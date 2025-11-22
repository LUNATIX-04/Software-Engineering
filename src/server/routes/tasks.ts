import type { Prisma } from "@prisma/client"
import type { Elysia } from "elysia"

import { createClient } from "../../utils/supabase/server"
import { prisma } from "../../lib/prisma"
import {
  projectMembers,
  projectTaskAssignees,
  projectTaskSubmissions,
  projectTasks,
} from "../projects/db"
import { requireProjectMembership } from "../projects/permissions"
import { PROJECT_ROLE, type ProjectRole } from "../../types/projects"
import { DEFAULT_TASK_CARD_COLOR } from "../../constants/task-colors"
import { getContrastingTextColor, sanitizeHexColor } from "../../utils/colors"

const TASK_STATUS_VALUES = ["SUBMITTED", "IN_PROGRESS", "BLOCKED"] as const
const VALID_SUBMISSION_STATUSES = ["SUBMITTED", "REVISION_REQUESTED", "APPROVED"] as const
const DEFAULT_PAGE_SIZE = 25
const MAX_PAGE_SIZE = 200
const CASE_INSENSITIVE_MODE: Prisma.QueryMode = "insensitive"

type SubmissionStatusValue = (typeof VALID_SUBMISSION_STATUSES)[number]
type TaskStatusEnum = (typeof TASK_STATUS_VALUES)[number]

type TaskScopeFilter = "assignee" | "assigner"

type TaskPagination = {
  page: number
  pageSize: number
}

type TaskQueryFilters = {
  search?: string
  departmentIds: string[]
  departmentNames: string[]
  statuses: TaskStatusEnum[]
  scope?: TaskScopeFilter
  memberId?: string
}

type ParsedTaskQuery = TaskQueryFilters & {
  pagination: TaskPagination | null
}

type TaskWithRelations = {
  id: string
  projectId: string
  departmentId: string | null
  createdByMemberId: string
  title: string
  detail: string | null
  status: TaskStatusEnum
  startDate: Date | null
  dueDate: Date | null
  cardColor: string
  cardTextColor: string
  createdAt: Date
  updatedAt: Date
  department: {
    id: string
    name: string
    color: string
    textColor: string
  } | null
  assignees: Array<{
    member: {
      id: string
      username: string
      departmentId: string | null
      profile: { fullName: string | null; avatarUrl: string | null }
    }
    taskId: string
    memberId: string
    assignedAt: Date
  }>
  createdBy: {
    id: string
    username: string
    role: ProjectRole
    profile: { fullName: string | null; avatarUrl: string | null }
  }
    submissions: Array<{
      id: string
      status: SubmissionStatusValue
      description: string | null
      reviewerComment: string | null
      attachmentMetadata: unknown | null
      submittedBy: { id: string; username: string; role: ProjectRole }
      reviewer: { id: string; username: string; role: ProjectRole } | null
      createdAt: Date
      updatedAt: Date
      acknowledgedAt: Date | null
      ownerAcknowledgedAt: Date | null
    }>
  }

function parseCardColor(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined
  const trimmed = value.trim()
  if (!trimmed) return undefined
  return sanitizeHexColor(trimmed)
}

function collectParamValues(params: URLSearchParams, keys: string[]) {
  const values = new Set<string>()
  keys.forEach((key) => {
    params.getAll(key).forEach((value) => {
      const trimmed = typeof value === "string" ? value.trim() : ""
      if (trimmed) {
        values.add(trimmed)
      }
    })
  })
  return Array.from(values)
}

function parsePaginationParams(params: URLSearchParams): TaskPagination | null {
  const hasPage = params.has("page")
  const hasPageSize = params.has("pageSize")
  if (!hasPage && !hasPageSize) {
    return null
  }
  const rawPage = Number(params.get("page"))
  const rawPageSize = Number(params.get("pageSize"))
  const page = Number.isFinite(rawPage) ? clampNumber(Math.trunc(rawPage), 1, Number.MAX_SAFE_INTEGER) : 1
  const pageSize = Number.isFinite(rawPageSize)
    ? clampNumber(Math.trunc(rawPageSize), 1, MAX_PAGE_SIZE)
    : DEFAULT_PAGE_SIZE
  return { page, pageSize }
}

function parseTaskQueryParams(searchParams: URLSearchParams): ParsedTaskQuery {
  const searchValue = searchParams.get("search")
  const search = searchValue ? searchValue.trim() : undefined
  const departmentIds = collectParamValues(searchParams, ["departmentId", "departmentIds"])
  const departmentNames = collectParamValues(searchParams, ["department", "departmentName", "departmentNames"])
  const statusValues = Array.from(
    new Set(
      searchParams
        .getAll("status")
        .map((value) => value.trim().toUpperCase())
        .filter((value): value is TaskStatusEnum =>
          TASK_STATUS_VALUES.includes(value as TaskStatusEnum)
        )
    )
  )
  const scopeValue = searchParams.get("scope")
  const normalizedScope = scopeValue ? scopeValue.trim().toLowerCase() : undefined
  const scope: TaskScopeFilter | undefined =
    normalizedScope === "assignee" || normalizedScope === "assigner"
      ? (normalizedScope as TaskScopeFilter)
      : undefined
  const memberId = searchParams.get("memberId") ?? searchParams.get("membershipId") ?? undefined
  const pagination = parsePaginationParams(searchParams)

  return {
    search: search && search.length > 0 ? search : undefined,
    departmentIds,
    departmentNames,
    statuses: statusValues,
    scope,
    memberId: memberId ?? undefined,
    pagination,
  }
}

function buildTaskWhere(projectId: string, filters: TaskQueryFilters): Prisma.ProjectTaskWhereInput {
  const where: Prisma.ProjectTaskWhereInput = { projectId }
  const andConditions: Prisma.ProjectTaskWhereInput[] = []

  if (filters.departmentIds.length === 1) {
    where.departmentId = filters.departmentIds[0]
  } else if (filters.departmentIds.length > 1) {
    where.departmentId = { in: filters.departmentIds }
  } else if (filters.departmentNames.length > 0) {
    const nameConditions = filters.departmentNames.map((name) => ({
      department: {
        is: {
          name: {
            equals: name,
            mode: CASE_INSENSITIVE_MODE,
          },
        },
      },
    }))
    andConditions.push({ OR: nameConditions })
  }

  if (filters.statuses.length === 1) {
    where.status = filters.statuses[0]
  } else if (filters.statuses.length > 1) {
    where.status = { in: filters.statuses }
  }

  if (filters.scope === "assignee" && filters.memberId) {
    andConditions.push({
      assignees: {
        some: {
          memberId: filters.memberId,
        },
      },
    })
  } else if (filters.scope === "assigner" && filters.memberId) {
    andConditions.push({ createdByMemberId: filters.memberId })
  }

  if (filters.search) {
    const normalized = filters.search.trim()
    if (normalized) {
      andConditions.push({ OR: createSearchConditions(normalized) })
    }
  }

  if (andConditions.length > 0) {
    where.AND = andConditions
  }

  return where
}

function createSearchConditions(term: string): Prisma.ProjectTaskWhereInput[] {
  return [
    { title: { contains: term, mode: CASE_INSENSITIVE_MODE } },
    { detail: { contains: term, mode: CASE_INSENSITIVE_MODE } },
    {
      department: {
        is: {
          name: { contains: term, mode: CASE_INSENSITIVE_MODE },
        },
      },
    },
    {
      createdBy: {
        is: {
          username: { contains: term, mode: CASE_INSENSITIVE_MODE },
        },
      },
    },
    {
      createdBy: {
        is: {
          profile: {
            is: {
              fullName: { contains: term, mode: CASE_INSENSITIVE_MODE },
            },
          },
        },
      },
    },
    {
      assignees: {
        some: {
          member: {
            username: { contains: term, mode: CASE_INSENSITIVE_MODE },
          },
        },
      },
    },
    {
      assignees: {
        some: {
          member: {
            profile: {
              is: {
                fullName: { contains: term, mode: CASE_INSENSITIVE_MODE },
              },
            },
          },
        },
      },
    },
  ]
}

function resolveCardTextColor(cardColor: string) {
  return getContrastingTextColor(cardColor)
}

function clampNumber(value: number, min: number, max: number) {
  if (!Number.isFinite(value)) {
    return min
  }
  return Math.min(max, Math.max(min, value))
}

function parseDeadlineInput(value: unknown): Date | null | undefined {
  if (value === undefined) return undefined
  if (value === null) return null
  if (typeof value !== "string") return null
  const trimmed = value.trim()
  if (!trimmed) return null

  const normalized = trimmed.replace(/-/g, "/").replace("T", " ")
  const segments = normalized
    .split(/\s+/)
    .map((segment) => segment.trim())
    .filter(Boolean)
  if (segments.length === 0) return null
  const [dateText, ...rest] = segments
  const dateParts = dateText.split("/").map((part) => part.trim())
  if (dateParts.length !== 3) return null
  const [dayRaw, monthRaw, yearRaw] = dateParts
  const day = Number(dayRaw)
  const monthIndex = Number(monthRaw) - 1
  const year = Number(yearRaw)
  if (!Number.isFinite(day) || !Number.isFinite(monthIndex) || !Number.isFinite(year)) return null
  const safeYear = clampNumber(Math.trunc(year), 1900, 2100)
  const safeMonthIndex = clampNumber(Math.trunc(monthIndex), 0, 11)
  const maxDays = new Date(safeYear, safeMonthIndex + 1, 0).getDate()
  const safeDay = clampNumber(Math.trunc(day), 1, maxDays)
  const candidate = new Date(Date.UTC(safeYear, safeMonthIndex, safeDay))

  if (rest.length > 0) {
    const timePart = rest.join(" ")
    const [hoursRaw, minutesRaw] = timePart.split(":")
    const hours = clampNumber(Math.trunc(Number(hoursRaw ?? "0")), 0, 23)
    const minutes = clampNumber(Math.trunc(Number(minutesRaw ?? "0")), 0, 59)
    candidate.setUTCHours(hours, minutes, 0, 0)
  } else {
    candidate.setUTCHours(0, 0, 0, 0)
  }
  return candidate
}

function serializeTask(task: TaskWithRelations) {
  return {
    id: task.id,
    title: task.title,
    detail: task.detail,
    status: task.status,
    startDate: task.startDate ? task.startDate.toISOString() : null,
    dueDate: task.dueDate ? task.dueDate.toISOString() : null,
    cardColor: task.cardColor,
    cardTextColor: task.cardTextColor,
    department: task.department
      ? {
          id: task.department.id,
          name: task.department.name,
          color: task.department.color,
          textColor: task.department.textColor,
        }
      : null,
    assignees: (() => {
      const filteredAssignees = task.assignees.filter(
        (assignment) => assignment.member.id !== task.createdBy.id
      )
      const sourceAssignees = filteredAssignees.length > 0 ? filteredAssignees : task.assignees
      return sourceAssignees.map((assignment) => ({
        id: assignment.member.id,
        username: assignment.member.username,
        fullName: assignment.member.profile?.fullName ?? null,
        departmentId: assignment.member.departmentId,
        avatarUrl: assignment.member.profile?.avatarUrl ?? null,
      }))
    })(),
    createdBy: {
      id: task.createdBy.id,
      username: task.createdBy.username,
      fullName: task.createdBy.profile?.fullName ?? null,
      role: task.createdBy.role,
      avatarUrl: task.createdBy.profile?.avatarUrl ?? null,
    },
    createdAt: task.createdAt.toISOString(),
    updatedAt: task.updatedAt.toISOString(),
    submission:
      task.submissions && task.submissions.length > 0
        ? {
            id: task.submissions[0].id,
            status: task.submissions[0].status,
            description: task.submissions[0].description,
            reviewerComment: task.submissions[0].reviewerComment,
            attachments: task.submissions[0].attachmentMetadata ?? null,
            submittedBy: {
              id: task.submissions[0].submittedBy.id,
              username: task.submissions[0].submittedBy.username,
              role: task.submissions[0].submittedBy.role,
            },
            reviewer: task.submissions[0].reviewer
              ? {
                  id: task.submissions[0].reviewer.id,
                  username: task.submissions[0].reviewer.username,
                  role: task.submissions[0].reviewer.role,
                }
              : null,
            createdAt: task.submissions[0].createdAt.toISOString(),
            updatedAt: task.submissions[0].updatedAt.toISOString(),
            acknowledgedAt: task.submissions[0].acknowledgedAt?.toISOString() ?? null,
            ownerAcknowledgedAt: task.submissions[0].ownerAcknowledgedAt?.toISOString() ?? null,
          }
        : null,
  }
}

function serializeSubmission(
  submission: NonNullable<Awaited<ReturnType<typeof fetchSubmission>>>
) {
  return {
    id: submission.id,
    status: submission.status,
    description: submission.description,
    reviewerComment: submission.reviewerComment,
    attachments: submission.attachmentMetadata ?? null,
    acknowledgedAt: submission.acknowledgedAt?.toISOString() ?? null,
    ownerAcknowledgedAt: submission.ownerAcknowledgedAt?.toISOString() ?? null,
    submittedBy: {
      id: submission.submittedBy.id,
      username: submission.submittedBy.username,
      role: submission.submittedBy.role,
    },
    reviewer: submission.reviewer
      ? {
          id: submission.reviewer.id,
          username: submission.reviewer.username,
          role: submission.reviewer.role,
        }
      : null,
    createdAt: submission.createdAt.toISOString(),
    updatedAt: submission.updatedAt.toISOString(),
  }
}

function fetchTasks(
  where: Prisma.ProjectTaskWhereInput,
  pagination?: TaskPagination | null
): Promise<TaskWithRelations[]> {
  const query: Parameters<typeof projectTasks.findMany>[0] = {
    where,
    include: {
      department: {
        select: {
          id: true,
          name: true,
          color: true,
          textColor: true,
        },
      },
      assignees: {
        select: {
          member: {
            select: {
              id: true,
              username: true,
              departmentId: true,
              profile: {
                select: {
                  fullName: true,
                  avatarUrl: true,
                },
              },
            },
          },
        },
      },
      createdBy: {
        select: {
          id: true,
          username: true,
          profile: {
            select: { fullName: true, avatarUrl: true },
          },
          role: true,
        },
      },
      submissions: {
        orderBy: { createdAt: "desc" },
        take: 1,
        select: {
          id: true,
          status: true,
          description: true,
          reviewerComment: true,
          attachmentMetadata: true,
          acknowledgedAt: true,
          ownerAcknowledgedAt: true,
          createdAt: true,
          updatedAt: true,
          submittedBy: {
            select: {
              id: true,
              username: true,
              role: true,
            },
          },
          reviewer: {
            select: {
              id: true,
              username: true,
              role: true,
            },
          },
        },
      },
    },
    orderBy: [
      { createdAt: "desc" },
      { title: "asc" },
    ],
  }

  if (pagination) {
    query.skip = (pagination.page - 1) * pagination.pageSize
    query.take = pagination.pageSize
  }

  return projectTasks.findMany(query).then((result) => result as unknown as TaskWithRelations[])
}

async function loadTask(projectId: string, taskId: string): Promise<TaskWithRelations | null> {
  const result = await projectTasks.findFirst({
    where: { id: taskId, projectId },
    include: {
      department: {
        select: {
          id: true,
          name: true,
          color: true,
          textColor: true,
        },
      },
      assignees: {
        include: {
          member: {
            select: {
              id: true,
              username: true,
              departmentId: true,
              profile: {
                select: {
                  fullName: true,
                  avatarUrl: true,
                },
              },
            },
          },
        },
      },
      createdBy: {
        select: {
          id: true,
          username: true,
          profile: {
            select: { fullName: true, avatarUrl: true },
          },
          role: true,
        },
      },
      submissions: {
        orderBy: { createdAt: "desc" },
        take: 1,
        include: {
          submittedBy: {
            select: {
              id: true,
              username: true,
              role: true,
            },
          },
          reviewer: {
            select: {
              id: true,
              username: true,
              role: true,
            },
          },
        },
      },
    },
  })
  return result as unknown as TaskWithRelations | null
}

async function ensureTaskPermission(projectId: string, userId: string, taskId: string) {
  const membership = await requireProjectMembership(projectId, userId)
  const task = await loadTask(projectId, taskId)
  if (!task) {
    throw new Error("not_found")
  }
  const canManage =
    membership.role === PROJECT_ROLE.OWNER ||
    membership.role === PROJECT_ROLE.HEADER ||
    task.createdByMemberId === membership.id

  if (!canManage) {
    throw new Error("forbidden")
  }

  return { membership, task }
}

async function getProjectMembership(projectId: string) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return null
  }

  try {
    return await requireProjectMembership(projectId, user.id)
  } catch {
    return null
  }
}

async function fetchSubmission(taskId: string) {
  return projectTaskSubmissions.findFirst({
    where: { taskId },
    orderBy: { createdAt: "desc" },
    include: {
      submittedBy: { select: { id: true, username: true, role: true } },
      reviewer: { select: { id: true, username: true, role: true } },
    },
  })
}

export function registerTaskRoutes(app: Elysia) {
  app.get("/projects/:projectId/tasks", async ({ request, params }) => {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 })
    }
    try {
      await requireProjectMembership(params.projectId, user.id)
    } catch (error) {
      const message = (error as Error).message === "not_found" ? "Not found" : "Forbidden"
      return new Response(JSON.stringify({ error: message }), { status: 404 })
    }
    const url = new URL(request.url)
    const parsedQuery = parseTaskQueryParams(url.searchParams)
    const { pagination, ...filters } = parsedQuery
    const where = buildTaskWhere(params.projectId, filters)
    const [tasks, totalCount] = await Promise.all([
      fetchTasks(where, pagination),
      pagination ? projectTasks.count({ where }) : Promise.resolve(null),
    ])
    const headers = new Headers({
      "Content-Type": "application/json",
    })
    if (pagination && totalCount !== null) {
      headers.set("X-Page", String(pagination.page))
      headers.set("X-Page-Size", String(pagination.pageSize))
      headers.set("X-Total-Count", String(totalCount))
      headers.set(
        "X-Total-Pages",
        String(Math.max(1, Math.ceil(totalCount / pagination.pageSize)))
      )
    }
    return new Response(JSON.stringify(tasks.map(serializeTask)), { headers })
  })

  app.post("/projects/:projectId/tasks", async ({ request, params }) => {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 })
    }
    let membership
    try {
      membership = await requireProjectMembership(params.projectId, user.id)
    } catch (error) {
      const message = (error as Error).message === "not_found" ? "Not found" : "Forbidden"
      return new Response(JSON.stringify({ error: message }), { status: 404 })
    }
    if (!membership) {
      return new Response(JSON.stringify({ error: "Not found" }), { status: 404 })
    }
    const payload = await request.json().catch(() => null)
    const title = typeof payload?.title === "string" ? payload.title.trim() : ""
    const detail =
      typeof payload?.detail === "string" && payload.detail.trim().length > 0
        ? payload.detail.trim()
        : null
    const departmentId =
      typeof payload?.departmentId === "string" && payload.departmentId.trim().length > 0
        ? payload.departmentId
        : null
    const assigneeIds = Array.isArray(payload?.assigneeIds)
      ? payload.assigneeIds.filter((value: unknown): value is string => typeof value === "string")
      : []
    const statusRaw =
      typeof payload?.status === "string" ? payload.status.toUpperCase() : "SUBMITTED"
    const status = TASK_STATUS_VALUES.includes(statusRaw as TaskStatusEnum)
      ? (statusRaw as TaskStatusEnum)
      : "SUBMITTED"
    const startDate = parseDeadlineInput(payload?.startDate)
    const dueDate = parseDeadlineInput(payload?.deadline)
    const cardColor = parseCardColor(payload?.cardColor) ?? DEFAULT_TASK_CARD_COLOR
    const cardTextColor = resolveCardTextColor(cardColor)
    if (!title) {
      return new Response(JSON.stringify({ error: "Title is required" }), { status: 400 })
    }
    if (departmentId) {
      const department = await prisma.projectDepartment.findFirst({
        where: { id: departmentId, projectId: params.projectId },
        select: { id: true },
      })
      if (!department) {
        return new Response(JSON.stringify({ error: "Department not found" }), { status: 404 })
      }
    }
    if (assigneeIds.length > 0) {
      const members = await projectMembers.findMany({
        where: {
          id: {
            in: assigneeIds,
          },
          projectId: params.projectId,
        },
        select: { id: true },
      })
      if (members.length !== assigneeIds.length) {
        return new Response(JSON.stringify({ error: "One or more assignees are invalid" }), { status: 400 })
      }
    }
    const task = await prisma.$transaction(async (tx) => {
      const created = await tx.projectTask.create({
        data: {
          projectId: params.projectId,
          departmentId,
          createdByMemberId: membership.id,
          title,
          detail,
          status,
          startDate,
          dueDate,
          cardColor,
          cardTextColor,
        },
      })
      if (assigneeIds.length > 0) {
        await tx.projectTaskAssignee.createMany({
          data: assigneeIds.map((memberId: string) => ({
            taskId: created.id,
            memberId,
          })),
        })
      }
      return tx.projectTask.findUniqueOrThrow({
        where: { id: created.id },
        include: {
          department: {
            select: {
              id: true,
              name: true,
              color: true,
              textColor: true,
            },
          },
          assignees: {
            include: {
              member: {
                select: {
                  id: true,
                  username: true,
                  departmentId: true,
                  profile: {
                    select: {
                      fullName: true,
                      avatarUrl: true,
                    },
                  },
                },
              },
            },
          },
          createdBy: {
            select: {
              id: true,
              username: true,
              role: true,
              profile: {
                select: { fullName: true, avatarUrl: true },
              },
            },
          },
          submissions: {
            orderBy: { createdAt: "desc" },
            take: 1,
            include: {
              submittedBy: {
                select: {
                  id: true,
                  username: true,
                  role: true,
                },
              },
              reviewer: {
                select: {
                  id: true,
                  username: true,
                  role: true,
                },
              },
            },
          },
        },
      })
    })
    return new Response(JSON.stringify(serializeTask(task)))
  })

  app.get("/projects/:projectId/tasks/:taskId/submission", async ({ params }) => {
    const membership = await getProjectMembership(params.projectId)
    if (!membership) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 })
    }

    const submission = await fetchSubmission(params.taskId)
    return new Response(
      JSON.stringify({ submission: submission ? serializeSubmission(submission) : null })
    )
  })

  app.post("/projects/:projectId/tasks/:taskId/submission", async ({ request, params }) => {
    const membership = await getProjectMembership(params.projectId)
    if (!membership) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 })
    }

    const payload = await request.json().catch(() => null)
    const description = typeof payload?.description === "string" ? payload.description.trim() : null
    const attachments = Array.isArray(payload?.attachments)
      ? payload.attachments.filter(
          (item: unknown): item is Record<string, unknown> =>
            typeof item === "object" && item !== null
        )
      : []

    const assignee = await projectTaskAssignees.findFirst({
      where: { taskId: params.taskId, memberId: membership.id },
    })
    if (!assignee && membership.role === PROJECT_ROLE.MEMBER) {
      return new Response(JSON.stringify({ error: "Forbidden" }), { status: 403 })
    }

    const submission = await projectTaskSubmissions.create({
      data: {
        taskId: params.taskId,
        submittedById: membership.id,
        status: "SUBMITTED",
        description,
        attachmentMetadata: attachments.length > 0 ? attachments : null,
        ownerAcknowledgedAt: null,
      },
      include: {
        submittedBy: { select: { id: true, username: true, role: true } },
        reviewer: { select: { id: true, username: true, role: true } },
      },
    })

    return new Response(JSON.stringify({ submission: serializeSubmission(submission) }))
  })

  app.patch("/projects/:projectId/tasks/:taskId/submission", async ({ request, params }) => {
    const membership = await getProjectMembership(params.projectId)
    if (!membership) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 })
    }

    const payload = await request.json().catch(() => null)
    const description = typeof payload?.description === "string" ? payload.description.trim() : null
    const reviewerComment =
      typeof payload?.reviewerComment === "string" ? payload.reviewerComment.trim() : null
    const statusValue = typeof payload?.status === "string" ? payload.status.toUpperCase() : null
    const status: SubmissionStatusValue | null = statusValue && VALID_SUBMISSION_STATUSES.includes(statusValue as SubmissionStatusValue)
      ? (statusValue as SubmissionStatusValue)
      : null
    const attachments = Array.isArray(payload?.attachments)
      ? payload.attachments.filter(
          (item: unknown): item is Record<string, unknown> =>
            typeof item === "object" && item !== null
        )
      : undefined

    const submission = await projectTaskSubmissions.findFirst({
      where: { taskId: params.taskId },
    })
    if (!submission) {
      return new Response(JSON.stringify({ error: "Submission not found" }), { status: 404 })
    }

    if (status) {
      submission.status = status
    }
    const now = new Date()
    const updatedSubmission = await projectTaskSubmissions.update({
      where: { id: submission.id },
      data: {
        description,
        reviewerComment,
        status: status ?? submission.status,
        ...(submission.submittedById === membership.id ? { acknowledgedAt: null } : {}),
        ownerAcknowledgedAt: null,
        reviewerId:
          membership.id !== submission.submittedById ? membership.id : submission.reviewerId,
        updatedAt: now,
        attachmentMetadata:
          attachments !== undefined ? (attachments.length > 0 ? attachments : null) : submission.attachmentMetadata,
      },
      include: {
        submittedBy: { select: { id: true, username: true, role: true } },
        reviewer: { select: { id: true, username: true, role: true } },
      },
    })

    return new Response(JSON.stringify({ submission: serializeSubmission(updatedSubmission) }))
  })

  app.post("/projects/:projectId/tasks/:taskId/submission/acknowledge", async ({ params }) => {
    const membership = await getProjectMembership(params.projectId)
    if (!membership) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 })
    }

    const assignee = await projectTaskAssignees.findFirst({
      where: { taskId: params.taskId, memberId: membership.id },
    })
    if (!assignee && membership.role === PROJECT_ROLE.MEMBER) {
      return new Response(JSON.stringify({ error: "Forbidden" }), { status: 403 })
    }

    const submission = await projectTaskSubmissions.findFirst({
      where: { taskId: params.taskId },
    })
    if (!submission) {
      return new Response(JSON.stringify({ error: "Submission not found" }), { status: 404 })
    }

    const now = new Date()
    const updatedSubmission = await projectTaskSubmissions.update({
      where: { id: submission.id },
      data: {
        acknowledgedAt: now,
        updatedAt: now,
      },
      include: {
        submittedBy: { select: { id: true, username: true, role: true } },
        reviewer: { select: { id: true, username: true, role: true } },
      },
    })

    return new Response(JSON.stringify({ submission: serializeSubmission(updatedSubmission) }))
  })

  app.post("/projects/:projectId/tasks/:taskId/submission/owner-acknowledge", async ({ params }) => {
    const membership = await getProjectMembership(params.projectId)
    if (!membership) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 })
    }
    const assignee = await projectTaskAssignees.findFirst({
      where: { taskId: params.taskId, memberId: membership.id },
    })
    const isTaskOwner = membership.role === PROJECT_ROLE.OWNER
    const isHeader = membership.role === PROJECT_ROLE.HEADER
    if (!assignee && !isTaskOwner && !isHeader) {
      return new Response(JSON.stringify({ error: "Forbidden" }), { status: 403 })
    }

    const submission = await projectTaskSubmissions.findFirst({
      where: { taskId: params.taskId },
    })
    if (!submission) {
      return new Response(JSON.stringify({ error: "Submission not found" }), { status: 404 })
    }

    const now = new Date()
    const updatedSubmission = await projectTaskSubmissions.update({
      where: { id: submission.id },
      data: {
        ownerAcknowledgedAt: now,
        updatedAt: now,
      },
      include: {
        submittedBy: { select: { id: true, username: true, role: true } },
        reviewer: { select: { id: true, username: true, role: true } },
      },
    })

    return new Response(JSON.stringify({ submission: serializeSubmission(updatedSubmission) }))
  })

  app.get("/projects/:projectId/tasks/:taskId", async ({ params }) => {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 })
    }

    try {
      await requireProjectMembership(params.projectId, user.id)
    } catch (error) {
      const message = (error as Error).message === "not_found" ? "Not found" : "Forbidden"
      return new Response(JSON.stringify({ error: message }), { status: 404 })
    }

    const task = await loadTask(params.projectId, params.taskId)
    if (!task) {
      return new Response(JSON.stringify({ error: "Not found" }), { status: 404 })
    }

    return new Response(JSON.stringify(serializeTask(task)))
  })

  app.patch("/projects/:projectId/tasks/:taskId", async ({ request, params }) => {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 })
    }

    try {
      await ensureTaskPermission(params.projectId, user.id, params.taskId)
    } catch (error) {
      const message = (error as Error).message === "not_found" ? "Not found" : "Forbidden"
      return new Response(JSON.stringify({ error: message }), { status: 404 })
    }

    const payload = await request.json().catch(() => null)
    const title = typeof payload?.title === "string" ? payload.title.trim() : undefined
    const detail =
      typeof payload?.detail === "string" && payload.detail.trim().length > 0
        ? payload.detail.trim()
        : null
    const departmentId =
      typeof payload?.departmentId === "string" && payload.departmentId.trim().length > 0
        ? payload.departmentId
        : null
    const assigneeIds = Array.isArray(payload?.assigneeIds)
      ? payload.assigneeIds.filter((value: unknown): value is string => typeof value === "string")
      : undefined
    const statusRaw = typeof payload?.status === "string" ? payload.status.toUpperCase() : undefined
    const status =
      statusRaw && TASK_STATUS_VALUES.includes(statusRaw as TaskStatusEnum)
        ? (statusRaw as TaskStatusEnum)
        : undefined
    const startDate = parseDeadlineInput(payload?.startDate)
    const dueDate = parseDeadlineInput(payload?.deadline)
    const cardColor = payload?.cardColor ? parseCardColor(payload.cardColor) : undefined
    const cardTextColor = cardColor ? resolveCardTextColor(cardColor) : undefined

    const updatePayload: Record<string, unknown> = {}
    if (title !== undefined) {
      if (!title) {
        return new Response(JSON.stringify({ error: "Title is required" }), { status: 400 })
      }
      updatePayload.title = title
    }
    if (detail !== undefined) {
      updatePayload.detail = detail
    }
    if (departmentId !== undefined) {
      if (departmentId) {
        const department = await prisma.projectDepartment.findFirst({
          where: { id: departmentId, projectId: params.projectId },
          select: { id: true },
        })
        if (!department) {
          return new Response(JSON.stringify({ error: "Department not found" }), { status: 404 })
        }
        updatePayload.departmentId = departmentId
      } else {
        updatePayload.departmentId = null
      }
    }
    if (status !== undefined) {
      updatePayload.status = status
    }
    if (startDate !== undefined) {
      updatePayload.startDate = startDate
    }
    if (dueDate !== undefined) {
      updatePayload.dueDate = dueDate
    }
    if (cardColor) {
      updatePayload.cardColor = cardColor
      updatePayload.cardTextColor = cardTextColor ?? resolveCardTextColor(cardColor)
    }

    if (Object.keys(updatePayload).length === 0 && assigneeIds === undefined) {
      return new Response(JSON.stringify({ error: "No updates provided" }), { status: 400 })
    }

    if (assigneeIds !== undefined) {
      if (assigneeIds.length > 0) {
        const members = await projectMembers.findMany({
          where: {
            id: { in: assigneeIds },
            projectId: params.projectId,
          },
          select: { id: true },
        })
        if (members.length !== assigneeIds.length) {
          return new Response(JSON.stringify({ error: "One or more assignees are invalid" }), { status: 400 })
        }
      }
    }

    const task = await prisma.$transaction(async (tx) => {
      if (Object.keys(updatePayload).length > 0) {
        await tx.projectTask.update({
          where: { id: params.taskId },
          data: updatePayload,
        })
      }
      if (assigneeIds !== undefined) {
        await tx.projectTaskAssignee.deleteMany({
          where: { taskId: params.taskId },
        })
        if (assigneeIds.length > 0) {
          await tx.projectTaskAssignee.createMany({
            data: assigneeIds.map((memberId: string) => ({
              taskId: params.taskId,
              memberId,
            })),
          })
        }
      }

      return loadTask(params.projectId, params.taskId)
    })

    if (!task) {
      return new Response(JSON.stringify({ error: "Not found" }), { status: 404 })
    }

    return new Response(JSON.stringify(serializeTask(task)))
  })

  app.delete("/projects/:projectId/tasks/:taskId", async ({ params }) => {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 })
    }

    try {
      await ensureTaskPermission(params.projectId, user.id, params.taskId)
    } catch (error) {
      const message = (error as Error).message === "not_found" ? "Not found" : "Forbidden"
      return new Response(JSON.stringify({ error: message }), { status: 404 })
    }

    await projectTaskAssignees.deleteMany({
      where: { taskId: params.taskId },
    })
    await projectTasks.delete({
      where: { id: params.taskId },
    })

    return new Response(JSON.stringify({ success: true }))
  })

  return app
}

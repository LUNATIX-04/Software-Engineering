import { NextRequest, NextResponse } from "next/server"

import { prisma } from "@/lib/prisma"
import { requireProjectMembership } from "@/server/projects/permissions"
import { createClient } from "@/utils/supabase/server"
import { PROJECT_ROLE } from "@/types/projects"
import type { SubmissionStatus } from "@prisma/client"

const VALID_STATUSES = ["SUBMITTED", "REVISION_REQUESTED", "APPROVED"] as const

type SubmissionStatusValue = (typeof VALID_STATUSES)[number]

type SerializedSubmission = {
  id: string
  status: SubmissionStatusValue
  description: string | null
  reviewerComment: string | null
  attachments: unknown | null
  submittedBy: {
    id: string
    username: string
    role: string
  }
  reviewer: { id: string; username: string; role: string } | null
  createdAt: string
  updatedAt: string
}

async function fetchSubmission(taskId: string) {
  return prisma.projectTaskSubmission.findFirst({
    where: { taskId },
    orderBy: { createdAt: "desc" },
    include: {
      submittedBy: { select: { id: true, username: true, role: true } },
      reviewer: { select: { id: true, username: true, role: true } },
    },
  })
}

function serializeSubmission(submission: NonNullable<ReturnType<typeof fetchSubmission>>) {
  return {
    id: submission.id,
    status: submission.status,
    description: submission.description,
    reviewerComment: submission.reviewerComment,
    attachments: submission.attachmentMetadata ?? null,
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

async function getMembership(_request: NextRequest, projectId: string) {
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

export async function GET(
  _request: NextRequest,
  { params }: { params: { projectId: string; taskId: string } }
) {
  const membership = await getMembership(_request, params.projectId)
  if (!membership) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const submission = await fetchSubmission(params.taskId)
  return NextResponse.json({ submission: submission ? serializeSubmission(submission) : null })
}

export async function POST(
  request: NextRequest,
  { params }: { params: { projectId: string; taskId: string } }
) {
  const membership = await getMembership(request, params.projectId)
  if (!membership) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const payload = await request.json().catch(() => null)
  const description = typeof payload?.description === "string" ? payload.description.trim() : null
  const attachments = Array.isArray(payload?.attachments)
    ? payload.attachments.filter((item): item is { name?: string; url?: string } =>
        typeof item === "object" && item !== null
      )
    : []

  const assignee = await prisma.projectTaskAssignee.findFirst({
    where: { taskId: params.taskId, memberId: membership.id },
  })
  if (!assignee && membership.role === PROJECT_ROLE.MEMBER) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const submission = await prisma.projectTaskSubmission.create({
    data: {
      taskId: params.taskId,
      submittedById: membership.id,
      status: "SUBMITTED",
      description,
      attachmentMetadata: attachments.length > 0 ? attachments : null,
    },
    include: {
      submittedBy: { select: { id: true, username: true, role: true } },
      reviewer: { select: { id: true, username: true, role: true } },
    },
  })

  return NextResponse.json({ submission: serializeSubmission(submission) })
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { projectId: string; taskId: string } }
) {
  const membership = await getMembership(request, params.projectId)
  if (!membership) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }
  if (membership.role === PROJECT_ROLE.MEMBER) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const payload = await request.json().catch(() => null)
  const submissionId = typeof payload?.submissionId === "string" ? payload.submissionId : null
  const status = typeof payload?.status === "string" ? payload.status.toUpperCase() : null
  const reviewerComment = typeof payload?.reviewerComment === "string" ? payload.reviewerComment.trim() : null

  if (!submissionId) {
    return NextResponse.json({ error: "submissionId is required" }, { status: 400 })
  }
  if (!status || !VALID_STATUSES.includes(status as SubmissionStatusValue)) {
    return NextResponse.json({ error: "Invalid status" }, { status: 400 })
  }

  const submission = await prisma.projectTaskSubmission.findUnique({ where: { id: submissionId } })
  if (!submission || submission.taskId !== params.taskId) {
    return NextResponse.json({ error: "Submission not found" }, { status: 404 })
  }

  const updated = await prisma.projectTaskSubmission.update({
    where: { id: submissionId },
    data: {
      status: status as SubmissionStatus,
      reviewerId: membership.id,
      reviewerComment,
    },
    include: {
      submittedBy: { select: { id: true, username: true, role: true } },
      reviewer: { select: { id: true, username: true, role: true } },
    },
  })

  return NextResponse.json({ submission: serializeSubmission(updated) })
}

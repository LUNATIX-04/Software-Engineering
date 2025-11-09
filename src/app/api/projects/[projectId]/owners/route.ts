import { NextRequest, NextResponse } from "next/server"

import { prisma } from "@/lib/prisma"
import { createClient } from "@/utils/supabase/server"

import { projectMembers } from "@/server/projects/db"
import { requireProjectMembership } from "@/server/projects/permissions"
import type { ProjectMemberStatus, ProjectRole } from "@/types/projects"
import { PROJECT_MEMBER_STATUS, PROJECT_ROLE } from "@/types/projects"

export async function POST(request: NextRequest, { params }: { params: { projectId: string } }) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  let requester
  try {
    requester = await requireProjectMembership(params.projectId, user.id, [PROJECT_ROLE.OWNER])
  } catch (error) {
    const message = (error as Error).message
    return NextResponse.json(
      { error: message === "forbidden" ? "Forbidden" : "Not found" },
      { status: message === "forbidden" ? 403 : 404 }
    )
  }

  const { ownerIds } = (await request.json()) ?? {}
  if (!Array.isArray(ownerIds) || ownerIds.length === 0) {
    return NextResponse.json({ error: "ownerIds is required" }, { status: 400 })
  }

  const uniqueOwnerIds = Array.from(new Set(ownerIds.filter((id): id is string => typeof id === "string")))
  if (uniqueOwnerIds.length === 0) {
    return NextResponse.json({ error: "ownerIds is required" }, { status: 400 })
  }

  const targetMembers = await projectMembers.findMany({
    where: {
      projectId: params.projectId,
      status: PROJECT_MEMBER_STATUS.ACTIVE,
      id: { in: uniqueOwnerIds },
    },
    select: { id: true, userId: true },
  })

  const currentOwners = await projectMembers.findMany({
    where: {
      projectId: params.projectId,
      status: PROJECT_MEMBER_STATUS.ACTIVE,
      role: PROJECT_ROLE.OWNER,
    },
    select: { id: true, username: true },
  })

  type OwnerCandidate = typeof targetMembers[number]

  if (targetMembers.length !== uniqueOwnerIds.length) {
    return NextResponse.json({ error: "One or more members were not found" }, { status: 404 })
  }

  const ownerUserMap = new Map(
    targetMembers.map((member: OwnerCandidate) => [member.id, member.userId])
  )
  const primaryOwnerUserId =
    ownerUserMap.get(uniqueOwnerIds[0]) ?? targetMembers[0]?.userId ?? requester.project.ownerId

  const departmentHeads = await prisma.projectDepartment.findMany({
    where: { projectId: params.projectId },
    select: { head: true },
  })
  const headUsernames = new Set(
    departmentHeads
      .map((dept) => dept.head)
      .filter((head): head is string => Boolean(head?.trim()))
  )

  type OwnerSummary = { id: string; username: string | null }
  const demoteTargets: OwnerSummary[] = currentOwners.filter(
    (owner: { id: string }) => !uniqueOwnerIds.includes(owner.id)
  )

  await prisma.$transaction(async (txRaw) => {
    const tx = txRaw as typeof prisma & {
      projectMember: typeof projectMembers
    }

    if (demoteTargets.length > 0) {
      await Promise.all(
        demoteTargets.map((owner: { id: string; username: string | null }) =>
          tx.projectMember.update({
            where: { id: owner.id },
            data: {
              role: headUsernames.has(owner.username ?? "")
                ? PROJECT_ROLE.HEADER
                : PROJECT_ROLE.MEMBER,
            },
          })
        )
      )
    }

    await tx.projectMember.updateMany({
      where: { id: { in: uniqueOwnerIds } },
      data: { role: PROJECT_ROLE.OWNER },
    })

    await tx.project.update({
      where: { id: params.projectId },
      data: { ownerId: primaryOwnerUserId },
    })
  })

  const owners = await projectMembers.findMany({
    where: { projectId: params.projectId, role: PROJECT_ROLE.OWNER },
    select: {
      id: true,
      userId: true,
      username: true,
    },
    orderBy: { createdAt: "asc" },
  })

  return NextResponse.json({ owners })
}

import { NextResponse } from "next/server"

import { createClient } from "@/utils/supabase/server"

import { prisma } from "@/lib/prisma"
import { projectMembers } from "@/server/projects/db"
import { ensureActiveMembership } from "@/server/projects/permissions"
import type { ProjectMemberStatus, ProjectRole } from "@/types/projects"
import { PROJECT_MEMBER_STATUS, PROJECT_ROLE } from "@/types/projects"

export async function POST(_request: Request, { params }: { params: { projectId: string } }) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  let membership
  try {
    membership = await ensureActiveMembership(params.projectId, user.id)
  } catch {
    return NextResponse.json({ error: "Not found" }, { status: 404 })
  }

  if (membership.role === PROJECT_ROLE.OWNER) {
    const ownerCount = await projectMembers.count({
      where: {
        projectId: params.projectId,
        role: PROJECT_ROLE.OWNER,
        status: PROJECT_MEMBER_STATUS.ACTIVE,
        id: { not: membership.id },
      },
    })
    if (ownerCount === 0) {
      return NextResponse.json({ error: "Transfer ownership before leaving" }, { status: 400 })
    }
  }

  if (
    membership.departmentId &&
    (membership.role === PROJECT_ROLE.HEADER || membership.role === PROJECT_ROLE.OWNER) &&
    membership.username
  ) {
    await prisma.projectDepartment.updateMany({
      where: {
        id: membership.departmentId,
        head: membership.username,
      },
      data: {
        head: null,
      },
    })
  }

  await projectMembers.delete({
    where: { id: membership.id },
  })

  return NextResponse.json({ success: true })
}

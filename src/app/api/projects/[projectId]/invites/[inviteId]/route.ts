import { NextRequest, NextResponse } from "next/server"

import { createClient } from "@/utils/supabase/server"

import { projectInvites } from "@/server/projects/db"
import { canInvite, requireProjectMembership } from "@/server/projects/permissions"

export async function DELETE(
  _request: NextRequest,
  { params }: { params: { projectId: string; inviteId: string } }
) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  let membership
  try {
    membership = await requireProjectMembership(params.projectId, user.id)
  } catch (error) {
    const message = (error as Error).message
    return NextResponse.json(
      { error: message === "forbidden" ? "Forbidden" : "Not found" },
      { status: message === "forbidden" ? 403 : 404 }
    )
  }

  if (!canInvite(membership.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  await projectInvites.deleteMany({
    where: { id: params.inviteId, projectId: params.projectId },
  })

  return NextResponse.json({ success: true })
}

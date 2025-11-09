import { NextResponse } from "next/server"

import { createClient } from "@/utils/supabase/server"

import { requireProjectMembership } from "@/server/projects/permissions"

export async function GET(_request: Request, { params }: { params: { projectId: string } }) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const membership = await requireProjectMembership(params.projectId, user.id)
    return NextResponse.json({
      id: membership.id,
      role: membership.role,
      username: membership.username,
      departmentId: membership.departmentId,
      status: membership.status,
    })
  } catch (error) {
    const message = (error as Error).message
    return NextResponse.json(
      { error: message === "forbidden" ? "Forbidden" : "Not found" },
      { status: message === "forbidden" ? 403 : 404 }
    )
  }
}

import { NextRequest, NextResponse } from "next/server"

import { createClient } from "@/utils/supabase/server"

import { projectMembers } from "@/server/projects/db"
import { ensureActiveMembership } from "@/server/projects/permissions"

export async function PATCH(request: NextRequest, { params }: { params: { projectId: string } }) {
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

  const { username } = (await request.json()) ?? {}
  if (typeof username !== "string" || username.trim().length === 0) {
    return NextResponse.json({ error: "Username is required" }, { status: 400 })
  }

  const updated = await projectMembers.update({
    where: { id: membership.id },
    data: { username: username.trim() },
    select: {
      id: true,
      username: true,
    },
  })

  return NextResponse.json(updated)
}

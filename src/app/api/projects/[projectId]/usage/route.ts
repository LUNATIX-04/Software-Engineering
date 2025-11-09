import { NextResponse } from "next/server"

import { createClient } from "@/utils/supabase/server"

import { projectMembers } from "@/server/projects/db"
import { ensureActiveMembership } from "@/server/projects/permissions"

export async function POST(
  _request: Request,
  { params }: { params: { projectId: string } }
) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    await ensureActiveMembership(params.projectId, user.id)
  } catch {
    return NextResponse.json({ error: "Not found" }, { status: 404 })
  }

  await projectMembers.updateMany({
    where: {
      projectId: params.projectId,
      userId: user.id,
    },
    data: {
      lastSeenAt: new Date(),
    },
  })

  return NextResponse.json({ success: true })
}

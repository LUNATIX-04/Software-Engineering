import { NextResponse } from "next/server"

import { prisma } from "@/lib/prisma"
import { projectMembers } from "@/server/projects/db"

export async function GET(
  request: Request,
  { params }: { params: { projectId: string } }
) {
  const { projectId } = params
  const url = new URL(request.url)
  const userId = url.searchParams.get("userId")

  if (!userId) {
    return NextResponse.json({ error: "userId is required" }, { status: 400 })
  }

  const membership = await projectMembers.findFirst({
    where: { projectId, userId },
    select: { id: true },
  })

  const project = await prisma.project.findFirst({
    where: { id: projectId },
    select: { ownerId: true },
  })

  return NextResponse.json({
    isMember: Boolean(membership),
    isOwner: project?.ownerId === userId,
  })
}

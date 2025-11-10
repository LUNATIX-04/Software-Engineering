import { Prisma, PrismaClient } from "@prisma/client"

import { prisma } from "@/lib/prisma"

type ExtendedPrismaClient = PrismaClient & {
  projectMember: Prisma.ProjectMemberDelegate
  projectInvite: Prisma.ProjectInviteDelegate
  projectTask: Prisma.ProjectTaskDelegate
  projectTaskAssignee: Prisma.ProjectTaskAssigneeDelegate
  projectTaskSubmission: Prisma.ProjectTaskSubmissionDelegate
}

const client = prisma as ExtendedPrismaClient

export const projectMembers = client.projectMember
export const projectInvites = client.projectInvite
export const projectTasks = client.projectTask
export const projectTaskAssignees = client.projectTaskAssignee
export const projectTaskSubmissions = client.projectTaskSubmission

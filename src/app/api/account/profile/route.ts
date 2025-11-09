import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"

import { prisma } from "@/lib/prisma"
import { AUTH_ERROR_MESSAGES } from "@/constants/authErrors"
import { createClient } from "@/utils/supabase/server"

const profileSchema = z.object({
  fullName: z
    .string()
    .trim()
    .min(1, "Full name is required.")
    .max(120, "Full name is too long.")
    .optional(),
  bio: z
    .string()
    .trim()
    .max(1000, "About me can be at most 1000 characters.")
    .optional(),
  avatarUrl: z
    .union([z.string().url(), z.literal(""), z.null()])
    .optional()
    .transform((value) => (value === "" ? null : value)),
})

export async function PATCH(request: NextRequest) {
  const supabase = await createClient()
  const {
    data: { user },
    error: getUserError,
  } = await supabase.auth.getUser()

  if (getUserError || !user) {
    return NextResponse.json({ error: "You need to be signed in to update your profile." }, { status: 401 })
  }

  let payload: z.infer<typeof profileSchema>
  try {
    const json = await request.json()
    const parsed = profileSchema.safeParse(json)
    if (!parsed.success) {
      const issues = parsed.error.flatten().fieldErrors
      return NextResponse.json({ errors: issues }, { status: 400 })
    }
    payload = parsed.data
  } catch {
    return NextResponse.json({ error: AUTH_ERROR_MESSAGES.invalidJsonBody }, { status: 400 })
  }

  const updates: {
    fullName?: string | null
    bio?: string | null
    avatarUrl?: string | null
  } = {}
  const metadataFullName =
    typeof user.user_metadata?.full_name === "string"
      ? user.user_metadata.full_name
      : undefined

  if (payload.fullName !== undefined) {
    const trimmedName = payload.fullName.trim()
    updates.fullName = trimmedName
    const { error: metadataError } = await supabase.auth.updateUser({
      data: {
        full_name: trimmedName,
        display_name: trimmedName,
      },
    })
    if (metadataError) {
      return NextResponse.json({ error: metadataError.message }, { status: metadataError.status ?? 400 })
    }
  }

  if (payload.bio !== undefined) {
    const trimmedBio = payload.bio.trim()
    updates.bio = trimmedBio.length > 0 ? trimmedBio : null
  }

  if (payload.avatarUrl !== undefined) {
    updates.avatarUrl = payload.avatarUrl
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: AUTH_ERROR_MESSAGES.profileNoChanges }, { status: 400 })
  }

  const updatedProfile = await prisma.profile.upsert({
    where: { id: user.id },
    update: {
      ...(updates.fullName !== undefined ? { fullName: updates.fullName } : {}),
      ...(updates.bio !== undefined ? { bio: updates.bio } : {}),
      ...(updates.avatarUrl !== undefined ? { avatarUrl: updates.avatarUrl } : {}),
      email: user.email ?? undefined,
    },
    create: {
      id: user.id,
      email: user.email ?? "",
      fullName: updates.fullName ?? metadataFullName ?? user.email ?? null,
      bio: updates.bio ?? null,
      avatarUrl: updates.avatarUrl ?? null,
      departmentLayout: "fullWidth",
      theme: "standard",
    },
    select: {
      id: true,
      email: true,
      fullName: true,
      bio: true,
      avatarUrl: true,
      lastSignIn: true,
      departmentLayout: true,
      theme: true,
      passwordHash: true,
    },
  })

  return NextResponse.json(
    {
      profile: {
        id: updatedProfile.id,
        email: updatedProfile.email,
        fullName: updatedProfile.fullName,
        bio: updatedProfile.bio,
        avatarUrl: updatedProfile.avatarUrl,
        lastSignIn: updatedProfile.lastSignIn,
        departmentLayout: updatedProfile.departmentLayout,
        theme: updatedProfile.theme,
        hasPassword: Boolean(updatedProfile.passwordHash),
      },
    },
    { status: 200 }
  )
}

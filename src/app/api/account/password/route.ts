import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import bcrypt from "bcrypt"

import { prisma } from "@/lib/prisma"
import { AUTH_ERROR_MESSAGES } from "@/constants/authErrors"
import { createClient } from "@/utils/supabase/server"
import { getSupabaseServiceRoleClient } from "@/utils/supabase/service-role"

const passwordSchema = z.object({
  password: z.string().min(6, "Password must be at least 6 characters."),
  oldPassword: z.string().optional(),
})

export async function PATCH(request: NextRequest) {
  const supabase = await createClient()
  const {
    data: { user },
    error: getUserError,
  } = await supabase.auth.getUser()

  if (getUserError || !user) {
    return NextResponse.json({ error: "You need to be signed in to update your password." }, { status: 401 })
  }

  let body: z.infer<typeof passwordSchema>
  try {
    const json = await request.json()
    const result = passwordSchema.safeParse(json)
    if (!result.success) {
      const message = result.error.issues[0]?.message ?? "Invalid password."
      return NextResponse.json({ error: message }, { status: 400 })
    }
    body = result.data
  } catch {
    return NextResponse.json({ error: AUTH_ERROR_MESSAGES.invalidJsonBody }, { status: 400 })
  }

  try {
    const existingProfile = await prisma.profile.findUnique({
      where: { id: user.id },
      select: { passwordHash: true },
    })
    const nextPassword = body.password.trim()
    if (nextPassword.length < 6) {
      return NextResponse.json(
        { error: "Password must be at least 6 characters." },
        { status: 400 }
      )
    }

    if (existingProfile?.passwordHash) {
      if (!body.oldPassword || body.oldPassword.trim().length === 0) {
        return NextResponse.json({ error: AUTH_ERROR_MESSAGES.oldPasswordRequired }, { status: 400 })
      }
      const matches = await bcrypt.compare(body.oldPassword, existingProfile.passwordHash)
      if (!matches) {
        return NextResponse.json({ error: AUTH_ERROR_MESSAGES.oldPasswordIncorrect }, { status: 400 })
      }
    }

    const adminClient = getSupabaseServiceRoleClient()
    const { error: updateError } = await adminClient.auth.admin.updateUserById(user.id, {
      password: nextPassword,
    })

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: updateError.status ?? 400 })
    }

    const passwordHash = await bcrypt.hash(nextPassword, 12)

    const fullNameMetadata =
      typeof user.user_metadata?.full_name === "string"
        ? user.user_metadata.full_name
        : undefined

    await prisma.profile.upsert({
      where: { id: user.id },
      update: {
        passwordHash,
        ...(user.email ? { email: user.email } : {}),
        ...(fullNameMetadata ? { fullName: fullNameMetadata } : {}),
      },
      create: {
        id: user.id,
        email: user.email ?? "",
        fullName: fullNameMetadata ?? user.email ?? null,
        passwordHash,
      },
    })

    const { error: refreshError } = await supabase.auth.refreshSession()
    if (refreshError) {
      console.warn("Failed to refresh session after password update", refreshError)
    }

    return NextResponse.json({ ok: true })
  } catch (error) {
    const message =
      error instanceof Error && error.message.length > 0
        ? error.message
        : "Unable to update password."
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

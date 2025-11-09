import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import bcrypt from "bcrypt"

import { prisma } from "@/lib/prisma"
import { AUTH_ERROR_MESSAGES } from "@/constants/authErrors"
import { createClient } from "@/utils/supabase/server"
import { getSupabaseServiceRoleClient } from "@/utils/supabase/service-role"

const signupSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  fullName: z.string().min(1).max(120),
})

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const supabaseAdmin = getSupabaseServiceRoleClient()

  let payload: z.output<typeof signupSchema>
  try {
    const json = await request.json()
    const parsed = signupSchema.safeParse(json)
    if (!parsed.success) {
      const fieldErrors = parsed.error.flatten().fieldErrors
      return NextResponse.json({ errors: fieldErrors }, { status: 400 })
    }
    payload = parsed.data
  } catch {
    return NextResponse.json({ error: AUTH_ERROR_MESSAGES.invalidJsonBody }, { status: 400 })
  }

  const { email, password, fullName } = payload
  const trimmedName = fullName.trim()
  const trimmedEmail = email.trim()
  const normalizedEmail = trimmedEmail.toLowerCase()

  try {
    const existingProfile = await prisma.profile.findFirst({
      where: {
        email: {
          equals: trimmedEmail,
          mode: "insensitive",
        },
      },
      select: { id: true, passwordHash: true },
    })

    if (existingProfile?.passwordHash) {
      return NextResponse.json(
        { error: AUTH_ERROR_MESSAGES.emailHasExistingPassword },
        { status: 409 }
      )
    }

    if (existingProfile && !existingProfile.passwordHash) {
      return NextResponse.json(
        { error: AUTH_ERROR_MESSAGES.emailRequiresSocialSignIn },
        { status: 409 }
      )
    }

    const hash = await bcrypt.hash(password, 12)

    const existingSupabaseUser = await prisma.users.findFirst({
      where: {
        OR: [{ email: trimmedEmail }, { email: normalizedEmail }],
      },
    })

    let authUser = null

    if (existingSupabaseUser) {
      const rawMetadata = existingSupabaseUser.raw_user_meta_data as unknown
      const existingMetadata =
        rawMetadata && typeof rawMetadata === "object" && !Array.isArray(rawMetadata)
          ? (rawMetadata as Record<string, unknown>)
          : {}

      const { data: updatedUser, error: updateError } =
        await supabaseAdmin.auth.admin.updateUserById(existingSupabaseUser.id, {
          password,
          email: trimmedEmail,
          email_confirm: true,
          user_metadata: {
            ...existingMetadata,
            full_name: trimmedName,
            display_name: trimmedName,
          },
        })

      if (updateError) {
        return NextResponse.json({ error: updateError.message }, { status: 400 })
      }

      authUser = updatedUser.user ?? {
        id: existingSupabaseUser.id,
        email: existingSupabaseUser.email ?? trimmedEmail,
      }
    } else {
      const { data: createdUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
        email: trimmedEmail,
        password,
        email_confirm: true,
        user_metadata: {
          full_name: trimmedName,
          display_name: trimmedName,
        },
      })

      if (createError) {
        const status = createError.status ?? 400
        return NextResponse.json({ error: createError.message }, { status })
      }

      if (!createdUser.user) {
        return NextResponse.json(
          { error: AUTH_ERROR_MESSAGES.unableToResolveUser },
          { status: 500 }
        )
      }

      authUser = createdUser.user
    }

    if (!authUser) {
      return NextResponse.json({ error: AUTH_ERROR_MESSAGES.unableToResolveUser }, { status: 500 })
    }

    await prisma.profile.upsert({
      where: { id: authUser.id },
      update: {
        email: trimmedEmail,
        fullName: trimmedName,
        passwordHash: hash,
      },
      create: {
        id: authUser.id,
        email: trimmedEmail,
        fullName: trimmedName,
        passwordHash: hash,
      },
    })

    const { data: sessionData, error: signInError } = await supabase.auth.signInWithPassword({
      email: trimmedEmail,
      password,
    })

    if (signInError) {
      return NextResponse.json({ error: signInError.message }, { status: signInError.status ?? 400 })
    }

    return NextResponse.json(
      {
        user: {
          id: authUser.id,
          email: authUser.email ?? trimmedEmail,
          emailConfirmed: true,
        },
        session: sessionData.session,
      },
      { status: 201 }
    )
  } catch (error) {
    const message =
      error instanceof Error && error.message ? error.message : AUTH_ERROR_MESSAGES.unableToCompleteSignup
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

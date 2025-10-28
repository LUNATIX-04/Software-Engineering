import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import bcrypt from "bcrypt"

import { prisma } from "@/lib/prisma"
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
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 })
  }

  const { email, password, fullName } = payload
  const trimmedName = fullName.trim()

  try {
    const hash = await bcrypt.hash(password, 12)

    const existingSupabaseUser = await prisma.users.findFirst({
      where: {
        OR: [{ email }, { email: email.toLowerCase() }],
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
        email: existingSupabaseUser.email ?? email,
      }
    } else {
      const { data: createdUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
        email,
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
        return NextResponse.json({ error: "Failed to create user." }, { status: 500 })
      }

      authUser = createdUser.user
    }

    if (!authUser) {
      return NextResponse.json({ error: "Unable to resolve user record." }, { status: 500 })
    }

    await prisma.profile.upsert({
      where: { id: authUser.id },
      update: {
        email,
        fullName: trimmedName,
        passwordHash: hash,
      },
      create: {
        id: authUser.id,
        email,
        fullName: trimmedName,
        passwordHash: hash,
      },
    })

    const { data: sessionData, error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (signInError) {
      return NextResponse.json({ error: signInError.message }, { status: signInError.status ?? 400 })
    }

    return NextResponse.json(
      {
        user: {
          id: authUser.id,
          email: authUser.email ?? email,
          emailConfirmed: true,
        },
        session: sessionData.session,
      },
      { status: 201 }
    )
  } catch (error) {
    const message =
      error instanceof Error && error.message ? error.message : "Unable to complete signup."
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

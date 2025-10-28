import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import bcrypt from "bcrypt"

import { prisma } from "@/lib/prisma"
import { createClient } from "@/utils/supabase/server"

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
})

export async function POST(request: NextRequest) {
  const supabase = await createClient()

  let payload: z.output<typeof loginSchema>
  try {
    const json = await request.json()
    const parsed = loginSchema.safeParse(json)
    if (!parsed.success) {
      const fieldErrors = parsed.error.flatten().fieldErrors
      return NextResponse.json({ errors: fieldErrors }, { status: 400 })
    }
    payload = parsed.data
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 })
  }

  const { email, password } = payload

  const profile = await prisma.profile.findUnique({
    where: { email },
    select: { id: true, passwordHash: true, fullName: true },
  })

  if (!profile?.passwordHash) {
    return NextResponse.json(
      { error: "No password is set for this account. Please use Google sign-in instead." },
      { status: 400 }
    )
  }

  const passwordMatches = await bcrypt.compare(password, profile.passwordHash)
  if (!passwordMatches) {
    return NextResponse.json({ error: "Incorrect email or password." }, { status: 401 })
  }

  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  })

  if (error) {
    const status = error.status ?? 401
    return NextResponse.json({ error: error.message }, { status })
  }

  const user = data.user

  if (user) {
    const fullName =
      typeof user.user_metadata?.full_name === "string"
        ? user.user_metadata.full_name
        : profile.fullName

    await prisma.profile.update({
      where: { id: user.id },
      data: {
        email: user.email ?? email,
        fullName: fullName?.trim() || profile.fullName,
        lastSignIn: new Date(),
      },
    })
  }

  return NextResponse.json(
    {
      user: user
        ? {
            id: user.id,
            email: user.email ?? email,
            fullName:
              (typeof user.user_metadata?.full_name === "string" &&
              user.user_metadata.full_name.trim().length > 0
                ? user.user_metadata.full_name.trim()
                : null),
          }
        : null,
      session: data.session,
    },
    { status: 200 }
  )
}

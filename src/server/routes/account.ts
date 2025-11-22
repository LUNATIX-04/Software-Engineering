import type { Elysia } from "elysia"

import bcrypt from "bcrypt"
import { createClient } from "../../utils/supabase/server"

function parseJsonBody(request: Request) {
  return request.json().catch(() => ({}))
}

function prepareUpdatedFullName(value: unknown) {
  if (value === null) return null
  if (typeof value !== "string") return null
  const trimmed = value.trim()
  return trimmed.length > 0 ? trimmed : null
}

function prepareUpdatedBio(value: unknown) {
  if (value === null) return null
  if (typeof value !== "string") return null
  const trimmed = value.trim()
  return trimmed.length > 0 ? trimmed : null
}

function prepareUpdatedAvatarUrl(value: unknown) {
  if (value === null) return null
  if (typeof value !== "string") return null
  const trimmed = value.trim()
  return trimmed.length > 0 ? trimmed : null
}

export function registerAccountRoutes(app: Elysia) {
  app.patch("/account/profile", async ({ request }) => {
    const supabase = await createClient()
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser()

    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 })
    }

    const payload = (await parseJsonBody(request)) as Record<string, unknown>
    const wantsFullName = Object.prototype.hasOwnProperty.call(payload, "fullName")
    const wantsBio = Object.prototype.hasOwnProperty.call(payload, "bio")
    const wantsAvatarUrl = Object.prototype.hasOwnProperty.call(payload, "avatarUrl")

    const updates: Record<string, string | null> = {}

    if (wantsFullName) {
      updates.full_name = prepareUpdatedFullName(payload.fullName)
    }
    if (wantsBio) {
      updates.bio = prepareUpdatedBio(payload.bio)
    }
    if (wantsAvatarUrl) {
      updates.avatar_url = prepareUpdatedAvatarUrl(payload.avatarUrl)
    }

    if (Object.keys(updates).length === 0) {
      return new Response(JSON.stringify({ error: "No updates provided" }), { status: 400 })
    }

    const { data, error } = await supabase
      .from("profiles")
      .upsert(
        { id: user.id, email: user.email ?? undefined, ...updates },
        { onConflict: "id", ignoreDuplicates: false }
      )
      .select("id, email, full_name, bio, avatar_url")
      .maybeSingle()

    if (error) {
      console.error("Failed to update profile", error)
      return new Response(JSON.stringify({ error: "Unable to update profile" }), { status: 500 })
    }

    if (!data) {
      return new Response(JSON.stringify({ error: "Profile not found" }), { status: 404 })
    }

    return new Response(
      JSON.stringify({
        profile: {
          id: data.id,
          email: data.email,
          fullName: data.full_name ?? null,
          bio: data.bio ?? null,
          avatarUrl: data.avatar_url ?? null,
        },
      })
    )
  })

  app.patch("/account/password", async ({ request }) => {
    const supabase = await createClient()
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser()

    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 })
    }

    const payload = (await parseJsonBody(request)) as Record<string, unknown>
    const password = typeof payload?.password === "string" ? payload.password.trim() : ""
    const oldPassword = typeof payload?.oldPassword === "string" ? payload.oldPassword : null

    if (!password) {
      return new Response(JSON.stringify({ error: "Password is required" }), { status: 400 })
    }

    if (oldPassword && user.email) {
      const { error: reauthError } = await supabase.auth.signInWithPassword({
        email: user.email,
        password: oldPassword,
      })
      if (reauthError) {
        return new Response(JSON.stringify({ error: "Current password is incorrect" }), { status: 400 })
      }
    }

    const { error: updateError } = await supabase.auth.updateUser({ password })

    if (updateError) {
      const message = updateError.message || "Unable to update password"
      return new Response(JSON.stringify({ error: message }), { status: 400 })
    }

    const hashedPassword = await bcrypt.hash(password, 12)
    const { error: profileError } = await supabase
      .from("profiles")
      .update({ password_hash: hashedPassword })
      .eq("id", user.id)

    if (profileError) {
      console.error("Unable to mark password as set", profileError)
      return new Response(
        JSON.stringify({ error: "Unable to record password status" }),
        { status: 500 }
      )
    }

    return new Response(JSON.stringify({ success: true }))
  })

  return app
}

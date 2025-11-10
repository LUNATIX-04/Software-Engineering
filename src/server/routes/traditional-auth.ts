import type { Elysia } from "elysia"

import { createClient } from "../../utils/supabase/server"

function parseJsonBody(request: Request) {
  return request.json().catch(() => ({}))
}

function ensureString(value: unknown): string {
  if (typeof value !== "string") {
    return ""
  }
  return value.trim()
}

const JSON_HEADERS = { "Content-Type": "application/json" }

function buildErrorResponse(message: string, status = 400) {
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: JSON_HEADERS,
  })
}

export function registerTraditionalAuthRoutes(app: Elysia) {
  app.post("/auth/traditional/login", async ({ request }) => {
    const supabase = await createClient()
    const payload = (await parseJsonBody(request)) as Record<string, unknown>
    const email = ensureString(payload.email)
    const password = ensureString(payload.password)

    if (!email || !password) {
      return buildErrorResponse("Email and password are required.")
    }

    const { data, error } = await supabase.auth.signInWithPassword({ email, password })

    if (error) {
      return buildErrorResponse(error.message || "Invalid credentials.", 401)
    }

    return new Response(JSON.stringify({ session: data.session ?? null }), {
      headers: JSON_HEADERS,
    })
  })

  app.post("/auth/traditional/signup", async ({ request }) => {
    const supabase = await createClient()
    const payload = (await parseJsonBody(request)) as Record<string, unknown>
    const email = ensureString(payload.email)
    const password = ensureString(payload.password)
    const fullName = ensureString(payload.fullName)

    if (!email || !password) {
      return buildErrorResponse("Email and password are required.")
    }

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: fullName ? { full_name: fullName } : undefined,
      },
    })

    if (error) {
      return buildErrorResponse(error.message)
    }

    const requiresEmailConfirmation = !Boolean(data.session)
    return new Response(
      JSON.stringify({
        session: data.session ?? null,
        requiresEmailConfirmation,
      }),
      { headers: JSON_HEADERS }
    )
  })

  app.post("/auth/traditional/logout", async () => {
    const supabase = await createClient()
    const { error } = await supabase.auth.signOut()

    if (error) {
      return buildErrorResponse(error.message || "Unable to sign out.")
    }

    return new Response(JSON.stringify({ success: true }), { headers: JSON_HEADERS })
  })

  return app
}

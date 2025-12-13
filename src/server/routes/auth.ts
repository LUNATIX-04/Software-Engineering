import type { Elysia } from "elysia"

import { createClient } from "../../utils/supabase/server"
import { prisma } from "../../lib/prisma"

type GoogleLinkPopupStatus = "success" | "mismatch" | "error"

export function registerAuthRoutes(app: Elysia) {
  app.get("/auth/callback", async ({ request }) => {
    const url = new URL(request.url)
    const code = url.searchParams.get("code")
    const next = url.searchParams.get("next")
    const popup = url.searchParams.get("popup")
    const origin = request.url.startsWith("http") ? new URL(request.url).origin : ""
    let popupStatus: GoogleLinkPopupStatus = "success"

    const safeNextPath = (() => {
      if (!next) return "/projects"
      if (next.startsWith("/") && !next.startsWith("//")) return next
      return "/projects"
    })()

    if (code) {
      const supabase = await createClient()
      const { error } = await supabase.auth.exchangeCodeForSession(code)
      if (error) {
        const errorUrl = new URL("/homepage", origin)
        errorUrl.searchParams.set("authError", "1")
        return new Response(null, {
          status: 302,
          headers: { Location: errorUrl.toString() },
        })
      }

      try {
        await ensureProfileRecord()
        if (popup === "1") {
          popupStatus = await validateGoogleLinkEmail()
        }
      } catch (profileError) {
        console.error("Failed to upsert profile after auth callback", profileError)
        if (popup === "1") {
          popupStatus = "error"
        }
      }
    }

    if (popup === "1") {
      const html = buildPopupResponse(origin, popupStatus)
      return new Response(html, {
        headers: {
          "Content-Type": "text/html; charset=utf-8",
          "Cache-Control": "no-store",
        },
      })
    }

    const redirectUrl = new URL(safeNextPath, origin)
    return new Response(null, {
      status: 302,
      headers: { Location: redirectUrl.toString() },
    })
  })

  return app
}

async function ensureProfileRecord() {
  const supabase = await createClient()
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser()

  if (error || !user) {
    return
  }

  const metadata = (user.user_metadata ?? {}) as Record<string, unknown>
  const normalizedEmail = pickFirstNonEmptyString(user.email, metadata.email) ?? ""
  const fullName =
    pickFirstNonEmptyString(metadata.full_name, metadata.name, metadata.display_name, user.email) ??
    null
  const avatarUrl = pickFirstNonEmptyString(metadata.avatar_url, metadata.picture)

  const lastSignInIso = user.last_sign_in_at
  const lastSignIn =
    typeof lastSignInIso === "string" && !Number.isNaN(Date.parse(lastSignInIso))
      ? new Date(lastSignInIso)
      : new Date()

  const existingProfile = await prisma.profile.findUnique({
    where: { id: user.id },
    select: { fullName: true, avatarUrl: true },
  })

  const updatePayload: {
    email: string
    lastSignIn: Date
    fullName?: string | null
    avatarUrl?: string | null
  } = {
    email: normalizedEmail,
    lastSignIn,
  }

  if (!existingProfile?.fullName && fullName) {
    updatePayload.fullName = fullName
  }
  if (!existingProfile?.avatarUrl && avatarUrl) {
    updatePayload.avatarUrl = avatarUrl
  }

  await prisma.profile.upsert({
    where: { id: user.id },
    update: updatePayload,
    create: {
      id: user.id,
      email: normalizedEmail,
      fullName,
      avatarUrl,
      lastSignIn,
    },
  })
}

async function validateGoogleLinkEmail(): Promise<GoogleLinkPopupStatus> {
  const supabase = await createClient()
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser()

  if (error || !user) {
    return "error"
  }

  const googleIdentity = user.identities?.find((identity) => identity.provider === "google")

  if (!googleIdentity) {
    return "error"
  }

  const identityData = (googleIdentity.identity_data ?? {}) as Record<string, unknown>
  const googleEmail =
    typeof identityData.email === "string" ? identityData.email.trim().toLowerCase() : null
  const profile = await prisma.profile.findUnique({
    where: { id: user.id },
    select: { email: true },
  })
  const profileEmail = profile?.email?.trim().toLowerCase() ?? null

  if (profileEmail && googleEmail && googleEmail !== profileEmail) {
    const { error: unlinkError } = await supabase.auth.unlinkIdentity(googleIdentity)
    if (unlinkError) {
      console.error("Failed to unlink mismatched Google identity", unlinkError)
    }
    return "mismatch"
  }

  return "success"
}

function pickFirstNonEmptyString(...candidates: Array<unknown>): string | null {
  for (const candidate of candidates) {
    if (typeof candidate === "string") {
      const trimmed = candidate.trim()
      if (trimmed.length > 0) {
        return trimmed
      }
    }
  }
  return null
}

function buildPopupResponse(origin: string, status: GoogleLinkPopupStatus) {
  const payload = JSON.stringify({ type: "google-link-complete", status })
  const safeOrigin = JSON.stringify(origin)
  return `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8" /></head><body><script>
    window.opener && window.opener.postMessage(${payload}, ${safeOrigin});
    window.close();
  </script></body></html>`
}

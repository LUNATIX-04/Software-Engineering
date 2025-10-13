import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { createServerClient } from "@supabase/ssr"

// Extend this list with any new segments that should require authentication.
const PROTECTED_PATH_PREFIXES = ["/Projects", "/account"]

function isProtectedPath(pathname: string) {
  return PROTECTED_PATH_PREFIXES.some((prefix) => pathname.startsWith(prefix))
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  const response = NextResponse.next()

  // Build a conservative CSP. In development we allow 'unsafe-eval' for Next tooling.
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ""
  let supabaseOrigin = ""
  try {
    supabaseOrigin = new URL(supabaseUrl).origin
  } catch {
    // ignore invalid URL
  }

  const isDev = process.env.NODE_ENV !== "production"
  const scriptDirectives = ["'self'", "'unsafe-inline'", isDev ? "'unsafe-eval'" : null]
    .filter(Boolean)
    .join(" ")
  const connectSources = [
    "'self'",
    supabaseOrigin || undefined,
    "https://*.supabase.co",
    "wss://*.supabase.co",
  ]
    .filter(Boolean)
    .join(" ")

  const csp = [
    "default-src 'self'",
    "base-uri 'self'",
    "frame-ancestors 'none'",
    "object-src 'none'",
    `script-src ${scriptDirectives}`,
    "style-src 'self' 'unsafe-inline'",
    `connect-src ${connectSources}`,
    "img-src 'self' data: blob: https:",
    "font-src 'self' data:",
    "form-action 'self'",
  ].join("; ")

  const applySecurityHeaders = (res: NextResponse) => {
    res.headers.set("Content-Security-Policy", csp)
    res.headers.set("Referrer-Policy", "strict-origin-when-cross-origin")
    res.headers.set("X-Content-Type-Options", "nosniff")
    res.headers.set("X-Frame-Options", "DENY")
    res.headers.set("Permissions-Policy", "camera=(), microphone=(), geolocation=()")
    // Only set HSTS on HTTPS
    if (request.nextUrl.protocol === "https:") {
      res.headers.set("Strict-Transport-Security", "max-age=63072000; includeSubDomains; preload")
    }
  }

  applySecurityHeaders(response)

  // If not a protected path, return the response with security headers only.
  if (!isProtectedPath(pathname)) {
    return response
  }

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach((cookie) => {
            response.cookies.set(cookie)
          })
        },
      },
    }
  )

  const {
    data: { session },
  } = await supabase.auth.getSession()

  if (!session) {
    const unauthorizedUrl = request.nextUrl.clone()
    unauthorizedUrl.pathname = "/401"
    const unauthorizedResponse = NextResponse.rewrite(unauthorizedUrl, { status: 401 })
    response.cookies.getAll().forEach((cookie) => {
      unauthorizedResponse.cookies.set(cookie)
    })
    applySecurityHeaders(unauthorizedResponse)
    return unauthorizedResponse
  }

  return response
}

export const config = {
  // Apply middleware to most routes except Next internals and common static assets.
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:png|jpg|jpeg|gif|svg|webp|ico|css|js|map)).*)",
  ],
}

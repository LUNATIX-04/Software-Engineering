import { NextRequest, NextResponse } from "next/server"

import { createClient } from "@/utils/supabase/server"

export async function GET(request: NextRequest) {
  const url = new URL(request.url)
  const code = url.searchParams.get("code")
  const next = url.searchParams.get("next")
  const origin = request.nextUrl.origin
  
  // Prevent open redirects by only allowing relative, same-origin paths
  const safeNextPath = (() => {
    if (!next) return "/Projects"
    // must start with single "/" and not be protocol-relative "//"
    if (next.startsWith("/") && !next.startsWith("//")) return next
    return "/Projects"
  })()

  if (code) {
    const supabase = await createClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (error) {
      console.error("Failed to exchange auth code for session", error)
      const errorUrl = new URL("/Homepage", origin)
      errorUrl.searchParams.set("authError", "1")
      return NextResponse.redirect(errorUrl)
    }
  }

  return NextResponse.redirect(new URL(safeNextPath, origin))
}

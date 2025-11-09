import { NextRequest, NextResponse } from "next/server"

const ALLOWED_PROTOCOLS = new Set(["http:", "https:"])

export async function GET(request: NextRequest) {
  const targetUrl = request.nextUrl.searchParams.get("url")
  if (!targetUrl) {
    return NextResponse.json({ error: "Missing url parameter." }, { status: 400 })
  }

  let parsed: URL
  try {
    parsed = new URL(targetUrl)
    if (!ALLOWED_PROTOCOLS.has(parsed.protocol)) {
      throw new Error("Invalid protocol")
    }
  } catch {
    return NextResponse.json({ error: "Invalid url parameter." }, { status: 400 })
  }

  try {
    const response = await fetch(parsed.toString(), {
      headers: { Accept: "image/avif,image/webp,image/*,*/*;q=0.8" },
      cache: "no-store",
    })

    if (!response.ok) {
      return NextResponse.json({ error: "Unable to fetch remote image." }, { status: 502 })
    }

    const contentType = response.headers.get("content-type") ?? "application/octet-stream"
    const buffer = await response.arrayBuffer()

    return new NextResponse(buffer, {
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "public, max-age=60",
      },
    })
  } catch (error) {
    console.error("Avatar proxy failed", error)
    return NextResponse.json({ error: "Failed to proxy image." }, { status: 500 })
  }
}

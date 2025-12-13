import type { NextRequest } from "next/server"

import { handleElysiaRequest } from "@/server/elysia"

async function handler(request: NextRequest) {
  const url = new URL(request.url)
  if (url.pathname.startsWith("/api")) {
    url.pathname = url.pathname.replace(/^\/api/, "") || "/"
  }

  const init: RequestInit & { duplex?: "half" } = {
    method: request.method,
    headers: request.headers,
    signal: request.signal,
  }
  if (request.method !== "GET" && request.method !== "HEAD") {
    init.body = request.body
    init.duplex = "half"
  }
  const forwarded = new Request(url.toString(), init)

  return handleElysiaRequest(forwarded)
}

// The router is intentionally explicit so that Next picks up every HTTP verb.
export async function GET(request: NextRequest) {
  return handler(request)
}
export async function POST(request: NextRequest) {
  return handler(request)
}
export async function PUT(request: NextRequest) {
  return handler(request)
}
export async function PATCH(request: NextRequest) {
  return handler(request)
}
export async function DELETE(request: NextRequest) {
  return handler(request)
}
export async function OPTIONS(request: NextRequest) {
  return handler(request)
}
export async function HEAD(request: NextRequest) {
  return handler(request)
}

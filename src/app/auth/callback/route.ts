import type { NextRequest } from "next/server"

import { handleElysiaRequest } from "@/server/elysia"

async function proxy(request: NextRequest) {
  const forwarded = new Request(request.url, {
    method: request.method,
    headers: request.headers,
    body: request.body,
    signal: request.signal,
  })

  return handleElysiaRequest(forwarded)
}

export async function GET(request: NextRequest) {
  return proxy(request)
}

export async function POST(request: NextRequest) {
  return proxy(request)
}

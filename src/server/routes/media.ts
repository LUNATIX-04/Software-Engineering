import type { Elysia } from "elysia"

import * as fs from "fs"
import * as path from "path"
import { createClient } from "../../utils/supabase/server"

export function registerMediaRoutes(app: Elysia) {
  app.get("/image", async ({ request }) => {
    const url = new URL(request.url)
    const imgPath = url.searchParams.get("path")
    if (!imgPath) {
      return new Response("Not found", { status: 404 })
    }
    const filePath = path.join(process.cwd(), "storage", imgPath)
    if (!fs.existsSync(filePath)) {
      return new Response("Not found", { status: 404 })
    }
    const buffer = fs.readFileSync(filePath)
    return new Response(buffer, {
      headers: {
        "Content-Type": "image/png",
      },
    })
  })

  app.get("/protected", async () => {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 })
    }

    return new Response(JSON.stringify({ message: "Authorized" }))
  })

  app.get("/account/avatar/proxy", async ({ request }) => {
    const url = new URL(request.url)
    const targetUrl = url.searchParams.get("url")
    if (!targetUrl) {
      return new Response(JSON.stringify({ error: "Missing url parameter." }), { status: 400 })
    }

    let parsed: URL
    try {
      parsed = new URL(targetUrl)
      if (!["http:", "https:"].includes(parsed.protocol)) {
        throw new Error("Invalid protocol")
      }
    } catch {
      return new Response(JSON.stringify({ error: "Invalid url parameter." }), { status: 400 })
    }

    try {
      const response = await fetch(parsed.toString(), {
        headers: { Accept: "image/avif,image/webp,image/*,*/*;q=0.8" },
        cache: "no-store",
      })

      if (!response.ok) {
        return new Response(JSON.stringify({ error: "Unable to fetch remote image." }), { status: 502 })
      }

      const contentType = response.headers.get("content-type") ?? "application/octet-stream"
      const buffer = await response.arrayBuffer()

      return new Response(buffer, {
        headers: {
          "Content-Type": contentType,
          "Cache-Control": "public, max-age=60",
        },
      })
    } catch (error) {
      console.error("Avatar proxy failed", error)
      return new Response(JSON.stringify({ error: "Failed to proxy image." }), { status: 500 })
    }
  })

  return app
}

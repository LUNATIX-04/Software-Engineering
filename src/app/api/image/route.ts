import path from "path"
import fs from "fs"
import type { NextRequest } from "next/server"

//prisma is safe
// ใช้ BLOB ซะะะะะะะะ
export async function GET(req: NextRequest) {
  const imgPath = req.nextUrl.searchParams.get("path")
  if (!imgPath) return new Response("Not found", { status: 404 })

  const filePath = path.join(process.cwd(), "storage", imgPath)
  if (!fs.existsSync(filePath)) return new Response("Not found", { status: 404 })

  const buffer = fs.readFileSync(filePath)
  return new Response(buffer, {
    headers: {
      "Content-Type": "image/png",
    },
  })
}

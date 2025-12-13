import type { NextConfig } from "next"

const remotePatterns: NonNullable<NextConfig["images"]>["remotePatterns"] = [
  {
    protocol: "https",
    hostname: "*.googleusercontent.com",
  },
  {
    protocol: "https",
    hostname: "avatars.githubusercontent.com",
  },
]

if (process.env.NEXT_PUBLIC_SUPABASE_URL) {
  try {
    const { hostname } = new URL(process.env.NEXT_PUBLIC_SUPABASE_URL)
    remotePatterns.push({
      protocol: "https",
      hostname,
    })
  } catch {
    // ignore invalid URL
  }
}

const nextConfig: NextConfig = {
  images: {
    remotePatterns,
  },
}

export default nextConfig

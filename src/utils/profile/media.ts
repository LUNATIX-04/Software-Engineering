"use client"

import { getSupabaseBrowserClient } from "@/utils/supabase/client"

const supabase = getSupabaseBrowserClient()
const PROFILE_AVATAR_BUCKET = "project-images"

export async function uploadProfileAvatar(file: File): Promise<string> {
  const {
    data,
    error: sessionError,
  } = await supabase.auth.getSession()
  if (sessionError) {
    throw sessionError
  }
  if (!data.session) {
    throw new Error("Authentication required")
  }

  const fileExt = extractFileExtension(file.name)
  const randomName = generateFileName(fileExt)
  const filePath = `profiles/${data.session.user.id}/${randomName}`

  const { error: uploadError } = await supabase.storage
    .from(PROFILE_AVATAR_BUCKET)
    .upload(filePath, file, {
      cacheControl: "3600",
      upsert: true,
    })

  if (uploadError) {
    throw uploadError
  }

  const {
    data: { publicUrl },
  } = supabase.storage.from(PROFILE_AVATAR_BUCKET).getPublicUrl(filePath)

  return publicUrl
}

function extractFileExtension(filename: string) {
  const parts = filename.split(".")
  if (parts.length > 1) {
    return parts.pop() ?? "dat"
  }
  return "dat"
}

function generateFileName(extension: string) {
  const id =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : Math.random().toString(36).slice(2)
  return `${id}.${extension}`
}

import { redirect } from "next/navigation"

import { createClient } from "@/utils/supabase/server"

export default async function Main() {
  const supabase = await createClient()
  const {
    data: { session },
  } = await supabase.auth.getSession()

  if (session) {
    redirect("/projects")
  }

  redirect("/homepage")
}

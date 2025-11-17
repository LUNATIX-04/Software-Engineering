"use client"

import { useRouter } from "next/navigation"

import { HomepageHero } from "./components/HomepageHero"
import { HomepageHeroImage } from "./components/HomepageHeroImage"

export default function Homepage() {
  const router = useRouter()

  return (
    <div className="max-w-[min(90rem,90vw)] w-full mx-auto px-[clamp(1.5rem,2vw,4rem)] py-[clamp(2rem,9vh,6rem)]">
      <div className="grid md:grid-cols-2 gap-[clamp(2rem,5vw,3rem)] items-center">
        <HomepageHero onGetStarted={() => router.push("/auth/traditional")} />
        <HomepageHeroImage />
      </div>
    </div>
  )
}

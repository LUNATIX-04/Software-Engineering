"use client"

import { useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { Search } from "lucide-react"

import { CreateProjectCard, ProjectCard } from "@/components/projects"
import { mockProjects } from "@/constants/projects"

export default function ProjectsPage() {
  const [searchQuery, setSearchQuery] = useState("")
  const router = useRouter()

  const filteredProjects = useMemo(() => {
    const normalizedQuery = searchQuery.trim().toLowerCase()
    if (!normalizedQuery) return mockProjects

    return mockProjects.filter((project) =>
      project.title.toLowerCase().includes(normalizedQuery)
    )
  }, [searchQuery])

  return (
    <div className="max-w-[min(90rem,90vw)] w-full mx-auto px-[clamp(1.5rem,2vw,4rem)] py-[clamp(2rem,5vh,4rem)]">
      <div className="flex justify-end mb-8">
        <div className="relative w-full max-w-md">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 size-5 text-primary/60" />
          <input
            type="text"
            placeholder="Search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-12 pr-4 py-3 rounded-full border-2 border-primary/40 bg-background text-foreground placeholder:text-primary/60 focus:outline-none focus:border-primary transition-colors"
          />
        </div>
      </div>

      <div className="space-y-6">
        {filteredProjects.map((project) => (
          <ProjectCard
            key={project.id}
            title={project.title}
            createdAt={project.createdAt}
            description={project.description}
            imageSrc={project.imageSrc}
            borderRadius={project.borderRadius}
            onEditProject={() => router.push(`/Projects/${project.id}/edit`)}
          />
        ))}
        <CreateProjectCard onClick={() => router.push("/Projects/create")} />
      </div>
    </div>
  )
}

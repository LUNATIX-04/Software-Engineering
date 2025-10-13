"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { Search } from "lucide-react"

import { CreateProjectCard, ProjectCard } from "@/components/projects"
import { deleteProject, fetchProjects, type ProjectRecord } from "@/utils/projects/api"

export default function ProjectsPage() {
  const [searchQuery, setSearchQuery] = useState("")
  const [projects, setProjects] = useState<ProjectRecord[]>([])
  const [projectsLoading, setProjectsLoading] = useState(true)
  const [projectsError, setProjectsError] = useState<string | null>(null)
  const [deleteError, setDeleteError] = useState<string | null>(null)
  const router = useRouter()

  const loadProjects = useCallback(async () => {
    setProjectsLoading(true)
    setProjectsError(null)
    try {
      const data = await fetchProjects()
      setProjects(data)
    } catch (error) {
      console.error("Failed to load projects", error)
      setProjectsError("Unable to load projects right now.")
    } finally {
      setProjectsLoading(false)
    }
  }, [])

  useEffect(() => {
    loadProjects()
  }, [loadProjects])

  const filteredProjects = useMemo(() => {
    const normalizedQuery = searchQuery.trim().toLowerCase()
    const source = projects ?? []
    if (!normalizedQuery) return source

    return source.filter((project) =>
      project.title.toLowerCase().includes(normalizedQuery)
    )
  }, [projects, searchQuery])

  const handleDelete = useCallback(
    async (projectId: string) => {
      setDeleteError(null)
      try {
        await deleteProject(projectId)
        setProjects((prev) => prev.filter((project) => project.id !== projectId))
      } catch (error) {
        console.error("Failed to delete project", error)
        const raw =
          error instanceof Error ? error.message : "Unable to delete this project right now."
        setDeleteError(
          raw === "Unauthorized" ? "Please sign in again before deleting projects." : raw
        )
      }
    },
    []
  )

  const formatCreatedAt = useCallback((isoString: string | null | undefined) => {
    if (!isoString) {
      return ""
    }
    try {
      return new Date(isoString).toLocaleDateString(undefined, {
        year: "numeric",
        month: "short",
        day: "numeric",
      })
    } catch {
      return isoString
    }
  }, [])

  return (
    <div className="max-w-[min(90rem,90vw)] w-full mx-auto px-[clamp(1.5rem,2vw,4rem)] pb-[clamp(2rem,5vh,4rem)]">
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
        {projectsError ? (
          <div className="rounded-2xl border border-destructive/50 bg-destructive/10 px-6 py-5 text-destructive">
            {projectsError}
          </div>
        ) : null}

        {projectsLoading ? (
          <div className="rounded-2xl border border-primary/20 bg-primary/5 px-6 py-5 text-sm text-primary">
            Loading projects…
          </div>
        ) : null}

        {deleteError ? (
          <div className="rounded-2xl border border-destructive/40 bg-destructive/10 px-6 py-4 text-sm text-destructive">
            {deleteError}
          </div>
        ) : null}

        {filteredProjects.map((project) => (
          <ProjectCard
            key={project.id}
            title={project.title}
            createdAt={formatCreatedAt(project.createdAt)}
            description={project.description ?? ""}
            imageSrc={project.imageUrl ?? undefined}
            onOpenProject={() => router.push(`/Projects/${project.id}`)}
            onEditProject={() => router.push(`/Projects/${project.id}/edit`)}
            onDelete={() => handleDelete(project.id)}
          />
        ))}
        <CreateProjectCard onClick={() => router.push("/Projects/create")} />
      </div>
    </div>
  )
}

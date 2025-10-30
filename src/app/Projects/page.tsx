"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { Search } from "lucide-react"

import { Button } from "@/components/ui/button"
import { CreateProjectCard, ProjectCard } from "@/components/projects"
import { deleteProject, fetchProjects, type ProjectRecord } from "@/utils/projects/api"

export default function ProjectsPage() {
  const [searchQuery, setSearchQuery] = useState("")
  const [projects, setProjects] = useState<ProjectRecord[]>([])
  const [projectsLoading, setProjectsLoading] = useState(true)
  const [projectsError, setProjectsError] = useState<string | null>(null)
  const [deleteError, setDeleteError] = useState<string | null>(null)
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(6)
  const [pageInput, setPageInput] = useState("1")
  const [pageInputFocused, setPageInputFocused] = useState(false)
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

  useEffect(() => {
    setPage(1)
  }, [searchQuery, projects])

  const totalPages = useMemo(() => {
    if (filteredProjects.length === 0) {
      return 1
    }
    return Math.max(1, Math.ceil(filteredProjects.length / pageSize))
  }, [filteredProjects.length, pageSize])

  useEffect(() => {
    if (page > totalPages) {
      setPage(totalPages)
    }
  }, [page, totalPages])

  useEffect(() => {
    setPageInput(String(page))
  }, [page])

  const paginatedProjects = useMemo(() => {
    const startIndex = (page - 1) * pageSize
    return filteredProjects.slice(startIndex, startIndex + pageSize)
  }, [filteredProjects, page, pageSize])

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

  const pageHint =
    totalPages <= 1 ? "Only page 1" : `Pages 1–${totalPages}`

  const commitPageInput = useCallback(() => {
    if (!pageInput.trim()) {
      setPageInput(String(page))
      return
    }
    const parsed = Number(pageInput)
    if (!Number.isFinite(parsed) || parsed < 1 || parsed > totalPages) {
      setPageInput(String(page))
      return
    }
    setPage(parsed)
  }, [page, pageInput, totalPages])

  return (
    <div className="max-w-[min(90rem,90vw)] w-full mx-auto px-[clamp(1.5rem,2vw,4rem)] pb-[clamp(2rem,5vh,4rem)]">
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative w-full max-w-xl sm:max-w-lg">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 size-5 text-primary/60" />
          <input
            type="text"
            placeholder="Search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-full border-2 border-primary/40 bg-background py-3 pl-12 pr-4 text-foreground placeholder:text-primary/60 transition-colors focus:border-primary focus:outline-none"
            data-cy="project-search-input"
          />
        </div>
        <div className="flex items-center justify-end gap-3 sm:w-auto">
          <label className="flex items-center gap-2 text-sm font-medium text-primary">
            Per page
            <select
              value={pageSize}
              onChange={(event) => {
                setPageSize(Number(event.target.value))
                setPage(1)
              }}
              className="rounded-full border-2 border-primary/40 bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none"
            >
              {[3, 6, 9, 12].map((sizeOption) => (
                <option key={sizeOption} value={sizeOption}>
                  {sizeOption}
                </option>
              ))}
            </select>
          </label>
          <Button
            type="button"
            variant="outline"
            onClick={() => router.push("/projects/create")}
            className="inline-flex h-12 items-center gap-2 rounded-full border-primary/40 px-6 text-base font-semibold text-primary transition hover:border-primary hover:bg-primary hover:text-primary-foreground"
          >
            <span className="inline-flex size-5 items-center justify-center rounded-full border border-current">
              +
            </span>
            Create Project
          </Button>
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

        {paginatedProjects.map((project, index) => (
          <ProjectCard
            key={project.id}
            title={project.title}
            createdAt={formatCreatedAt(project.createdAt)}
            description={project.description ?? ""}
            imageSrc={project.imageUrl ?? undefined}
            onOpenProject={() => router.push(`/projects/${project.id}`)}
            onEditProject={() => router.push(`/projects/${project.id}/edit`)}
            onDelete={() => handleDelete(project.id)}
            dataCyIndex={index}
          />
        ))}

        {!projectsLoading && filteredProjects.length === 0 ? (
          <CreateProjectCard onClick={() => router.push("/projects/create")} />
        ) : null}

        {!projectsLoading && filteredProjects.length > 0 ? (
          <div className="flex items-center justify-center gap-4 pt-4">
            <Button
              type="button"
              variant="ghost"
              onClick={() => setPage((prev) => Math.max(1, prev - 1))}
              disabled={page === 1}
              className="size-10 rounded-full border border-transparent text-lg text-primary hover:border-primary/40 hover:text-primary"
            >
              &#9664;
            </Button>
            <div className="relative flex flex-col items-center gap-1">
              {pageInputFocused ? (
                <span className="absolute -top- whitespace-nowrap rounded-full border border-primary/30 bg-white px-3 py-1 text-xs font-medium text-primary shadow-sm">
                  {pageHint}
                </span>
              ) : null}
              <span id="project-page-hint" className="sr-only">
                {pageHint}
              </span>
              <input
                id="project-page-input"
                type="text"
                inputMode="numeric"
                value={pageInput}
                onFocus={() => setPageInputFocused(true)}
                onBlur={() => {
                  setPageInputFocused(false)
                  commitPageInput()
                }}
                onChange={(event) => {
                  const numericValue = event.target.value.replace(/[^0-9]/g, "")
                  setPageInput(numericValue)
                }}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    commitPageInput()
                  }
                }}
                className="w-16 rounded-full border-2 border-primary/40 bg-white px-3 py-2 text-center text-base font-semibold text-primary shadow-sm focus:border-primary focus:outline-none"
                aria-describedby="project-page-hint"
              />
            </div>
            <Button
              type="button"
              variant="ghost"
              onClick={() => setPage((prev) => Math.min(totalPages, prev + 1))}
              disabled={page === totalPages}
              className="size-10 rounded-full border border-transparent text-lg text-primary hover:border-primary/40 hover:text-primary"
            >
              &#9654;
            </Button>
          </div>
        ) : null}
      </div>
    </div>
  )
}

"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { Check, PlusCircle, Search } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { CreateProjectCard, ProjectCard } from "@/components/projects"
import {
  deleteProject,
  fetchProjects,
  leaveProject,
  markProjectUsage,
  type ProjectRecord,
  type ProjectRole,
} from "@/utils/projects/api"
import { cn } from "@/lib/utils"

const BASE_PAGE_SIZE_OPTIONS = [3, 9, 18, 36, 64, 96, 136, 172]
export default function ProjectsPage() {
  const [searchQuery, setSearchQuery] = useState("")
  const [projects, setProjects] = useState<ProjectRecord[]>([])
  const [projectsLoading, setProjectsLoading] = useState(true)
  const [projectsError, setProjectsError] = useState<string | null>(null)
  const [deleteError, setDeleteError] = useState<string | null>(null)
  const [leaveError, setLeaveError] = useState<string | null>(null)
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(
    BASE_PAGE_SIZE_OPTIONS[1] ?? BASE_PAGE_SIZE_OPTIONS[0]
  )
  const [pageInput, setPageInput] = useState("1")
  const [pageHintVisible, setPageHintVisible] = useState(false)
  const [pageSizeMenuOpen, setPageSizeMenuOpen] = useState(false)
  const paginationControlsRef = useRef<HTMLDivElement | null>(null)
  const pageHintTimeoutRef = useRef<number | null>(null)
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

  const navigateToProject = useCallback(
    (projectId: string, destination: string) => {
      markProjectUsage(projectId).catch((error) => {
        if (process.env.NODE_ENV !== "production") {
          console.warn("Failed to record project usage", error)
        }
      })
      router.push(destination)
    },
    [router]
  )

  const filteredProjects = useMemo(() => {
    const normalizedQuery = searchQuery.trim().toLowerCase()
    const source = projects ?? []
    if (!normalizedQuery) return source

    return source.filter((project) =>
      project.title.toLowerCase().includes(normalizedQuery)
    )
  }, [projects, searchQuery])

  const pageSizeOptions = useMemo(() => {
    const totalProjects = filteredProjects.length || projects.length
    if (totalProjects === 0) {
      return BASE_PAGE_SIZE_OPTIONS.slice(0, 1)
    }
    const maxAllowed =
      BASE_PAGE_SIZE_OPTIONS.find((option) => option >= totalProjects) ??
      BASE_PAGE_SIZE_OPTIONS[BASE_PAGE_SIZE_OPTIONS.length - 1]
    return BASE_PAGE_SIZE_OPTIONS.filter((option) => option <= maxAllowed)
  }, [filteredProjects.length, projects.length])

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
    if (pageSizeOptions.length === 0) {
      return
    }
    const maxOption = pageSizeOptions[pageSizeOptions.length - 1]
    if (!pageSizeOptions.includes(pageSize)) {
      setPageSize(maxOption)
      setPage(1)
    }
  }, [pageSize, pageSizeOptions])

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

  const clearPageHintTimeout = useCallback(() => {
    if (pageHintTimeoutRef.current) {
      window.clearTimeout(pageHintTimeoutRef.current)
      pageHintTimeoutRef.current = null
    }
  }, [])

  const hidePageHint = useCallback(() => {
    clearPageHintTimeout()
    setPageHintVisible(false)
  }, [clearPageHintTimeout])

  const triggerPageHint = useCallback(() => {
    if (typeof window === "undefined") {
      return
    }
    setPageHintVisible(true)
    clearPageHintTimeout()
    pageHintTimeoutRef.current = window.setTimeout(() => {
      setPageHintVisible(false)
      pageHintTimeoutRef.current = null
    }, 2000)
  }, [clearPageHintTimeout])

  useEffect(() => {
    if (!pageHintVisible) {
      return
    }

    const handlePointerDown = (event: Event) => {
      if (!paginationControlsRef.current?.contains(event.target as Node)) {
        hidePageHint()
      } else {
        triggerPageHint()
      }
    }

    const handleFocusIn = (event: FocusEvent) => {
      if (!paginationControlsRef.current?.contains(event.target as Node)) {
        hidePageHint()
      } else {
        triggerPageHint()
      }
    }

    const pointerEventName =
      typeof window !== "undefined" && "PointerEvent" in window ? "pointerdown" : "mousedown"

    document.addEventListener(pointerEventName, handlePointerDown as EventListener)
    document.addEventListener("focusin", handleFocusIn)

    return () => {
      document.removeEventListener(pointerEventName, handlePointerDown as EventListener)
      document.removeEventListener("focusin", handleFocusIn)
    }
  }, [hidePageHint, pageHintVisible, triggerPageHint])

  useEffect(() => {
    return () => {
      clearPageHintTimeout()
    }
  }, [clearPageHintTimeout])

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
      return new Date(isoString).toLocaleDateString("en-US", {
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

  const containerMinHeight = "calc(100dvh - 100rem)"
  const cardListMaxHeight = "calc(100dvh - 18rem)"

  return (
    <div
      className="mx-auto flex w-full max-w-[min(92rem,92vw)] flex-1 flex-col gap-6 overflow-hidden px-[clamp(1.5rem,2vw,4rem)]"
      style={{ minHeight: containerMinHeight }}
    >
      <div className="flex flex-col gap-4 mt-10 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative ml-5 w-[clamp(20rem,30vw,40rem)] max-w-xl sm:max-w-lg">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 size-5 text-primary/60" />
          <input
            type="text"
            placeholder="Search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-white rounded-full border-2 border-primary/40 bg-background py-3 pl-12 pr-4 text-foreground placeholder:text-primary/60 transition-colors focus:border-primary focus:outline-none"
            data-cy="project-search-input"
          />
        </div>
        <div className="flex items-center justify-end gap-3 sm:w-auto">
          <div className="relative flex items-center gap-2 text-sm font-medium text-primary select-none">
            <span>Per page</span>
            <DropdownMenu onOpenChange={setPageSizeMenuOpen}>
              <DropdownMenuTrigger asChild>
                <Button
                  type="button"
                  variant="outline"
                  className={pageSizeMenuOpen?"inline-flex h-12 select-none items-center rounded-full border-2 border-primary bg-primary/10 px-4 text-sm font-semibold text-primary transition ":
                    "inline-flex h-12 select-none items-center rounded-full border-2 border-primary/40 bg-background px-4 text-sm font-semibold text-primary transition hover:border-primary hover:bg-primary/10 bg-white"}
                >
                  {pageSize}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                align="end"
                className="w-32 rounded-2xl border border-primary/30 bg-background/95 p-2 text-sm text-primary shadow-[0_16px_30px_rgba(39,36,66,0.15)]"
              >
                {pageSizeOptions.map((sizeOption) => {
                  const isActive = sizeOption === pageSize
                  return (
                    <DropdownMenuItem
                      key={sizeOption}
                      className={cn(
                        "flex items-center justify-between rounded-xl px-3 py-2 font-semibold transition hover:bg-primary/10 focus:bg-primary/10 focus:text-primary",
                        isActive && "bg-primary/10 text-primary"
                      )}
                      onSelect={() => {
                        if (isActive) {
                          return
                        }
                        setPageSize(sizeOption)
                        setPage(1)
                      }}
                    >
                      <span>{sizeOption}</span>
                      {isActive ? <Check className="size-4" /> : null}
                    </DropdownMenuItem>
                  )
                })}
              </DropdownMenuContent>
            </DropdownMenu>
            <div
              className={cn(
                "pointer-events-none absolute right-[-10rem] top-3/2 z-[500] rounded-2xl border border-primary/30 bg-white/95 px-4 py-2 text-xs font-semibold uppercase tracking-[0.3em] text-primary shadow-lg transition duration-200 ease-out",
                "max-w-[14rem] whitespace-normal break-words leading-tight -translate-y-1/2",
                pageSizeMenuOpen && filteredProjects.length > 0
                  ? "opacity-100 translate-y-[-40%]"
                  : "opacity-0 translate-y-[-50%]"
              )}
            >
              {filteredProjects.length > 0 ? `${filteredProjects.length} projects` : ""}
            </div>
          </div>
          <Button
            type="button"
            variant="outline"
            onClick={() => router.push("/projects/create")}
            className="inline-flex h-12 bg-white select-none items-center gap-2 rounded-full border-primary/40 px-6 text-base font-semibold text-primary transition hover:border-primary hover:bg-primary hover:text-primary-foreground"
          >
            <PlusCircle className="size-5" aria-hidden="true" />
            Create Project
          </Button>
        </div>
      </div>

      <div className="flex flex-1 min-h-0 flex-col">
        <div className="-mr-3 -mt-2 flex-1">
          <div
            className="projects-scroll [scrollbar-gutter:stable] flex h-full flex-col space-y-3 px-0.5 py-4"
            style={{ maxHeight: cardListMaxHeight }}
          >
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
            {leaveError ? (
              <div className="rounded-2xl border border-destructive/40 bg-destructive/10 px-6 py-4 text-sm text-destructive">
                {leaveError}
              </div>
            ) : null}

            {paginatedProjects.map((project, index) => {
              const role = project.membership?.role as ProjectRole
              const isOwner = role === "OWNER"
              const canChangeOwner = isOwner
              return (
                <ProjectCard
                  key={project.id}
                  title={project.title}
                  createdAt={formatCreatedAt(project.createdAt)}
                  description={project.description ?? ""}
                  imageSrc={project.imageUrl ?? undefined}
                  onOpenProject={() => navigateToProject(project.id, `/projects/${project.id}`)}
                  onEditProject={
                    isOwner
                      ? () => navigateToProject(project.id, `/projects/${project.id}/edit`)
                      : undefined
                  }
                  onDelete={isOwner ? () => handleDelete(project.id) : undefined}
                  onLeaveProject={async () => {
                    try {
                      setLeaveError(null)
                      await leaveProject(project.id)
                      setProjects((prev) => prev.filter((item) => item.id !== project.id))
                    } catch (error) {
                      const raw =
                        error instanceof Error ? error.message : "Unable to leave this project."
                      setLeaveError(raw)
                    }
                  }}
                  canEdit={isOwner}
                  canDelete={isOwner}
                  canChangeOwner={canChangeOwner}
                  canLeave
                  isOwnerCard={isOwner}
                  dataCyIndex={index}
                />
              )
            })}

            {!projectsLoading && filteredProjects.length === 0 ? (
              <CreateProjectCard onClick={() => router.push("/projects/create")} />
            ) : null}
          </div>
        </div>

        {!projectsLoading && filteredProjects.length > 0 ? (
          <div
            ref={paginationControlsRef}
            className="mt-auto mb-4 flex select-none items-center justify-center gap-4 pt-4"
            onFocus={triggerPageHint}
            onBlur={(event) => {
              const nextTarget = event.relatedTarget as HTMLElement | null
              if (!nextTarget || !paginationControlsRef.current?.contains(nextTarget)) {
                hidePageHint()
              }
            }}
          >
            <Button
              type="button"
              variant="ghost"
              onClick={() => {
                triggerPageHint()
                setPage((prev) => Math.max(1, prev - 1))
              }}
              disabled={page === 1}
              className="size-10 select-none rounded-full border border-transparent text-lg text-primary/70 transition-colors hover:border-transparent hover:!bg-transparent hover:text-primary focus:outline-none focus-visible:outline-none focus-visible:border-transparent focus-visible:ring-0 active:border-transparent active:bg-transparent"
            >
              &#9664;
            </Button>
            <div className="relative flex flex-col items-center gap-1">
              <span
                aria-hidden="true"
                className={cn(
                  "absolute -top-8 whitespace-nowrap rounded-full border border-primary/30 bg-white px-3 py-1 text-xs font-medium text-primary shadow-sm transition-all duration-200 ease-out",
                  pageHintVisible
                    ? "pointer-events-auto opacity-100 translate-y-0 scale-100"
                    : "pointer-events-none opacity-0 -translate-y-1 scale-95"
                )}
              >
                {pageHint}
              </span>
              <span id="project-page-hint" className="sr-only">
                {pageHint}
              </span>
              <input
                id="project-page-input"
                type="text"
                inputMode="numeric"
                value={pageInput}
                onFocus={triggerPageHint}
                onBlur={() => {
                  commitPageInput()
                  hidePageHint()
                }}
                onChange={(event) => {
                  const numericValue = event.target.value.replace(/[^0-9]/g, "")
                  setPageInput(numericValue)
                  triggerPageHint()
                }}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    commitPageInput()
                    triggerPageHint()
                  }
                }}
                className="w-16 select-text rounded-full border-2 border-primary/40 bg-white px-3 py-2 text-center text-base font-semibold text-primary shadow-sm focus:border-primary focus:outline-none"
                aria-describedby="project-page-hint"
              />
            </div>
            <Button
              type="button"
              variant="ghost"
              onClick={() => {
                triggerPageHint()
                setPage((prev) => Math.min(totalPages, prev + 1))
              }}
              disabled={page === totalPages}
              className="size-10 select-none rounded-full border border-transparent text-lg text-primary/70 transition-colors hover:border-transparent hover:!bg-transparent hover:text-primary focus:outline-none focus-visible:outline-none focus-visible:border-transparent focus-visible:ring-0 active:border-transparent active:bg-transparent"
            >
              &#9654;
            </Button>
          </div>
        ) : null}
      </div>
    </div>
  )
}

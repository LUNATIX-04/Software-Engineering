"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { Check, PlusCircle } from "lucide-react"

import { Button } from "@/components/ui/button"
import { ProgressBar } from "@/components/ui/progress-bar"
import { SearchField } from "@/components/ui/search-field"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { ProjectOwnerDialog } from "@/components/layout/AppShell/ProjectOwnerDialog"
import { CreateProjectCard, ProjectCard } from "@/components/projects"
import {
  deleteProject,
  fetchProjects,
  fetchProjectMembers,
  leaveProject,
  markProjectUsage,
  updateProjectOwners,
  type ProjectMemberDetail,
  type ProjectRecord,
  type ProjectRole,
} from "@/utils/projects/api"
import { useNotifications } from "@/components/notifications/Notification"
import { cn } from "@/lib/utils"
import { dispatchNavigationAbortEvent, useNavigationAbort } from "@/hooks/useNavigationAbort"
import { BASE_PAGE_SIZE_OPTIONS } from "@/constants/pagination"

const PROJECTS_PAGE_SIZE_KEY = "asap:projects-page-size"

const readStoredPageSize = (key: string) => {
  if (typeof window === "undefined") {
    return null
  }
  const raw = window.localStorage.getItem(key)
  const parsedLocal = raw ? Number.parseInt(raw, 10) : NaN
  if (Number.isFinite(parsedLocal) && BASE_PAGE_SIZE_OPTIONS.includes(parsedLocal)) {
    return parsedLocal
  }
  // Fallback to cookie if present
  const cookieMatch = document.cookie
    .split(";")
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${key}=`))
  const cookieValue = cookieMatch ? Number.parseInt(cookieMatch.split("=")[1] ?? "", 10) : NaN
  if (Number.isFinite(cookieValue) && BASE_PAGE_SIZE_OPTIONS.includes(cookieValue)) {
    return cookieValue
  }
  return null
}

const persistPageSize = (key: string, value: number) => {
  if (typeof window === "undefined") {
    return
  }
  try {
    window.localStorage.setItem(key, String(value))
    document.cookie = `${key}=${value}; path=/; max-age=${60 * 60 * 24 * 365}; SameSite=Lax`
  } catch (error) {
    if (process.env.NODE_ENV !== "production") {
      console.warn("Failed to persist page size", error)
    }
  }
}

type ProjectsPaginationControlsProps = {
  page: number
  totalPages: number
  pageInput: string
  setPageInput: (value: string) => void
  onPageChange: (value: number) => void
  pageHint: string
  onPageInputCommit: () => void
}

function ProjectsPaginationControls({
  page,
  totalPages,
  pageInput,
  setPageInput,
  onPageChange,
  pageHint,
  onPageInputCommit,
}: ProjectsPaginationControlsProps) {
  const controlsRef = useRef<HTMLDivElement | null>(null)
  const hintTimeoutRef = useRef<number | null>(null)
  const [pageHintVisible, setPageHintVisible] = useState(false)

  const clearPageHintTimeout = useCallback(() => {
    if (hintTimeoutRef.current) {
      window.clearTimeout(hintTimeoutRef.current)
      hintTimeoutRef.current = null
    }
  }, [])

  const hidePageHint = useCallback(() => {
    clearPageHintTimeout()
    setPageHintVisible(false)
  }, [clearPageHintTimeout])

  const triggerPageHint = useCallback(() => {
    setPageHintVisible(true)
    clearPageHintTimeout()
    hintTimeoutRef.current = window.setTimeout(() => {
      setPageHintVisible(false)
      hintTimeoutRef.current = null
    }, 2000)
  }, [clearPageHintTimeout])

  useEffect(() => {
    if (!pageHintVisible) {
      return
    }
    const pointerEventName =
      typeof window !== "undefined" && "PointerEvent" in window ? "pointerdown" : "mousedown"

    const handlePointerDown = (event: Event) => {
      if (!controlsRef.current?.contains(event.target as Node)) {
        hidePageHint()
      } else {
        triggerPageHint()
      }
    }

    const handleFocusIn = (event: FocusEvent) => {
      if (!controlsRef.current?.contains(event.target as Node)) {
        hidePageHint()
      } else {
        triggerPageHint()
      }
    }

    document.addEventListener(pointerEventName, handlePointerDown as EventListener)
    document.addEventListener("focusin", handleFocusIn)

    return () => {
      document.removeEventListener(pointerEventName, handlePointerDown as EventListener)
      document.removeEventListener("focusin", handleFocusIn)
    }
  }, [hidePageHint, pageHintVisible, triggerPageHint])

  const handlePrev = () => {
    triggerPageHint()
    onPageChange(Math.max(1, page - 1))
  }

  const handleNext = () => {
    triggerPageHint()
    onPageChange(Math.min(totalPages, page + 1))
  }

  return (
    <div
      ref={controlsRef}
      className="mt-auto mb-4 flex select-none items-center justify-center gap-4 pt-4 form-entry"
      onFocus={triggerPageHint}
      onBlur={(event) => {
        const nextTarget = event.relatedTarget as HTMLElement | null
        if (!nextTarget || !controlsRef.current?.contains(nextTarget)) {
          hidePageHint()
        }
      }}
    >
      <Button
        type="button"
        variant="ghost"
        data-cy="project-pagination-prev"
        onClick={handlePrev}
        disabled={page === 1}
        className={cn(
          "pagination-surface inline-flex size-10 select-none items-center justify-center rounded-full text-lg transition focus:outline-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30 active:scale-95",
          page === 1 && "cursor-not-allowed"
        )}
      >
        &#9664;
      </Button>
      <div className="relative flex flex-col items-center gap-1">
        <span
          aria-hidden="true"
          className={cn(
            "pagination-hint absolute -top-8 whitespace-nowrap rounded-full px-3 py-1 text-xs font-medium shadow-sm transition-all duration-200 ease-out",
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
          data-cy="project-pagination-input"
          type="text"
          inputMode="numeric"
          value={pageInput}
          onFocus={triggerPageHint}
          onBlur={() => {
            onPageInputCommit()
            hidePageHint()
          }}
          onChange={(event) => {
            const numericValue = event.target.value.replace(/[^0-9]/g, "")
            setPageInput(numericValue)
            triggerPageHint()
          }}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              onPageInputCommit()
              triggerPageHint()
            }
          }}
          className="pagination-input w-16 select-text rounded-full px-3 py-2 text-center text-base font-semibold shadow-sm focus:outline-none"
          aria-describedby="project-page-hint"
        />
      </div>
      <Button
        type="button"
        variant="ghost"
        data-cy="project-pagination-next"
        onClick={handleNext}
        disabled={page === totalPages}
        className={cn(
          "pagination-surface inline-flex size-10 select-none items-center justify-center rounded-full text-lg transition focus:outline-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30 active:scale-95",
          page === totalPages && "cursor-not-allowed"
        )}
      >
        &#9654;
      </Button>
    </div>
  )
}
export default function ProjectsPage() {
  const [searchQuery, setSearchQuery] = useState("")
  const [projects, setProjects] = useState<ProjectRecord[]>([])
  const [projectsLoading, setProjectsLoading] = useState(true)
  const [projectsError, setProjectsError] = useState<string | null>(null)
  const [deleteError, setDeleteError] = useState<string | null>(null)
  const [leaveError, setLeaveError] = useState<string | null>(null)
  const [page, setPage] = useState(1)
  const [pageDirection, setPageDirection] = useState<"left" | "right" | null>(null)
  const [pageSize, setPageSize] = useState<number>(() => {
    if (typeof window === "undefined") {
      return BASE_PAGE_SIZE_OPTIONS[0]
    }
    const stored = readStoredPageSize(PROJECTS_PAGE_SIZE_KEY)
    return stored ?? BASE_PAGE_SIZE_OPTIONS[0]
  })
  const [pageSizeHydrated, setPageSizeHydrated] = useState(() => typeof window !== "undefined")
  const [pageInput, setPageInput] = useState("1")
  const [pageSizeMenuOpen, setPageSizeMenuOpen] = useState(false)
  const router = useRouter()
  const navigationAbortRef = useNavigationAbort()
  const { notify } = useNotifications()
  const [ownerDialogProjectId, setOwnerDialogProjectId] = useState<string | null>(null)
  const [ownerCandidates, setOwnerCandidates] = useState<ProjectMemberDetail[]>([])
  const [ownerSelection, setOwnerSelection] = useState<Set<string>>(new Set())
  const [ownersLoading, setOwnersLoading] = useState(false)
  const [ownersSaving, setOwnersSaving] = useState(false)
  const [ownerError, setOwnerError] = useState<string | null>(null)
  const [ownerSearch, setOwnerSearch] = useState("")
  const [selectedOwnersSearch, setSelectedOwnersSearch] = useState("")

  const changePage = useCallback(
    (nextPage: number) => {
      setPageDirection(nextPage > page ? "right" : nextPage < page ? "left" : null)
      setPage(nextPage)
      setPageInput(String(nextPage))
    },
    [page]
  )

  const loadProjects = useCallback(async () => {
    if (navigationAbortRef.current) {
      return
    }
    setProjectsLoading(true)
    setProjectsError(null)
    try {
      const data = await fetchProjects()
      if (navigationAbortRef.current) {
        return
      }
      const sorted = [...data].sort((a, b) => {
        const parse = (value: string | undefined | null) => {
          if (!value) return 0
          const parsed = Date.parse(value)
          return Number.isFinite(parsed) ? parsed : 0
        }
        const scoreA = parse(a.lastActivity) || parse(a.updatedAt) || parse(a.createdAt)
        const scoreB = parse(b.lastActivity) || parse(b.updatedAt) || parse(b.createdAt)
        return scoreB - scoreA
      })
      setProjects(sorted)
    } catch (error) {
      console.error("Failed to load projects", error)
      if (!navigationAbortRef.current) {
        setProjectsError("Unable to load projects right now.")
      }
    } finally {
      if (!navigationAbortRef.current) {
        setProjectsLoading(false)
      }
    }
  }, [navigationAbortRef])

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
      dispatchNavigationAbortEvent()
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

  const pageSizeOptions = useMemo(() => BASE_PAGE_SIZE_OPTIONS, [])

  useEffect(() => {
    setPage(1)
    setPageDirection(null)
  }, [searchQuery, projects])

  useEffect(() => {
    setPageSizeHydrated(true)
  }, [])

  useEffect(() => {
    if (!pageSizeHydrated) {
      return
    }
    persistPageSize(PROJECTS_PAGE_SIZE_KEY, pageSize)
  }, [pageSize, pageSizeHydrated])

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
    if (!pageSizeOptions.includes(pageSize)) {
      const fallbackSize = BASE_PAGE_SIZE_OPTIONS[0]
      setPageSize(fallbackSize)
      changePage(1)
    }
  }, [changePage, pageSize, pageSizeOptions])

  useEffect(() => {
    if (page > totalPages) {
      setPageDirection(null)
      setPage(totalPages)
      setPageInput(String(totalPages))
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
    changePage(parsed)
  }, [changePage, page, pageInput, totalPages])

  const containerMinHeight = "calc(100dvh - 100rem)"
  const cardListMaxHeight = "calc(100dvh - 18rem)"
  const ownerDialogProject = useMemo(
    () => projects.find((project) => project.id === ownerDialogProjectId) ?? null,
    [ownerDialogProjectId, projects]
  )
  const ownerDialogOpen = Boolean(ownerDialogProjectId)
  const selectedOwners = useMemo(
    () => ownerCandidates.filter((candidate) => ownerSelection.has(candidate.id)),
    [ownerCandidates, ownerSelection]
  )
  const filteredOwnerCandidates = useMemo(() => {
    const term = ownerSearch.trim().toLowerCase()
    if (!term) return ownerCandidates
    return ownerCandidates.filter((candidate) =>
      candidate.username.toLowerCase().includes(term)
    )
  }, [ownerCandidates, ownerSearch])
  const filteredSelectedOwners = useMemo(() => {
    const term = selectedOwnersSearch.trim().toLowerCase()
    if (!term) return selectedOwners
    return selectedOwners.filter((owner) =>
      owner.username.toLowerCase().includes(term)
    )
  }, [selectedOwners, selectedOwnersSearch])

  const refreshOwnerCandidates = useCallback(
    async (projectId: string) => {
      setOwnersLoading(true)
      setOwnerError(null)
      try {
        const members = await fetchProjectMembers(projectId)
        setOwnerCandidates(members)
        const owners = new Set(
          members.filter((member) => member.role === "OWNER").map((member) => member.id)
        )
        setOwnerSelection(owners)
      } catch (error) {
        const raw =
          error instanceof Error ? error.message : "Unable to load project members."
        setOwnerError(raw)
      } finally {
        setOwnersLoading(false)
      }
    },
    []
  )

  useEffect(() => {
    if (ownerDialogProjectId) {
      setOwnerSearch("")
      setSelectedOwnersSearch("")
      refreshOwnerCandidates(ownerDialogProjectId)
    } else {
      setOwnerCandidates([])
      setOwnerSelection(new Set())
      setOwnerSearch("")
      setSelectedOwnersSearch("")
      setOwnerError(null)
    }
  }, [ownerDialogProjectId, refreshOwnerCandidates])

  const toggleOwnerSelection = useCallback((memberId: string) => {
    setOwnerSelection((prev) => {
      const next = new Set(prev)
      if (next.has(memberId)) {
        next.delete(memberId)
      } else {
        next.add(memberId)
      }
      return next
    })
  }, [])

  const handleSaveOwners = useCallback(async () => {
    if (!ownerDialogProjectId) return
    if (ownerSelection.size === 0) {
      setOwnerError("Select at least one owner.")
      return
    }
    setOwnersSaving(true)
    setOwnerError(null)
    try {
      await updateProjectOwners(ownerDialogProjectId, Array.from(ownerSelection))
      notify({
        title: "Owners updated",
        description: "Project ownership has been updated.",
        variant: "success",
      })
      setOwnerDialogProjectId(null)
      await loadProjects()
    } catch (error) {
      console.error("Failed to update owners", error)
      const raw =
        error instanceof Error ? error.message : "Unable to update project owners right now."
      setOwnerError(raw)
    } finally {
      setOwnersSaving(false)
    }
  }, [loadProjects, notify, ownerDialogProjectId, ownerSelection])

  const openOwnerDialog = useCallback((projectId: string) => {
    setOwnerDialogProjectId(projectId)
  }, [])

  return (
    <div
      className="mx-auto flex w-full max-w-[min(92rem,92vw)] flex-1 flex-col gap-6 overflow-hidden px-[clamp(1.5rem,2vw,4rem)] page-fade"
      style={{ minHeight: containerMinHeight }}
    >
      <div className="flex flex-col gap-4 mt-10 sm:flex-row sm:items-center sm:justify-between page-slide">
        <SearchField
          wrapperClassName="w-full max-w-md sm:mr-auto"
          placeholder="Search"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="bg-background transition-colors"
          data-cy="project-search-input"
        />
        <div className="flex items-center justify-end gap-3 sm:w-auto">
          <div className="relative flex items-center gap-2 text-sm font-medium text-primary select-none">
            <span>Per page</span>
            <DropdownMenu onOpenChange={setPageSizeMenuOpen}>
            <DropdownMenuTrigger asChild>
              <Button
                type="button"
                variant="outline"
                data-cy="project-page-size-button"
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
                        setPageSizeMenuOpen(false)
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
                "pagination-surface pointer-events-none absolute right-[-10rem] top-3/2 z-[500] rounded-2xl px-4 py-2 text-xs font-semibold uppercase tracking-[0.3em] shadow-lg transition duration-200 ease-out",
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
            data-cy="project-create-project-button"
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
            className={cn(
              "projects-scroll [scrollbar-gutter:stable] flex h-full flex-col space-y-3 px-0.5 py-4",
              pageDirection === "right"
                ? "page-slide-horizontal-right"
                : pageDirection === "left"
                  ? "page-slide-horizontal-left"
                  : "page-slide"
            )}
            style={{ maxHeight: cardListMaxHeight }}
          >
            {projectsError ? (
              <div className="rounded-2xl border border-destructive/50 bg-destructive/10 px-6 py-5 text-destructive">
                {projectsError}
              </div>
            ) : null}

            {projectsLoading ? (
              <div className="flex flex-col gap-3 rounded-2xl border border-primary/20 bg-primary/5 px-6 py-5 text-sm text-primary">
                <span className="font-semibold">Loading projects…</span>
                <ProgressBar />
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
                <div key={project.id} className="form-entry">
                  <ProjectCard
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
                    onChangeOwner={canChangeOwner ? () => openOwnerDialog(project.id) : undefined}
                    onLeaveProject={async () => {
                      try {
                        setLeaveError(null)
                        await leaveProject(project.id)
                        setProjects((prev) => prev.filter((item) => item.id !== project.id))
                      } catch (error) {
                        const raw =
                          error instanceof Error ? error.message : "Unable to leave this project."
                        if (raw.includes("Transfer ownership before leaving")) {
                          notify({
                            title: "Transfer ownership before leaving",
                            description: raw,
                            variant: "destructive",
                          })
                        } else {
                          setLeaveError(raw)
                        }
                      }
                    }}
                    canEdit={isOwner}
                    canDelete={isOwner}
                    canChangeOwner={canChangeOwner}
                    canLeave
                    isOwnerCard={isOwner}
                    dataCyIndex={index}
                  />
                </div>
              )
            })}

            {!projectsLoading && filteredProjects.length === 0 ? (
              <CreateProjectCard onClick={() => router.push("/projects/create")} />
            ) : null}
          </div>
        </div>

        {!projectsLoading && filteredProjects.length > 0 ? (
          <ProjectsPaginationControls
            page={page}
            totalPages={totalPages}
            pageInput={pageInput}
            setPageInput={setPageInput}
            onPageChange={changePage}
            pageHint={pageHint}
            onPageInputCommit={commitPageInput}
          />
        ) : null}
      </div>
      <ProjectOwnerDialog
        open={ownerDialogOpen}
        onOpenChange={(open) => {
          if (!open) {
            setOwnerDialogProjectId(null)
          }
        }}
        departmentLayout="fullWidth"
        ownerError={ownerError}
        ownerCandidates={ownerCandidates}
        ownerSelection={ownerSelection}
        selectedOwners={selectedOwners}
        filteredOwnerCandidates={filteredOwnerCandidates}
        filteredSelectedOwners={filteredSelectedOwners}
        ownerSearch={ownerSearch}
        selectedOwnersSearch={selectedOwnersSearch}
        ownersLoading={ownersLoading}
        ownersSaving={ownersSaving}
        toggleOwnerSelection={toggleOwnerSelection}
        handleSaveOwners={handleSaveOwners}
        setOwnerSearch={setOwnerSearch}
        setSelectedOwnersSearch={setSelectedOwnersSearch}
        mode="projects"
        subtitle={ownerDialogProject?.title ?? null}
      />
    </div>
  )
}

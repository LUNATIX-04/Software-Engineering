"use client"

import * as React from "react"
import { useCallback, useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"

import Image from "next/image"
import Link from "next/link"
import { ArrowLeft, CalendarDays, FolderKanban, PencilLine, RefreshCcw, Tags } from "lucide-react"

import { Button } from "@/components/ui/button"
import { usePreferences } from "@/contexts/preferences"
import { type ProjectRecord } from "@/utils/projects/api"
import { loadProjectRecord } from "@/utils/projects/prefetch"
import { PROJECT_REFRESH_EVENT } from "@/constants/events"

type ProjectInfoPageProps = {
  params: Promise<{
    projectId: string
  }>
}

type FormattedDates = {
  created: string
  updated: string
}


export default function ProjectInfoPage({ params }: ProjectInfoPageProps) {
  const { projectId } = React.use(params)
  const [project, setProject] = React.useState<ProjectRecord | null>(null)
  const [loading, setLoading] = React.useState(true)
  const [error, setError] = React.useState<string | null>(null)
  const [refreshToken, setRefreshToken] = useState(0)
  const router = useRouter()
  const { profile } = usePreferences()

  React.useEffect(() => {
    if (!projectId) {
      return
    }
    let active = true
    setLoading(true)
    setError(null)
    setProject(null)

    loadProjectRecord(projectId)
      .then((data) => {
        if (!active) return
        if (!data) {
          setError("Project not found.")
          setProject(null)
          return
        }
        setProject(data)
      })
      .catch((fetchError) => {
        console.error("Failed to fetch project info", fetchError)
        if (!active) return
        setError("Unable to load project information.")
      })
      .finally(() => {
        if (!active) return
        setLoading(false)
      })

    return () => {
      active = false
    }
  }, [projectId, refreshToken])

  useEffect(() => {
    if (typeof window === "undefined") {
      return
    }
    const handleProjectRefresh = (event: Event) => {
      const detail = (
        event as CustomEvent<{ projectId?: string | null; origin?: string }>
      ).detail
      if (detail?.projectId && detail.projectId !== projectId) {
        return
      }
      if (detail?.origin === "tasks-page") {
        return
      }
      setRefreshToken((token) => token + 1)
    }
    window.addEventListener(PROJECT_REFRESH_EVENT, handleProjectRefresh)
    return () => window.removeEventListener(PROJECT_REFRESH_EVENT, handleProjectRefresh)
  }, [projectId])

  const formattedDates = React.useMemo<FormattedDates>(() => {
    const defaultValue = { created: "—", updated: "—" }
    if (!project) {
      return defaultValue
    }
    const formatDate = (value: string) => {
      try {
        return new Date(value).toLocaleString("en-US", {
          dateStyle: "medium",
          timeStyle: "short",
        })
      } catch {
        return value
      }
    }
    return {
      created: formatDate(project.createdAt),
      updated: formatDate(project.updatedAt),
    }
  }, [project])

  const handleBackClick = useCallback(() => {
      if (typeof window !== "undefined" && window.history.length > 1) {
        router.back()
        return
      }
      router.push("/projects")
    }, [router])

  if (loading) {
    return (
      <div className="mx-auto flex w-full max-w-full flex-col gap-3 px-[clamp(1.5rem,3vw,3.5rem)] pb-16 pt-10 text-center text-foreground/70">
        Loading project information…
      </div>
    )
  }

  if (error) {
    return (
      <div className="mx-auto flex w-full max-w-full flex-col gap-3 px-[clamp(1.5rem,3vw,3.5rem)] pb-16 pt-10 text-center text-destructive">
        {error}
      </div>
    )
  }

  if (!project) {
    return null
    // The error branch above should already cover missing project scenarios.
  }

  const role = project.membership?.role ?? "MEMBER"
  const isOwner = role === "OWNER"
  const hasDescription = Boolean(project.description?.trim())
  const hasDepartments = project.departments.length > 0
  const departmentChipVariant = profile?.departmentLayout ?? "fullWidth"
  const departmentChipBaseClass =
    "inline-flex items-center rounded-full border-2 border-primary/30 bg-white text-primary font-semibold shadow-[0_2px_0_rgba(144,122,214,0.22)]"
  const departmentChipClass =
    departmentChipVariant === "compact"
      ? `${departmentChipBaseClass} px-5 py-2 text-sm`
      : `${departmentChipBaseClass} w-full min-w-0 justify-between px-6 py-3 text-base`
  const departmentsWrapperClass =
    departmentChipVariant === "compact"
      ? "mt-1 flex flex-wrap gap-3"
      : "mt-3 flex w-full flex-col gap-3"
  const projectDetailCopy = hasDescription
    ? project.description
    : "This project does not have a description yet. Add one from the edit page to help your team stay aligned."

  return (
    <div className="asap-scroll w-full min-h-[calc(100vh-6.5rem)] px-[clamp(3.25rem,4vw,3.25rem)] pt-3">
      <div className="flex w-full flex-col items-start gap-4 lg:flex-row lg:items-start lg:gap-6">
        <div className="sticky top-1 z-10 -ml-3 flex flex-shrink-0 items-start justify-start lg:-mt-0">
          <Button
            type="button"
            variant="ghost"
            data-cy="project-info-back-button"
            onClick={handleBackClick}
            className="inline-flex size-12 items-center justify-center rounded-full border border-primary/20 bg-white text-primary shadow-sm transition hover:border-primary/40 hover:bg-primary/10 focus-visible:border-primary focus-visible:ring-0"
            aria-label="Back to projects"
          >
            <ArrowLeft className="size-6" aria-hidden="true" />
          </Button>
        </div>

        <div className="mx-auto mt-10 flex w-full max-w-full flex-1 flex-col gap-8 px-[clamp(1.5rem,3vw,3.5rem)] pb-10">
          {isOwner ? (
            <div className="flex justify-end">
          <Button
            asChild
            type="button"
            variant="outline"
            data-cy="project-info-edit-button"
            className="inline-flex h-12 min-w-[11rem] items-center gap-2 rounded-full border-primary/40 bg-white px-8 text-base font-semibold text-primary transition hover:border-primary hover:bg-primary hover:text-primary-foreground"
          >
                <Link href={`/projects/${projectId}/edit`}>
                  <PencilLine className="size-5" />
                  Edit Project
                </Link>
              </Button>
            </div>
          ) : null}

          <section
            className="rounded-[2.75rem] border-2 border-primary/40 bg-white p-8 shadow-[0_6px_0_rgba(144,122,214,0.15)]"
            data-cy="project-info-summary-section"
          >
            <div className="flex flex-col gap-8 md:flex-row md:items-center">
              <div className="flex shrink-0 justify-center">
                {project.imageUrl ? (
                  <div className="relative h-40 w-40 overflow-hidden rounded-[2.5rem] border-2 border-primary/40 bg-primary/20 shadow-[0_6px_0_rgba(144,122,214,0.22)]">
                    <Image
                      src={project.imageUrl}
                      alt={`${project.title} cover`}
                      fill
                      className="object-cover"
                      data-cy="project-cover-image"
                    />
                  </div>
                ) : (
                <div className="flex h-40 w-40 items-center justify-center rounded-[2.5rem] border-2 border-dashed border-primary/40 bg-primary/10 text-primary shadow-[0_14px_0_rgba(144,122,214,0.22)]">
                  <FolderKanban className="size-14" />
                </div>
              )}
            </div>

            <div className="flex flex-1 flex-col gap-5">
              <div>
                <h1 className="text-3xl font-bold text-foreground md:text-4xl" data-cy="project-name">
                  {project.title}
                </h1>
              </div>

              <dl className="grid gap-5 text-sm text-foreground/80 sm:grid-cols-2">
                <div
                  className="flex items-start gap-3 rounded-2xl bg-background/70 px-4 py-3 shadow-[0_8px_0_rgba(144,122,214,0.15)]"
                  data-cy="project-info-created-card"
                >
                  <CalendarDays className="mt-0.5 size-5 text-primary" />
                  <div>
                    <dt className="text-sm font-semibold text-foreground">Created</dt>
                    <dd>{formattedDates.created}</dd>
                  </div>
                </div>
                <div
                  className="flex items-start gap-3 rounded-2xl bg-background/70 px-4 py-3 shadow-[0_8px_0_rgba(144,122,214,0.15)]"
                  data-cy="project-info-updated-card"
                >
                  <RefreshCcw className="mt-0.5 size-5 text-primary" />
                  <div>
                    <dt className="text-sm font-semibold text-foreground">Last Updated</dt>
                    <dd>{formattedDates.updated}</dd>
                  </div>
                </div>
                <div
                  className="flex items-start gap-3 rounded-2xl bg-background/70 px-4 py-3 shadow-[0_8px_0_rgba(144,122,214,0.15)]"
                  data-cy="project-info-departments-card"
                >
                  <Tags className="mt-0.5 size-5 text-primary" />
                  <div>
                    <dt className="text-sm font-semibold text-foreground">Departments</dt>
                    <dd data-cy="project-department">
                      {project.departments.length > 0 ? project.departments.length : "No departments yet"}
                    </dd>
                  </div>
                </div>
                <div
                  className="flex items-start gap-3 rounded-2xl bg-background/70 px-4 py-3 shadow-[0_8px_0_rgba(144,122,214,0.15)]"
                  data-cy="project-info-id-card"
                >
                  <FolderKanban className="mt-0.5 size-5 text-primary" />
                  <div>
                    <dt className="text-sm font-semibold text-foreground">Project ID</dt>
                    <dd className="font-mono text-xs text-foreground/70">{project.id}</dd>
                  </div>
                </div>
              </dl>
            </div>
          </div>
          </section>

          <section
            className="rounded-[2.75rem] border-2 border-primary/30 bg-primary/10 px-8 py-6 shadow-[0_6px_0_rgba(144,122,214,0.1)]"
            data-cy="project-info-detail-section"
          >
            <header className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-xl font-semibold text-foreground">Project Detail</h2>
                <p className="mt-1 text-x text-foreground/70" data-cy="project-description">
                  {projectDetailCopy}
                </p>
              </div>
            </header>

            <div className="mt-6 flex flex-col gap-6">
              <div>
                <h2 className="text-xl font-semibold text-foreground">
                  Departments
                </h2>
                  {hasDepartments ? (
                    <div className={departmentsWrapperClass} data-cy="project-info-department-list">
                    {project.departments.map((department) => (
                      <span
                        key={department}
                        className={departmentChipClass}
                      >
                        {department}
                      </span>
                    ))}
                  </div>
                ) : (
                  <p className="mt-3 text-sm text-foreground/60">
                    No departments assigned yet. You can add them from the Edit Project page.
                  </p>
                )}
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  )
}


/*
    <div className="flex flex-1 flex-col pb-16 pt-2">
      <div className="px-[clamp(1.5rem,1vw,3rem)]">
        <Link
          href="/projects"
          className="inline-flex size-12 items-center justify-center rounded-full border border-primary/20 bg-white text-primary shadow-sm transition hover:border-primary/40 hover:bg-primary/10 focus-visible:border-primary focus-visible:ring-0"
          aria-label="Go back to projects"
        >
          <ArrowLeft className="size-5" />
        </Link>
      </div>

      <div className="mx-auto -mt-8 flex w-full max-w-full flex-1 flex-col gap-8 px-[clamp(1.5rem,3vw,3.5rem)] pb-20">
        <div className="flex justify-end">
          <Button
            asChild
            type="button"
            variant="outline"
            className="inline-flex h-12 min-w-[11rem] items-center gap-2 rounded-full border-primary/40 bg-white px-8 text-base font-semibold text-primary shadow-[0_6px_0_rgba(144,122,214,0.2)] transition hover:border-primary hover:bg-primary hover:text-primary-foreground"
          >
            <Link href={`/projects/${projectId}/edit`}>
              <PencilLine className="size-5" />
              Edit Project
            </Link>
          </Button>
        </div>

        <section
          className="rounded-[2.75rem] border-2 border-primary/40 bg-white p-8 shadow-[0_18px_0_rgba(144,122,214,0.15)]"
          data-cy="project-info-summary-section"
        >
            <div className="flex flex-col gap-8 md:flex-row md:items-center">
              <div className="flex shrink-0 justify-center">
                {project.imageUrl ? (
                  <div className="relative h-40 w-40 overflow-hidden rounded-[2.5rem] border-2 border-primary/40 bg-primary/20 shadow-[0_14px_0_rgba(144,122,214,0.22)]">
                    <Image
                      src={project.imageUrl}
                      alt={`${project.title} cover`}
                      fill
                      className="object-cover"
                      data-cy="project-cover-image"
                    />
                  </div>
                ) : (
              <div className="flex h-40 w-40 items-center justify-center rounded-[2.5rem] border-2 border-dashed border-primary/40 bg-primary/10 text-primary shadow-[0_14px_0_rgba(144,122,214,0.22)]">
                <FolderKanban className="size-14" />
              </div>
            )}
          </div>

          <div className="flex flex-1 flex-col gap-5">
            <div>
              <h1 className="text-3xl font-bold text-foreground md:text-4xl" data-cy="project-name">
                {project.title}
              </h1>
            </div>

            <dl className="grid gap-5 text-sm text-foreground/80 sm:grid-cols-2">
              <div
                className="flex items-start gap-3 rounded-2xl bg-background/70 px-4 py-3 shadow-[0_8px_0_rgba(144,122,214,0.15)]"
                data-cy="project-info-created-card"
              >
                <CalendarDays className="mt-0.5 size-5 text-primary" />
                <div>
                  <dt className="text-sm font-semibold text-foreground">Created</dt>
                  <dd>{formattedDates.created}</dd>
                </div>
              </div>
              <div
                className="flex items-start gap-3 rounded-2xl bg-background/70 px-4 py-3 shadow-[0_8px_0_rgba(144,122,214,0.15)]"
                data-cy="project-info-updated-card"
              >
                <RefreshCcw className="mt-0.5 size-5 text-primary" />
                <div>
                  <dt className="text-sm font-semibold text-foreground">Last updated</dt>
                  <dd>{formattedDates.updated}</dd>
                </div>
              </div>
              <div
                className="flex items-start gap-3 rounded-2xl bg-background/70 px-4 py-3 shadow-[0_8px_0_rgba(144,122,214,0.15)]"
                data-cy="project-info-departments-card"
              >
                <Tags className="mt-0.5 size-5 text-primary" />
                <div>
                  <dt className="text-sm font-semibold text-foreground">Departments</dt>
                  <dd data-cy="project-department">
                    {project.departments.length > 0 ? project.departments.length : "No departments yet"}
                  </dd>
                </div>
              </div>
              <div
                className="flex items-start gap-3 rounded-2xl bg-background/70 px-4 py-3 shadow-[0_8px_0_rgba(144,122,214,0.15)]"
                data-cy="project-info-id-card"
              >
                <FolderKanban className="mt-0.5 size-5 text-primary" />
                <div>
                  <dt className="text-sm font-semibold text-foreground">Project ID</dt>
                  <dd className="font-mono text-xs text-foreground/70">{project.id}</dd>
                </div>
              </div>
            </dl>
          </div>
        </div>
        </section>

        <section
          className="mt-6 rounded-[2.75rem] border-2 border-primary/30 bg-primary/10 px-8 py-6 shadow-[0_14px_0_rgba(144,122,214,0.1)]"
          data-cy="project-info-detail-section"
        >
          <header className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-xl font-semibold text-foreground">Project Detail</h2>
              <p className="text-sm text-foreground/70" data-cy="project-description">
                {projectDetailCopy}
              </p>
            </div>
          </header>

          <div className="mt-6 flex flex-col gap-6">
            <div>
              <h3 className="text-sm font-semibold uppercase tracking-wide text-foreground/70">
                Departments
              </h3>
              {hasDepartments ? (
                <div className={departmentsWrapperClass} data-cy="project-info-department-list">
                  {project.departments.map((department) => (
                    <span key={department} className={departmentChipClass}>
                      {department}
                    </span>
                  ))}
                </div>
              ) : (
                <p className="mt-3 text-sm text-foreground/60">
                  No departments assigned yet. You can add them from the Edit Project page.
                </p>
              )}
            </div>
          </div>
        </section>
      </div>
    </div>


*/

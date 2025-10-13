"use client"

import * as React from "react"

import Image from "next/image"
import { CalendarDays, FolderKanban, RefreshCcw, Tags } from "lucide-react"

import { fetchProjectById, type ProjectRecord } from "@/utils/projects/api"

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

  React.useEffect(() => {
    let active = true
    setLoading(true)
    setError(null)

    fetchProjectById(projectId)
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
  }, [projectId])

  const formattedDates = React.useMemo<FormattedDates>(() => {
    const defaultValue = { created: "—", updated: "—" }
    if (!project) {
      return defaultValue
    }
    const formatDate = (value: string) => {
      try {
        return new Date(value).toLocaleString(undefined, {
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

  if (loading) {
    return (
      <div className="mx-auto flex w-full max-w-4xl flex-col gap-3 px-[clamp(1.5rem,3vw,3.5rem)] pb-16 pt-10 text-center text-foreground/70">
        Loading project information…
      </div>
    )
  }

  if (error) {
    return (
      <div className="mx-auto flex w-full max-w-4xl flex-col gap-3 px-[clamp(1.5rem,3vw,3.5rem)] pb-16 pt-10 text-center text-destructive">
        {error}
      </div>
    )
  }

  if (!project) {
    return null
    // The error branch above should already cover missing project scenarios.
  }

  const hasDescription = Boolean(project.description?.trim())
  const hasDepartments = project.departments.length > 0

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-8 px-[clamp(1.5rem,3vw,3.5rem)] pb-20 pt-10">
      <section className="rounded-[2.75rem] border-2 border-primary/40 bg-primary/10 p-8 shadow-[0_18px_0_rgba(144,122,214,0.15)]">
        <div className="flex flex-col gap-8 md:flex-row md:items-center">
          <div className="flex shrink-0 justify-center">
            {project.imageUrl ? (
              <div className="relative h-40 w-40 overflow-hidden rounded-[2.5rem] border-2 border-primary/40 bg-primary/20 shadow-[0_14px_0_rgba(144,122,214,0.22)]">
                <Image
                  src={project.imageUrl}
                  alt={`${project.title} cover`}
                  fill
                  className="object-cover"
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
              <h1 className="text-3xl font-bold text-foreground md:text-4xl">{project.title}</h1>
              <p className="mt-3 text-base text-foreground/80">
                {hasDescription
                  ? project.description
                  : "This project does not have a description yet. Add one from the edit page to help your team stay aligned."}
              </p>
            </div>

            <dl className="grid gap-5 text-sm text-foreground/80 sm:grid-cols-2">
              <div className="flex items-start gap-3 rounded-2xl bg-background/70 px-4 py-3 shadow-[0_8px_0_rgba(144,122,214,0.15)]">
                <CalendarDays className="mt-0.5 size-5 text-primary" />
                <div>
                  <dt className="text-sm font-semibold text-foreground">Created</dt>
                  <dd>{formattedDates.created}</dd>
                </div>
              </div>
              <div className="flex items-start gap-3 rounded-2xl bg-background/70 px-4 py-3 shadow-[0_8px_0_rgba(144,122,214,0.15)]">
                <RefreshCcw className="mt-0.5 size-5 text-primary" />
                <div>
                  <dt className="text-sm font-semibold text-foreground">Last updated</dt>
                  <dd>{formattedDates.updated}</dd>
                </div>
              </div>
              <div className="flex items-start gap-3 rounded-2xl bg-background/70 px-4 py-3 shadow-[0_8px_0_rgba(144,122,214,0.15)]">
                <Tags className="mt-0.5 size-5 text-primary" />
                <div>
                  <dt className="text-sm font-semibold text-foreground">Departments</dt>
                  <dd>{project.departments.length > 0 ? project.departments.length : "No departments yet"}</dd>
                </div>
              </div>
              <div className="flex items-start gap-3 rounded-2xl bg-background/70 px-4 py-3 shadow-[0_8px_0_rgba(144,122,214,0.15)]">
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

      <section className="rounded-[2.75rem] border-2 border-primary/30 bg-background px-8 py-6 shadow-[0_14px_0_rgba(144,122,214,0.1)]">
        <header className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-xl font-semibold text-foreground">Project Overview</h2>
            <p className="text-sm text-foreground/70">
              Snapshot of departments and project metadata for quick reference.
            </p>
          </div>
        </header>

        <div className="mt-6 flex flex-col gap-6">
          <div>
            <h3 className="text-sm font-semibold uppercase tracking-wide text-foreground/70">
              Departments
            </h3>
            {hasDepartments ? (
              <div className="mt-4 flex flex-wrap gap-3">
                {project.departments.map((department) => (
                  <span
                    key={department}
                    className="rounded-full border-2 border-primary/40 bg-primary/10 px-5 py-2 text-sm font-semibold text-primary shadow-[0_6px_0_rgba(144,122,214,0.2)]"
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

          <div>
            <h3 className="text-sm font-semibold uppercase tracking-wide text-foreground/70">
              Notes
            </h3>
            <p className="mt-3 rounded-2xl border border-primary/20 bg-primary/5 px-5 py-4 text-sm text-foreground/75 shadow-[0_6px_0_rgba(144,122,214,0.15)]">
              Keep your project team aligned by maintaining updated descriptions and department
              ownership. Use the tabs above to manage members, tasks, and calendars connected to
              this project.
            </p>
          </div>
        </div>
      </section>
    </div>
  )
}

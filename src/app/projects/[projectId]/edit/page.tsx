"use client"

import * as React from "react"
import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { useRouter } from "next/navigation"

import { ProgressBar } from "@/components/ui/progress-bar"
import { ProjectForm } from "@/components/projects/ProjectForm"
import type { ProjectFormValues } from "@/components/projects/ProjectForm/types"
import { usePreferences } from "@/contexts/preferences"
import { type ProjectRecord, updateProject } from "@/utils/projects/api"
import { loadProjectRecord } from "@/utils/projects/prefetch"
import { uploadProjectImage } from "@/utils/projects/media"
import { PROJECT_REFRESH_EVENT } from "@/constants/events"
import BackButton from "@/components/navigation/BackButton"
import {
  fetchProjectDepartments,
  createProjectDepartment,
  updateProjectDepartment,
} from "@/utils/projects/departments"
import { getContrastingTextColor, generatePastelColor, sanitizeHexColor } from "@/utils/colors"
import { useNotifications } from "@/components/notifications/Notification"

type EditProjectPageProps = {
  params: Promise<{
    projectId: string
  }>
}

export default function EditProjectPage({ params }: EditProjectPageProps) {
  const { projectId } = React.use(params)
  const router = useRouter()
  const { notify } = useNotifications()
  const { profile } = usePreferences()
  const preferredDepartmentLayout = profile?.departmentLayout ?? "fullWidth"
  const [project, setProject] = useState<ProjectRecord | null>(null)
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [departmentColors, setDepartmentColors] = useState<
    Record<string, { color: string; textColor: string }>
  >({})
  const [departmentColorsLoading, setDepartmentColorsLoading] = useState(true)
  const redirectedRef = useRef(false)

  const handleProjectUnavailable = useCallback(
    (message: string) => {
      if (redirectedRef.current) {
        return
      }
      redirectedRef.current = true
      notify({
        title: "Project unavailable",
        description: message,
        variant: "destructive",
      })
      router.replace("/projects")
    },
    [notify, router]
  )

  const surfaceSubmitError = useCallback(
    (message: string) => {
      setSubmitError(message)
      notify({
        title: "Update failed",
        description: message,
        variant: "destructive",
      })
    },
    [notify]
  )

  useEffect(() => {
    if (!projectId || redirectedRef.current) {
      return
    }
    let active = true
    setLoading(true)
    setLoadError(null)


    loadProjectRecord(projectId)
      .then((data) => {
        if (!active) return
        if (!data) {
          setProject(null)
          handleProjectUnavailable("This project may have been removed or you lost access.")
          return
        }
        setProject(data)
      })
      .catch((error) => {
        console.error("Failed to fetch project", error)
        if (!active) return
        setLoadError("Unable to load project information.")
        notify({
          title: "Failed to load project",
          description: "Unable to load project information right now.",
          variant: "destructive",
        })
      })
      .finally(() => {
        if (!active) return
        setLoading(false)
      })

    return () => {
      active = false
    }
  }, [handleProjectUnavailable, notify, projectId])

  useEffect(() => {
    if (!projectId || redirectedRef.current) {
      return
    }
    let active = true
    setDepartmentColorsLoading(true)
    fetchProjectDepartments(projectId)
      .then((departments) => {
        if (!active) return
        const mapped = departments.reduce<Record<string, { color: string; textColor: string }>>(
          (acc, dept) => {
            acc[dept.name] = { color: dept.color, textColor: dept.textColor }
            return acc
          },
          {}
        )
        setDepartmentColors(mapped)
      })
      .catch((error) => {
        console.error("Failed to load project departments", error)
      })
      .finally(() => {
        if (active) {
          setDepartmentColorsLoading(false)
        }
      })
    return () => {
      active = false
    }
  }, [projectId])

  const initialValues = useMemo(() => {
    if (!project) {
      return undefined
    }
    return {
      title: project.title,
      detail: project.description ?? "",
      departments: project.departments ?? [],
      imageUrl: project.imageUrl,
      departmentColors,
    }
  }, [departmentColors, project])

  const handleSubmit = useCallback(
    async (values: ProjectFormValues) => {
      setSubmitError(null)
      setSubmitting(true)
      try {
        const title = values.title.trim()
        if (!title) {
          surfaceSubmitError("Project title is required.")
          setSubmitting(false)
          return
        }

        const departments = Array.from(
          new Set(values.departments.map((dept) => dept.trim()).filter(Boolean))
        )

        let imageUrl = project?.imageUrl ?? null

        if (values.imageFile) {
          try {
            imageUrl = await uploadProjectImage(values.imageFile)
          } catch (error) {
            console.error("Failed to upload project image", error)
            surfaceSubmitError("Unable to upload project image. Please try again.")
            setSubmitting(false)
            return
          }
        }

        await updateProject(projectId, {
          title,
          description: values.detail.trim() || null,
          departments,
          imageUrl,
        })

        try {
          const departmentColors = values.departmentColors ?? {}
          const existingDepartments = await fetchProjectDepartments(projectId).catch(() => [])
          const existingByName = new Map(
            existingDepartments.map((dept) => [dept.name.toLowerCase(), dept])
          )

          for (const name of departments) {
            const colorConfig = departmentColors[name]
            const desiredColor = colorConfig?.color ? sanitizeHexColor(colorConfig.color) : null
            const match = existingByName.get(name.toLowerCase())

            if (match) {
              if (desiredColor && match.color.toLowerCase() !== desiredColor.toLowerCase()) {
                const textColor = getContrastingTextColor(desiredColor)
                await updateProjectDepartment(projectId, match.id, {
                  color: desiredColor,
                  textColor,
                })
              } else {
                // populate initial values with existing colors for the form
                values.departmentColors ??= {}
                values.departmentColors[name] = {
                  color: match.color,
                  textColor: match.textColor,
                }
              }
            } else {
              const color = desiredColor ?? generatePastelColor()
              const textColor = getContrastingTextColor(color)
              await createProjectDepartment(projectId, { name, color, textColor })
            }
          }
        } catch (error) {
          console.error("Failed to sync department colors", error)
        }

        if (typeof window !== "undefined") {
          window.dispatchEvent(
            new CustomEvent(PROJECT_REFRESH_EVENT, { detail: { projectId } })
          )
        }
        const projectTitle = values.title.trim() || "Project"
        notify({
          title: "Project updated",
          description: `Changes to “${projectTitle}” are now live.`,
          variant: "success",
        })
        router.back()
      } catch (error) {
        console.error("Failed to update project", error)
        const raw =
          error instanceof Error ? error.message : "Unable to save changes right now."
        surfaceSubmitError(
          raw === "Authentication required" || raw === "Unauthorized"
            ? "Please sign in again and retry."
            : raw
        )
      } finally {
        setSubmitting(false)
      }
    },
    [project?.imageUrl, projectId, router, surfaceSubmitError]
  )

  const renderContent = () => {
    if (loading) {
      return (
        <div className="mx-auto flex w-full max-w-xl flex-col items-center gap-4 px-6 py-12 text-center text-primary page-slide">
          <span className="text-base font-semibold">Loading project details…</span>
          <ProgressBar className="w-full" />
        </div>
      )
    }
    if (departmentColorsLoading) {
      return (
        <div className="mx-auto flex w-full max-w-xl flex-col items-center gap-4 px-6 py-12 text-center text-primary page-slide">
          <span className="text-base font-semibold">Loading departments…</span>
          <ProgressBar className="w-full" />
        </div>
      )
    }
    if (loadError) {
      return (
        <div className="mx-auto w-full max-w-full px-6 py-12 text-center text-destructive">
          {loadError}
        </div>
      )
    }
    if (!project || !initialValues || departmentColorsLoading) {
      return null
    }
    return (
      <div className="form-entry">
        <ProjectForm
          heading="Edit Project"
          submitLabel={submitting ? "Saving" : "Save"}
          initialValues={initialValues}
          departmentChipVariant={preferredDepartmentLayout}
          onSubmit={handleSubmit}
          submitting={submitting}
        />
      </div>
    )
  }

  return (
    <div className="asap-scroll w-full min-h-[calc(100vh-6.5rem)] px-[clamp(3.25rem,4vw,3.25rem)] pt-3">
      <div className="flex w-full flex-col items-start gap-4 lg:flex-row lg:items-start lg:gap-6">
        <BackButton dataCy="project-edit-back-button" ariaLabel="Back to projects" />
        <div className="flex-1 lg:mt-10">
          {renderContent()}
        </div>
      </div>
    </div>
  )
}

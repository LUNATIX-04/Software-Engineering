"use client"

import * as React from "react"
import { useCallback, useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { ArrowLeft } from "lucide-react"

import { Button } from "@/components/ui/button"
import { ProjectForm, type ProjectFormValues } from "@/components/projects/ProjectForm"
import { usePreferences } from "@/contexts/preferences"
import { fetchProjectById, updateProject, type ProjectRecord } from "@/utils/projects/api"
import { uploadProjectImage } from "@/utils/projects/media"

type EditProjectPageProps = {
  params: Promise<{
    projectId: string
  }>
}

export default function EditProjectPage({ params }: EditProjectPageProps) {
  const { projectId } = React.use(params)
  const router = useRouter()
  const handleNavigateBack = useCallback(() => router.push("/projects"), [router])
  const { profile } = usePreferences()
  const preferredDepartmentLayout = profile?.departmentLayout ?? "fullWidth"
  const [project, setProject] = useState<ProjectRecord | null>(null)
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)

  useEffect(() => {
    let active = true
    setLoading(true)
    setLoadError(null)

    fetchProjectById(projectId)
      .then((data) => {
        if (!active) return
        if (!data) {
          setLoadError("Project not found.")
          setProject(null)
          return
        }
        setProject(data)
      })
      .catch((error) => {
        console.error("Failed to fetch project", error)
        if (!active) return
        setLoadError("Unable to load project information.")
      })
      .finally(() => {
        if (!active) return
        setLoading(false)
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
    }
  }, [project])

  const handleSubmit = useCallback(
    async (values: ProjectFormValues) => {
      setSubmitError(null)
      setSubmitting(true)
      try {
        const title = values.title.trim()
        if (!title) {
          setSubmitError("Project title is required.")
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
            setSubmitError("Unable to upload project image. Please try again.")
            return
          }
        }

        await updateProject(projectId, {
          title,
          description: values.detail.trim() || null,
          departments,
          imageUrl,
        })
        router.push("/projects")
      } catch (error) {
        console.error("Failed to update project", error)
        const raw =
          error instanceof Error ? error.message : "Unable to save changes right now."
        setSubmitError(
          raw === "Authentication required" || raw === "Unauthorized"
            ? "Please sign in again and retry."
            : raw
        )
      } finally {
        setSubmitting(false)
      }
    },
    [project?.imageUrl, projectId, router]
  )

  const renderContent = () => {
    if (loading) {
      return (
        <div className="mx-auto w-full max-w-4xl px-6 py-12 text-center text-foreground/70">
          Loading project details…
        </div>
      )
    }
    if (loadError) {
      return (
        <div className="mx-auto w-full max-w-4xl px-6 py-12 text-center text-destructive">
          {loadError}
        </div>
      )
    }
    if (!project || !initialValues) {
      return null
    }
    return (
      <ProjectForm
        heading="Edit Project"
        submitLabel={submitting ? "Saving" : "Save"}
        initialValues={initialValues}
        departmentChipVariant={preferredDepartmentLayout}
        onSubmit={handleSubmit}
        submitting={submitting}
      />
    )
  }

  return (
    <div className="asap-scroll w-full min-h-[calc(100vh-6.5rem)] px-[clamp(3.25rem,4vw,3.25rem)] pt-3">
      <div className="flex w-full max-w-7xl flex-col items-start gap-4 lg:flex-row lg:items-start lg:gap-6">
        <div className="sticky top-1 z-10 -ml-3 flex flex-shrink-0 items-start justify-start lg:-mt-0">
          <Button
            type="button"
            onClick={handleNavigateBack}
            variant="ghost"
            className="inline-flex size-12 items-center justify-center rounded-full border border-primary/20 bg-white text-primary shadow-sm transition hover:border-primary/40 hover:bg-primary/10 focus-visible:border-primary focus-visible:ring-0"
            aria-label="Back to projects"
          >
            <ArrowLeft className="size-6" aria-hidden="true" />
          </Button>
        </div>
        <div className="flex-1 lg:mt-10">
          {renderContent()}
        </div>
      </div>
    </div>
  )
}

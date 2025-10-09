"use client"

import * as React from "react"
import { useCallback, useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"

import { ProjectForm, type ProjectFormValues } from "@/components/projects/ProjectForm"
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
        router.push("/Projects")
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
      submitLabel={submitting ? "Saving…" : "Save"}
      initialValues={initialValues}
      onSubmit={handleSubmit}
      submitting={submitting}
      submitError={submitError}
    />
  )
}

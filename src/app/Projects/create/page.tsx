"use client"

import { useCallback, useState } from "react"
import { useRouter } from "next/navigation"

import { ProjectForm, type ProjectFormValues } from "@/components/projects/ProjectForm"
import { createProject } from "@/utils/projects/api"
import { uploadProjectImage } from "@/utils/projects/media"

export default function CreateProjectPage() {
  const router = useRouter()
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)

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

        let imageUrl: string | null = null

        if (values.imageFile) {
          try {
            imageUrl = await uploadProjectImage(values.imageFile)
          } catch (error) {
            console.error("Failed to upload project image", error)
            setSubmitError("Unable to upload project image. Please try again.")
            return
          }
        }

        await createProject({
          title,
          description: values.detail.trim() || null,
          departments,
          imageUrl,
        })
        router.push("/Projects")
      } catch (error) {
        console.error("Failed to create project", error)
        const raw =
          error instanceof Error ? error.message : "Unable to create project right now."
        const message =
          raw === "Authentication required" || raw === "Unauthorized"
            ? "Please sign in to create a project."
            : raw
        setSubmitError(message)
      } finally {
        setSubmitting(false)
      }
    },
    [router]
  )

  return (
    <ProjectForm
      heading="Create Project"
      submitLabel={submitting ? "Creating…" : "Next"}
      departmentChipVariant="compact"
      onSubmit={handleSubmit}
      submitting={submitting}
      submitError={submitError}
    />
  )
}

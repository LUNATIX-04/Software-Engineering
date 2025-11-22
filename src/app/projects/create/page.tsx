"use client"

import { useCallback, useState } from "react"
import { useRouter } from "next/navigation"

import { ProjectForm } from "@/components/projects/ProjectForm"
import type { ProjectFormValues } from "@/components/projects/ProjectForm/types"
import { createProject } from "@/utils/projects/api"
import {
  createProjectDepartment,
  fetchProjectDepartments,
  updateProjectDepartment,
} from "@/utils/projects/departments"
import { uploadProjectImage } from "@/utils/projects/media"
import { useNotifications } from "@/components/notifications/Notification"
import { usePreferences } from "@/contexts/preferences"
import BackButton from "@/components/navigation/BackButton"
import { getContrastingTextColor, generatePastelColor, sanitizeHexColor } from "@/utils/colors"

export default function CreateProjectPage() {
  const router = useRouter()
  const [submitting, setSubmitting] = useState(false)
  const { notify } = useNotifications()
  const { profile } = usePreferences()
  const preferredDepartmentLayout = profile?.departmentLayout ?? "fullWidth"

  const handleSubmit = useCallback(
    async (values: ProjectFormValues) => {
      setSubmitting(true)
      try {
        const title = values.title.trim()
        if (!title) {
          notify({
            title: "Project title required",
            description: "Please provide a project title before continuing.",
            variant: "destructive",
          })
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
            notify({
              title: "Image upload failed",
              description: "Unable to upload the selected image. Please try again.",
              variant: "destructive",
            })
            return
          }
        }

        try {
          const project = await createProject({
            title,
            description: values.detail.trim() || null,
            departments,
            imageUrl,
          })
          const departmentColors = values.departmentColors ?? {}
          const existingDepartments = await fetchProjectDepartments(project.id).catch(() => [])
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
                await updateProjectDepartment(project.id, match.id, {
                  color: desiredColor,
                  textColor,
                })
              }
            } else {
              const color = desiredColor ?? generatePastelColor()
              const textColor = getContrastingTextColor(color)
              await createProjectDepartment(project.id, { name, color, textColor })
            }
          }
        } catch (error) {
          console.error("Failed to sync department colors", error)
        }

        router.push("/projects")
      } catch (error) {
        console.error("Failed to create project", error)
        const raw =
          error instanceof Error ? error.message : "Unable to create project right now."
        const message =
          raw === "Authentication required" || raw === "Unauthorized"
            ? "Please sign in to create a project."
            : raw
        notify({
          title: "Create project failed",
          description: message,
          variant: "destructive",
        })
      } finally {
        setSubmitting(false)
      }
    },
    [notify, router]
  )

  return (
    <div className="asap-scroll w-full min-h-[calc(100vh-6.5rem)] px-[clamp(3.25rem,4vw,3.25rem)] pt-3">
      <div className="flex w-full flex-col items-start gap-4 lg:flex-row lg:items-start lg:gap-6">
        <BackButton
          dataCy="project-create-back-button"
          ariaLabel="Back to projects"
          onClick={() => router.push("/projects")}
        />
        <div className="mx-0 flex-1 lg:mt-10 form-entry">
          <ProjectForm
            className="w-full"
            heading="Create Project"
            submitLabel={submitting ? "Creating…" : "Create"}
            departmentChipVariant={preferredDepartmentLayout}
            onSubmit={handleSubmit}
            submitting={submitting}
          />
        </div>
      </div>
    </div>
  )
}

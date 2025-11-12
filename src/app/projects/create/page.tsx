"use client"

import { useCallback, useState } from "react"
import { useRouter } from "next/navigation"

import { ProjectForm, type ProjectFormValues } from "@/components/projects/ProjectForm"
import { Button } from "@/components/ui/button"
import { usePreferences } from "@/contexts/preferences"
import { createProject } from "@/utils/projects/api"
import { uploadProjectImage } from "@/utils/projects/media"
import { useNotifications } from "@/components/notifications/Notification"
import { ArrowLeft } from "lucide-react"

export default function CreateProjectPage() {
  const router = useRouter()
  const [submitting, setSubmitting] = useState(false)
  const { profile } = usePreferences()
  const { notify } = useNotifications()
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

        await createProject({
          title,
          description: values.detail.trim() || null,
          departments,
          imageUrl,
        })
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
      <div className="flex w-full max-w-7xl flex-col items-start gap-4 lg:flex-row lg:items-start lg:gap-6">
        <div className="sticky top-1 z-10 -ml-3 flex flex-shrink-0 items-start justify-start lg:-mt-0">
          <Button
            type="button"
            variant="ghost"
            data-cy="project-create-back-button"
            onClick={() => router.push("/projects")}
            className="inline-flex size-12 items-center justify-center rounded-full border border-primary/20 bg-white text-primary shadow-sm transition hover:border-primary/40 hover:bg-primary/10 focus-visible:border-primary focus-visible:ring-0"
            aria-label="Back to projects"
          >
            <ArrowLeft className="size-6" aria-hidden="true" />
          </Button>
        </div>
        <ProjectForm
          className="mx-0 flex-1 lg:mt-10"
          heading="Create Project"
          submitLabel={submitting ? "Creating…" : "Create"}
          departmentChipVariant={preferredDepartmentLayout}
          onSubmit={handleSubmit}
          submitting={submitting}
        />
      </div>
    </div>
  )
}

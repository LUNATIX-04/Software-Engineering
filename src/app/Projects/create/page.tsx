"use client"

import { ProjectForm } from "@/components/projects/ProjectForm"

export default function CreateProjectPage() {
  return (
    <ProjectForm
      heading="Create Project"
      submitLabel="Next"
      onSubmit={() => {
        /* TODO: connect to backend */
      }}
    />
  )
}

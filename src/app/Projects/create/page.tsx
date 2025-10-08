"use client"

import { ProjectForm } from "@/components/projects/ProjectForm"

export default function CreateProjectPage() {
  return (
    <ProjectForm
      heading="Create Project"
      submitLabel="Next"
      departmentChipVariant="compact" //fullWidth
      onSubmit={() => {
        /* TODO: connect to backend */
      }}
    />
  )
}

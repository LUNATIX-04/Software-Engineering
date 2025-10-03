import { notFound } from "next/navigation"

import { ProjectForm } from "@/components/projects/ProjectForm"
import { mockProjects } from "@/constants/projects"

type EditProjectPageProps = {
  params: {
    projectId: string
  }
}

export default function EditProjectPage({ params }: EditProjectPageProps) {
  const project = mockProjects.find((item) => item.id === params.projectId)

  if (!project) {
    notFound()
  }

  return (
    <ProjectForm
      heading="Edit Project"
      submitLabel="Save"
      initialValues={{
        title: project.title,
        detail: project.description,
        departments: project.departments,
        imageUrl: project.imageSrc ?? null,
      }}
      onSubmit={() => {
        /* TODO: connect to backend */
      }}
    />
  )
}

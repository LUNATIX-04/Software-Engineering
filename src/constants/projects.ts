export type MockProject = {
  id: string
  title: string
  createdAt: string
  description: string
  imageSrc?: string
  borderRadius?: string
  departments: string[]
}

export const mockProjects: MockProject[] = [
  {
    id: "1",
    title: "Project fsdff",
    createdAt: "DD/MM/YYYY",
    description:
      "DetailDetailDetailDetailDetailDetailDetailDetailDetailDetailDetailDetailDetailDetailDetailDetailDetailDetailDetailDetailDetailDetailDetailDetailDetailDetailDetailDetailDetailDetailDetailDetailDetailDetailDetailDetailDetailDetail",
    imageSrc: "/api/image?path=/Project_test/Project1/Project1_MainImg.jpg",
    borderRadius: "1.5rem",
    departments: ["Account", "Registratiodfdn"],
  },{
    id: "2",
    title: "Project fsdff",
    createdAt: "DD/MM/YYYY",
    description:
      "DetailDetailDetailDetailDetailDetailDetailDetailDetailDetailDetailDetailDetailDetailDetailDetailDetailDetailDetailDetailDetailDetailDetailDetailDetailDetailDetailDetailDetailDetailDetailDetailDetailDetailDetailDetailDetailDetail",
    imageSrc: "/api/image?path=/Project_test/Project1/Project1_MainImg.jpg",
    borderRadius: "1.5rem",
    departments: ["Account", "Registration"],
  },{
    id: "3",
    title: "Project fsdff",
    createdAt: "DD/MM/YYYY",
    description:
      "DetailDetailDetailDetailDetailDetailDetailDetailDetailDetailDetailDetailDetailDetailDetailDetailDetailDetailDetailDetailDetailDetailDetailDetailDetailDetailDetailDetailDetailDetailDetailDetailDetailDetailDetailDetailDetailDetail",
    imageSrc: "/api/image?path=/Project_test/Project1/Project1_MainImg.jpg",
    borderRadius: "1.5rem",
    departments: ["Account", "Registration"],
  },{
    id: "4",
    title: "Project fsdff",
    createdAt: "DD/MM/YYYY",
    description:
      "DetailDetailDetailDetailDetailDetailDetailDetailDetailDetailDetailDetailDetailDetailDetailDetailDetailDetailDetailDetailDetailDetailDetailDetailDetailDetailDetailDetailDetailDetailDetailDetailDetailDetailDetailDetailDetailDetail",
    imageSrc: "/api/image?path=/Project_test/Project1/Project1_MainImg.jpg",
    borderRadius: "1.5rem",
    departments: ["Account", "Registration"],
  },
]

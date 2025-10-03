"use client"

import {
  ChangeEvent,
  FormEvent,
  KeyboardEvent,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Image as ImageIcon, Plus, X } from "lucide-react"

const FALLBACK_DEPARTMENTS = ["Account", "Registration"]

export type ProjectFormValues = {
  title: string
  detail: string
  departments: string[]
  imageFile: File | null
  imagePreviewUrl: string | null
}

export type ProjectFormInitialValues = {
  title?: string
  detail?: string
  departments?: string[]
  imageUrl?: string | null
}

export type ProjectFormProps = {
  heading: string
  submitLabel: string
  initialValues?: ProjectFormInitialValues
  onSubmit?: (values: ProjectFormValues) => void
  className?: string
  defaultDepartments?: string[]
}

export function ProjectForm({
  heading,
  submitLabel,
  initialValues,
  onSubmit,
  className,
  defaultDepartments = FALLBACK_DEPARTMENTS,
}: ProjectFormProps) {
  const normalizedInitial = useMemo(() => {
    return {
      title: initialValues?.title ?? "",
      detail: initialValues?.detail ?? "",
      departments:
        initialValues?.departments && initialValues.departments.length > 0
          ? [...initialValues.departments]
          : [...defaultDepartments],
      imageUrl: initialValues?.imageUrl ?? null,
    }
  }, [defaultDepartments, initialValues])

  const [title, setTitle] = useState(normalizedInitial.title)
  const [detail, setDetail] = useState(normalizedInitial.detail)
  const [departments, setDepartments] = useState<string[]>([...normalizedInitial.departments])
  const [departmentInput, setDepartmentInput] = useState("")
  const [imagePreview, setImagePreview] = useState<string | null>(
    normalizedInitial.imageUrl
  )
  const [selectedImageName, setSelectedImageName] = useState<string | null>(null)
  const [imageFile, setImageFile] = useState<File | null>(null)
  const objectUrlRef = useRef<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement | null>(null)

  useEffect(() => {
    setTitle(normalizedInitial.title)
    setDetail(normalizedInitial.detail)
    setDepartments([...normalizedInitial.departments])
    setImagePreview(normalizedInitial.imageUrl)
    setSelectedImageName(null)
    setImageFile(null)
  }, [normalizedInitial])

  useEffect(() => {
    return () => {
      if (objectUrlRef.current) {
        URL.revokeObjectURL(objectUrlRef.current)
      }
    }
  }, [])

  const handleAddDepartment = () => {
    const trimmed = departmentInput.trim()
    if (!trimmed) return
    if (departments.some((dept) => dept.toLowerCase() === trimmed.toLowerCase())) {
      setDepartmentInput("")
      return
    }

    setDepartments((prev) => [...prev, trimmed])
    setDepartmentInput("")
  }

  const handleRemoveDepartment = (value: string) => {
    setDepartments((prev) => prev.filter((dept) => dept !== value))
  }

  const handleDepartmentKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Enter") {
      event.preventDefault()
      handleAddDepartment()
    }
  }

  const handleImageSelect = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) {
      return
    }

    const previewUrl = URL.createObjectURL(file)
    if (objectUrlRef.current) {
      URL.revokeObjectURL(objectUrlRef.current)
    }
    objectUrlRef.current = previewUrl

    setImagePreview(previewUrl)
    setSelectedImageName(file.name)
    setImageFile(file)

    event.target.value = ""
  }

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    onSubmit?.({
      title,
      detail,
      departments,
      imageFile,
      imagePreviewUrl: imagePreview,
    })
  }

  return (
    <div
      className={[
        "max-w-6xl w-full mx-auto px-[clamp(1.5rem,4vw,4rem)] py-[clamp(2rem,6vh,4rem)]",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
    >
      <div className="grid gap-12 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)] items-start">
        <form
          onSubmit={handleSubmit}
          className="rounded-[2.5rem] border-2 border-primary/30 bg-[#f4e7ff]/70 px-10 py-12 shadow-[0_30px_60px_rgba(112,59,208,0.18)]"
        >
          <h1 className="text-3xl font-bold text-foreground">{heading}</h1>

          <div className="mt-10 space-y-8">
            <label className="block space-y-3">
              <span className="text-lg font-semibold text-foreground">Project Title</span>
              <Input
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                placeholder="Project Title"
                className="h-16 rounded-[2rem] border-2 border-primary/40 bg-white/80 px-6 text-lg font-semibold text-foreground placeholder:text-primary/60 shadow-[0_12px_24px_rgba(112,59,208,0.12)]"
              />
            </label>

            <label className="block space-y-3">
              <span className="text-lg font-semibold text-foreground">Add detail</span>
              <Textarea
                value={detail}
                onChange={(event) => setDetail(event.target.value)}
                placeholder="Add detail"
                className="min-h-[10rem] rounded-[2rem] border-2 border-primary/40 bg-white/80 px-6 py-4 text-base text-foreground placeholder:text-primary/60 shadow-[0_12px_24px_rgba(112,59,208,0.12)]"
              />
            </label>

            <div className="space-y-4">
              <span className="text-lg font-semibold text-foreground">Department</span>
              <div className="flex flex-wrap gap-3">
                {departments.map((dept) => (
                  <span
                    key={dept}
                    className="flex items-center gap-2 rounded-full border-2 border-primary/30 bg-white px-5 py-2 text-sm font-semibold text-foreground shadow-[0_10px_20px_rgba(112,59,208,0.1)]"
                  >
                    {dept}
                    <button
                      type="button"
                      onClick={() => handleRemoveDepartment(dept)}
                      className="grid size-6 place-items-center rounded-full bg-primary/10 text-primary transition-colors hover:bg-primary/20"
                      aria-label={`Remove ${dept}`}
                    >
                      <X className="size-4" />
                    </button>
                  </span>
                ))}
              </div>
              <div className="relative max-w-sm">
                <span className="pointer-events-none absolute left-5 top-1/2 -translate-y-1/2 text-primary/60">
                  <Plus className="size-5" />
                </span>
                <Input
                  value={departmentInput}
                  onChange={(event) => setDepartmentInput(event.target.value)}
                  onKeyDown={handleDepartmentKeyDown}
                  placeholder="Add"
                  className="h-14 rounded-[2rem] border-2 border-primary/40 bg-white/80 pl-12 pr-4 text-base font-medium text-foreground placeholder:text-primary/60"
                />
              </div>
            </div>
          </div>

          <div className="mt-12 flex justify-end">
            <Button
              type="submit"
              className="rounded-full bg-[#3f3f80] px-10 py-4 text-base font-semibold text-white shadow-[0_16px_30px_rgba(63,63,128,0.2)] transition-transform hover:translate-y-[-2px] hover:bg-[#35306d]"
            >
              {submitLabel}
            </Button>
          </div>
        </form>

        <div className="flex flex-col items-center gap-8">
          <div className="relative w-full max-w-sm overflow-hidden rounded-[2.5rem] border-2 border-primary/30 bg-white/80 shadow-[0_30px_60px_rgba(112,59,208,0.18)]">
            <div className="aspect-square w-full">
              {imagePreview ? (
                <img
                  src={imagePreview}
                  alt="Selected preview"
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="flex h-full w-full flex-col items-center justify-center gap-4 text-primary">
                  <ImageIcon className="size-16" />
                  <p className="text-base font-medium">Project image</p>
                </div>
              )}
            </div>
          </div>

          {selectedImageName ? (
            <p className="text-sm text-muted-foreground">Selected: {selectedImageName}</p>
          ) : null}

          <Button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="rounded-full bg-[#3f3f80] px-8 py-3 text-base font-semibold text-white shadow-[0_16px_30px_rgba(63,63,128,0.2)] transition-transform hover:translate-y-[-2px] hover:bg-[#35306d]"
          >
            Add Image
          </Button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="sr-only"
            onChange={handleImageSelect}
          />
        </div>
      </div>
    </div>
  )
}

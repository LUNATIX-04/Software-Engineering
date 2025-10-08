"use client"

import {
  ChangeEvent,
  DragEvent,
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
import { GripVertical, Image as ImageIcon, Plus, X } from "lucide-react"

const FALLBACK_DEPARTMENTS = ["Account", "Registration"]

export type DepartmentChipVariant = "compact" | "fullWidth"

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
  departmentChipVariant?: DepartmentChipVariant
}

export function ProjectForm({
  heading,
  submitLabel,
  initialValues,
  onSubmit,
  className,
  defaultDepartments = FALLBACK_DEPARTMENTS,
  departmentChipVariant = "compact",
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
  const [draggingIndex, setDraggingIndex] = useState<number | null>(null)
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null)
  const [imagePreview, setImagePreview] = useState<string | null>(
    normalizedInitial.imageUrl
  )
  const [selectedImageName, setSelectedImageName] = useState<string | null>(null)
  const [imageFile, setImageFile] = useState<File | null>(null)
  const objectUrlRef = useRef<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const previewCardRef = useRef<HTMLDivElement | null>(null)
  const draggedDepartmentIndexRef = useRef<number | null>(null)

  useEffect(() => {
    setTitle(normalizedInitial.title)
    setDetail(normalizedInitial.detail)
    setDepartments([...normalizedInitial.departments])
    setImagePreview(normalizedInitial.imageUrl)
    setSelectedImageName(null)
    setImageFile(null)
    setDraggingIndex(null)
    setDragOverIndex(null)
    draggedDepartmentIndexRef.current = null
  }, [normalizedInitial])

  useEffect(() => {
    return () => {
      if (objectUrlRef.current) {
        URL.revokeObjectURL(objectUrlRef.current)
      }
    }
  }, [])

  useEffect(() => {
    const node = previewCardRef.current
    if (!node || typeof window === "undefined") {
      return
    }

    let scheduledFrame = 0

    const updateScrollEffect = () => {
      scheduledFrame = 0
      const rect = node.getBoundingClientRect()
      const viewportHeight =
        window.innerHeight || document.documentElement.clientHeight || 1
      const progressRaw = 1 - rect.top / viewportHeight
      const progress = Math.min(Math.max(progressRaw, 0), 1)

      node.style.setProperty("--preview-scroll-progress", progress.toFixed(3))
      node.style.setProperty(
        "--preview-scroll-opacity",
        (0.6 + progress * 0.4).toFixed(3)
      )
    }

    const scheduleUpdate = () => {
      if (scheduledFrame) {
        return
      }
      scheduledFrame = window.requestAnimationFrame(updateScrollEffect)
    }

    scheduleUpdate()
    window.addEventListener("scroll", scheduleUpdate, { passive: true })
    window.addEventListener("resize", scheduleUpdate)

    return () => {
      if (scheduledFrame) {
        window.cancelAnimationFrame(scheduledFrame)
      }
      window.removeEventListener("scroll", scheduleUpdate)
      window.removeEventListener("resize", scheduleUpdate)
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

  const handleDepartmentDragStart = (event: DragEvent<HTMLSpanElement>, index: number) => {
    draggedDepartmentIndexRef.current = index
    setDraggingIndex(index)
    event.dataTransfer?.setData("text/plain", String(index))
    if (event.dataTransfer) {
      event.dataTransfer.effectAllowed = "move"
    }
  }

  const handleDepartmentDragOver = (event: DragEvent<HTMLSpanElement>, index: number) => {
    event.preventDefault()
    if (event.dataTransfer) {
      event.dataTransfer.dropEffect = "move"
    }
    if (draggedDepartmentIndexRef.current === index) {
      if (dragOverIndex !== null) {
        setDragOverIndex(null)
      }
      return
    }
    if (dragOverIndex !== index) {
      setDragOverIndex(index)
    }
  }

  const handleDepartmentDrop = (event: DragEvent<HTMLSpanElement>, index: number) => {
    event.preventDefault()
    const fromIndex = draggedDepartmentIndexRef.current
    if (fromIndex === null || fromIndex === index) {
      setDragOverIndex(null)
      setDraggingIndex(null)
      draggedDepartmentIndexRef.current = null
      return
    }

    setDepartments((prev) => {
      if (fromIndex < 0 || fromIndex >= prev.length || index < 0 || index >= prev.length) {
        return prev
      }
      const updated = [...prev]
      const [movedItem] = updated.splice(fromIndex, 1)
      updated.splice(index, 0, movedItem)
      return updated
    })

    setDragOverIndex(null)
    setDraggingIndex(null)
    draggedDepartmentIndexRef.current = null
  }

  const handleDepartmentDragEnd = () => {
    setDragOverIndex(null)
    setDraggingIndex(null)
    draggedDepartmentIndexRef.current = null
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

  const departmentChipBaseClass =
    "flex items-center gap-2 rounded-full border-2 border-primary/30 bg-white font-semibold text-foreground select-none cursor-grab active:cursor-grabbing transition-colors"
  const departmentChipStyles: Record<DepartmentChipVariant, string> = {
    compact: `${departmentChipBaseClass} px-5 py-2 text-sm`,
    fullWidth: `${departmentChipBaseClass} h-14 w-full justify-between pl-12 pr-4 text-base`,
  }
  const departmentChipClass = departmentChipStyles[departmentChipVariant]
  const chipActionButtonClass =
    "grid size-6 place-items-center rounded-full bg-primary/10 text-primary transition-colors hover:bg-primary/20 disabled:opacity-40 disabled:hover:bg-primary/10"
 
  return (
    <div
      className={[
        "max-w-6xl w-full mx-auto px-[clamp(1.5rem,4vw,4rem)] pb-[clamp(2rem,6vh,4rem)]",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
    >
      <div className="grid gap-25 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.8fr)] items-start">
        <form
          onSubmit={handleSubmit}                                         //0px 3px 5px 1px rgba(0, 0, 0, 0.25)
          className="rounded-[2.5rem] border-2 border-primary/30 bg-card-project px-10 pt-5 pb-12 shadow-[0_4px_2px_0.15px_rgba(0,1,0,0.15)]"
        >
          <h1 className="text-3xl font-bold text-foreground">{heading}</h1>

          <div className="mt-5 space-y-4">
            <label className="block space-y-3">
              {/*<span className="text-lg font-semibold text-foreground">Project Title</span>*/}
              <Input
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                placeholder="Project Title"
                className="h-12 w-1/2 rounded-[2rem] border-2 border-primary/40 bg-white/80 px-6 text-lg font-semibold text-foreground placeholder:text-primary/60"
              />
            </label>
 
            <label className="block space-y-3">
              {/*<span className="text-lg font-semibold text-foreground">Add detail</span>*/}
              <div className="group/textarea overflow-hidden rounded-[1rem] border-2 border-primary/40 bg-white/80 transition-[box-shadow,border-color] focus-within:border-primary focus-within:shadow-[0_0_0_3px_rgba(0,0,0,0.25)]">
                <Textarea
                  value={detail}
                  onChange={(event) => setDetail(event.target.value)}
                  placeholder="Add detail"
                  className="min-h-[10rem] w-full resize-y rounded-[inherit] border-none bg-transparent px-6 py-2 text-base text-foreground placeholder:text-primary/60 shadow-none focus-visible:outline-none focus-visible:ring-0"
                />
              </div>
            </label>

            <div className="space-y-4">
              <span className="text-lg font-semibold text-foreground">Department</span>
              <div className="flex flex-wrap gap-3 mt-3">
                {departments.map((dept, index) => {
                  const isDragOver = dragOverIndex === index
                  const isDragging = draggingIndex === index
                  const chipClassName = [
                    departmentChipClass,
                    isDragOver
                      ? "border-primary bg-primary/10"
                      : "",
                    isDragging ? "cursor-grabbing opacity-80" : "",
                  ]
                    .filter(Boolean)
                    .join(" ")

                  return (
                    <span
                      key={dept}
                      className={chipClassName}
                      draggable
                      aria-grabbed={isDragging}
                      onDragStart={(event) => handleDepartmentDragStart(event, index)}
                      onDragOver={(event) => handleDepartmentDragOver(event, index)}
                      onDrop={(event) => handleDepartmentDrop(event, index)}
                      onDragEnd={handleDepartmentDragEnd}
                    >
                      <span className="inline-flex items-center gap-2">
                        <GripVertical className="size-4 text-primary/60" aria-hidden />
                        <span>{dept}</span>
                      </span>
                      <button
                        type="button"
                        onClick={() => handleRemoveDepartment(dept)}
                        className={`${chipActionButtonClass} ml-auto`}
                        aria-label={`Remove ${dept}`}
                      >
                        <X className="size-4" />
                      </button>
                    </span>
                  )
                })}
              </div>
              <div className="relative">
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
              className="rounded-full bg-button-background px-10 py-5 text-base font-semibold text-button-foreground transition-transform hover:bg-button-hover-background"
            >
              {submitLabel}
            </Button>
          </div>
        </form>

        <div className="flex flex-col items-center gap-8">
          <div
            ref={previewCardRef}
            className="relative w-full max-w-sm overflow-hidden rounded-[2.5rem] border-2 border-primary/30 bg-white/80 shadow-[0_4px_2px_0.15px_rgba(0,1,0,0.15)]"
          >
            <div className="aspect-square w-full">
              {imagePreview ? (
                <img
                  src={imagePreview}
                  alt="Selected preview"
                  className="h-full w-full object-cover transition-transform duration-500 ease-out"
                  style={{
                    transform: "translateY(calc(var(--preview-scroll-progress, 0) * -12px))",
                  }}
                />
              ) : (
                <div
                  className="flex h-full w-full flex-col items-center justify-center gap-4 text-primary transition-[transform,opacity] duration-500 ease-out"
                  style={{
                    transform: "translateY(calc(var(--preview-scroll-progress, 0) * -18px))",
                    opacity: "calc(0.6 + var(--preview-scroll-opacity, 1) - 1)",
                  }}
                >
                  <ImageIcon className="size-16" />
                  <p className="text-base font-medium">Project image</p>
                </div>
              )}
            </div>
          </div>

          {selectedImageName ? (
            <p className="text-sm text-muted-foreground">{selectedImageName}</p>
          ) : null}

          <Button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="rounded-full bg-button-background px-8 py-5 text-base font-semibold text-button-foreground transition-transform  hover:bg-button-hover-background"
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

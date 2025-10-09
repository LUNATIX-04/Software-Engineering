"use client"

import {
  ChangeEvent,
  DragEvent,
  FormEvent,
  KeyboardEvent,
  PointerEvent,
  type CSSProperties,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { GripVertical, Image as ImageIcon, Minus, Plus, X } from "lucide-react"

const FALLBACK_DEPARTMENTS: string[] = []

export type DepartmentChipVariant = "compact" | "fullWidth"

export type ImageCropSelection = {
  xPercent: number
  yPercent: number
}

type CropPreparationSource = {
  file: File | null
  url: string
}

const DEFAULT_CROP_POSITION: ImageCropSelection = {
  xPercent: 50,
  yPercent: 50,
}

const DEFAULT_ZOOM = 1
const MIN_ZOOM = 1
const MAX_ZOOM = 10
const ZOOM_STEP = 0.15

const CROPPED_NAME_SUFFIX = "-square"

const SUPPORTED_CANVAS_MIME_TYPES = new Set(["image/png", "image/jpeg", "image/webp"])

function clampPercent(value: number) {
  if (Number.isNaN(value)) {
    return 50
  }
  return Math.min(100, Math.max(0, value))
}

function clampZoom(value: number) {
  if (!Number.isFinite(value)) {
    return DEFAULT_ZOOM
  }
  return Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, value))
}

function ensureCropPosition(position: ImageCropSelection | null | undefined): ImageCropSelection {
  if (!position) {
    return { ...DEFAULT_CROP_POSITION }
  }
  return {
    xPercent: clampPercent(position.xPercent),
    yPercent: clampPercent(position.yPercent),
  }
}

function deriveExtensionFromMime(mimeType: string) {
  const normalized = mimeType.toLowerCase()
  switch (normalized) {
    case "image/jpeg":
    case "image/jpg":
      return "jpg"
    case "image/png":
      return "png"
    case "image/webp":
      return "webp"
    default:
      return "png"
  }
}

function sanitizeBaseFileName(name: string) {
  return name.replace(/\.[^/.]+$/, "")
}

function buildCroppedFileName(originalName: string, mimeType: string) {
  const extension = deriveExtensionFromMime(mimeType)
  const base = sanitizeBaseFileName(originalName)
  const suffix = base.endsWith(CROPPED_NAME_SUFFIX) ? "" : CROPPED_NAME_SUFFIX
  return `${base}${suffix}.${extension}`
}

function inferNameFromUrl(url: string, mimeType: string) {
  try {
    const withoutQuery = url.split("?")[0] ?? url
    const segments = withoutQuery.split("/")
    const lastSegment = segments[segments.length - 1] || "project-image"
    const extensionCandidate = lastSegment.includes(".")
      ? lastSegment.split(".").pop()?.toLowerCase() ?? null
      : null
    if (extensionCandidate) {
      return buildCroppedFileName(lastSegment, mimeType)
    }
    return buildCroppedFileName(`${lastSegment}.${deriveExtensionFromMime(mimeType)}`, mimeType)
  } catch {
    return buildCroppedFileName("project-image", mimeType)
  }
}

function resolveCanvasMimeType(originalMime: string | undefined) {
  if (!originalMime) {
    return { mimeType: "image/png", quality: undefined as number | undefined }
  }

  const normalizedRaw = originalMime.toLowerCase()
  const normalized = normalizedRaw === "image/jpg" ? "image/jpeg" : normalizedRaw
  if (SUPPORTED_CANVAS_MIME_TYPES.has(normalized)) {
    const quality = normalized === "image/jpeg" ? 0.92 : undefined
    return { mimeType: normalized, quality }
  }

  return { mimeType: "image/png", quality: undefined as number | undefined }
}

async function blobFromCanvas(
  canvas: HTMLCanvasElement,
  mimeType: string,
  quality?: number
): Promise<Blob> {
  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) {
          reject(new Error("Failed to produce cropped image data."))
          return
        }
        resolve(blob)
      },
      mimeType,
      quality
    )
  })
}

async function loadImageFromBlob(blob: Blob) {
  const objectUrl = URL.createObjectURL(blob)
  try {
    const imageElement = await new Promise<HTMLImageElement>((resolve, reject) => {
      const image = new Image()
      image.crossOrigin = "anonymous"
      image.onload = () => resolve(image)
      image.onerror = () => reject(new Error("Unable to read image data for cropping."))
      image.src = objectUrl
    })
    return { image: imageElement, revoke: () => URL.revokeObjectURL(objectUrl) }
  } catch (error) {
    URL.revokeObjectURL(objectUrl)
    throw error
  }
}

async function resolveSourceBlob({ file, url }: CropPreparationSource): Promise<{
  blob: Blob
  name: string
  mimeType: string
}> {
  if (file) {
    const mimeType = file.type || "image/png"
    return { blob: file, name: file.name, mimeType }
  }

  const response = await fetch(url, { mode: "cors" })
  if (!response.ok) {
    throw new Error(`Unable to fetch image for cropping (status ${response.status}).`)
  }

  const blob = await response.blob()
  const mimeType = blob.type || "image/png"
  const name = inferNameFromUrl(url, mimeType)

  return { blob, name, mimeType }
}

async function generateCroppedFile(
  source: CropPreparationSource,
  cropPosition: ImageCropSelection,
  zoom: number
): Promise<File> {
  const { blob: sourceBlob, name: originalName, mimeType: originalMime } =
    await resolveSourceBlob(source)
  const crop = ensureCropPosition(cropPosition)
  const { image, revoke } = await loadImageFromBlob(sourceBlob)

  const naturalWidth = image.naturalWidth || image.width
  const naturalHeight = image.naturalHeight || image.height
  if (!naturalWidth || !naturalHeight) {
    revoke()
    throw new Error("Selected image is missing size information.")
  }

  const normalizedZoom = clampZoom(zoom)
  const squareSize = Math.min(naturalWidth, naturalHeight)
  const sourceSide = Math.max(1, Math.round(squareSize / normalizedZoom))
  const overflowX = Math.max(naturalWidth - sourceSide, 0)
  const overflowY = Math.max(naturalHeight - sourceSide, 0)

  const offsetX = Math.min(overflowX, Math.round((clampPercent(crop.xPercent) / 100) * overflowX))
  const offsetY = Math.min(overflowY, Math.round((clampPercent(crop.yPercent) / 100) * overflowY))

  const canvas = document.createElement("canvas")
  canvas.width = squareSize
  canvas.height = squareSize

  const context = canvas.getContext("2d")
  if (!context) {
    revoke()
    throw new Error("Unable to access drawing context for cropping.")
  }

  context.drawImage(
    image,
    offsetX,
    offsetY,
    sourceSide,
    sourceSide,
    0,
    0,
    squareSize,
    squareSize
  )

  revoke()

  const { mimeType, quality } = resolveCanvasMimeType(originalMime)
  const croppedBlob = await blobFromCanvas(canvas, mimeType, quality)
  const croppedFileName = buildCroppedFileName(originalName, mimeType)

  return new File([croppedBlob], croppedFileName, { type: croppedBlob.type || mimeType })
}

export type ProjectFormValues = {
  title: string
  detail: string
  departments: string[]
  imageFile: File | null
  imagePreviewUrl: string | null
  imageCropPosition: ImageCropSelection | null
}

export type ProjectFormInitialValues = {
  title?: string
  detail?: string
  departments?: string[]
  imageUrl?: string | null
  imageCropPosition?: ImageCropSelection | null
}

export type ProjectFormProps = {
  heading: string
  submitLabel: string
  initialValues?: ProjectFormInitialValues
  onSubmit?: (values: ProjectFormValues) => void | Promise<void>
  className?: string
  defaultDepartments?: string[]
  departmentChipVariant?: DepartmentChipVariant
  submitting?: boolean
  submitError?: string | null
}

export function ProjectForm({
  heading,
  submitLabel,
  initialValues,
  onSubmit,
  className,
  defaultDepartments = FALLBACK_DEPARTMENTS,
  departmentChipVariant = "fullWidth",
  submitting,
  submitError,
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
      imageCropPosition:
        initialValues?.imageCropPosition ??
        (initialValues?.imageUrl ? { xPercent: 50, yPercent: 50 } : null),
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
  const [imageCropPosition, setImageCropPosition] = useState<ImageCropSelection | null>(
    normalizedInitial.imageCropPosition
  )
  const [selectedImageName, setSelectedImageName] = useState<string | null>(null)
  const [imageFile, setImageFile] = useState<File | null>(null)
  const objectUrlRef = useRef<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const previewCardRef = useRef<HTMLDivElement | null>(null)
  const previewImageContainerRef = useRef<HTMLDivElement | null>(null)
  const draggedDepartmentIndexRef = useRef<number | null>(null)
  const cropDragStateRef = useRef<{
    pointerId: number
    lastClientX: number
    lastClientY: number
  } | null>(null)
  const croppedImageCacheRef = useRef<{ signature: string; file: File } | null>(null)
  const [imageZoom, setImageZoom] = useState(DEFAULT_ZOOM)
  const [zoomInputValue, setZoomInputValue] = useState(DEFAULT_ZOOM.toFixed(2))
  const [internalSubmitting, setInternalSubmitting] = useState(false)
  const [isDraggingCrop, setIsDraggingCrop] = useState(false)

  useEffect(() => {
    setTitle(normalizedInitial.title)
    setDetail(normalizedInitial.detail)
    setDepartments([...normalizedInitial.departments])
    setImagePreview(normalizedInitial.imageUrl)
    setImageCropPosition(normalizedInitial.imageCropPosition)
    setSelectedImageName(null)
    setImageFile(null)
    setImageZoom(DEFAULT_ZOOM)
    setZoomInputValue(DEFAULT_ZOOM.toFixed(2))
    croppedImageCacheRef.current = null
    setDraggingIndex(null)
    setDragOverIndex(null)
    draggedDepartmentIndexRef.current = null
    setInternalSubmitting(false)
  }, [normalizedInitial])

  useEffect(() => {
    return () => {
      if (objectUrlRef.current) {
        URL.revokeObjectURL(objectUrlRef.current)
      }
    }
  }, [])

  useEffect(() => {
    if (!imagePreview) {
      cropDragStateRef.current = null
      setIsDraggingCrop(false)
      croppedImageCacheRef.current = null
      setImageZoom(DEFAULT_ZOOM)
      setZoomInputValue(DEFAULT_ZOOM.toFixed(2))
    }
  }, [imagePreview])

  const applyZoom = (value: number | ((current: number) => number)) => {
    setImageZoom((prevZoom) => {
      const target = typeof value === "function" ? value(prevZoom) : value
      const nextZoom = clampZoom(target)
      if (nextZoom !== prevZoom) {
        croppedImageCacheRef.current = null
      }
      setZoomInputValue(nextZoom.toFixed(2))
      return nextZoom
    })
  }

  const handleZoomIn = () => {
    if (!imagePreview) {
      return
    }
    applyZoom((prev) => prev + ZOOM_STEP)
  }

  const handleZoomOut = () => {
    if (!imagePreview) {
      return
    }
    applyZoom((prev) => prev - ZOOM_STEP)
  }

  const commitZoomInput = (rawValue: string) => {
    if (!imagePreview) {
      setZoomInputValue(DEFAULT_ZOOM.toFixed(2))
      return
    }
    const numeric = Number.parseFloat(rawValue)
    if (Number.isNaN(numeric)) {
      setZoomInputValue(clampZoom(imageZoom).toFixed(2))
      return
    }
    applyZoom(numeric)
  }

  const handleZoomInputChange = (event: ChangeEvent<HTMLInputElement>) => {
    setZoomInputValue(event.target.value)
  }

  const handleZoomInputBlur = (event: ChangeEvent<HTMLInputElement>) => {
    commitZoomInput(event.target.value)
  }

  const handleZoomInputKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Enter") {
      event.preventDefault()
      commitZoomInput((event.target as HTMLInputElement).value)
    }
  }

  const applyCropDelta = (deltaX: number, deltaY: number) => {
    const container = previewImageContainerRef.current
    if (!container || !imagePreview) {
      return
    }

    const rect = container.getBoundingClientRect()
    if (!rect.width || !rect.height) {
      return
    }

    setImageCropPosition((prev) => {
      const base = prev ?? { xPercent: 50, yPercent: 50 }
      const scale = clampZoom(imageZoom)
      const deltaPercentX = (deltaX / rect.width) * (100 / scale)
      const deltaPercentY = (deltaY / rect.height) * (100 / scale)
      const adjustedX = clampPercent(base.xPercent - deltaPercentX)
      const adjustedY = clampPercent(base.yPercent - deltaPercentY)
      return {
        xPercent: adjustedX,
        yPercent: adjustedY,
      }
    })
  }

  const handleCropPointerDown = (event: PointerEvent<HTMLDivElement>) => {
    if (!imagePreview) {
      return
    }

    event.preventDefault()
    event.stopPropagation()

    if (!imageCropPosition) {
      setImageCropPosition({ xPercent: 50, yPercent: 50 })
    }

    cropDragStateRef.current = {
      pointerId: event.pointerId,
      lastClientX: event.clientX,
      lastClientY: event.clientY,
    }
    try {
      event.currentTarget.setPointerCapture(event.pointerId)
    } catch {
      // Ignore if pointer capture is not supported (SSR or older browsers)
    }
    setIsDraggingCrop(true)
  }

  const handleCropPointerMove = (event: PointerEvent<HTMLDivElement>) => {
    const state = cropDragStateRef.current
    if (!state || state.pointerId !== event.pointerId) {
      return
    }

    event.preventDefault()
    const deltaX = event.clientX - state.lastClientX
    const deltaY = event.clientY - state.lastClientY

    if (deltaX === 0 && deltaY === 0) {
      return
    }

    state.lastClientX = event.clientX
    state.lastClientY = event.clientY

    applyCropDelta(deltaX, deltaY)
  }

  const endCropDragging = (event: PointerEvent<HTMLDivElement>) => {
    const state = cropDragStateRef.current
    if (!state || state.pointerId !== event.pointerId) {
      return
    }

    try {
      event.currentTarget.releasePointerCapture(event.pointerId)
    } catch {
      // Ignore if pointer capture is not supported
    }

    cropDragStateRef.current = null
    setIsDraggingCrop(false)
  }

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

    croppedImageCacheRef.current = null
    setImagePreview(previewUrl)
    setSelectedImageName(file.name)
    setImageFile(file)
    setImageZoom(DEFAULT_ZOOM)
    setZoomInputValue(DEFAULT_ZOOM.toFixed(2))
    setImageCropPosition({ xPercent: 50, yPercent: 50 })

    event.target.value = ""
  }

  const buildCropCacheSignature = (
    file: File | null,
    previewUrl: string | null,
    cropPosition: ImageCropSelection | null,
    zoom: number
  ) => {
    const sourcePart = file
      ? `${file.name}|${file.size}|${file.lastModified}`
      : previewUrl ?? "no-image"
    const crop = ensureCropPosition(cropPosition)
    const normalizedZoom = clampZoom(zoom)
    return `${sourcePart}|${crop.xPercent.toFixed(3)}|${crop.yPercent.toFixed(
      3
    )}|${normalizedZoom.toFixed(3)}`
  }

  const prepareImageForSubmit = async () => {
    if (!imagePreview) {
      return { file: imageFile, previewUrl: imagePreview }
    }

    const cropPosition = ensureCropPosition(imageCropPosition)
    const normalizedZoom = clampZoom(imageZoom)
    const signature = buildCropCacheSignature(
      imageFile,
      imagePreview,
      cropPosition,
      normalizedZoom
    )

    if (croppedImageCacheRef.current?.signature === signature) {
      return { file: croppedImageCacheRef.current.file, previewUrl: imagePreview }
    }

    try {
      const croppedFile = await generateCroppedFile(
        { file: imageFile, url: imagePreview },
        cropPosition,
        normalizedZoom
      )
      croppedImageCacheRef.current = { signature, file: croppedFile }
      return { file: croppedFile, previewUrl: imagePreview }
    } catch (error) {
      console.error("Failed to crop project image", error)
      return { file: imageFile, previewUrl: imagePreview }
    }
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!onSubmit) {
      return
    }

    let preparedFile = imageFile
    let preparedPreviewUrl = imagePreview

    if (imagePreview) {
      const prepared = await prepareImageForSubmit()
      preparedFile = prepared.file
      preparedPreviewUrl = prepared.previewUrl
    }

    const result = onSubmit({
      title,
      detail,
      departments,
      imageFile: preparedFile,
      imagePreviewUrl: preparedPreviewUrl,
      imageCropPosition,
    })

    if (result && typeof (result as Promise<unknown>).then === "function") {
      if (typeof submitting === "undefined") {
        try {
          setInternalSubmitting(true)
          await result
        } finally {
          setInternalSubmitting(false)
        }
      } else {
        await result
      }
    }
  }

  const effectiveSubmitting = submitting ?? internalSubmitting

  const departmentChipBaseClass =
    "flex items-center gap-2 rounded-full border-2 border-primary/30 bg-white font-semibold text-foreground select-none cursor-grab active:cursor-grabbing transition-colors"
  const departmentChipStyles: Record<DepartmentChipVariant, string> = {
    compact: `${departmentChipBaseClass} px-5 py-2 text-sm`,
    fullWidth: `${departmentChipBaseClass} h-14 w-full justify-between pl-12 pr-4 text-base`,
  }
  const departmentChipClass = departmentChipStyles[departmentChipVariant]
  const chipActionButtonClass =
    "grid size-6 place-items-center rounded-full bg-primary/10 text-primary transition-colors hover:bg-primary/20 disabled:opacity-40 disabled:hover:bg-primary/10"
  const normalizedZoom = clampZoom(imageZoom)
  const cropXPercent = imageCropPosition?.xPercent ?? DEFAULT_CROP_POSITION.xPercent
  const cropYPercent = imageCropPosition?.yPercent ?? DEFAULT_CROP_POSITION.yPercent
  const isZoomOutDisabled = !imagePreview || normalizedZoom <= MIN_ZOOM + 0.001
  const isZoomInDisabled = !imagePreview || normalizedZoom >= MAX_ZOOM - 0.001
  const zoomButtonClass =
    "inline-flex size-8 items-center justify-center rounded-full border border-primary/30 bg-white/90 text-primary transition-colors hover:bg-primary/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-white/90"
  const zoomInputClass =
    "w-16 bg-transparent text-center tabular-nums text-sm font-semibold text-foreground focus-visible:outline-none focus-visible:ring-0 disabled:cursor-not-allowed disabled:opacity-40 [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
  const previewImageStyle: CSSProperties = {
    transform: `translateY(calc(var(--preview-scroll-progress, 0) * 0px)) scale(${normalizedZoom})`,
    transformOrigin: `${cropXPercent}% ${cropYPercent}%`,
    objectPosition: `${cropXPercent}% ${cropYPercent}%`,
    willChange: "transform",
  }
 
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
              disabled={effectiveSubmitting}
              className="rounded-full bg-button-background px-10 py-5 text-base font-semibold text-button-foreground transition-transform hover:bg-button-hover-background"
            >
              {submitLabel}
            </Button>
          </div>

          {submitError ? (
            <p className="mt-4 text-right text-sm text-destructive">{submitError}</p>
          ) : null}
        </form>

        <div className="flex flex-col items-center gap-8">
          <div
            ref={previewCardRef}
            className="relative w-full max-w-sm overflow-hidden rounded-[2.5rem] border-2 border-primary/30 bg-white/80 shadow-[0_4px_2px_0.15px_rgba(0,1,0,0.15)]"
          >
            <div className="relative aspect-square w-full">
              <div className="pointer-events-none absolute inset-20 rounded-[2rem] border-2 border-primary/15" aria-hidden />
              <div
                ref={previewImageContainerRef}
                className={[
                  "absolute inset-20 overflow-hidden rounded-[1.75rem] bg-black/5 shadow-inner",
                  imagePreview ? (isDraggingCrop ? "cursor-grabbing" : "cursor-grab") : "",
                  imagePreview ? "select-none touch-none" : "",
                ]
                  .filter(Boolean)
                  .join(" ")}
                onPointerDown={handleCropPointerDown}
                onPointerMove={handleCropPointerMove}
                onPointerUp={endCropDragging}
                onPointerCancel={endCropDragging}
              >
                {imagePreview ? (
                  <>
                    <img
                      src={imagePreview}
                      alt="Selected preview"
                      className="h-full w-full object-cover transition-transform duration-500 ease-out"
                      style={previewImageStyle}
                    />
                    <div className="pointer-events-none absolute inset-0 ring-1 ring-inset ring-white/40" aria-hidden />
                  </>
                ) : (
                  <div
                    className="flex h-full w-full flex-col items-center justify-center gap-4 text-primary transition-[transform,opacity] duration-500 ease-out"
                    style={{
                      transform: "translateY(calc(var(--preview-scroll-progress, 0) * 0px))",
                      opacity: "calc(0.6 + var(--preview-scroll-opacity, 1) - 1)",
                    }}
                  >
                    <ImageIcon className="size-16" />
                    <p className="text-base font-medium">Project image</p>
                  </div>
                )}
              </div>
            </div>
            {imagePreview ? (
              <div className="flex items-center justify-center gap-4 px-4 pb-6 text-sm text-muted-foreground">
                <div className="flex items-center gap-2 rounded-full border border-primary/20 bg-white/70 px-3 py-1.5 shadow-sm backdrop-blur-sm">
                  <button
                    type="button"
                    onClick={handleZoomOut}
                    className={zoomButtonClass}
                    disabled={isZoomOutDisabled}
                    aria-label="Zoom out"
                  >
                    <Minus className="size-4" aria-hidden />
                  </button>
                  <div className="flex items-center gap-1">
                    <input
                      type="number"
                      inputMode="decimal"
                      min={MIN_ZOOM.toFixed(2)}
                      max={MAX_ZOOM.toFixed(2)}
                      step="0.01"
                      value={zoomInputValue}
                      onChange={handleZoomInputChange}
                      onBlur={handleZoomInputBlur}
                      onKeyDown={handleZoomInputKeyDown}
                      className={zoomInputClass}
                      aria-label="Set zoom level"
                      disabled={!imagePreview}
                    />
                    <span className="text-sm font-semibold text-foreground">x</span>
                  </div>
                  <button
                    type="button"
                    onClick={handleZoomIn}
                    className={zoomButtonClass}
                    disabled={isZoomInDisabled}
                    aria-label="Zoom in"
                  >
                    <Plus className="size-4" aria-hidden />
                  </button>
                </div>
              </div>
            ) : null}
          </div>

          {selectedImageName ? (
            <p className="text-sm text-muted-foreground">{selectedImageName}</p>
          ) : null}
          {imagePreview ? (
            <p className="text-xs text-muted-foreground">
              Drag the image to choose which area appears in the square preview.
            </p>
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

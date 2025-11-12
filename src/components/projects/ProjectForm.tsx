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
import { useNotifications } from "@/components/notifications/Notification"
import { ERROR_MESSAGES } from "@/constants/error"
import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip"
import { TOOLTIP_DELAY_DURATION_MS } from "@/constants/ui"

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
  imageRemoved: boolean
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
  const [activeDepartmentIndex, setActiveDepartmentIndex] = useState<number>(
    normalizedInitial.departments.length > 0 ? 0 : -1
  )
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
  const [imageRemoved, setImageRemoved] = useState(false)
  const objectUrlRef = useRef<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const departmentInputRef = useRef<HTMLInputElement | null>(null)
  const previewCardRef = useRef<HTMLDivElement | null>(null)
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
  const { notify } = useNotifications()

  const openImageFilePicker = () => {
    fileInputRef.current?.click()
  }


  useEffect(() => {
    setTitle(normalizedInitial.title)
    setDetail(normalizedInitial.detail)
    setDepartments([...normalizedInitial.departments])
    setDepartmentInput("")
    setActiveDepartmentIndex(normalizedInitial.departments.length > 0 ? 0 : -1)
    setImagePreview(normalizedInitial.imageUrl)
    setImageCropPosition(normalizedInitial.imageCropPosition)
    setSelectedImageName(null)
    setImageFile(null)
    setImageRemoved(false)
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

  const applyCropDelta = (container: HTMLDivElement, deltaX: number, deltaY: number) => {
    if (!imagePreview) {
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

    applyCropDelta(event.currentTarget, deltaX, deltaY)
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
    if (!trimmed) {
      const { title, description } = ERROR_MESSAGES.emptyDepartment
      notify({
        title,
        description,
        variant: "destructive",
      })
      return
    }
    setDepartmentInput("")
    setDepartments((prev) => {
      if (prev.some((dept) => dept.toLowerCase() === trimmed.toLowerCase())) {
        return prev
      }
      const next = [...prev, trimmed]
      setActiveDepartmentIndex(next.length - 1)
      return next
    })
  }

  const handleRemoveDepartment = (value: string) => {
    setDepartments((prev) => {
      const indexToRemove = prev.findIndex((dept) => dept === value)
      if (indexToRemove === -1) {
        return prev
      }
      const next = prev.filter((dept) => dept !== value)
      setActiveDepartmentIndex((current) => {
        if (current === indexToRemove) {
          if (next.length === 0) {
            return -1
          }
          return Math.min(indexToRemove, next.length - 1)
        }
        if (current > indexToRemove) {
          return current - 1
        }
        return current
      })
      return next
    })
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
      setActiveDepartmentIndex((current) => {
        if (current === fromIndex) {
          return index
        }
        if (fromIndex < index) {
          if (current > fromIndex && current <= index) {
            return current - 1
          }
        } else if (fromIndex > index) {
          if (current >= index && current < fromIndex) {
            return current + 1
          }
        }
        return current
      })
      return updated
    })

    setDragOverIndex(null)
    setDraggingIndex(null)
    draggedDepartmentIndexRef.current = null
  }

  const handleDepartmentChipKeyDown = (event: KeyboardEvent<HTMLSpanElement>, index: number) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault()
      setActiveDepartmentIndex(index)
    }
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

  const handleClearImage = () => {
    if (objectUrlRef.current) {
      URL.revokeObjectURL(objectUrlRef.current)
      objectUrlRef.current = null
    }
    croppedImageCacheRef.current = null
    setImagePreview(null)
    setSelectedImageName(null)
    setImageFile(null)
    setImageCropPosition(null)
    setImageZoom(DEFAULT_ZOOM)
    setZoomInputValue(DEFAULT_ZOOM.toFixed(2))
    setImageRemoved(true)
    if (fileInputRef.current) {
      fileInputRef.current.value = ""
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
    setImageRemoved(false)
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

    if (!title.trim()) {
      notify({
        title: "Project title required",
        description: "Please enter a project title before submitting.",
        variant: "destructive",
      })
      return
    }

    if (departments.length === 0) {
      notify({
        title: "At least one department",
        description: "Add at least one department to categorize this project.",
        variant: "destructive",
      })
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
      imageRemoved,
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
  const imageDialogTriggerLabel = imagePreview ? "Edit Image" : "Add Image"

  const renderImagePreviewCard = ({
    attachScrollRef = false,
    interactive = false,
  }: {
    attachScrollRef?: boolean
    interactive?: boolean
  }) => (
    <div
      ref={attachScrollRef ? previewCardRef : undefined}
      className="relative w-4/5 max-w-md sm:max-w-lg xl:max-w-xl overflow-hidden rounded-[2.5rem] border-2 border-primary/30 bg-white/80 shadow-[0_2px_6px_rgba(0,0,0,0.12)]"
    >
      <div className="relative aspect-square w-full">
        <div className="pointer-events-none absolute inset-8 rounded-[2rem] border-2 border-primary/15" aria-hidden />
        <div
          className={[
            "absolute inset-8 overflow-hidden rounded-[1.75rem] bg-black/5 shadow-inner",
            interactive && imagePreview ? (isDraggingCrop ? "cursor-grabbing" : "cursor-grab") : "",
            interactive && imagePreview ? "select-none touch-none" : "",
          ]
            .filter(Boolean)
            .join(" ")}
          onPointerDown={interactive ? handleCropPointerDown : undefined}
          onPointerMove={interactive ? handleCropPointerMove : undefined}
          onPointerUp={interactive ? endCropDragging : undefined}
          onPointerCancel={interactive ? endCropDragging : undefined}
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
              className="flex h-full w-full flex-col items-center justify-center gap-2 text-primary transition-[transform,opacity] duration-500 ease-out"
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
        <button
          type="button"
          onClick={handleClearImage}
          className="group absolute right-6 top-6 inline-flex size-10 items-center justify-center rounded-full border border-primary/30 bg-white/95 text-primary shadow-sm transition hover:bg-destructive/10 hover:text-destructive focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
          aria-label="Remove project image"
          data-cy="project-image-remove"
        >
          <X className="size-5" aria-hidden />
        </button>
      ) : null}
    </div>
  )

  const renderImageSection = ({ attachScrollRef = false }: { attachScrollRef?: boolean } = {}) => (
    <>
      {renderImagePreviewCard({ attachScrollRef, interactive: true })}
      <div className="mt-1 flex w-full flex-col items-center gap-3">
        <div className="flex w-full flex-wrap items-center justify-center gap-3">
          <Button
            type="button"
            onClick={openImageFilePicker}
            className="rounded-full bg-button-background px-8 py-5 text-base font-semibold text-button-foreground transition-transform hover:bg-button-hover-background"
            data-cy="project-image-add"
          >
            {imageDialogTriggerLabel}
          </Button>
          {imagePreview ? (
            <div className="flex items-center gap-2 rounded-full border border-primary/20 bg-white/70 px-3 py-1.5 shadow-sm backdrop-blur-sm">
              <button
                type="button"
                onClick={handleZoomOut}
                className={zoomButtonClass}
                disabled={isZoomOutDisabled}
                aria-label="Zoom out"
                data-cy="project-image-zoom-out"
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
                  data-cy="project-image-zoom-input"
                />
                <span className="text-sm font-semibold text-foreground">x</span>
              </div>
              <button
                type="button"
                onClick={handleZoomIn}
                className={zoomButtonClass}
                disabled={isZoomInDisabled}
                aria-label="Zoom in"
                data-cy="project-image-zoom-in"
              >
                <Plus className="size-4" aria-hidden />
              </button>
            </div>
          ) : null}
        </div>
        <p className="px-6 text-center text-sm text-muted-foreground">
          {imagePreview
            ? "Drag the image and use zoom to fine-tune the square preview."
            : "Add an image to make your project stand out."}
        </p>
      </div>
    </>
  )
 
  return (
    <div
      className={[
        "w-full max-w-full mx-auto px-[clamp(1.5rem,4vw,6rem)] pb-[clamp(2rem,6vh,4rem)]",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
    >
      <div className="grid items-start gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:gap-16">
        <form
          onSubmit={handleSubmit} //0px 3px 5px 1px rgba(0, 0, 0, 0.25)
          className="rounded-[2.5rem] border-2 border-primary/30 bg-card-project px-10 pt-4 pb-8 shadow-[0_2px_6px_rgba(0,0,0,0.12)]"
        >
          <h1 className="text-3xl font-bold text-foreground">{heading}</h1>

          <div className="mt-4 space-y-4">
            <div className="space-y-3">
              <div className="flex flex-wrap items-center gap-3">
                <label className="flex-1 min-w-0">
                  {/*<span className="text-lg font-semibold text-foreground">Project Title</span>*/}
                  <Input
                    value={title}
                    onChange={(event) => setTitle(event.target.value)}
                    placeholder="Project Title"
                    className="h-12 w-full max-w-2xl rounded-[2rem] border-2 border-primary/40 bg-white/80 px-6 text-lg font-semibold text-foreground placeholder:text-primary/60"
                    data-cy="project-title-input"
                  />
                </label>
              </div>
            </div>

            <label className="block space-y-3">
              {/*<span className="text-lg font-semibold text-foreground">Add detail</span>*/}
              <div className="group/textarea overflow-hidden rounded-[1rem] border-2 border-primary/40 bg-white/80 transition-[box-shadow,border-color] focus-within:border-primary focus-within:shadow-[0_0_0_3px_rgba(0,0,0,0.25)]">
                <Textarea
                  value={detail}
                  onChange={(event) => setDetail(event.target.value)}
                  placeholder="Add Detail"
                  className="project-detail-scroll min-h-[10rem] w-full resize-y rounded-[inherit] border-none bg-transparent px-6 py-2 text-base text-foreground placeholder:text-primary/60 shadow-none focus-visible:outline-none focus-visible:ring-0"
                  data-cy="project-detail-textarea"
                />
              </div>
            </label>

            <div className="space-y-2">
              <span className="text-lg font-semibold text-foreground">Department</span>
              <div className="mt-1 flex flex-wrap gap-3">
                {departments.map((dept, index) => {
                  const isDragOver = dragOverIndex === index
                  const isDragging = draggingIndex === index
                  const isActive = index === activeDepartmentIndex

                  const chipClassName = [
                    departmentChipClass,
                    isActive
                      ? "border-primary bg-[#E9E0FF] text-[#2F2766] shadow-[0_2px_0_rgba(144,122,214,0.22)]"
                      : "",
                    isDragOver ? "border-primary bg-primary/10" : "",
                    isDragging ? "cursor-grabbing opacity-80" : "",
                  ]
                    .filter(Boolean)
                    .join(" ")

                  return (
                    <Tooltip key={`department-chip-tooltip-${dept}-${index}`} delayDuration={TOOLTIP_DELAY_DURATION_MS}>
                      <TooltipTrigger asChild>
                        <span
                          className={chipClassName}
                          draggable
                          role="button"
                          tabIndex={0}
                          aria-pressed={isActive}
                          aria-grabbed={isDragging}
                          onFocus={() => setActiveDepartmentIndex(index)}
                          onClick={() => setActiveDepartmentIndex(index)}
                          onKeyDown={(event) => handleDepartmentChipKeyDown(event, index)}
                          onDoubleClick={() => {
                            setDepartmentInput(dept)
                            setDepartments((prev) => {
                              const next = [...prev]
                              next.splice(index, 1)
                              return next
                            })
                            setTimeout(() => {
                              if (departmentInputRef.current) {
                                departmentInputRef.current.focus()
                                departmentInputRef.current.select()
                              }
                            }, 0)
                          }}
                          onDragStart={(event) => handleDepartmentDragStart(event, index)}
                          onDragOver={(event) => handleDepartmentDragOver(event, index)}
                          onDrop={(event) => handleDepartmentDrop(event, index)}
                          onDragEnd={handleDepartmentDragEnd}
                          data-active={isActive || undefined}
                        >
                          <span className="inline-flex items-center gap-2">
                            <GripVertical
                              className={`size-4 ${isActive ? "text-primary" : "text-primary/60"}`}
                              aria-hidden
                            />
                            <span className="max-w-[12rem] truncate" title={dept}>
                              {dept}
                            </span>
                          </span>
                          <button
                            type="button"
                            onClick={(event) => {
                              event.stopPropagation()
                              handleRemoveDepartment(dept)
                            }}
                            className={`${chipActionButtonClass} ml-auto`}
                            aria-label={`Remove ${dept}`}
                            data-cy="project-department-remove"
                            data-department={dept}
                          >
                            <X className="size-4" />
                          </button>
                        </span>
                      </TooltipTrigger>
                      <TooltipContent side="top" sideOffset={6}>
                        Double-click to edit
                      </TooltipContent>
                    </Tooltip>
                  )
                })}
              </div>
              <div className="relative">
                <button
                  type="button"
                  onClick={handleAddDepartment}
                  aria-label="Add department"
                  className="absolute left-5 top-1/2 -translate-y-1/2 cursor-pointer text-primary/60 transition hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
                >
                  <Plus className="size-5" />
                </button>
                <Input
                  ref={departmentInputRef}
                  value={departmentInput}
                  onChange={(event) => {
                    setDepartmentInput(event.target.value)
                  }}
                  onKeyDown={handleDepartmentKeyDown}
                  placeholder="Add"
                  className="h-14 rounded-[2rem] border-2 border-primary/40 bg-white/80 pl-12 pr-4 text-base font-medium text-foreground placeholder:text-primary/60"
                  data-cy="project-department-input"
                />
              </div>
            </div>
          </div>

          <div className="mt-6 flex justify-end">
            <Button
              type="submit"
              disabled={effectiveSubmitting}
              className="rounded-full bg-button-background px-10 py-5 text-base font-semibold text-button-foreground transition-transform hover:bg-button-hover-background"
              data-cy="project-submit-button"
            >
              {submitLabel}
            </Button>
          </div>

        </form>

        <div className="mt-10 flex w-full flex-col items-center gap-6 lg:mt-12">
          {renderImageSection({ attachScrollRef: true })}
        </div>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="sr-only"
        onChange={handleImageSelect}
        data-cy="project-image-file-input"
      />
    </div>
  )
}

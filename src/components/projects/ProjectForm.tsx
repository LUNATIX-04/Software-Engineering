"use client"

import {
  ChangeEvent,
  DragEvent,
  FormEvent,
  KeyboardEvent,
  PointerEvent,
  type CSSProperties,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Check, GripVertical, Image as ImageIcon, Minus, Plus, X } from "lucide-react"
import { useNotifications } from "@/components/notifications/Notification"
import { ERROR_MESSAGES } from "@/constants/error"
import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip"
import { TOOLTIP_DELAY_DURATION_MS } from "@/constants/ui"
import { cn } from "@/lib/utils"
import {
  DEFAULT_CROP_POSITION,
  DEFAULT_ZOOM,
  MIN_ZOOM,
  MAX_ZOOM,
  ZOOM_STEP,
  clampPercent,
  clampZoom,
  ensureCropPosition,
  generateCroppedFile,
} from "./ProjectForm/imageUtils"
import {
  DepartmentChipVariant,
  ImageCropSelection,
  ProjectFormInitialValues,
  ProjectFormValues,
} from "./ProjectForm/types"
import DepartmentColorMenu, { QUICK_DEPARTMENT_COLORS } from "@/components/projects/DepartmentColorMenu"
import { computeTextColor, sanitizeHexColor } from "@/utils/colors"
import DepartmentDeleteDialog from "@/app/projects/[projectId]/department/components/DepartmentDeleteDialog"

const FALLBACK_DEPARTMENTS: string[] = []
const DEFAULT_DEPARTMENT_COLOR = "#E9E0FF"

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
      departmentColors: initialValues?.departmentColors ?? undefined,
    }
  }, [defaultDepartments, initialValues])

  const [title, setTitle] = useState(normalizedInitial.title)
  const [detail, setDetail] = useState(normalizedInitial.detail)
  const [departments, setDepartments] = useState<string[]>([...normalizedInitial.departments])
  const [activeDepartmentIndex, setActiveDepartmentIndex] = useState<number>(
    normalizedInitial.departments.length > 0 ? 0 : -1
  )
  const [previewDeptId, setPreviewDeptId] = useState<string | null>(null)
  const [previewColor, setPreviewColor] = useState<string | null>(null)
  const [editingDepartmentId, setEditingDepartmentId] = useState<string | null>(null)
  const [editingDepartmentName, setEditingDepartmentName] = useState("")
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null)
  const buildInitialDepartmentStyles = useCallback(
    (names: string[]) => {
      const styles: Record<string, { color: string; textColor: string }> = {}
      names.forEach((name, index) => {
        const paletteColor =
          QUICK_DEPARTMENT_COLORS[index % QUICK_DEPARTMENT_COLORS.length]?.value
        const color = sanitizeHexColor(
          normalizedInitial.departmentColors?.[name]?.color ?? paletteColor ?? DEFAULT_DEPARTMENT_COLOR
        )
        const textColor =
          normalizedInitial.departmentColors?.[name]?.textColor ?? computeTextColor(color)
        styles[name] = { color, textColor }
      })
      return styles
    },
    [normalizedInitial.departmentColors]
  )
  const [departmentStyles, setDepartmentStyles] = useState<Record<string, { color: string; textColor: string }>>(
    buildInitialDepartmentStyles(normalizedInitial.departments)
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
    setDepartmentStyles(buildInitialDepartmentStyles(normalizedInitial.departments))
    setPreviewDeptId(null)
    setPreviewColor(null)
  }, [buildInitialDepartmentStyles, normalizedInitial])

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
      setDepartmentStyles((prevStyles) => {
        if (prevStyles[trimmed]) {
          return prevStyles
        }
        const paletteColor =
          QUICK_DEPARTMENT_COLORS[next.length % QUICK_DEPARTMENT_COLORS.length]?.value ??
          DEFAULT_DEPARTMENT_COLOR
        const color = sanitizeHexColor(paletteColor)
        return {
          ...prevStyles,
          [trimmed]: {
            color,
            textColor: computeTextColor(color),
          },
        }
      })
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
    setDepartmentStyles((prev) => {
      if (!prev[value]) {
        return prev
      }
      const next = { ...prev }
      delete next[value]
      return next
    })
    if (editingDepartmentId === value) {
      setEditingDepartmentId(null)
      setEditingDepartmentName("")
    }
  }

  const handleDepartmentColorChange = useCallback(
    (name: string, color: string) => {
      const sanitized = sanitizeHexColor(color)
      setDepartmentStyles((prev) => ({
        ...prev,
        [name]: {
          color: sanitized,
          textColor: computeTextColor(sanitized),
        },
      }))
      setPreviewColor((current) => (name === previewDeptId ? sanitized : current))
    },
    [previewDeptId]
  )

  const handleDepartmentDragStart = (event: DragEvent<HTMLSpanElement>, index: number) => {
    if (editingDepartmentId) {
      event.preventDefault()
      return
    }
    draggedDepartmentIndexRef.current = index
    setDraggingIndex(index)
    event.dataTransfer?.setData("text/plain", String(index))
    if (event.dataTransfer) {
      event.dataTransfer.effectAllowed = "move"
    }
  }

  const handleDepartmentDragOver = (event: DragEvent<HTMLSpanElement>, index: number) => {
    if (editingDepartmentId) {
      event.preventDefault()
      return
    }
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
    if (editingDepartmentId) {
      event.preventDefault()
      return
    }
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

  const startEditingDepartment = (value: string) => {
    setEditingDepartmentId(value)
    setEditingDepartmentName(value)
  }

  const cancelEditingDepartment = () => {
    setEditingDepartmentId(null)
    setEditingDepartmentName("")
  }

  const confirmRemoveDepartment = () => {
    if (!deleteTarget) {
      return
    }
    handleRemoveDepartment(deleteTarget)
    setDeleteDialogOpen(false)
    setDeleteTarget(null)
  }

  const commitEditingDepartment = (original: string) => {
    const trimmed = editingDepartmentName.trim()
    if (!trimmed) {
      notify({
        title: "Department name required",
        description: "Please enter a department name.",
        variant: "destructive",
      })
      return
    }
    if (trimmed === original) {
      setEditingDepartmentId(null)
      setEditingDepartmentName("")
      return
    }
    if (trimmed !== original && departments.some((name) => name.toLowerCase() === trimmed.toLowerCase())) {
      notify({
        title: "Duplicate department",
        description: "A department with this name already exists.",
        variant: "destructive",
      })
      return
    }

    setDepartments((prev) =>
      prev.map((name) => (name === original ? trimmed : name))
    )
    setDepartmentStyles((prev) => {
      if (!prev[original]) {
        return prev
      }
      const next = { ...prev, [trimmed]: prev[original] }
      delete next[original]
      return next
    })
    setEditingDepartmentId(null)
    setEditingDepartmentName("")
  }

  const handleDepartmentChipKeyDown = (event: KeyboardEvent<HTMLSpanElement>, index: number) => {
    const dept = departments[index]
    if (editingDepartmentId === dept) {
      if (event.key === "Enter") {
        event.preventDefault()
        commitEditingDepartment(dept)
      } else if (event.key === "Escape") {
        event.preventDefault()
        cancelEditingDepartment()
      }
      return
    }
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
      departmentColors: departmentStyles,
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
              <div className="textarea-surface group/textarea overflow-hidden rounded-[1rem]">
                <Textarea
                  value={detail}
                  onChange={(event) => setDetail(event.target.value)}
                  placeholder="Add Detail"
                  className="project-detail-scroll min-h-[10rem] w-full resize-y rounded-[inherit] border-none bg-transparent px-6 py-2 text-base shadow-none focus-visible:outline-none focus-visible:ring-0"
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
                  const baseChipColors = departmentStyles[dept] ?? {
                    color: DEFAULT_DEPARTMENT_COLOR,
                    textColor: computeTextColor(DEFAULT_DEPARTMENT_COLOR),
                  }
                  const chipColors =
                    previewDeptId === dept && previewColor
                      ? { color: previewColor, textColor: computeTextColor(previewColor) }
                      : baseChipColors
                  const chipStyle = {
                    backgroundColor: chipColors.color,
                    color: chipColors.textColor,
                    borderColor: isActive ? "var(--primary)" : "color-mix(in srgb, var(--primary) 15%, #cccccc)",
                  }

                  const chipClassName = [
                    departmentChipClass,
                    isActive
                      ? "border-primary shadow-[0_2px_0_rgba(144,122,214,0.22)]"
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
                          role="button"
                          tabIndex={0}
                          aria-pressed={isActive}
                          aria-grabbed={isDragging}
                          onFocus={() => setActiveDepartmentIndex(index)}
                          onClick={() => setActiveDepartmentIndex(index)}
                          onKeyDown={(event) => handleDepartmentChipKeyDown(event, index)}
                          onDoubleClick={() => startEditingDepartment(dept)}
                          onDragStart={(event) => handleDepartmentDragStart(event, index)}
                          onDragOver={(event) => handleDepartmentDragOver(event, index)}
                          onDrop={(event) => handleDepartmentDrop(event, index)}
                          onDragEnd={handleDepartmentDragEnd}
                          data-active={isActive || undefined}
                          style={chipStyle as CSSProperties}
                          draggable={!editingDepartmentId}
                        >
                          {editingDepartmentId === dept ? (
                            <span className="relative inline-flex flex-1 items-center min-w-0 gap-3">
                              <button
                                type="button"
                                onClick={(event) => {
                                  event.stopPropagation()
                                  commitEditingDepartment(dept)
                                }}
                                className="absolute -left-9 top-1/2 size-8 -translate-y-1/2 inline-flex items-center justify-center rounded-full border border-primary/40 bg-white/80 text-primary shadow-sm transition hover:border-primary/60 hover:bg-primary/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
                                aria-label={`Save ${dept}`}
                                data-cy="project-department-save"
                                data-department={dept}
                              >
                                <Check className="size-4" />
                              </button>
                              <Input
                                value={editingDepartmentName}
                                onChange={(event) => setEditingDepartmentName(event.target.value)}
                                onKeyDown={(event) => {
                                  if (event.key === "Enter") {
                                    event.preventDefault()
                                    commitEditingDepartment(dept)
                                  }
                                  if (event.key === "Escape") {
                                    event.preventDefault()
                                    cancelEditingDepartment()
                                  }
                                }}
                                className="max-w-[30rem] flex-1 truncate rounded-lg bg-white/70 pl-2 text-sm font-semibold text-foreground shadow-sm"
                                autoFocus
                              />
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-2">
                              <GripVertical
                                className={`size-4 ${isActive ? "text-primary" : "text-primary/60"}`}
                                aria-hidden
                              />
                              <span className="max-w-[12rem] truncate" title={dept}>
                                {dept}
                              </span>
                            </span>
                          )}
                          <span className="ml-auto inline-flex items-center gap-2">
                            <DepartmentColorMenu
                              color={baseChipColors.color}
                              quickColors={QUICK_DEPARTMENT_COLORS}
                              onSelectColor={(color) => {
                                handleDepartmentColorChange(dept, color)
                                setPreviewDeptId(null)
                                setPreviewColor(null)
                              }}
                              onPreviewColor={(color) => {
                                setPreviewDeptId(color ? dept : null)
                                setPreviewColor(color)
                              }}
                              onOpenChange={(open) => {
                                if (!open) {
                                  setPreviewDeptId(null)
                                  setPreviewColor(null)
                                }
                              }}
                              trigger={
                                <button
                                  type="button"
                                  className="inline-flex size-8 items-center justify-center rounded-full border border-white/60 bg-white/60 text-primary shadow-sm transition hover:border-white/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
                                  aria-label={`Change ${dept} color`}
                                  onClick={(event) => event.stopPropagation()}
                                >
                                  <span
                                    className="block size-4 rounded-full border border-black/10"
                                    style={{ backgroundColor: chipColors.color }}
                                  />
                                </button>
                              }
                            />
                            {editingDepartmentId === dept ? (
                              <>
                                <button
                                  type="button"
                                  onClick={(event) => {
                                    event.stopPropagation()
                                    cancelEditingDepartment()
                                  }}
                                  className={chipActionButtonClass}
                                  aria-label={`Cancel editing ${dept}`}
                                  data-cy="project-department-cancel"
                                  data-department={dept}
                                >
                                  <X className="size-4" />
                                </button>
                              </>
                            ) : (
                              <button
                                type="button"
                                onClick={(event) => {
                                  event.stopPropagation()
                                  setDeleteTarget(dept)
                                  setDeleteDialogOpen(true)
                                }}
                                className={chipActionButtonClass}
                                aria-label={`Remove ${dept}`}
                                data-cy="project-department-remove"
                                data-department={dept}
                              >
                                <X className="size-4" />
                              </button>
                            )}
                          </span>
                        </span>
                      </TooltipTrigger>
                      {editingDepartmentId === dept ? null : (
                        <TooltipContent side="top" sideOffset={6}>
                          Double-click to edit
                        </TooltipContent>
                      )}
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

      <DepartmentDeleteDialog
        open={deleteDialogOpen}
        onOpenChange={(open) => {
          setDeleteDialogOpen(open)
          if (!open) {
            setDeleteTarget(null)
          }
        }}
        departmentName={deleteTarget ?? ""}
        onConfirm={confirmRemoveDepartment}
        deleting={false}
      />
    </div>
  )
}

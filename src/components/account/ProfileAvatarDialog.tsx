"use client"

import Image from "next/image"
import {
  ChangeEvent,
  PointerEvent,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react"
import { Loader2, Minus, Plus, Upload, X } from "lucide-react"

import {
  DEFAULT_CROP_POSITION,
  DEFAULT_ZOOM,
  MAX_ZOOM,
  MIN_ZOOM,
  ZOOM_STEP,
  clampPercent,
  clampZoom,
  ensureCropPosition,
  generateCroppedFile,
  type CropPreparationSource,
  type ImageCropSelection,
} from "@/utils/images/crop"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { cn } from "@/lib/utils"
import { useNotifications } from "@/components/notifications/Notification"

type ProfileAvatarDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  initialImageUrl: string | null
  fallbackImageUrl?: string | null
  fallbackLetter: string
  onComplete: (file: File) => void
}

export function ProfileAvatarDialog({
  open,
  onOpenChange,
  initialImageUrl,
  fallbackImageUrl,
  fallbackLetter,
  onComplete,
}: ProfileAvatarDialogProps) {
  const { notify } = useNotifications()
  const [imagePreview, setImagePreview] = useState<string | null>(initialImageUrl)
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [imageCropPosition, setImageCropPosition] = useState<ImageCropSelection | null>(null)
  const [imageZoom, setImageZoom] = useState(DEFAULT_ZOOM)
  const [zoomInputValue, setZoomInputValue] = useState(DEFAULT_ZOOM.toFixed(2))
  const [isDraggingCrop, setIsDraggingCrop] = useState(false)
  const [saving, setSaving] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const previewCardRef = useRef<HTMLDivElement | null>(null)
  const objectUrlRef = useRef<string | null>(null)
  const dragStartRef = useRef<{ x: number; y: number } | null>(null)
  const cropSourceRef = useRef<CropPreparationSource>({ file: null, url: "" })
  const showAvatarError = useCallback(
    (message: string) => {
      setErrorMessage(message)
      notify({
        title: "Update photo failed",
        description: message,
        variant: "destructive",
      })
    },
    [notify]
  )

  const buildProxyUrl = useCallback((url: string) => {
    if (url.startsWith("/api/account/avatar/proxy")) {
      return url
    }
    if (url.startsWith("http://") || url.startsWith("https://")) {
      return `/api/account/avatar/proxy?url=${encodeURIComponent(url)}`
    }
    return url
  }, [])

  const setCropSourceFromUrl = useCallback(
    (url: string | null) => {
      if (!url) {
        cropSourceRef.current = { file: null, url: "" }
        return
      }
      cropSourceRef.current = { file: null, url: buildProxyUrl(url) }
    },
    [buildProxyUrl]
  )

  const resolvedFallbackPreview = useMemo(
    () => initialImageUrl ?? fallbackImageUrl ?? null,
    [fallbackImageUrl, initialImageUrl]
  )

  useEffect(() => {
    if (!open) {
      cleanupObjectUrl()
      setImageFile(null)
      setImagePreview(resolvedFallbackPreview)
      setImageZoom(DEFAULT_ZOOM)
      setZoomInputValue(DEFAULT_ZOOM.toFixed(2))
      setImageCropPosition(null)
      setIsDraggingCrop(false)
      setCropSourceFromUrl(resolvedFallbackPreview)
      setErrorMessage(null)
      return
    }

    if (imageFile) {
      cropSourceRef.current = { file: imageFile, url: "" }
      setErrorMessage(null)
      return
    }

    if (imagePreview) {
      setCropSourceFromUrl(imagePreview)
      setErrorMessage(null)
      return
    }

    const seedUrl = initialImageUrl ?? fallbackImageUrl ?? null
    if (seedUrl) {
      setImagePreview(seedUrl)
      setImageCropPosition({ ...DEFAULT_CROP_POSITION })
      setCropSourceFromUrl(seedUrl)
    } else {
      setImagePreview(null)
      setImageCropPosition(null)
      setCropSourceFromUrl(null)
    }

    setErrorMessage(null)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, initialImageUrl, fallbackImageUrl, imageFile, imagePreview])

  useEffect(() => {
    return () => {
      cleanupObjectUrl()
    }
  }, [])

  const cleanupObjectUrl = () => {
    if (objectUrlRef.current) {
      URL.revokeObjectURL(objectUrlRef.current)
      objectUrlRef.current = null
    }
  }

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) {
      return
    }
    const previewUrl = URL.createObjectURL(file)
    cleanupObjectUrl()
    objectUrlRef.current = previewUrl

    setImagePreview(previewUrl)
    setImageFile(file)
    setImageCropPosition({ ...DEFAULT_CROP_POSITION })
    setImageZoom(DEFAULT_ZOOM)
    setZoomInputValue(DEFAULT_ZOOM.toFixed(2))
    setErrorMessage(null)
    cropSourceRef.current = { file, url: "" }
  }

  const applyCropDelta = (container: HTMLDivElement, deltaX: number, deltaY: number) => {
    setImageCropPosition((prev) => {
      const base = ensureCropPosition(prev)
      const rect = container.getBoundingClientRect()
      const percentDeltaX = (deltaX / rect.width) * 100
      const percentDeltaY = (deltaY / rect.height) * 100
      const adjustedX = clampPercent(base.xPercent - percentDeltaX)
      const adjustedY = clampPercent(base.yPercent - percentDeltaY)
      return { xPercent: adjustedX, yPercent: adjustedY }
    })
  }

  const handleCropPointerDown = (event: PointerEvent<HTMLDivElement>) => {
    if (!imagePreview) {
      return
    }
    event.currentTarget.setPointerCapture(event.pointerId)
    dragStartRef.current = { x: event.clientX, y: event.clientY }
    setIsDraggingCrop(true)
    event.preventDefault()
  }

  const handleCropPointerMove = (event: PointerEvent<HTMLDivElement>) => {
    if (!isDraggingCrop || !dragStartRef.current) {
      return
    }
    const container = event.currentTarget
    const deltaX = event.clientX - dragStartRef.current.x
    const deltaY = event.clientY - dragStartRef.current.y
    dragStartRef.current = { x: event.clientX, y: event.clientY }
    applyCropDelta(container, deltaX, deltaY)
  }

  const endCropDragging = (event: PointerEvent<HTMLDivElement>) => {
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId)
    }
    dragStartRef.current = null
    setIsDraggingCrop(false)
  }

  const normalizedZoom = clampZoom(imageZoom)
  const cropXPercent = imageCropPosition?.xPercent ?? DEFAULT_CROP_POSITION.xPercent
  const cropYPercent = imageCropPosition?.yPercent ?? DEFAULT_CROP_POSITION.yPercent

  const previewImageStyle = useMemo(() => {
    return {
      transform: `scale(${normalizedZoom})`,
      transformOrigin: `${cropXPercent}% ${cropYPercent}%`,
      objectPosition: `${cropXPercent}% ${cropYPercent}%`,
    }
  }, [cropXPercent, cropYPercent, normalizedZoom])

  const handleZoomChange = (next: number) => {
    const clamped = clampZoom(next)
    setImageZoom(clamped)
    setZoomInputValue(clamped.toFixed(2))
  }

  const handleZoomInputChange = (event: ChangeEvent<HTMLInputElement>) => {
    setZoomInputValue(event.target.value)
  }

  const handleZoomInputBlur = () => {
    const parsed = Number(zoomInputValue)
    if (Number.isNaN(parsed)) {
      setZoomInputValue(normalizedZoom.toFixed(2))
      return
    }
    handleZoomChange(parsed)
  }

  const handleZoomInputKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Enter") {
      handleZoomInputBlur()
    }
  }

  const handleSave = async () => {
    const source = cropSourceRef.current
    if (!source.file && (!source.url || source.url.length === 0)) {
      showAvatarError("Please select an image to upload.")
      return
    }
    setSaving(true)
    setErrorMessage(null)
    try {
      const cropPosition = ensureCropPosition(imageCropPosition)
      const croppedFile = await generateCroppedFile(source, cropPosition, normalizedZoom)
      onComplete(croppedFile)
      onOpenChange(false)
    } catch (error) {
      const message =
        error instanceof Error && error.message.length > 0
          ? error.message
          : "Unable to save your profile photo."
      showAvatarError(message)
    } finally {
      setSaving(false)
    }
  }

  const handleDialogChange = (nextOpen: boolean) => {
    if (!nextOpen) {
      cleanupObjectUrl()
      setImageFile(null)
      setImageZoom(DEFAULT_ZOOM)
      setZoomInputValue(DEFAULT_ZOOM.toFixed(2))
      setImageCropPosition(null)
      setIsDraggingCrop(false)
      setErrorMessage(null)
      setImagePreview(resolvedFallbackPreview)
      setCropSourceFromUrl(resolvedFallbackPreview)
    }
    onOpenChange(nextOpen)
  }

  return (
    <Dialog open={open} onOpenChange={handleDialogChange}>
      <DialogContent className="max-w-4xl rounded-[2.5rem] border border-primary/20 photo-dialog-surface px-0 py-0 shadow-2xl">
        <DialogHeader className="sr-only">
          <DialogTitle>Update profile photo</DialogTitle>
        </DialogHeader>
        <div className="grid gap-6 p-8 lg:grid-cols-[1.1fr_1fr]">
          <div className="space-y-5">
            <p className="photo-section-label text-xs font-semibold uppercase tracking-[0.35em]">Preview</p>
            <div
              ref={previewCardRef}
              className="photo-preview-card relative aspect-square overflow-hidden rounded-full"
            >
              <div className="photo-preview-frame pointer-events-none absolute inset-4 rounded-full" />
              <div
                  className={cn(
                    "photo-preview-canvas absolute inset-4 overflow-hidden rounded-full",
                    imagePreview ? (isDraggingCrop ? "cursor-grabbing" : "cursor-grab") : "",
                    imagePreview ? "touch-none select-none" : ""
                  )}
                onPointerDown={imagePreview ? handleCropPointerDown : undefined}
                onPointerMove={imagePreview ? handleCropPointerMove : undefined}
                onPointerUp={imagePreview ? endCropDragging : undefined}
                onPointerCancel={imagePreview ? endCropDragging : undefined}
              >
                {imagePreview ? (
                  <>
                    <Image
                      src={imagePreview}
                      alt="Selected preview"
                      fill
                      className="object-cover transition-transform duration-200 ease-out"
                      style={previewImageStyle}
                      sizes="(max-width: 768px) 300px, 480px"
                      priority
                      data-cy="account-avatar-preview-image"
                    />
                    <div className="pointer-events-none absolute inset-0 ring-1 ring-white/40" />
                  </>
                ) : fallbackImageUrl ? (
                  <>
                    <Image
                      src={fallbackImageUrl}
                      alt="Current avatar"
                      fill
                      className="object-cover"
                      sizes="(max-width: 768px) 300px, 480px"
                      priority
                      data-cy="account-avatar-current-image"
                    />
                    <div className="pointer-events-none absolute inset-0 ring-1 ring-white/40" />
                  </>
                ) : (
                  <div className="photo-preview-placeholder flex h-full flex-col items-center justify-center gap-3">
                    <div className="photo-placeholder-initial flex size-20 items-center justify-center rounded-full">
                      {fallbackLetter}
                    </div>
                    <p className="photo-preview-placeholder-title text-base font-semibold">Upload a square-friendly image</p>
                    <p className="photo-preview-placeholder-subtitle text-sm">JPG, PNG, or WEBP up to 5MB.</p>
                  </div>
                )}
              </div>
              <button
                type="button"
                onClick={() => {
                  cleanupObjectUrl()
                  setImageFile(null)
                  setImageZoom(DEFAULT_ZOOM)
                  setZoomInputValue(DEFAULT_ZOOM.toFixed(2))
                  setImageCropPosition(null)
                  setIsDraggingCrop(false)
                  setErrorMessage(null)
                  const fallback = fallbackImageUrl ?? initialImageUrl ?? null
                  setImagePreview(fallback)
                  setCropSourceFromUrl(fallback)
                }}
                className="photo-preview-close group absolute right-3 top-3 inline-flex size-10 items-center justify-center rounded-full shadow-sm transition"
                aria-label="Reset selected image"
              >
                <X className="size-5" />
              </button>
            </div>
          </div>
          <div className="space-y-6">
            <div className="photo-zoom-panel space-y-3 rounded-3xl p-5">
              <p className="text-xs font-semibold uppercase tracking-[0.35em] text-primary/60">
                Position & zoom
              </p>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                className="photo-zoom-button inline-flex size-9 items-center justify-center rounded-full border transition disabled:cursor-not-allowed disabled:opacity-40"
                  onClick={() => handleZoomChange(imageZoom - ZOOM_STEP)}
                  disabled={!imagePreview || normalizedZoom <= MIN_ZOOM + 0.001}
                >
                  <Minus className="size-4" />
                </button>
                <input
                  type="range"
                  min={MIN_ZOOM.toFixed(2)}
                  max={MAX_ZOOM.toFixed(2)}
                  step={ZOOM_STEP}
                  value={normalizedZoom}
                  onChange={(event) => handleZoomChange(Number(event.target.value))}
                  className="photo-zoom-range flex-1"
                  disabled={!imagePreview}
                />
                <button
                  type="button"
                className="photo-zoom-button inline-flex size-9 items-center justify-center rounded-full border transition disabled:cursor-not-allowed disabled:opacity-40"
                  onClick={() => handleZoomChange(imageZoom + ZOOM_STEP)}
                  disabled={!imagePreview || normalizedZoom >= MAX_ZOOM - 0.001}
                >
                  <Plus className="size-4" />
                </button>
              </div>
              <div className="flex items-center gap-2">
                <span className="photo-zoom-label text-sm font-semibold">Zoom</span>
                <input
                  type="number"
                  value={zoomInputValue}
                  onChange={handleZoomInputChange}
                  onBlur={handleZoomInputBlur}
                  onKeyDown={handleZoomInputKeyDown}
                  className="photo-zoom-input w-20 rounded-full border border-primary/20 px-3 py-1 text-center text-sm font-semibold"
                  min={MIN_ZOOM}
                  max={MAX_ZOOM}
                  step={ZOOM_STEP}
                  disabled={!imagePreview}
                />
              </div>
            </div>
            <div className="space-y-3">
              <Button
                type="button"
                className="photo-action-button w-full rounded-full"
                onClick={() => fileInputRef.current?.click()}
              >
                <Upload className="mr-2 size-4" />
                Choose image
              </Button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleFileChange}
              />
            </div>
            {errorMessage ? <p className="text-sm font-semibold text-destructive">{errorMessage}</p> : null}
            <div className="flex flex-wrap gap-3">
              <Button
                type="button"
                onClick={handleSave}
                disabled={saving || !imagePreview}
                className="photo-action-button flex-1 rounded-full"
              >
                {saving ? <Loader2 className="mr-2 size-4 animate-spin" /> : null}
                Save photo
              </Button>
              <Button
                type="button"
                variant="ghost"
                className="photo-action-button photo-action-button--ghost rounded-full"
                onClick={() => onOpenChange(false)}
                disabled={saving}
              >
                Cancel
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

export default ProfileAvatarDialog

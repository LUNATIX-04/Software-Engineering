"use client"

export type ImageCropSelection = {
  xPercent: number
  yPercent: number
}

export type CropPreparationSource = {
  file: File | null
  url: string
}

export const DEFAULT_CROP_POSITION: ImageCropSelection = {
  xPercent: 50,
  yPercent: 50,
}

export const DEFAULT_ZOOM = 1
export const MIN_ZOOM = 1
export const MAX_ZOOM = 10
export const ZOOM_STEP = 0.15
const CROPPED_NAME_SUFFIX = "-square"

const SUPPORTED_CANVAS_MIME_TYPES = new Set(["image/png", "image/jpeg", "image/webp"])

export function clampPercent(value: number) {
  if (Number.isNaN(value)) {
    return 50
  }
  return Math.min(100, Math.max(0, value))
}

export function clampZoom(value: number) {
  if (!Number.isFinite(value)) {
    return DEFAULT_ZOOM
  }
  return Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, value))
}

export function ensureCropPosition(position: ImageCropSelection | null | undefined): ImageCropSelection {
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

export function buildCroppedFileName(originalName: string, mimeType: string) {
  const extension = deriveExtensionFromMime(mimeType)
  const base = sanitizeBaseFileName(originalName)
  const suffix = base.endsWith(CROPPED_NAME_SUFFIX) ? "" : CROPPED_NAME_SUFFIX
  return `${base}${suffix}.${extension}`
}

export function inferNameFromUrl(url: string, mimeType: string) {
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

export async function resolveSourceBlob({ file, url }: CropPreparationSource): Promise<{
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

export async function generateCroppedFile(
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
    throw new Error("Unable to access canvas for cropping.")
  }

  context.drawImage(image, offsetX, offsetY, sourceSide, sourceSide, 0, 0, squareSize, squareSize)

  const { mimeType, quality } = resolveCanvasMimeType(originalMime)
  const outputBlob = await blobFromCanvas(canvas, mimeType, quality)
  revoke()
  const croppedFileName = buildCroppedFileName(originalName, mimeType)
  return new File([outputBlob], croppedFileName, { type: mimeType })
}

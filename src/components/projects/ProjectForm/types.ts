"use client"

export type DepartmentChipVariant = "compact" | "fullWidth"

export type ImageCropSelection = {
  xPercent: number
  yPercent: number
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

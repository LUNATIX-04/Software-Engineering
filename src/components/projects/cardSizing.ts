export type ThumbnailSizing = {
  size: string
  icon: string
  borderRadius?: string
}

export type CardFrameSizing = {
  minHeight: string
  padding: {
    top: string
    right: string
    bottom: string
    left: string
  }
  gap: string
  borderRadius: string
  shadow: string
}

export type ProjectCardSizing = {
  cardProject: CardFrameSizing
  cardCreate: CardFrameSizing
  projectThumbnail: ThumbnailSizing
  createThumbnail: ThumbnailSizing
}

export const projectCardSizing: ProjectCardSizing = {
  cardProject: {
    minHeight: "clamp(2rem, 20vh, 5rem)",
    padding: {
      top: "1rem",
      right: "1.5rem",
      bottom: "1rem",
      left: "3rem",
    },
    gap: "1.5rem",
    borderRadius: "1.5rem",
    shadow: "0px 3px 5px 1px rgba(0, 0, 0, 0.25)",
  },
  cardCreate: {
    minHeight: "clamp(2rem, 20vh, 5rem)",
    padding: {
      top: "1.5rem",
      right: "1.5rem",
      bottom: "1.5rem",
      left: "4rem",
    },
    gap: "1.5rem",
    borderRadius: "1.5rem",
    shadow: "0px 3px 5px 1px rgba(0, 0, 0, 0.25)",
  },
  projectThumbnail: {
    size: "4rem",
    icon: "1.5rem",
    borderRadius: "0.5rem",
  },
  createThumbnail: {
    size: "3rem",
    icon: "1.5rem",
    borderRadius: "9999px",
  },
}

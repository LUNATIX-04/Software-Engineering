"use client"

import type { CSSProperties } from "react"

import { Plus } from "lucide-react"

import { projectCardSizing } from "./cardSizing"

const baseCardClass = "create-card w-full rounded-3xl flex items-center select-none"

export type CreateProjectCardProps = {
  label?: string
  onClick?: () => void
}

export function CreateProjectCard({
  label = "Create Project",
  onClick,
}: CreateProjectCardProps) {
  const cardFrame = projectCardSizing.cardCreate

  const cardStyle: CSSProperties = {
    minHeight: cardFrame.minHeight,
    paddingTop: cardFrame.padding.top,
    paddingRight: cardFrame.padding.right,
    paddingBottom: cardFrame.padding.bottom,
    paddingLeft: cardFrame.padding.left,
    gap: cardFrame.gap,
    borderRadius: cardFrame.borderRadius,
    boxShadow: cardFrame.shadow,
  }

  const thumbnailStyle: CSSProperties = {
    width: projectCardSizing.createThumbnail.size,
    height: projectCardSizing.createThumbnail.size,
    borderRadius: projectCardSizing.createThumbnail.borderRadius,
  }

  const iconStyle: CSSProperties = {
    width: projectCardSizing.createThumbnail.icon,
    height: projectCardSizing.createThumbnail.icon,
  }

  return (
    <button type="button" className={baseCardClass} style={cardStyle} onClick={onClick}>
      <div
        className="create-card-thumbnail flex items-center justify-center flex-shrink-0"
        style={thumbnailStyle}
      >
        <Plus className="text-foreground" style={iconStyle} />
      </div>
      <span className="text-2xl font-bold text-foreground">{label}</span>
    </button>
  )
}

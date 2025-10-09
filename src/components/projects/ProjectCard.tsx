"use client"

import { useMemo, useState, type CSSProperties } from "react"

import Image from "next/image"

import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { ImageIcon, MoreHorizontal } from "lucide-react"

import { projectCardSizing } from "./cardSizing"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogFooter,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"

const baseCardClass = "project-card rounded-3xl flex items-center relative select-none"

export type ProjectCardProps = {
  title: string
  createdAt: string
  description: string
  imageSrc?: string
  borderRadius?: string
  onEditProject?: () => void
  onDelete?: () => Promise<void> | void
}

export function ProjectCard({
  title,
  createdAt,
  description,
  imageSrc,
  borderRadius,
  onEditProject,
  onDelete,
}: ProjectCardProps) {
  const [menuOpen, setMenuOpen] = useState(false)
  const [isHovering, setIsHovering] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const cardFrame = projectCardSizing.cardProject

  const cardStyle: CSSProperties = {
    minHeight: cardFrame.minHeight,
    paddingTop: cardFrame.padding.top,
    paddingRight: cardFrame.padding.right,
    paddingBottom: cardFrame.padding.bottom,
    paddingLeft: cardFrame.padding.left,
    gap: cardFrame.gap,
    borderRadius: borderRadius ?? cardFrame.borderRadius,
    boxShadow: cardFrame.shadow,
  }

  const thumbnailStyle: CSSProperties = {
    width: projectCardSizing.projectThumbnail.size,
    height: projectCardSizing.projectThumbnail.size,
    borderRadius: projectCardSizing.projectThumbnail.borderRadius,
  }

  const iconStyle: CSSProperties = {
    width: projectCardSizing.projectThumbnail.icon,
    height: projectCardSizing.projectThumbnail.icon,
  }

  const titleStyle: CSSProperties = {
    flexBasis: "75%",
    maxWidth: "75%",
  }

  const containerClassName = useMemo(() => {
    if (menuOpen || isHovering) {
      return `${baseCardClass} project-card--active`
    }
    return baseCardClass
  }, [isHovering, menuOpen])

  const handleDeleteClick = () => {
    setDeleteDialogOpen(true)
    setMenuOpen(false)
    setIsHovering(true)
  }

  const handleConfirmDelete = async () => {
    if (!onDelete) {
      setDeleteDialogOpen(false)
      setIsHovering(false)
      return
    }

    try {
      setDeleting(true)
      await onDelete()
      setDeleteDialogOpen(false)
    } catch (error) {
      console.error("Failed to delete project", error)
    } finally {
      setDeleting(false)
      setIsHovering(false)
    }
  }

  const handleNoConfirmDelete = () => {
    setDeleteDialogOpen(false)
    setIsHovering(false)
  }

  const handleDeleteDialogChange = (open: boolean) => {
    if (deleting) {
      return
    }
    setDeleteDialogOpen(open)
    if (open) {
      setMenuOpen(false)
      setIsHovering(false)
    }
  }

  return (
    <div
      className={containerClassName}
      style={cardStyle}
      onMouseEnter={() => setIsHovering(true)}
      onMouseLeave={() => setIsHovering(false)}
    >
      {imageSrc ? (
        <div
          className="project-card-thumbnail relative flex-shrink-0 overflow-hidden"
          style={thumbnailStyle}
        >
          <Image
            src={imageSrc}
            alt={`${title} thumbnail`}
            fill
            className="object-cover"
          />
        </div>
      ) : (
        <div
          className="project-card-thumbnail flex items-center justify-center flex-shrink-0"
          style={thumbnailStyle}
        >
          <ImageIcon className="text-foreground/40" style={iconStyle} />
        </div>
      )}

      <div className="flex min-w-0 flex-1 flex-col pr-12 gap-1">
        <div className="flex min-w-0 items-center gap-3 overflow-hidden flex-nowrap">
          <h3
            className="clamp-ellipsis-1 min-w-0 truncate-ellipsis text-2xl font-bold text-foreground"
            style={titleStyle}
          >
            {title}
          </h3>
          <span className="text-sm text-muted-foreground whitespace-nowrap flex-none ml-auto text-right">Create : {createdAt}</span>
        </div>
        <p className="clamp-ellipsis-1 min-w-0 text-foreground/70">{description}</p>
      </div>

      <DropdownMenu
        modal={false}
        onOpenChange={(open) => {
          setMenuOpen(open)
          if (!open) {
            setIsHovering(false)
          }
        }}
      >
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="absolute top-6 right-6 hover:bg-transparent"
            onMouseDown={(event) => event.preventDefault()}
          >
            <MoreHorizontal className="size-6 text-foreground" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent
          align="end"
          sideOffset={-10}
          className="w-48 bg-button-background border-none rounded-2xl p-2"
        >
          <DropdownMenuItem
            className="text-button-foreground hover:bg-button-hover-background rounded-xl py-3 px-4 cursor-pointer text-base"
            onSelect={onEditProject}
          >
            Edit Project
          </DropdownMenuItem>
          <DropdownMenuItem
            className="text-button-foreground hover:bg-button-hover-background rounded-xl py-3 px-4 cursor-pointer text-base"
            onSelect={handleDeleteClick}
          >
            Delete Project
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <AlertDialog
        open={deleteDialogOpen}
        onOpenChange={handleDeleteDialogChange}
        disableModal
      >
        <AlertDialogContent className="bg-background border-2 border-primary/30 rounded-[2rem] px-8 py-10 text-center shadow-xl">
          <AlertDialogTitle className="text-2xl font-semibold text-foreground">
            Are you sure? <br/> You want to delete this project? <br/><br/> " {title} "
          </AlertDialogTitle>
          <AlertDialogFooter className="mt-8 flex w-full flex-row justify-between sm:!justify-between gap-6">
            <AlertDialogCancel className="rounded-full bg-secondary border-none px-8 py-3 text-base font-semibold text-secondary-foreground shadow-none transition-colors hover:bg-secondary/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
            onClick={handleNoConfirmDelete}
            disabled={deleting}>
              No
            </AlertDialogCancel>
            <AlertDialogAction
              className="rounded-full bg-primary px-8 py-3 text-base font-semibold text-primary-foreground hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
              onClick={handleConfirmDelete}
              disabled={deleting}
            >
              {deleting ? "Deleting…" : "Yes"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

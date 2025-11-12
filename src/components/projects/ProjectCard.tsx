"use client"

import { useMemo, useState, type CSSProperties } from "react"

import Image from "next/image"

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { ImageIcon, LogOut, MoreHorizontal, PencilLine, Trash2, UserPen } from "lucide-react"

import { projectCardSizing } from "./cardSizing"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogFooter,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"

const baseCardClass =
  "project-card w-full rounded-3xl flex items-center relative select-none shrink-0"

export type ProjectCardProps = {
  title: string
  createdAt: string
  description: string
  imageSrc?: string
  borderRadius?: string
  onOpenProject?: () => void
  onEditProject?: () => void
  onDelete?: () => Promise<void> | void
  onChangeOwner?: () => void
  onLeaveProject?: () => void
  onPointerEnter?: () => void
  canEdit?: boolean
  canDelete?: boolean
  canChangeOwner?: boolean
  canLeave?: boolean
  isOwnerCard?: boolean
  dataCyIndex?: number
}

export function ProjectCard({
  title,
  createdAt,
  description,
  imageSrc,
  borderRadius,
  onOpenProject,
  onEditProject,
  onDelete,
  onChangeOwner,
  onLeaveProject,
  onPointerEnter,
  canEdit = false,
  canDelete = false,
  canChangeOwner = false,
  canLeave = true,
  isOwnerCard = false,
  dataCyIndex,
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
    const interactiveClass = onOpenProject
      ? "cursor-pointer focus:outline-none focus-visible:ring-4 focus-visible:ring-primary/40"
      : ""
    const ownerClass = isOwnerCard ? menuOpen?"bg-primary/50 border-primary":"project-card--owner group hover:bg-primary/50 hover:border-primary" : menuOpen?"bg-primary/20":""
    if (menuOpen || isHovering) {
      return `${baseCardClass} project-card--active ${ownerClass} ${interactiveClass}`.trim()
    }
    return `${baseCardClass} ${ownerClass} ${interactiveClass}`.trim()
  }, [isHovering, isOwnerCard, menuOpen, onOpenProject])

  const menuButtonClassName = useMemo(
    () =>
      [
        "absolute px-2 py-2 top-6 right-6 rounded-full border transition-colors duration-200 cursor-pointer",
        "focus-visible:ring-0 focus-visible:ring-offset-0 focus-visible:border-transparent focus-visible:outline-none",
        menuOpen
          ? "border-primary/40 bg-white/90 text-primary shadow-[0_1px_3px_rgba(79,61,152,0.95)]"
          : "border-transparent text-foreground hover:border-primary/30 hover:bg-white/80 hover:text-primary",
      ]
        .filter(Boolean)
        .join(" "),
    [menuOpen]
  )

  const menuIconClassName = menuOpen ? "size-6 text-primary" : "size-6 text-current"

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

  const dataCySuffix = typeof dataCyIndex === "number" ? `-${dataCyIndex}` : ""
  const buildDataCy = (base: string) => `${base}${dataCySuffix}`

  return (
    <div
      className={containerClassName}
      style={cardStyle}
      role={onOpenProject ? "button" : undefined}
      tabIndex={onOpenProject ? 0 : undefined}
      data-cy={buildDataCy("project-card")}
      onKeyDown={(event) => {
        if (!onOpenProject) return
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault()
          onOpenProject()
        }
      }}
      onMouseEnter={() => {
        setIsHovering(true)
        onPointerEnter?.()
      }}
      onMouseLeave={() => setIsHovering(false)}
      onClick={(event) => {
        if (!onOpenProject) return
        const target = event.target
        if (!(target instanceof Node)) {
          return
        }
        if (!event.currentTarget.contains(target)) {
          return
        }
        if (target instanceof Element && target.closest("[data-ignore-card-click='true']")) {
          return
        }
        onOpenProject()
      }}
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
              data-cy="project-card-thumbnail"
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
            data-cy={buildDataCy("project-card-title")}
          >
            {title}
          </h3>
          <span className="text-sm text-muted-foreground whitespace-nowrap flex-none ml-auto text-right">
            Created: {createdAt}
          </span>
        </div>
        {description ? (
          <p
            className="clamp-ellipsis-1 min-w-0 text-foreground/70"
            data-cy={buildDataCy("project-card-description")}
          >
            {description}
          </p>
        ) : (
          <div className="min-h-[1.5rem]" aria-hidden />
        )}
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
          <button
            type="button"
            className={menuButtonClassName}
            data-ignore-card-click="true"
            onMouseDown={(event) => event.preventDefault()}
            data-cy={buildDataCy("project-card-menu-button")}
            aria-pressed={menuOpen}
          >
            <MoreHorizontal className={menuIconClassName} />
            <span className="sr-only">Open project menu</span>
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent
          align="end"
          sideOffset={-10}
          className="w-48 bg-button-background border-none rounded-2xl p-2"
          data-ignore-card-click="true"
        >
          {canEdit ? (
            <DropdownMenuItem
              className="text-button-foreground hover:bg-button-hover-background rounded-xl py-3 px-4 cursor-pointer text-base"
              data-ignore-card-click="true"
              onSelect={(event) => {
                event.preventDefault()
                event.stopPropagation()
                onEditProject?.()
              }}
              data-cy={buildDataCy("project-card-menu-edit")}
            >
              <span className="inline-flex items-center gap-2">
                <PencilLine className="size-4 hover:text-foreground" />
                Edit Project
              </span>
            </DropdownMenuItem>
          ) : null}
          {canChangeOwner ? (
            <DropdownMenuItem
              className="text-button-foreground hover:bg-button-hover-background rounded-xl py-3 px-4 cursor-pointer text-base"
              data-ignore-card-click="true"
              onSelect={(event) => {
                event.preventDefault()
                event.stopPropagation()
                onChangeOwner?.()
              }}
            >
              <span className="inline-flex items-center gap-2">
                <UserPen className="size-4 hover:text-foreground" />
                Change Owner
              </span>
            </DropdownMenuItem>
          ) : null}
          {canDelete ? (
            <DropdownMenuItem
              className="text-button-foreground hover:bg-button-hover-background rounded-xl py-3 px-4 cursor-pointer text-base hover:bg-destructive/30 focus:bg-destructive/30"
              data-ignore-card-click="true"
              onSelect={(event) => {
                event.preventDefault()
                event.stopPropagation()
                handleDeleteClick()
              }}
              data-cy={buildDataCy("project-card-menu-delete")}
            >
              <span className="inline-flex items-center gap-2 text-destructive">
                <Trash2 className="size-4 text-destructive" />
                Delete Project
              </span>
            </DropdownMenuItem>
          ) : null}
          {canLeave ? (
            <DropdownMenuItem
              className="text-button-foreground hover:bg-button-hover-background rounded-xl py-3 px-4 cursor-pointer text-base"
              data-ignore-card-click="true"
              onSelect={(event) => {
                event.preventDefault()
                event.stopPropagation()
                onLeaveProject?.()
              }}
            >
              <span className="inline-flex items-center gap-2">
                <LogOut className="size-4 hover:text-foreground" />
                Leave Project
              </span>
            </DropdownMenuItem>
          ) : null}
        </DropdownMenuContent>
      </DropdownMenu>

      <AlertDialog
        open={deleteDialogOpen}
        onOpenChange={handleDeleteDialogChange}
      >
        <AlertDialogContent className="bg-background border-2 border-primary/30 rounded-[2rem] px-8 py-10 text-center shadow-xl">
          <AlertDialogTitle className="text-2xl font-semibold text-foreground">
            Are you sure? <br/> You want to delete this project? <br/><br/>
            <span className="block break-words break-all px-2 text-primary">
              "{title}"
            </span>
          </AlertDialogTitle>
          <AlertDialogFooter className="mt-8 flex w-full flex-row justify-end gap-4 sm:gap-6">
            <AlertDialogCancel
              className="rounded-full bg-secondary border-none px-8 py-3 text-base font-semibold text-secondary-foreground shadow-none transition-colors hover:bg-secondary/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
              onClick={handleNoConfirmDelete}
              disabled={deleting}
              data-cy={buildDataCy("project-delete-cancel")}
            >
              No
            </AlertDialogCancel>
            <AlertDialogAction
              className="rounded-full bg-primary px-8 py-3 text-base font-semibold text-primary-foreground hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
              onClick={handleConfirmDelete}
              disabled={deleting}
              data-cy={buildDataCy("project-delete-confirm")}
            >
              {deleting ? "Deleting…" : "Yes"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

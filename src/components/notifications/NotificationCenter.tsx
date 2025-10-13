"use client"

import {
  ReactNode,
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react"
import { X as CloseIcon } from "lucide-react"

import { cn } from "@/lib/utils"

export type NotificationVariant = "success" | "info" | "warning" | "destructive"

export type NotificationOptions = {
  title: string
  description?: string
  variant?: NotificationVariant
  durationMs?: number
}

const EXIT_DURATION_MS = 250

type NotificationRecord = {
  id: string
  title: string
  description?: string
  variant: NotificationVariant
  durationMs: number
  status: "enter" | "visible" | "exit"
}

type NotificationContextValue = {
  notify: (options: NotificationOptions) => string
  dismiss: (id: string) => void
}

const NotificationContext = createContext<NotificationContextValue | null>(null)

export function useNotifications() {
  const context = useContext(NotificationContext)
  if (!context) {
    throw new Error("useNotifications must be used within a NotificationProvider")
  }
  return context
}

const VARIANT_CLASSES: Record<NotificationVariant, string> = {
  success: "bg-primary text-primary-foreground shadow-[0_4px_2px_rgba(144,122,214,0.2)]",
  info: "bg-primary-soft text-secondary-foreground shadow-[0_4px_2px_rgba(144,122,214,0.15)]",
  warning: "bg-amber-500 text-white shadow-[0_4px_2px_rgba(245,158,11,0.2)]",
  destructive: "bg-destructive text-destructive-foreground shadow-[0_4px_2px_rgba(239,68,68,0.2)]",
}

type NotificationViewportProps = {
  notifications: NotificationRecord[]
  onDismiss: (id: string) => void
}

function NotificationViewport({ notifications, onDismiss }: NotificationViewportProps) {
  return (
    <div className="pointer-events-none fixed left-1/2 top-6 z-[70] flex w-full max-w-md -translate-x-1/2 flex-col gap-3 px-4">
      {notifications.map((notification) => (
        <div
          key={notification.id}
          className={cn(
            "pointer-events-auto flex items-start justify-between gap-4 overflow-hidden rounded-[1.75rem] border border-white/10 px-6 py-4 transition-all duration-300 ease-out",
            VARIANT_CLASSES[notification.variant],
            notification.status === "enter" && "translate-y-6 scale-[0.96] opacity-0",
            notification.status === "visible" && "translate-y-0 scale-100 opacity-100",
            notification.status === "exit" &&
              "-translate-y-4 scale-[0.96] opacity-0 pointer-events-none"
          )}
          role="status"
          aria-live="polite"
        >
          <div className="flex flex-1 flex-col gap-1">
            <span className="text-base font-semibold leading-tight">{notification.title}</span>
            {notification.description ? (
              <span className="text-sm leading-snug opacity-90">{notification.description}</span>
            ) : null}
          </div>
          <button
            type="button"
            aria-label="Dismiss notification"
            onClick={() => onDismiss(notification.id)}
            className="rounded-full bg-white/15 p-1.5 text-current transition hover:bg-white/25 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60"
          >
            <CloseIcon className="size-4" />
          </button>
        </div>
      ))}
    </div>
  )
}

type NotificationProviderProps = {
  children: ReactNode
}

export function NotificationProvider({ children }: NotificationProviderProps) {
  const [notifications, setNotifications] = useState<NotificationRecord[]>([])
  const idRef = useRef(0)
  const autoDismissTimers = useRef<Record<string, ReturnType<typeof setTimeout>>>({})
  const exitTimers = useRef<Record<string, ReturnType<typeof setTimeout>>>({})

  const dismiss = useCallback((id: string) => {
    const autoTimer = autoDismissTimers.current[id]
    if (autoTimer) {
      clearTimeout(autoTimer)
      delete autoDismissTimers.current[id]
    }

    let shouldScheduleRemoval = false
    setNotifications((prev) =>
      prev.map((item) => {
        if (item.id === id && item.status !== "exit") {
          shouldScheduleRemoval = true
          return { ...item, status: "exit" }
        }
        return item
      })
    )

    if (!shouldScheduleRemoval) {
      return
    }

    exitTimers.current[id] = setTimeout(() => {
      setNotifications((prev) => prev.filter((item) => item.id !== id))
      delete exitTimers.current[id]
    }, EXIT_DURATION_MS)
  }, [])

  const notify = useCallback(
    (options: NotificationOptions) => {
      idRef.current += 1
      const id = `notify-${idRef.current}`
      const durationMs = options.durationMs ?? 1500
      const record: NotificationRecord = {
        id,
        title: options.title,
        description: options.description,
        variant: options.variant ?? "info",
        durationMs,
        status: "enter",
      }

      setNotifications((prev) => [...prev, record])

      requestAnimationFrame(() => {
        setNotifications((prev) =>
          prev.map((item) =>
            item.id === id && item.status === "enter" ? { ...item, status: "visible" } : item
          )
        )
      })

      if (durationMs > 0) {
        autoDismissTimers.current[id] = setTimeout(() => {
          dismiss(id)
        }, durationMs)
      }

      return id
    },
    [dismiss]
  )

  useEffect(() => {
    return () => {
      Object.values(autoDismissTimers.current).forEach((timer) => {
        clearTimeout(timer)
      })
      autoDismissTimers.current = {}
      Object.values(exitTimers.current).forEach((timer) => {
        clearTimeout(timer)
      })
      exitTimers.current = {}
    }
  }, [])

  const value = useMemo(
    () => ({
      notify,
      dismiss,
    }),
    [dismiss, notify]
  )

  return (
    <NotificationContext.Provider value={value}>
      {children}
      <NotificationViewport notifications={notifications} onDismiss={dismiss} />
    </NotificationContext.Provider>
  )
}

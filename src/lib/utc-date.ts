"use client"

const pad = (value: number, length = 2) => String(value).padStart(length, "0")

const GMT_OFFSET_PATTERN = /[+-]\d{2}:?\d{2}$/

export function parseUtcDateAsLocal(value?: string | null) {
  if (!value) {
    return null
  }
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) {
    return null
  }
  const isUtcString = value.endsWith("Z") || GMT_OFFSET_PATTERN.test(value)
  if (!isUtcString) {
    return parsed
  }
  return new Date(
    parsed.getUTCFullYear(),
    parsed.getUTCMonth(),
    parsed.getUTCDate(),
    parsed.getUTCHours(),
    parsed.getUTCMinutes(),
    parsed.getUTCSeconds(),
    parsed.getUTCMilliseconds()
  )
}

export function toLocalIsoString(date: Date) {
  const year = date.getFullYear()
  const month = pad(date.getMonth() + 1)
  const day = pad(date.getDate())
  const hours = pad(date.getHours())
  const minutes = pad(date.getMinutes())
  const seconds = pad(date.getSeconds())
  const milliseconds = String(date.getMilliseconds()).padStart(3, "0")
  return `${year}-${month}-${day}T${hours}:${minutes}:${seconds}.${milliseconds}`
}

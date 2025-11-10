export function sanitizeHexColor(input: string): string {
  const value = input.trim()
  if (!value) {
    return "#FFFFFF"
  }
  return value.startsWith("#") ? value : `#${value}`
}

const RELATIVE_LUMINANCE_FACTORS = { r: 0.2126, g: 0.7152, b: 0.0722 }

function hexToRgb(hex: string) {
  const sanitized = hex.replace("#", "")
  if (sanitized.length !== 6) {
    return { r: 255, g: 255, b: 255 }
  }
  return {
    r: parseInt(sanitized.slice(0, 2), 16),
    g: parseInt(sanitized.slice(2, 4), 16),
    b: parseInt(sanitized.slice(4, 6), 16),
  }
}

export function getContrastingTextColor(
  hexColor: string,
  lightColor = "#FFFFFF",
  darkColor = "#2F2766"
) {
  const { r, g, b } = hexToRgb(hexColor)
  const luminance =
    (RELATIVE_LUMINANCE_FACTORS.r * r +
      RELATIVE_LUMINANCE_FACTORS.g * g +
      RELATIVE_LUMINANCE_FACTORS.b * b) /
    255
  return luminance < 0.55 ? lightColor : darkColor
}

export function generatePastelColor() {
  const hue = Math.floor(Math.random() * 360)
  const saturation = 70
  const lightness = 85
  return hslToHex(hue, saturation, lightness)
}

const LIGHT_TEXT_COLOR = "#FFFFFF"
const DARK_TEXT_COLOR = "#2F2766"
const MIN_CONTRAST_RATIO = 3

function normalizeHexString(hex: string | null | undefined) {
  if (!hex) {
    return null
  }
  const value = hex.trim().replace("#", "")
  if (value.length !== 6) {
    return null
  }
  return `#${value.toLowerCase()}`
}

function getRelativeLuminance(hex: string) {
  const { r, g, b } = hexToRgb(hex)
  const toChannel = (value: number) => {
    const channel = value / 255
    return channel <= 0.03928 ? channel / 12.92 : Math.pow((channel + 0.055) / 1.055, 2.4)
  }
  return (
    RELATIVE_LUMINANCE_FACTORS.r * toChannel(r) +
    RELATIVE_LUMINANCE_FACTORS.g * toChannel(g) +
    RELATIVE_LUMINANCE_FACTORS.b * toChannel(b)
  )
}

function getContrastRatio(hexA: string, hexB: string) {
  const l1 = getRelativeLuminance(hexA)
  const l2 = getRelativeLuminance(hexB)
  const [lighter, darker] = l1 > l2 ? [l1, l2] : [l2, l1]
  return (lighter + 0.05) / (darker + 0.05)
}

export function computeTextColor(backgroundHex: string, preferredHex?: string | null) {
  const normalizedBg = normalizeHexString(backgroundHex)
  const normalizedPreferred = normalizeHexString(preferredHex)

  if (normalizedBg && normalizedPreferred) {
    const ratio = getContrastRatio(normalizedBg, normalizedPreferred)
    if (ratio >= MIN_CONTRAST_RATIO) {
      return normalizedPreferred
    }
  }

  if (!normalizedBg) {
    return normalizedPreferred ?? DARK_TEXT_COLOR
  }

  const luminance = getRelativeLuminance(normalizedBg)
  return luminance < 0.5 ? LIGHT_TEXT_COLOR : DARK_TEXT_COLOR
}

function hslToHex(h: number, s: number, l: number) {
  s /= 100
  l /= 100

  const k = (n: number) => (n + h / 30) % 12
  const a = s * Math.min(l, 1 - l)
  const f = (n: number) =>
    l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)))

  const toHex = (x: number) => Math.round(x * 255)

  return `#${[toHex(f(0)), toHex(f(8)), toHex(f(4))]
    .map((value) => value.toString(16).padStart(2, "0"))
    .join("")}`
}

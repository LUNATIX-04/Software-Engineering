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

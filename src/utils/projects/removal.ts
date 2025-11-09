export function isRemovalError(error: unknown) {
  if (!(error instanceof Error)) {
    return false
  }
  const message = error.message.toLowerCase()
  return message.includes("not found") || message.includes("status 404")
}


/** Read the shared CSS exit token without allowing an invalid token to retain a modal forever. */
export function exitDuration(token: string): number {
  const match = token.trim().match(/^(\d+(?:\.\d+)?)(ms|s)$/)
  if (!match) return 180
  const value = Number(match[1]) * (match[2] === 's' ? 1000 : 1)
  return Number.isFinite(value) && value <= 1000 ? value : 180
}

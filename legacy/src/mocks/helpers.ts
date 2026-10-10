/** Fixed timestamps - seeds must look identical on every run. */
export const ts = (d: string) => `${d}T08:00:00.000Z`

/**
 * Inline SVG placeholder. Data URI rather than a remote image so the mock
 * layer has no network dependency.
 */
export function placeholder(label: string, hue: number): string {
  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" width="800" height="500">` +
    `<rect width="800" height="500" fill="hsl(${hue},30%,72%)"/>` +
    `<text x="400" y="258" font-family="system-ui,sans-serif" font-size="30" ` +
    `fill="hsl(${hue},45%,26%)" text-anchor="middle">${label}</text></svg>`
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`
}

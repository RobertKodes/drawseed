import type { Derived } from './derive'
import type { Stroke } from './strokes'

function strokePath(stroke: Stroke, scale: number): string {
  return stroke.points
    .map((pt, i) => {
      const x = (pt.x * scale).toFixed(2)
      const y = (pt.y * scale).toFixed(2)
      return i === 0 ? `M ${x} ${y}` : `L ${x} ${y}`
    })
    .join(' ')
}

export function strokesToSvg(
  strokes: Stroke[],
  derived: Derived | null,
): string {
  const scale = 1000
  const paths = strokes
    .filter((s) => s.points.length > 0)
    .map(
      (s) =>
        `    <path d="${strokePath(s, scale)}" fill="none" stroke="#14110e" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round"/>`,
    )
    .join('\n')

  const caption = derived
    ? `    <text x="24" y="976" font-family="ui-monospace, SFMono-Regular, Menlo, monospace" font-size="13" fill="#3a342c">${escapeXml(derived.address)}</text>`
    : ''

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${scale} ${scale}" width="${scale}" height="${scale}">
    <rect width="${scale}" height="${scale}" fill="#cfc6b6"/>
${paths}
${caption}
</svg>
`
}

export function derivedToJson(
  strokes: Stroke[],
  derived: Derived,
): string {
  return `${JSON.stringify(
    {
      v: 1,
      namespace: 'drawseed',
      programId: derived.programId,
      seeds: ['drawseed', derived.hashHex],
      hash: derived.hashHex,
      address: derived.address,
      bump: derived.bump,
      includeTiming: derived.includeTiming,
      serialized: derived.serialized,
      strokeCount: strokes.length,
      pointCount: strokes.reduce((n, s) => n + s.points.length, 0),
      note: 'Preview only. Not a wallet, not a signing seed.',
    },
    null,
    2,
  )}\n`
}

export function downloadText(filename: string, content: string, type: string) {
  const blob = new Blob([content], { type })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}

function escapeXml(text: string): string {
  return text
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
}

export type Point = {
  /** Normalized 0..1 across the sheet */
  x: number
  y: number
  /** Milliseconds from stroke start */
  t: number
  /** Pointer pressure, 0..1 */
  p: number
}

export type Stroke = {
  id: string
  points: Point[]
}

const COORD_DECIMALS = 4
const TIME_BUCKET_MS = 16

export function serializeStrokes(
  strokes: Stroke[],
  includeTiming: boolean,
): string {
  const chunks = ['v1']
  for (const stroke of strokes) {
    if (stroke.points.length === 0) continue
    const pts = stroke.points.map((pt) => {
      const x = pt.x.toFixed(COORD_DECIMALS)
      const y = pt.y.toFixed(COORD_DECIMALS)
      if (!includeTiming) return `${x},${y}`
      const t = Math.round(pt.t / TIME_BUCKET_MS)
      return `${x},${y},${t}`
    })
    chunks.push(pts.join(';'))
  }
  return chunks.join('|')
}

export function countPoints(strokes: Stroke[]): number {
  return strokes.reduce((n, s) => n + s.points.length, 0)
}

export function newStrokeId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID()
  }
  return `s-${Date.now()}-${Math.random().toString(16).slice(2)}`
}

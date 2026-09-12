import { useEffect, useRef } from 'react'
import { newStrokeId, type Point, type Stroke } from '../lib/strokes'

type Props = {
  strokes: Stroke[]
  onStrokeEnd: (stroke: Stroke) => void
  onLiveStroke: (stroke: Stroke | null) => void
}

const MIN_MOVE_PX = 1.4
const INK = '#14110e'

function cssSize(el: HTMLElement) {
  const r = el.getBoundingClientRect()
  return { w: r.width, h: r.height, left: r.left, top: r.top }
}

function toPoint(e: PointerEvent, box: { w: number; h: number; left: number; top: number }, t0: number): Point {
  return {
    x: (e.clientX - box.left) / box.w,
    y: (e.clientY - box.top) / box.h,
    t: Math.max(0, e.timeStamp - t0),
    p: e.pressure > 0 ? e.pressure : 0.5,
  }
}

function inkWidth(a: Point, b: Point, w: number, h: number): number {
  const dx = (b.x - a.x) * w
  const dy = (b.y - a.y) * h
  const dist = Math.hypot(dx, dy)
  const dt = Math.max(b.t - a.t, 8)
  const speed = dist / dt
  const slow = 1 - Math.min(speed / 1.15, 1)
  return 1.25 + slow * 4.1 + b.p * 1.7
}

function drawStroke(
  ctx: CanvasRenderingContext2D,
  stroke: Stroke,
  w: number,
  h: number,
) {
  const pts = stroke.points
  if (pts.length === 0) return
  if (pts.length === 1) {
    const p = pts[0]
    ctx.beginPath()
    ctx.fillStyle = INK
    ctx.arc(p.x * w, p.y * h, 2.1, 0, Math.PI * 2)
    ctx.fill()
    return
  }

  ctx.strokeStyle = INK
  ctx.lineCap = 'round'
  ctx.lineJoin = 'round'
  for (let i = 1; i < pts.length; i++) {
    const a = pts[i - 1]
    const b = pts[i]
    ctx.beginPath()
    ctx.moveTo(a.x * w, a.y * h)
    ctx.lineTo(b.x * w, b.y * h)
    ctx.lineWidth = inkWidth(a, b, w, h)
    ctx.stroke()
  }
}

function paint(
  canvas: HTMLCanvasElement,
  strokes: Stroke[],
  live: Stroke | null,
) {
  const ctx = canvas.getContext('2d')
  if (!ctx) return
  const box = cssSize(canvas)
  const dpr = Math.min(window.devicePixelRatio || 1, 2)
  const pw = Math.max(1, Math.round(box.w * dpr))
  const ph = Math.max(1, Math.round(box.h * dpr))
  if (canvas.width !== pw || canvas.height !== ph) {
    canvas.width = pw
    canvas.height = ph
  }
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
  ctx.clearRect(0, 0, box.w, box.h)
  for (const s of strokes) drawStroke(ctx, s, box.w, box.h)
  if (live) drawStroke(ctx, live, box.w, box.h)
}

export function InkCanvas({ strokes, onStrokeEnd, onLiveStroke }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const strokesRef = useRef(strokes)
  const liveRef = useRef<Stroke | null>(null)
  const drawingRef = useRef(false)
  const t0Ref = useRef(0)
  const lastCssRef = useRef<{ x: number; y: number } | null>(null)

  strokesRef.current = strokes

  const redraw = () => {
    const canvas = canvasRef.current
    if (!canvas) return
    paint(canvas, strokesRef.current, liveRef.current)
  }

  useEffect(() => {
    redraw()
  }, [strokes])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ro = new ResizeObserver(() => redraw())
    ro.observe(canvas)
    return () => ro.disconnect()
  }, [])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    let liveNotify: number | null = null
    let lastEmit = 0
    let pending: Stroke | null = null
    const emitLive = (stroke: Stroke | null, immediate = false) => {
      pending = stroke
      if (immediate) {
        if (liveNotify != null) {
          window.clearTimeout(liveNotify)
          liveNotify = null
        }
        lastEmit = Date.now()
        onLiveStroke(stroke)
        return
      }
      const wait = 80 - (Date.now() - lastEmit)
      if (wait <= 0) {
        lastEmit = Date.now()
        onLiveStroke(stroke)
        return
      }
      if (liveNotify != null) return
      liveNotify = window.setTimeout(() => {
        liveNotify = null
        lastEmit = Date.now()
        onLiveStroke(pending)
      }, wait)
    }

    const endStroke = () => {
      if (!drawingRef.current) return
      drawingRef.current = false
      const done = liveRef.current
      liveRef.current = null
      lastCssRef.current = null
      if (done && done.points.length > 0) onStrokeEnd(done)
      emitLive(null, true)
      redraw()
    }

    const onDown = (e: PointerEvent) => {
      if (e.button !== 0 && e.pointerType === 'mouse') return
      e.preventDefault()
      const box = cssSize(canvas)
      t0Ref.current = e.timeStamp
      drawingRef.current = true
      const pt = toPoint(e, box, t0Ref.current)
      liveRef.current = { id: newStrokeId(), points: [pt] }
      lastCssRef.current = { x: e.clientX, y: e.clientY }
      if (e.pointerType !== 'mouse') {
        try {
          canvas.setPointerCapture(e.pointerId)
        } catch {
          /* some browsers throw if already captured */
        }
      }
      emitLive(liveRef.current, true)
      redraw()
    }

    const onMove = (e: PointerEvent) => {
      if (!drawingRef.current || !liveRef.current) return
      e.preventDefault()
      const last = lastCssRef.current
      if (last) {
        const moved = Math.hypot(e.clientX - last.x, e.clientY - last.y)
        if (moved < MIN_MOVE_PX) return
      }
      const box = cssSize(canvas)
      const pt = toPoint(e, box, t0Ref.current)
      liveRef.current = {
        ...liveRef.current,
        points: [...liveRef.current.points, pt],
      }
      lastCssRef.current = { x: e.clientX, y: e.clientY }
      emitLive(liveRef.current)
      redraw()
    }

    const onUp = (e: PointerEvent) => {
      if (!drawingRef.current) return
      e.preventDefault()
      try {
        canvas.releasePointerCapture(e.pointerId)
      } catch {
        /* already released */
      }
      endStroke()
    }

    canvas.addEventListener('pointerdown', onDown)
    canvas.addEventListener('pointermove', onMove)
    canvas.addEventListener('pointerup', onUp)
    canvas.addEventListener('pointercancel', onUp)

    return () => {
      if (liveNotify != null) window.clearTimeout(liveNotify)
      canvas.removeEventListener('pointerdown', onDown)
      canvas.removeEventListener('pointermove', onMove)
      canvas.removeEventListener('pointerup', onUp)
      canvas.removeEventListener('pointercancel', onUp)
    }
  }, [onLiveStroke, onStrokeEnd])

  return (
    <canvas
      ref={canvasRef}
      className="sheet"
      role="img"
      aria-label="Ink sheet. Draw to derive an address."
    />
  )
}

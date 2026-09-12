import { useCallback, useEffect, useRef, useState } from 'react'
import { AddressDock } from './components/AddressDock'
import { InkCanvas } from './components/InkCanvas'
import { deriveFromStrokes, type Derived } from './lib/derive'
import { derivedToJson, downloadText, strokesToSvg } from './lib/export'
import { peekAccount, type PeekResult } from './lib/rpc'
import type { Stroke } from './lib/strokes'

const PEEK_IDLE_MS = 1400

export default function App() {
  const [strokes, setStrokes] = useState<Stroke[]>([])
  const [live, setLive] = useState<Stroke | null>(null)
  const [derived, setDerived] = useState<Derived | null>(null)
  const [includeTiming, setIncludeTiming] = useState(false)
  const [copied, setCopied] = useState(false)
  const [peek, setPeek] = useState<PeekResult | null>(null)
  const [peeking, setPeeking] = useState(false)

  const peekTimer = useRef<number | null>(null)
  const peekGen = useRef(0)
  const derivedRef = useRef<Derived | null>(null)
  derivedRef.current = derived

  const allStrokes = live ? [...strokes, live] : strokes

  const recompute = useCallback(async (next: Stroke[], timing: boolean) => {
    const result = await deriveFromStrokes(next, timing)
    setDerived(result)
  }, [])

  useEffect(() => {
    void recompute(allStrokes, includeTiming)
  }, [allStrokes, includeTiming, recompute])

  const runPeek = useCallback(async (address: string) => {
    const gen = ++peekGen.current
    setPeeking(true)
    const result = await peekAccount(address)
    if (gen !== peekGen.current) return
    setPeek(result)
    setPeeking(false)
  }, [])

  useEffect(() => {
    setPeek(null)
    if (peekTimer.current) window.clearTimeout(peekTimer.current)
    if (!derived || live) return
    peekTimer.current = window.setTimeout(() => {
      void runPeek(derived.address)
    }, PEEK_IDLE_MS)
    return () => {
      if (peekTimer.current) window.clearTimeout(peekTimer.current)
    }
  }, [derived?.address, live, runPeek])

  const onStrokeEnd = useCallback((stroke: Stroke) => {
    setLive(null)
    setStrokes((prev) => [...prev, stroke])
  }, [])

  const onLiveStroke = useCallback((stroke: Stroke | null) => {
    setLive(stroke)
  }, [])

  const onUndo = useCallback(() => {
    setStrokes((prev) => prev.slice(0, -1))
    setCopied(false)
  }, [])

  const onClear = useCallback(() => {
    setStrokes([])
    setLive(null)
    setDerived(null)
    setPeek(null)
    setCopied(false)
    peekGen.current += 1
    setPeeking(false)
  }, [])

  const onCopy = useCallback(async () => {
    if (!derivedRef.current) return
    const text = derivedRef.current.address
    let ok = false
    try {
      await navigator.clipboard.writeText(text)
      ok = true
    } catch {
      const el = document.createElement('textarea')
      el.value = text
      el.setAttribute('readonly', '')
      el.style.position = 'fixed'
      el.style.left = '-9999px'
      document.body.appendChild(el)
      el.select()
      ok = document.execCommand('copy')
      el.remove()
    }
    setCopied(ok)
    if (ok) window.setTimeout(() => setCopied(false), 1400)
  }, [])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'z') {
        e.preventDefault()
        onUndo()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onUndo])

  const filenameBase = derived
    ? `drawseed-${derived.address.slice(0, 8)}`
    : 'drawseed'

  return (
    <div className="app">
      <header className="mast">
        <h1>drawseed</h1>
        <p>ink → sha256 → system-program PDA. not a wallet.</p>
      </header>

      <InkCanvas
        strokes={strokes}
        onStrokeEnd={onStrokeEnd}
        onLiveStroke={onLiveStroke}
      />

      {!strokes.length && !live && (
        <p className="hint">draw with pointer or finger</p>
      )}

      <AddressDock
        strokes={strokes}
        derived={derived}
        includeTiming={includeTiming}
        onToggleTiming={() => setIncludeTiming((v) => !v)}
        onUndo={onUndo}
        onClear={onClear}
        onCopy={() => void onCopy()}
        copied={copied}
        onPeek={() => {
          if (derived) void runPeek(derived.address)
        }}
        peek={peek}
        peeking={peeking}
        onExportSvg={() =>
          downloadText(
            `${filenameBase}.svg`,
            strokesToSvg(strokes, derived),
            'image/svg+xml',
          )
        }
        onExportJson={() => {
          if (!derived) return
          downloadText(
            `${filenameBase}.json`,
            derivedToJson(strokes, derived),
            'application/json',
          )
        }}
      />
    </div>
  )
}

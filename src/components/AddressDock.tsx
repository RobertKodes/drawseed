import type { Derived } from '../lib/derive'
import { hashTint, shortenAddress } from '../lib/derive'
import { formatSol, type PeekResult } from '../lib/rpc'
import { countPoints, type Stroke } from '../lib/strokes'

type Props = {
  strokes: Stroke[]
  derived: Derived | null
  includeTiming: boolean
  onToggleTiming: () => void
  onUndo: () => void
  onClear: () => void
  onCopy: () => void
  copied: boolean
  onPeek: () => void
  peek: PeekResult | null
  peeking: boolean
  onExportSvg: () => void
  onExportJson: () => void
}

function peekLine(peek: PeekResult | null, peeking: boolean): string {
  if (peeking) return 'checking a public RPC…'
  if (!peek) return 'optional on-chain peek is idle'
  if (!peek.ok) return peek.error
  const hop = peek.hopped.length ? ` (hopped ${peek.hopped.join(', ')})` : ''
  if (peek.empty) {
    return `empty account on ${new URL(peek.url).host}${hop} — never created, which is the usual case`
  }
  return `${formatSol(peek.lamports)} SOL · owner ${peek.owner ?? '?'}${hop}`
}

export function AddressDock({
  strokes,
  derived,
  includeTiming,
  onToggleTiming,
  onUndo,
  onClear,
  onCopy,
  copied,
  onPeek,
  peek,
  peeking,
  onExportSvg,
  onExportJson,
}: Props) {
  const points = countPoints(strokes)
  const tint = derived ? hashTint(derived.hashBytes) : '#3a342c'

  return (
    <aside className="dock">
      <div className="dock-row tools">
        <button type="button" onClick={onUndo} disabled={strokes.length === 0}>
          undo stroke
        </button>
        <button type="button" onClick={onClear} disabled={strokes.length === 0}>
          clear
        </button>
        <label className="timing">
          <input
            type="checkbox"
            checked={includeTiming}
            onChange={onToggleTiming}
          />
          count timing
        </label>
        <span className="meta">
          {strokes.length} stroke{strokes.length === 1 ? '' : 's'} · {points} pts
        </span>
      </div>

      {derived ? (
        <div className="address-block">
          <div className="address-head">
            <span className="swatch" style={{ background: tint }} aria-hidden />
            <span className="short" title={derived.address}>
              {shortenAddress(derived.address)}
            </span>
            <button type="button" className="copy" onClick={onCopy}>
              {copied ? 'copied' : 'copy'}
            </button>
          </div>
          <code className="full">{derived.address}</code>
          <p className="hash">
            sha256 {derived.hashHex.slice(0, 16)}… · bump {derived.bump} · system
            program PDA
          </p>
        </div>
      ) : (
        <p className="empty-addr">
          Draw on the sheet. The path hashes into a Solana address.
        </p>
      )}

      <div className="dock-row peek">
        <button type="button" onClick={onPeek} disabled={!derived || peeking}>
          peek
        </button>
        <span className="peek-line">{peekLine(peek, peeking)}</span>
      </div>

      <div className="dock-row export">
        <button type="button" onClick={onExportSvg} disabled={!derived}>
          download SVG
        </button>
        <button type="button" onClick={onExportJson} disabled={!derived}>
          download JSON
        </button>
      </div>
    </aside>
  )
}

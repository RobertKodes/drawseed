import { PublicKey, SystemProgram } from '@solana/web3.js'
import { Buffer } from 'buffer'
import { serializeStrokes, type Stroke } from './strokes'

/** Well-known program id: System Program. Documented constant, not a secret. */
export const PROGRAM_ID = SystemProgram.programId
export const PROGRAM_ID_BASE58 = PROGRAM_ID.toBase58()

/** First PDA seed so this lab's addresses don't collide with a bare hash. */
export const SEED_NAMESPACE = 'drawseed'

export type Derived = {
  serialized: string
  hashHex: string
  hashBytes: Uint8Array
  address: string
  bump: number
  programId: string
  includeTiming: boolean
}

export async function sha256(text: string): Promise<Uint8Array> {
  const data = new TextEncoder().encode(text)
  const digest = await crypto.subtle.digest('SHA-256', data)
  return new Uint8Array(digest)
}

export function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('')
}

export function pdaFromHash(hashBytes: Uint8Array): { address: string; bump: number } {
  if (hashBytes.length !== 32) {
    throw new Error(`hash must be 32 bytes, got ${hashBytes.length}`)
  }
  const [pda, bump] = PublicKey.findProgramAddressSync(
    [Buffer.from(SEED_NAMESPACE), Buffer.from(hashBytes)],
    PROGRAM_ID,
  )
  return { address: pda.toBase58(), bump }
}

export async function deriveFromStrokes(
  strokes: Stroke[],
  includeTiming: boolean,
): Promise<Derived | null> {
  const useful = strokes.filter((s) => s.points.length > 0)
  if (useful.length === 0) return null
  const serialized = serializeStrokes(useful, includeTiming)
  const hashBytes = await sha256(serialized)
  const { address, bump } = pdaFromHash(hashBytes)
  return {
    serialized,
    hashHex: bytesToHex(hashBytes),
    hashBytes,
    address,
    bump,
    programId: PROGRAM_ID_BASE58,
    includeTiming,
  }
}

export function shortenAddress(address: string, head = 4, tail = 4): string {
  if (address.length <= head + tail + 1) return address
  return `${address.slice(0, head)}…${address.slice(-tail)}`
}

export function hashTint(hashBytes: Uint8Array): string {
  const h = hashBytes[0] ?? 0
  const s = 28 + ((hashBytes[1] ?? 0) % 22)
  const l = 28 + ((hashBytes[2] ?? 0) % 16)
  return `hsl(${Math.round((h * 360) / 255)} ${s}% ${l}%)`
}

# drawseed

You draw. We hash the ink. Out comes a Solana address.

Not a wallet. Not an explorer skin. The new input is a stroke — if you strip the type, drawing → address is still the whole product.

Live: https://robertkodes.github.io/drawseed/

## Loop

1. Full-bleed sheet. Pointer, pen, or finger. Undo last stroke, or wipe the sheet.
2. Path is serialized as normalized points (`x,y` in 0..1, four decimals). Timing is optional (16 ms buckets) and off by default, so the same geometry hashes the same way.
3. SHA-256 of that string. Bytes go into `PublicKey.findProgramAddressSync` with a fixed namespace seed `drawseed` against the **System Program** (`11111111111111111111111111111111`). That is a real base58 PDA.
4. Short + full address, copy button. After you lift the pen we optionally `getAccountInfo` on a public RPC (`VITE_RPC_URL` first, then mainnet-beta / publicnode). 403/429 hops to the next URL. Empty accounts are called empty — that's the usual case. These addresses are not keys. Don't send funds to a doodle.
5. Download the ink as SVG, and a JSON with hash + address + bump.

## Dev

```bash
npm i
npm run dev
```

App lives at `/drawseed/` (GitHub Pages project path). Preview the production build with `npm run build && npm run preview`.

Optional RPC:

```bash
# .env
VITE_RPC_URL=https://api.mainnet-beta.solana.com
```

## Pages

`base` is `/drawseed/`. Static `dist/` plus `.nojekyll` is what gets pushed to `gh-pages` — no Actions.

## What this refuses

No wallet connect, no signing seeds, no trading. The hash is a preview seed for a PDA lookup, not a keypair.

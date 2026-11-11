/**
 * Upstream generates `/public/brand` from `assets/brand` via tools/generate/brand.
 * That toolchain is not in this vendor tree, and `/public/brand` is gitignored —
 * so copy the committed assets into the Vite public dir on install / before dev.
 */
import { copyFileSync, existsSync, mkdirSync, readdirSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const srcDir = resolve(root, 'assets/brand')
const brandOut = resolve(root, 'public/brand')

if (!existsSync(srcDir)) {
  console.warn('[ensure-brand] skipped: missing', srcDir)
  process.exit(0)
}

mkdirSync(brandOut, { recursive: true })

const rootFiles = new Set(['favicon.ico', 'apple-touch-icon.png'])

for (const name of readdirSync(srcDir)) {
  if (name.startsWith('.')) continue
  const from = join(srcDir, name)
  const to = rootFiles.has(name) ? join(root, 'public', name) : join(brandOut, name)
  copyFileSync(from, to)
}

console.log('[ensure-brand] wrote', brandOut)

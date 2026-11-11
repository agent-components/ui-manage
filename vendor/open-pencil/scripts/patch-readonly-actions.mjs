/**
 * Upstream read-only allowlist omits canvas lifecycle `reportPresented`.
 * Patch both src and dist copies so install + prebundle stay consistent.
 */
import { readFileSync, writeFileSync, existsSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const targets = [
  resolve(root, 'node_modules/@open-pencil/core/src/editor/read-only/actions.ts'),
  resolve(root, 'node_modules/@open-pencil/core/dist/editor/read-only/actions.js')
]

const replacements = [
  ["'replaceGraph',\n  'requestRefresh',", "'replaceGraph',\n  'reportPresented',\n  'requestRefresh',"],
  ['"replaceGraph",\n\t"requestRefresh",', '"replaceGraph",\n\t"reportPresented",\n\t"requestRefresh",'],
  ['"replaceGraph",\n  "requestRefresh",', '"replaceGraph",\n  "reportPresented",\n  "requestRefresh",']
]

for (const file of targets) {
  if (!existsSync(file)) {
    console.warn('[patch-readonly-actions] skip missing', file)
    continue
  }
  const text = readFileSync(file, 'utf8')
  if (text.includes('reportPresented')) {
    console.log('[patch-readonly-actions] already patched', file)
    continue
  }
  let next = text
  let matched = false
  for (const [old, insert] of replacements) {
    if (next.includes(old)) {
      next = next.replace(old, insert)
      matched = true
      break
    }
  }
  if (!matched) {
    console.warn('[patch-readonly-actions] pattern not found', file)
    continue
  }
  writeFileSync(file, next)
  console.log('[patch-readonly-actions] patched', file)
}

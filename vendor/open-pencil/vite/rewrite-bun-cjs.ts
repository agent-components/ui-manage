import { createRequire } from 'node:module'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

import type { Plugin } from 'vite'

import { openPencilForceBundle } from './cjs-deps'

const require = createRequire(import.meta.url)
const viteDir = dirname(fileURLToPath(import.meta.url))

/**
 * Excluded `@open-pencil/*` imports often resolve to raw `.bun/.../pkg` CJS files.
 * Rewrite those absolute ids back to the bare package name so Vite's
 * optimizeDeps (include + needsInterop) serves the prebundled ESM instead.
 *
 * Also catch deep `source-map-js/lib/source-map-generator.js` (css-tree) which
 * is CJS and has no named ESM exports in the browser.
 */
export function rewriteBunCjsPlugin(): Plugin {
  const packages = new Set<string>(openPencilForceBundle)
  const sourceMapGeneratorShim = resolve(
    viteDir,
    '../shims/source-map-generator.ts'
  )

  return {
    name: 'open-pencil:rewrite-bun-cjs',
    enforce: 'pre',
    apply: 'serve',
    async resolveId(source, importer, options) {
      const bare = source.split('?')[0]
      if (
        bare === 'source-map-js/lib/source-map-generator.js' ||
        bare.endsWith('/source-map-js/lib/source-map-generator.js')
      ) {
        return sourceMapGeneratorShim
      }

      // Only rewrite absolute paths into the bun store for known CJS packages.
      if (!source.includes('/node_modules/.bun/')) return null
      if (source.includes('canvaskit')) return null

      for (const name of packages) {
        const marker = `/node_modules/${name}/`
        if (!source.includes(marker)) continue
        // Deep generator path already handled above; other files → package root.
        const resolved = await this.resolve(name, importer, {
          ...options,
          skipSelf: true
        })
        return resolved
      }
      return null
    }
  }
}

/** Ensure force-bundle packages are resolvable from the app root (bun may not hoist). */
export function ensureHoistedCjsDeps(rootDir: string): void {
  const { existsSync, mkdirSync, symlinkSync, lstatSync, unlinkSync } =
    require('node:fs') as typeof import('node:fs')
  const { readdirSync } = require('node:fs') as typeof import('node:fs')
  const bunDir = join(rootDir, 'node_modules/.bun')
  if (!existsSync(bunDir)) return

  const roots = new Set(
    openPencilForceBundle.map((id) => {
      if (id.startsWith('@')) {
        const [scope, name] = id.split('/')
        return `${scope}/${name}`
      }
      return id.split('/')[0]
    })
  )

  for (const name of roots) {
    const dest = join(rootDir, 'node_modules', name)
    if (existsSync(dest)) continue
    const key = name.replace('/', '+')
    let match: string | undefined
    for (const entry of readdirSync(bunDir)) {
      if (entry.startsWith(`${key}@`) || entry.startsWith(`${name}@`)) {
        match = entry
        break
      }
    }
    if (!match) continue
    const pkg = join(bunDir, match, 'node_modules', name)
    if (!existsSync(pkg)) continue
    mkdirSync(dirname(dest), { recursive: true })
    try {
      if (existsSync(dest) || lstatSync(dest).isSymbolicLink()) unlinkSync(dest)
    } catch {
      /* missing */
    }
    const rel = require('node:path').relative(dirname(dest), pkg)
    symlinkSync(rel, dest)
  }
}

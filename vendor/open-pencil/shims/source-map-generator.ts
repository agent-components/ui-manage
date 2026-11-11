/**
 * css-tree ESM does `import { SourceMapGenerator } from 'source-map-js/lib/...'`,
 * but that file is CJS. Re-export from the package root (force-prebundled + needsInterop).
 */
import * as sourceMapJs from 'source-map-js'

const mod = sourceMapJs as typeof sourceMapJs & {
  default?: { SourceMapGenerator?: unknown }
  SourceMapGenerator?: unknown
}

export const SourceMapGenerator =
  mod.SourceMapGenerator ?? mod.default?.SourceMapGenerator

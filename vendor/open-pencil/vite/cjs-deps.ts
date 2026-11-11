/**
 * Packages that must be force-prebundled because `@open-pencil/*` is excluded
 * from optimizeDeps (otherwise the browser loads raw `.bun` modules and hits
 * CJS named-export errors).
 *
 * Include both the CJS leaves and the ESM packages that import them (e.g. sucrase).
 */
export const openPencilForceBundle = [
  '@xmldom/xmldom',
  '@acemir/cssom/lib/index.js',
  '@jridgewell/resolve-uri',
  '@jridgewell/sourcemap-codec',
  '@jridgewell/trace-mapping',
  '@jridgewell/gen-mapping',
  'css-tree',
  'cssesc',
  'entities',
  'fflate',
  'image-size',
  'postcss-value-parser',
  'source-map-js',
  'sucrase',
  'svgpath',
  'ts-interface-checker'
] as const

/** Subset that are CJS/UMD and need Vite's default/named export interop. */
export const openPencilCjsInterop = [
  '@xmldom/xmldom',
  '@acemir/cssom/lib/index.js',
  '@jridgewell/resolve-uri',
  'cssesc',
  'image-size',
  'postcss-value-parser',
  'source-map-js',
  'svgpath',
  'ts-interface-checker'
] as const

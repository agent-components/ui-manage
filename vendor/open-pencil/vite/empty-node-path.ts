/** Browser stub for `path` / `node:path` (e.g. unifont). */
export function dirname(p: string): string {
  const i = p.replace(/\\/g, '/').lastIndexOf('/')
  return i <= 0 ? '.' : p.slice(0, i)
}
export function basename(p: string, ext?: string): string {
  const norm = p.replace(/\\/g, '/')
  const base = norm.slice(norm.lastIndexOf('/') + 1)
  return ext && base.endsWith(ext) ? base.slice(0, -ext.length) : base
}
export function join(...parts: string[]): string {
  return parts.filter(Boolean).join('/').replace(/\/+/g, '/')
}
export function resolve(...parts: string[]): string {
  return join(...parts)
}
export function extname(p: string): string {
  const base = basename(p)
  const i = base.lastIndexOf('.')
  return i < 0 ? '' : base.slice(i)
}
export function relative(_from: string, to: string): string {
  return to
}
export function isAbsolute(p: string): boolean {
  return p.startsWith('/') || /^[A-Za-z]:[\\/]/.test(p)
}
export const sep = '/'
export const delimiter = ':'
export default {
  dirname,
  basename,
  join,
  resolve,
  extname,
  relative,
  isAbsolute,
  sep,
  delimiter
}

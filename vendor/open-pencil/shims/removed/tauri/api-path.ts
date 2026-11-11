
export const sep = '/'
export async function dirname(p: string): Promise<string> {
  const i = p.replace(/\\/g, '/').lastIndexOf('/')
  return i <= 0 ? '.' : p.slice(0, i)
}
export async function join(...parts: string[]): Promise<string> {
  return parts.filter(Boolean).join('/').replace(/\/+/g, '/')
}
export async function resolve(...parts: string[]): Promise<string> {
  return join(...parts)
}
export async function homeDir(): Promise<string> {
  return '/'
}

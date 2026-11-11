
export const BaseDirectory = { AppData: 0, AppConfig: 1, AppLocalData: 2, Home: 3 } as const
export const SeekMode = { Start: 0, Current: 1, End: 2 } as const
export async function exists(_path: string, _opts?: unknown): Promise<boolean> { return false }
export async function readFile(_path: string, _opts?: unknown): Promise<Uint8Array> {
  throw new Error('fs unavailable')
}
export async function readTextFile(_path: string, _opts?: unknown): Promise<string> {
  throw new Error('fs unavailable')
}
export async function writeFile(_path: string, _data: unknown, _opts?: unknown): Promise<void> {
  throw new Error('fs unavailable')
}
export async function mkdir(_path: string, _opts?: unknown): Promise<void> {}
export async function remove(_path: string, _opts?: unknown): Promise<void> {}
export async function lstat(_path: string, _opts?: unknown): Promise<any> {
  throw new Error('fs unavailable')
}
export async function stat(_path: string, _opts?: unknown): Promise<any> {
  throw new Error('fs unavailable')
}
export async function open(_path: string, _opts?: unknown): Promise<any> {
  throw new Error('fs unavailable')
}
export async function watch(_paths: unknown, _cb: unknown, _opts?: unknown): Promise<() => void> {
  return () => undefined
}

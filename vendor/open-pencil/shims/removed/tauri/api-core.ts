
export class Channel<T = unknown> {
  onmessage: ((data: T) => void) | null = null
  constructor(_arg?: unknown) {}
}
export async function invoke(_cmd: string, _args?: unknown): Promise<any> {
  throw new Error('Tauri is not available in ui-manage web build')
}

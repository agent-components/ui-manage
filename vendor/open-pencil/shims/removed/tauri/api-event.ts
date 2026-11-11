
export const TauriEvent = { WINDOW_CLOSE_REQUESTED: 'tauri://close-requested' } as const
export async function listen(_event: string, _handler: (...args: any[]) => void): Promise<() => void> {
  return () => undefined
}
export async function emitTo(_target: string, _event: string, _payload?: unknown): Promise<void> {}

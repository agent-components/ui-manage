
export function getCurrentWindow() {
  return {
    close: async () => undefined,
    destroy: async () => undefined,
    setTitle: async () => undefined,
    listen: async () => () => undefined,
    once: async () => () => undefined,
    emit: async () => undefined,
    label: 'main'
  }
}

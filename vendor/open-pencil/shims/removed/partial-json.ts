
export const Allow = { ALL: ~0, STR: 1, OBJ: 2, ARR: 4, NUM: 8 } as const
export function parseJSON(text: string, _allow?: number) {
  try { return JSON.parse(text) } catch { return null }
}

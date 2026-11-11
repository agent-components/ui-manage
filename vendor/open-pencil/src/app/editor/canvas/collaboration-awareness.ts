import type { EditorStore } from '@/app/editor/active-store'

/** Local cursor only — no room awareness in single-user mode. */
export function useCanvasCollaborationAwareness(store: EditorStore) {
  function updateCursor(cx: number, cy: number) {
    store.state.cursorCanvasX = cx
    store.state.cursorCanvasY = cy
  }

  return { updateCursor }
}

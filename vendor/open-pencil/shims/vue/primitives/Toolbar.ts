/**
 * Published `@open-pencil/vue` Toolbar entry omits dock helpers used by the App.
 * Re-export the real primitives and fill the holes.
 */
export {
  ToolbarItem,
  ToolbarRoot,
  getToolbarToolSelection,
  isToolbarToolActive,
  useToolbar,
  useToolbarState
} from '../../../node_modules/@open-pencil/vue/dist/primitives/Toolbar/index.js'

export const TOOLBAR_SIDES = ['bottom', 'top', 'left', 'right'] as const
export type ToolbarSide = (typeof TOOLBAR_SIDES)[number]

export const TOOLBAR_ALIGNS = ['start', 'center', 'end'] as const
export type ToolbarAlign = (typeof TOOLBAR_ALIGNS)[number]

export function toolbarOrientation(
  side: ToolbarSide
): 'horizontal' | 'vertical' {
  return side === 'left' || side === 'right' ? 'vertical' : 'horizontal'
}

/** Popup / tooltip side facing the canvas (opposite the docked edge). */
export function toolbarPopupSide(
  side: ToolbarSide
): 'top' | 'bottom' | 'left' | 'right' {
  switch (side) {
    case 'bottom':
      return 'top'
    case 'top':
      return 'bottom'
    case 'left':
      return 'right'
    case 'right':
      return 'left'
  }
}

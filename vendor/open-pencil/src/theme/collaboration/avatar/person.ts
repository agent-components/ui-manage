/** Minimal avatar styles (collaboration themes trimmed for single-user). */
export default {
  base: 'inline-flex items-center justify-center rounded-full text-white font-medium select-none',
  variants: {
    size: {
      sm: 'size-5 text-3xs',
      md: 'size-6 text-2xs',
      lg: 'size-8 text-xs'
    },
    bordered: {
      true: 'ring-2 ring-panel',
      false: ''
    },
    following: {
      true: 'ring-2 ring-primary',
      false: ''
    },
    interactive: {
      true: 'cursor-pointer',
      false: ''
    },
    voice: {
      none: '',
      speaking: 'ring-2 ring-emerald-400',
      listening: ''
    }
  },
  defaultVariants: {
    size: 'sm',
    bordered: false,
    following: false,
    interactive: false,
    voice: 'none'
  }
}

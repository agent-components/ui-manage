
import { defineComponent, h } from 'vue'

export type MarkdownComponentProps = {
  node?: unknown
}

export const Markdown = defineComponent({
  name: 'Markdown',
  setup(_, { slots }) {
    return () => h('div', slots.default?.())
  },
})

export const Tooltip = defineComponent({
  name: 'StreamMarkdownTooltip',
  props: {
    content: String,
    trigger: String,
    placement: String,
    delay: {
      type: [Number, Array],
      default: undefined,
    },
  },
  setup(_, { slots }) {
    return () => h('div', slots.default?.())
  },
})

export const UI = { Tooltip }
export default Markdown

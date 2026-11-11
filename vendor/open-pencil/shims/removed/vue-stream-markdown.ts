
import { defineComponent, h } from 'vue'
export const Markdown = defineComponent({
  name: 'Markdown',
  setup(_, { slots }) { return () => h('div', slots.default?.()) }
})
export const UI = {}
export default Markdown

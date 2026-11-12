import { useEventListener } from '@vueuse/core'

import { allTabs } from '@/app/tabs'

export function useDocumentCloseProtection() {
  useEventListener(window, 'beforeunload', (event) => {
    if (!allTabs.value.some((tab) => tab.isDirty)) return
    event.preventDefault()
    event.returnValue = ''
  })
}

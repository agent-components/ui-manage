import { computed, ref } from 'vue'

import { browserCredentialsRemembered } from '../app'
import { setRememberCredentials } from '../media'

export function useCredentialSettings() {
  const busy = ref(false)
  const failed = ref(false)
  const remembered = computed({
    get: () => browserCredentialsRemembered.value,
    set: (value) => {
      void setRememberCredentials(value).catch(() => {
        failed.value = true
      })
    }
  })
  return { busy, failed, remembered }
}

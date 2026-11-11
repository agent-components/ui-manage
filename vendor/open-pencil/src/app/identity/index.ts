import { createGlobalState, useLocalStorage } from '@vueuse/core'
import { computed } from 'vue'

import type { Color } from '@open-pencil/scene-graph/primitives'
import { randomIndex } from '@open-pencil/scene-graph/random'

import { generateGuestName } from '@/app/identity/guest-name'
import { PEER_COLORS } from '@/constants'

export const DISPLAY_NAME_STORAGE_KEY = 'op-collab-name'

/**
 * Local display name and session color (comments, editor user label).
 * Kept across sessions; color is per session.
 */
export const useDisplayIdentity = createGlobalState(() => {
  const storedName = useLocalStorage(DISPLAY_NAME_STORAGE_KEY, '')
  const guestName = generateGuestName()
  const color: Color = PEER_COLORS[randomIndex(PEER_COLORS.length)] ?? PEER_COLORS[0]
  const name = computed(() => storedName.value.trim() || guestName)
  const hasChosenName = computed(() => storedName.value.trim().length > 0)

  function setName(next: string) {
    storedName.value = next.trim()
  }

  return { name, color, hasChosenName, setName }
})

/** @deprecated Prefer useDisplayIdentity */
export const useCollabIdentity = useDisplayIdentity
export const COLLAB_NAME_STORAGE_KEY = DISPLAY_NAME_STORAGE_KEY

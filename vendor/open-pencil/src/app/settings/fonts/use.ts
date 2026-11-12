import { computed, ref } from 'vue'

import type {
  FontFamilyOption,
  LocalFontAccessState,
  WebFontProviderId
} from '@open-pencil/core/text'
import { useI18n } from '@open-pencil/vue/i18n'

import {
  fontProviderSettings,
  localFontAccessState,
  onlineFontsEnabled,
  requestLocalFontAccess,
  type FontProviderSettings
} from '@/app/editor/fonts'

export interface FontSettingsActions {
  localFontAccessState: () => LocalFontAccessState
  requestLocalFontAccess: () => Promise<string[] | FontFamilyOption[]>
  onlineFontsEnabled: { value: boolean }
  fontProviderSettings: { value: FontProviderSettings }
}

export type FontSettingsBusyAction = 'access'

const defaultActions: FontSettingsActions = {
  localFontAccessState,
  requestLocalFontAccess,
  onlineFontsEnabled,
  fontProviderSettings
}

export function useFontSettings(actions: FontSettingsActions = defaultActions) {
  const { common, fonts } = useI18n()
  const accessState = ref(actions.localFontAccessState())
  const busyAction = ref<FontSettingsBusyAction | null>(null)
  const status = ref('')
  const onlineFontsEnabled = actions.onlineFontsEnabled
  const fontProviderSettings = actions.fontProviderSettings

  const accessStateLabel = computed(() => {
    if (accessState.value === 'granted') return common.value.enabled
    if (accessState.value === 'denied') return common.value.denied
    if (accessState.value === 'unsupported') return common.value.unavailable
    return common.value.notRequested
  })

  const canRequestLocalFonts = computed(
    () => accessState.value === 'prompt' || accessState.value === 'denied'
  )

  async function requestAccess() {
    busyAction.value = 'access'
    status.value = ''
    try {
      await actions.requestLocalFontAccess()
      accessState.value = actions.localFontAccessState()
      status.value = fonts.value.localFontAccessEnabled
    } catch {
      accessState.value = actions.localFontAccessState()
      status.value = fonts.value.localFontAccessNotGranted
    } finally {
      busyAction.value = null
    }
  }

  function setOnlineFontsEnabled(enabled: boolean) {
    onlineFontsEnabled.value = enabled
    status.value = enabled
      ? fonts.value.onlineFontProvidersEnabled
      : fonts.value.onlineFontProvidersDisabled
  }

  function setFontProviderEnabled(provider: WebFontProviderId, enabled: boolean) {
    fontProviderSettings.value = { ...fontProviderSettings.value, [provider]: enabled }
    status.value = enabled
      ? fonts.value.providerEnabled({ provider })
      : fonts.value.providerDisabled({ provider })
  }

  return {
    accessState,
    accessStateLabel,
    busyAction,
    canRequestLocalFonts,
    status,
    onlineFontsEnabled,
    fontProviderSettings,
    requestAccess,
    setOnlineFontsEnabled,
    setFontProviderEnabled
  }
}

<script setup lang="ts">
import { useI18n } from '@open-pencil/vue/i18n'

import { useCredentialSettings } from '@/app/settings/credentials/preferences/use'
import SettingsGroup from '@/components/settings/layout/SettingsGroup.vue'
import SettingsRow from '@/components/settings/layout/SettingsRow.vue'
import SettingsSection from '@/components/settings/layout/SettingsSection.vue'
import AppAlert from '@/components/ui/feedback/AppAlert.vue'
import AppSwitch from '@/components/ui/toggle/AppSwitch.vue'

const { credentials } = useI18n()
const { failed, remembered } = useCredentialSettings()
</script>

<template>
  <SettingsSection>
    <template #title>{{ credentials.settingsTitle }}</template>
    <SettingsGroup>
      <SettingsRow
        as="label"
        :label="credentials.rememberDevice"
        :description="!remembered ? credentials.sessionOnly : undefined"
      >
        <AppSwitch v-model="remembered" :label="credentials.rememberDevice" />
      </SettingsRow>
    </SettingsGroup>
    <AppAlert v-if="failed" tone="error" :heading="credentials.retryFailed" />
  </SettingsSection>
</template>

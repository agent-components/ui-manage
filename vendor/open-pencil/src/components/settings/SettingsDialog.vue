<script setup lang="ts">
import { tryOnScopeDispose } from '@vueuse/core'
import { AlertDialogCancel } from 'reka-ui'
import { computed, type Component } from 'vue'
import IconPenTool from '~icons/lucide/pen-tool'
import IconSettings from '~icons/lucide/settings'
import IconType from '~icons/lucide/type'

import { useViewportKind } from '@open-pencil/vue/editor/viewport-kind'
import { useI18n } from '@open-pencil/vue/i18n'

import {
  settingsDialogOpen,
  registerSettingsNavigation,
  settingsDialogSection,
  type SettingsSection
} from '@/app/settings/dialog'
import { provideSettingsNavigation } from '@/app/settings/navigation/use'
import EditorSettingsPanel from '@/components/settings/editor/EditorSettingsPanel.vue'
import FontSettingsPanel from '@/components/settings/fonts/FontSettingsPanel.vue'
import GeneralSettingsPanel from '@/components/settings/general/GeneralSettingsPanel.vue'
import SettingsBreadcrumb from '@/components/settings/layout/SettingsBreadcrumb.vue'
import SettingsPage from '@/components/settings/layout/SettingsPage.vue'
import AppButton from '@/components/ui/button/AppButton.vue'
import {
  AppAlertDialogRoot,
  AppDialogFooter,
  AppDialogHeader,
  AppDialogRoot
} from '@/components/ui/dialog'
import AppSelect from '@/components/ui/select/AppSelect.vue'
import {
  AppTabsContent,
  AppTabsHeading,
  AppTabsList,
  AppTabsRoot,
  AppTabsTrigger
} from '@/components/ui/tabs'

const { isMobile } = useViewportKind()
const { settings, common } = useI18n()
const navigation = provideSettingsNavigation()
tryOnScopeDispose(registerSettingsNavigation(navigation.request))
const { editing, confirming, crumb } = navigation
interface SectionItem {
  value: SettingsSection
  label: string
  icon: Component
}

/** ui-manage: only app prefs — no storage / notifications / privacy / diagnostics. */
const groups = computed<{ label: string; sections: SectionItem[] }[]>(() => [
  {
    label: settings.value.groupApp,
    sections: [
      { value: 'general', label: settings.value.general, icon: IconSettings },
      { value: 'editor', label: settings.value.editor, icon: IconPenTool },
      { value: 'fonts', label: settings.value.fonts, icon: IconType }
    ]
  }
])
const sections = computed(() => groups.value.flatMap((group) => group.sections))
const selectGroups = computed(() =>
  groups.value.map((group) => ({
    label: group.label,
    options: group.sections.map(({ value, label }) => ({ value, label }))
  }))
)
function onSectionChange(section: string | number): void {
  const match = sections.value.find((item) => item.value === section)
  if (!match || match.value === settingsDialogSection.value) return
  navigation.request(() => {
    settingsDialogSection.value = match.value
  })
}
function onTriggerClick(section: string): void {
  if (section === settingsDialogSection.value && editing.value) navigation.back()
}
function closeSettings(): void {
  settingsDialogOpen.value = false
}

function onOpenChange(open: boolean): void {
  if (open) {
    settingsDialogOpen.value = true
    return
  }
  // Always close — do not block behind settings-form dirty prompts in ui-manage.
  closeSettings()
}
</script>

<template>
  <AppDialogRoot
    :open="settingsDialogOpen"
    size="xl"
    :ui="{ content: 'w-[min(52.5rem,96vw)]' }"
    height="full"
    data-test-id="app-settings-dialog"
    @update:open="onOpenChange"
  >
    <AppDialogHeader
      :heading="settings.title"
      :description="settings.description"
      :close-label="common.close"
    >
      <template v-if="crumb" #title>
        <SettingsBreadcrumb
          :steps="isMobile ? [crumb.parent] : [settings.title, crumb.parent]"
          :current="crumb.title"
          @back="navigation.back()"
        />
      </template>
    </AppDialogHeader>

    <AppTabsRoot
      :model-value="settingsDialogSection"
      @update:model-value="onSectionChange"
      :orientation="isMobile ? 'horizontal' : 'vertical'"
    >
      <div v-if="isMobile" class="shrink-0 border-b border-border p-3">
        <AppSelect
          :model-value="settingsDialogSection"
          :groups="selectGroups"
          :label="settings.title"
          :ui="{ trigger: 'w-full' }"
          @update:model-value="onSectionChange"
        />
      </div>
      <AppTabsList v-show="!isMobile" :label="settings.title">
        <template v-for="group in groups" :key="group.label">
          <AppTabsHeading>{{ group.label }}</AppTabsHeading>
          <AppTabsTrigger
            v-for="section in group.sections"
            :key="section.value"
            :value="section.value"
            :data-test-id="`settings-section-${section.value}`"
            @click="onTriggerClick(section.value)"
          >
            <template #leading><component :is="section.icon" class="size-3.5" /></template>
            {{ section.label }}
          </AppTabsTrigger>
        </template>
      </AppTabsList>

      <AppTabsContent value="general" as-child>
        <SettingsPage><GeneralSettingsPanel /></SettingsPage>
      </AppTabsContent>
      <AppTabsContent value="editor" as-child>
        <EditorSettingsPanel />
      </AppTabsContent>
      <AppTabsContent value="fonts" as-child>
        <FontSettingsPanel />
      </AppTabsContent>
    </AppTabsRoot>

    <AppDialogFooter v-if="!editing">
      <AppButton
        color="primary"
        variant="solid"
        data-test-id="app-settings-done"
        @click="closeSettings"
      >
        {{ common.done }}
      </AppButton>
    </AppDialogFooter>
  </AppDialogRoot>
  <AppAlertDialogRoot :open="confirming" @update:open="!$event && navigation.keepEditing()">
    <AppDialogHeader
      :heading="settings.discardChanges"
      :description="settings.discardChangesDescription"
      :show-close="false"
    />
    <AppDialogFooter>
      <AlertDialogCancel as-child
        ><AppButton>{{ settings.keepEditing }}</AppButton></AlertDialogCancel
      >
      <AppButton color="error" variant="solid" @click="navigation.discard">{{
        settings.discard
      }}</AppButton>
    </AppDialogFooter>
  </AppAlertDialogRoot>
</template>

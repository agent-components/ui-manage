<script setup lang="ts">
import { useHead } from '@unhead/vue'
import { useEventListener } from '@vueuse/core'
import { computed, onMounted, onUnmounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'

import { openingCloudLink, shownEditorStore, versionPreviewKey } from '@/app/cloud/integration'
import { openWebLinkFromLocation, withoutWebLinkParams } from '@/app/document/io/web-link'
import { setActiveEditorStore } from '@/app/editor/active-store'
import { focusNodesByName } from '@/app/editor/selection/focus'
import { bootUiManageBridgeFromRoute } from '@/app/integrations/ui-manage/bridge'
import {
  bootSharePreview,
  stopSharePreview
} from '@/app/integrations/ui-manage/share-bridge'
import { appRuntimeConfig } from '@/app/runtime/config'
import { useDocumentDrop } from '@/app/shell/document-drop'
import { useKeyboard } from '@/app/shell/keyboard/use'
import { useEditorMenu } from '@/app/shell/menu/use'
import { toast } from '@/app/shell/ui'
import {
  activeTab,
  createHomeTab,
  ensureHomeTab,
  createTab,
  getActiveStore,
  tabCount,
  type Tab
} from '@/app/tabs'
import { syncTabAddress } from '@/app/tabs/address'
import ColorSpaceBanner from '@/components/canvas/ColorSpaceBanner.vue'
import CommandPalette from '@/components/commands/CommandPalette.vue'
import EditorWorkspace from '@/components/editor/EditorWorkspace.vue'
import FileApiBanner from '@/components/FileApiBanner.vue'
import FontStatusBanner from '@/components/font-status/FontStatusBanner.vue'
import RenameSelectionDialog from '@/components/selection/RenameSelectionDialog.vue'
import LoadingScreen from '@/components/shell/LoadingScreen.vue'
import TabBar from '@/components/TabBar.vue'
import { IS_BROWSER } from '@/constants'

const props = defineProps<{ id?: string; token?: string }>()
const route = useRoute()
const uiManageEmbed = import.meta.env.VITE_OPENPENCIL_UI_MANAGE === '1'
const isShareRoute = computed(
  () => route.name === 'ui-manage-share' || Boolean(props.token)
)
/**
 * The active tab as it shows: a version of its document being previewed takes the document's
 * place, in a workspace of its own, until the history goes back to the document.
 */
const shown = computed(() => {
  const tab = activeTab.value
  if (!tab) return null
  return {
    tab: { ...tab, store: shownEditorStore(tab.store) },
    key: tab.id + versionPreviewKey(tab.store)
  }
})
// Shortcuts, menus, and the clipboard act on what the tab shows.
watch(
  () => shown.value?.tab.store,
  (store) => {
    if (store) setActiveEditorStore(store)
  }
)
const router = useRouter()
const pinHome = !appRuntimeConfig.test && !uiManageEmbed
const showHomeFirst = route.path === '/' && pinHome
watch(
  () => !appRuntimeConfig.test && !uiManageEmbed,
  (pins) => {
    if (pins) ensureHomeTab()
  }
)
const opensCloudLink = ['documentId', 'shareId', 'invitationId'].some(
  (param) => typeof route.params[param] === 'string'
)

function openFirstTab(): Tab {
  if (pinHome) createHomeTab()
  return showHomeFirst || opensCloudLink ? createHomeTab() : createTab()
}

{
  // Need a store before useKeyboard/useEditorMenu; ui-manage bridge reuses this blank tab.
  activeTab.value ?? openFirstTab()
}

useHead({ title: undefined })
useKeyboard()
useEditorMenu()
useDocumentDrop()

syncTabAddress(router, route)

useEventListener(
  document,
  'wheel',
  (event: WheelEvent) => {
    if (event.ctrlKey || event.metaKey) event.preventDefault()
  },
  { passive: false }
)

function stripWebLinkParams(): void {
  void router.replace({
    path: route.path,
    query: withoutWebLinkParams(route.query),
    hash: route.hash
  })
}

async function selectNodeByName(name: string): Promise<boolean> {
  return (await focusNodesByName(getActiveStore(), name)) !== 'missing'
}

onMounted(async () => {
  if (uiManageEmbed && (props.token || route.name === 'ui-manage-share')) {
    const token =
      props.token ||
      (typeof route.params.token === 'string' ? route.params.token : '')
    try {
      await bootSharePreview(token)
    } catch (error) {
      console.error('[ui-manage share]', error)
      toast.error(error instanceof Error ? error.message : String(error))
    }
    return
  }

  // ui-manage: open/save only via Nitro `/api/designs/:id/content`.
  if (uiManageEmbed && props.id) {
    try {
      await bootUiManageBridgeFromRoute(props.id)
    } catch (error) {
      console.error('[ui-manage bridge]', error)
      toast.error(error instanceof Error ? error.message : String(error))
    }
    return
  }

  if (IS_BROWSER) {
    try {
      await openWebLinkFromLocation(window.location.search, stripWebLinkParams, {
        selectByName: selectNodeByName,
        notify: (message, level) => (level === 'error' ? toast.error : toast.info)(message)
      })
    } catch (error) {
      console.error('[Web link]', error)
    }
  }
})

onUnmounted(() => {
  if (isShareRoute.value) stopSharePreview()
})
</script>

<template>
  <div data-test-id="editor-root" class="flex h-screen w-screen flex-col">
    <template v-if="!isShareRoute">
      <FileApiBanner />
      <ColorSpaceBanner />
      <FontStatusBanner />
      <RenameSelectionDialog />
      <CommandPalette />
    </template>
    <!-- ui-manage opens one design; the name and the way back live in the left header. -->
    <TabBar v-if="!uiManageEmbed && !isShareRoute" />
    <EditorWorkspace
      v-if="shown && shown.tab.kind === 'document'"
      :key="shown.key"
      :tab="shown.tab"
    />
    <LoadingScreen v-if="openingCloudLink" />
  </div>
</template>

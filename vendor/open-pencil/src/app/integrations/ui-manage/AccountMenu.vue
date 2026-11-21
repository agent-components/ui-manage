<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'
import { PopoverContent, PopoverPortal, PopoverRoot, PopoverTrigger } from 'reka-ui'

import { openSettingsDialog } from '@/app/settings/dialog'
import AccountAvatar from '@/components/presence/AccountAvatar.vue'

import { useUiManageAuth } from './auth'
import McpConnectDialog from './McpConnectDialog.vue'
import { isEmbeddedFrame } from './mode'
import ProfileDialog from './ProfileDialog.vue'

const { placement = 'sidebar' } = defineProps<{
  placement?: 'sidebar' | 'header'
}>()

const router = useRouter()
const { user, logout } = useUiManageAuth()
const menuOpen = ref(false)
const profileOpen = ref(false)
const mcpOpen = ref(false)
const displayName = computed(() => user.value?.displayName || user.value?.account || '')
const embedded = isEmbeddedFrame()

const itemClass =
  'flex w-full cursor-pointer items-center gap-2 rounded px-2 py-1.5 text-left text-xs text-surface outline-none hover:bg-hover'

function openProfile() {
  menuOpen.value = false
  profileOpen.value = true
}

function openMcp() {
  menuOpen.value = false
  mcpOpen.value = true
}

function openSystemSettings() {
  menuOpen.value = false
  openSettingsDialog()
}

async function onLogout() {
  menuOpen.value = false
  await logout()
  if (embedded) {
    await router.replace({ name: 'ui-manage-harness-required' })
    return
  }
  await router.replace('/login')
}
</script>

<template>
  <PopoverRoot v-model:open="menuOpen">
    <PopoverTrigger
      class="flex cursor-pointer items-center gap-2 rounded-md text-left outline-none transition-colors hover:bg-hover focus-visible:ring-1 focus-visible:ring-panel-focus"
      :class="placement === 'sidebar' ? 'w-full justify-between px-2 py-1.5' : ''"
      :aria-label="displayName ? `${displayName}，账户菜单` : '账户菜单'"
    >
      <span
        class="truncate text-xs text-surface"
        :class="placement === 'sidebar' ? 'min-w-0' : 'max-w-24'"
      >
        {{ displayName }}
      </span>
      <AccountAvatar
        v-if="user"
        :id="user.id"
        :name="displayName || user.account"
        size="sm"
      />
    </PopoverTrigger>
    <PopoverPortal>
      <PopoverContent
        :side="placement === 'sidebar' ? 'top' : 'bottom'"
        :align="placement === 'sidebar' ? 'start' : 'end'"
        :side-offset="8"
        class="z-50 min-w-40 rounded-xl bg-panel p-1 text-surface shadow-[0_0_0_1px_var(--color-border),0_8px_30px_rgb(0_0_0/0.4)] outline-none"
      >
        <button type="button" :class="itemClass" @click="openMcp">
          <icon-lucide-plug class="size-3.5 text-muted" />
          接入 MCP
        </button>
        <button
          v-if="!embedded"
          type="button"
          :class="itemClass"
          @click="openProfile"
        >
          <icon-lucide-user-pen class="size-3.5 text-muted" />
          修改资料
        </button>
        <button type="button" :class="itemClass" @click="openSystemSettings">
          <icon-lucide-settings class="size-3.5 text-muted" />
          系统设置
        </button>
        <button v-if="!embedded" type="button" :class="itemClass" @click="onLogout">
          <icon-lucide-log-out class="size-3.5 text-muted" />
          退出登录
        </button>
      </PopoverContent>
    </PopoverPortal>
  </PopoverRoot>
  <ProfileDialog v-if="!embedded" v-model:open="profileOpen" />
  <McpConnectDialog v-model:open="mcpOpen" />
</template>

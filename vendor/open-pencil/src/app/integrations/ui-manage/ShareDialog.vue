<script setup lang="ts">
import { computed, ref, watch } from 'vue'

import AppButton from '@/components/ui/button/AppButton.vue'
import { AppDialog } from '@/components/ui/dialog'
import AppAlert from '@/components/ui/feedback/AppAlert.vue'
import AppInput from '@/components/ui/input/AppInput.vue'
import { toast } from '@/app/shell/ui'

import { useUiManageDesigns } from './designs-api'

const open = defineModel<boolean>('open', { default: false })
const { designId } = defineProps<{ designId: string }>()

const api = useUiManageDesigns()
const loading = ref(false)
const enabling = ref(false)
const disabling = ref(false)
const error = ref('')
const enabled = ref(false)
const sharePath = ref<string | null>(null)

const shareUrl = computed({
  get() {
    if (!sharePath.value) return ''
    return `${window.location.origin}${sharePath.value}`
  },
  set() {
    /* readonly field */
  }
})

async function refresh() {
  if (!designId) return
  loading.value = true
  error.value = ''
  try {
    const state = await api.getShare(designId)
    enabled.value = state.enabled
    sharePath.value = state.url
  } catch (e: unknown) {
    error.value = e instanceof Error ? e.message : '加载分享状态失败'
  } finally {
    loading.value = false
  }
}

watch(
  () => [open.value, designId] as const,
  ([isOpen]) => {
    if (isOpen) void refresh()
  },
  { immediate: true }
)

async function onEnable() {
  enabling.value = true
  error.value = ''
  try {
    const state = await api.enableShare(designId)
    enabled.value = state.enabled
    sharePath.value = state.url
  } catch (e: unknown) {
    error.value = e instanceof Error ? e.message : '开启分享失败'
  } finally {
    enabling.value = false
  }
}

async function onDisable() {
  disabling.value = true
  error.value = ''
  try {
    const state = await api.disableShare(designId)
    enabled.value = state.enabled
    sharePath.value = state.url
  } catch (e: unknown) {
    error.value = e instanceof Error ? e.message : '关闭分享失败'
  } finally {
    disabling.value = false
  }
}

async function onCopy() {
  if (!shareUrl.value) return
  try {
    await navigator.clipboard.writeText(shareUrl.value)
    toast.info('已复制分享链接')
  } catch {
    toast.error('复制失败')
  }
}
</script>

<template>
  <AppDialog v-model:open="open" heading="分享设计稿" size="sm">
    <p class="text-xs text-muted">
      开启后，任何持有链接的人可只读预览；作者保存后约 10 秒内同步。
    </p>
    <AppAlert v-if="error" class="mt-3" tone="error" :heading="error" />

    <div v-if="enabled" class="mt-4 space-y-2">
      <label class="block text-xs font-medium text-surface">
        分享链接
        <AppInput
          v-model="shareUrl"
          class="mt-1.5 w-full"
          size="md"
          readonly
          @focus="($event.target as HTMLInputElement).select()"
        />
      </label>
    </div>
    <p v-else-if="!loading" class="mt-4 text-xs text-muted">尚未开启分享。</p>

    <template #footer>
      <AppButton
        v-if="enabled"
        color="neutral"
        variant="ghost"
        :disabled="disabling || enabling"
        :loading="disabling"
        @click="onDisable"
      >
        关闭分享
      </AppButton>
      <AppButton
        v-else
        color="primary"
        variant="solid"
        :disabled="loading || enabling"
        :loading="enabling"
        @click="onEnable"
      >
        开启分享
      </AppButton>
      <AppButton
        v-if="enabled"
        color="primary"
        variant="solid"
        :disabled="!shareUrl"
        @click="onCopy"
      >
        复制链接
      </AppButton>
    </template>
  </AppDialog>
</template>

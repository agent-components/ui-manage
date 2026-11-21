<script setup lang="ts">
import { ref, watch } from 'vue'

import { toast } from '@/app/shell/ui'
import AppButton from '@/components/ui/button/AppButton.vue'
import { AppDialog } from '@/components/ui/dialog'
import AppAlert from '@/components/ui/feedback/AppAlert.vue'

import { trpc } from './trpc'

const open = defineModel<boolean>('open', { default: false })

const json = ref('')
const loading = ref(false)
const error = ref('')
const copying = ref(false)

function mcpConnectJson(token: string) {
  return JSON.stringify(
    {
      mcpServers: {
        设计稿: {
          url: `${window.location.origin}/mcp`,
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      }
    },
    null,
    2
  )
}

watch(open, async (value) => {
  if (!value) return
  json.value = ''
  error.value = ''
  loading.value = true
  try {
    const result = await trpc.auth.token.query()
    json.value = mcpConnectJson(result.token)
  } catch (e: unknown) {
    error.value = e instanceof Error ? e.message : '读取令牌失败'
  } finally {
    loading.value = false
  }
})

async function copy() {
  if (!json.value || copying.value) return
  copying.value = true
  try {
    await navigator.clipboard.writeText(json.value)
    toast.info('已复制')
  } catch {
    toast.error('复制失败')
  } finally {
    copying.value = false
  }
}
</script>

<template>
  <AppDialog v-model:open="open" heading="接入 MCP" size="lg">
    <AppAlert v-if="error" tone="error" :heading="error" />
    <pre
      v-else
      class="m-0 min-h-40 overflow-auto rounded-md bg-field p-3 font-mono text-xs leading-relaxed whitespace-pre text-surface"
      >{{ loading ? '正在读取令牌…' : json }}</pre
    >
    <template #footer>
      <AppButton color="neutral" variant="ghost" @click="open = false">关闭</AppButton>
      <AppButton
        color="primary"
        variant="solid"
        :disabled="!json"
        :loading="copying"
        @click="copy"
      >
        复制
      </AppButton>
    </template>
  </AppDialog>
</template>

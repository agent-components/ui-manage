<script setup lang="ts">
import { nextTick, onMounted, ref, useTemplateRef, watch } from 'vue'

import { toast } from '@/app/shell/ui'

import AppButton from '@/components/ui/button/AppButton.vue'
import { AppConfirmationDialog, AppDialog } from '@/components/ui/dialog'
import AppAlert from '@/components/ui/feedback/AppAlert.vue'
import AppInput from '@/components/ui/input/AppInput.vue'
import {
  AppTable,
  AppTableBody,
  AppTableCell,
  AppTableHead,
  AppTableHeader,
  AppTablePlaceholder,
  AppTableRow
} from '@/components/ui/table'

import ManageShell from './ManageShell.vue'
import { useUiManageTokens, type ApiTokenRow, type CreatedApiToken } from './tokens-api'

const api = useUiManageTokens()

const tokens = ref<ApiTokenRow[]>([])
const loading = ref(true)
const error = ref('')
const creating = ref(false)

const createOpen = ref(false)
const createName = ref('')
const createInput = useTemplateRef<{ focus: (o?: FocusOptions) => void; select: () => void }>(
  'createInput'
)

const revealedOpen = ref(false)
const revealedToken = ref<CreatedApiToken | null>(null)

const revokeOpen = ref(false)
const revokeTarget = ref<ApiTokenRow | null>(null)

const tableUi = {
  root: 'console-table flex min-h-0 flex-1 flex-col overflow-hidden rounded-none border-0 bg-transparent',
  scroller: 'console-scroll min-h-0 flex-1 overflow-auto',
  table: 'console-grid',
  footer: 'border-0 bg-transparent p-0'
}

async function refresh() {
  loading.value = true
  error.value = ''
  try {
    tokens.value = await api.list()
  } catch (e: unknown) {
    error.value = e instanceof Error ? e.message : '加载失败'
  } finally {
    loading.value = false
  }
}

async function openCreate() {
  createName.value = ''
  createOpen.value = true
  await nextTick()
  createInput.value?.focus()
}

async function submitCreate() {
  const name = createName.value.trim()
  if (!name) {
    error.value = '请输入令牌名称'
    return
  }
  creating.value = true
  error.value = ''
  try {
    const created = await api.create(name)
    createOpen.value = false
    revealedToken.value = created
    revealedOpen.value = true
    await refresh()
  } catch (e: unknown) {
    error.value = e instanceof Error ? e.message : '创建失败'
  } finally {
    creating.value = false
  }
}

function openRevoke(token: ApiTokenRow) {
  revokeTarget.value = token
  revokeOpen.value = true
}

async function confirmRevoke() {
  const token = revokeTarget.value
  if (!token) return
  try {
    await api.revoke(token.id)
    revokeTarget.value = null
    await refresh()
  } catch (e: unknown) {
    error.value = e instanceof Error ? e.message : '撤销失败'
  }
}

async function copyText(value: string, okMessage: string) {
  try {
    await navigator.clipboard.writeText(value)
    toast.info(okMessage)
  } catch {
    toast.error('复制失败')
  }
}

async function copyRevealedToken() {
  const value = revealedToken.value?.token
  if (!value) return
  await copyText(value, '已复制访问令牌')
}

async function copyMcpConfig(token: ApiTokenRow) {
  try {
    const { config } = await api.mcpConfig(token.id)
    await copyText(config, '已复制 MCP 配置')
  } catch (e: unknown) {
    toast.error(e instanceof Error ? e.message : '复制失败')
  }
}

async function copyRevealedMcpConfig() {
  const created = revealedToken.value
  if (!created) return
  await copyMcpConfig(created)
}

function closeRevealed() {
  revealedOpen.value = false
  revealedToken.value = null
}

watch(revealedOpen, (open) => {
  if (!open) revealedToken.value = null
})

function formatTime(value: string | null) {
  if (!value) return '—'
  const d = new Date(value)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`
}

onMounted(refresh)
</script>

<template>
  <ManageShell
    active="tokens"
    title="访问令牌"
    description="给第三方 MCP 客户端使用。明文只在创建时显示一次。"
  >
    <template #actions>
      <AppButton
        class="console-btn"
        color="primary"
        variant="solid"
        size="md"
        :disabled="creating"
        @click="openCreate"
      >
        <template #leading>
          <icon-lucide-plus class="size-3.5" />
        </template>
        创建令牌
      </AppButton>
    </template>

    <AppAlert v-if="error" tone="error" :heading="error" />

    <section class="console-card console-card-fill">
      <AppTable
        label="访问令牌列表"
        :loading="loading ? 'first' : false"
        loading-label="加载中…"
        :ui="tableUi"
      >
        <AppTableHeader>
          <AppTableRow>
            <AppTableHead>名称</AppTableHead>
            <AppTableHead>前缀</AppTableHead>
            <AppTableHead>创建时间</AppTableHead>
            <AppTableHead>最近使用</AppTableHead>
            <AppTableHead class="console-col-ops-narrow">操作</AppTableHead>
          </AppTableRow>
        </AppTableHeader>
        <AppTablePlaceholder
          v-if="loading"
          :columns="[
            { id: 'name' },
            { id: 'prefix' },
            { id: 'created' },
            { id: 'used' },
            { id: 'actions', actions: true }
          ]"
        />
        <AppTableBody v-else>
          <tr v-if="!tokens.length" class="console-empty-row">
            <td class="console-empty-cell" colspan="5">
              <div class="console-empty">
                <svg
                  class="console-empty-icon"
                  width="40"
                  height="40"
                  viewBox="0 0 40 40"
                  fill="none"
                  aria-hidden="true"
                >
                  <circle cx="16" cy="20" r="6.25" stroke="currentColor" stroke-width="1.4" />
                  <path
                    d="M21.2 20H31.5v3.2M27.6 20v3.2"
                    stroke="currentColor"
                    stroke-width="1.4"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                  />
                  <circle cx="16" cy="20" r="1.4" fill="currentColor" />
                </svg>
                <p class="console-empty-title">还没有访问令牌</p>
                <p class="console-empty-desc">创建后用于连接 MCP 画稿。</p>
                <button type="button" class="console-empty-action" @click="openCreate">
                  创建令牌
                </button>
              </div>
            </td>
          </tr>
          <AppTableRow v-for="token in tokens" :key="token.id">
            <AppTableCell>
              <span class="console-name">
                <span class="console-name-text">{{ token.name }}</span>
              </span>
            </AppTableCell>
            <AppTableCell class="console-code">{{ token.tokenPrefix }}…</AppTableCell>
            <AppTableCell class="console-time">{{ formatTime(token.createdAt) }}</AppTableCell>
            <AppTableCell class="console-time">{{ formatTime(token.lastUsedAt) }}</AppTableCell>
            <AppTableCell>
              <div class="console-ops">
                <button type="button" class="console-op" @click="copyMcpConfig(token)">复制</button>
                <button type="button" class="console-op is-danger" @click="openRevoke(token)">
                  撤销
                </button>
              </div>
            </AppTableCell>
          </AppTableRow>
        </AppTableBody>
        <template #footer>
          <template v-if="loading">加载中…</template>
          <template v-else>共 {{ tokens.length }} 条</template>
        </template>
      </AppTable>
    </section>

    <AppDialog
      v-model:open="createOpen"
      heading="创建访问令牌"
      size="sm"
      :show-close="!creating"
    >
      <label class="block text-xs font-medium text-surface">
        名称
        <AppInput
          ref="createInput"
          v-model="createName"
          class="mt-1.5 w-full"
          size="md"
          maxlength="64"
          placeholder="例如：Cursor MCP"
          :disabled="creating"
          required
          @enter="submitCreate"
        />
      </label>
      <template #footer>
        <AppButton
          color="neutral"
          variant="ghost"
          :disabled="creating"
          @click="createOpen = false"
        >
          取消
        </AppButton>
        <AppButton color="primary" variant="solid" :loading="creating" @click="submitCreate">
          创建
        </AppButton>
      </template>
    </AppDialog>

    <AppDialog v-model:open="revealedOpen" heading="令牌已创建" size="sm" :show-close="true">
      <p class="text-xs text-muted">请立即复制并妥善保存。关闭后将无法再次查看完整令牌。</p>
      <label class="mt-3 block text-xs font-medium text-surface">
        访问令牌
        <AppInput
          :model-value="revealedToken?.token ?? ''"
          class="mt-1.5 w-full font-mono text-[12px]"
          size="md"
          readonly
          @focus="($event.target as HTMLInputElement).select()"
        />
      </label>
      <template #footer>
        <AppButton color="neutral" variant="ghost" @click="closeRevealed">关闭</AppButton>
        <AppButton color="neutral" variant="outline" @click="copyRevealedToken">复制令牌</AppButton>
        <AppButton color="primary" variant="solid" @click="copyRevealedMcpConfig">
          复制 MCP 配置
        </AppButton>
      </template>
    </AppDialog>

    <AppConfirmationDialog
      v-model:open="revokeOpen"
      heading="撤销访问令牌"
      :description="
        revokeTarget ? `确认撤销「${revokeTarget.name}」？使用该令牌的客户端将立即失效。` : undefined
      "
      cancel-label="取消"
      confirm-label="撤销"
      tone="danger"
      @confirm="confirmRevoke"
      @cancel="revokeTarget = null"
    />
  </ManageShell>
</template>

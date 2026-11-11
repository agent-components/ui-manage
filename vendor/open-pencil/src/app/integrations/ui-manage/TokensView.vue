<script setup lang="ts">
import { computed, nextTick, onMounted, ref, useTemplateRef, watch } from 'vue'
import { RouterLink, useRouter } from 'vue-router'
import { PopoverContent, PopoverPortal, PopoverRoot, PopoverTrigger } from 'reka-ui'

import { openSettingsDialog } from '@/app/settings/dialog'
import { resolvedAppTheme } from '@/app/shell/theme'
import { toast } from '@/app/shell/ui'
import BrandMark from '@/components/brand/BrandMark.vue'
import AccountAvatar from '@/components/presence/AccountAvatar.vue'
import AppButton from '@/components/ui/button/AppButton.vue'
import { AppConfirmationDialog, AppDialog } from '@/components/ui/dialog'
import AppAlert from '@/components/ui/feedback/AppAlert.vue'
import AppPlaceholder from '@/components/ui/feedback/AppPlaceholder.vue'
import AppInput from '@/components/ui/input/AppInput.vue'
import {
  AppTable,
  AppTableBody,
  AppTableCell,
  AppTableEmpty,
  AppTableHead,
  AppTableHeader,
  AppTablePlaceholder,
  AppTableRow
} from '@/components/ui/table'

import { useUiManageAuth } from './auth'
import { useUiManageTokens, type ApiTokenRow, type CreatedApiToken } from './tokens-api'

const router = useRouter()
const { user, logout } = useUiManageAuth()
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
const accountMenuOpen = ref(false)

const displayName = computed(() => user.value?.displayName || user.value?.account || '')

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

async function copyRevealedToken() {
  const value = revealedToken.value?.token
  if (!value) return
  try {
    await navigator.clipboard.writeText(value)
    toast.info('已复制访问令牌')
  } catch {
    toast.error('复制失败')
  }
}

function closeRevealed() {
  revealedOpen.value = false
  revealedToken.value = null
}

watch(revealedOpen, (open) => {
  if (!open) revealedToken.value = null
})

function openSystemSettings() {
  accountMenuOpen.value = false
  openSettingsDialog()
}

async function onLogout() {
  accountMenuOpen.value = false
  await logout()
  await router.replace('/login')
}

function formatTime(value: string | null) {
  if (!value) return '—'
  const d = new Date(value)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}/${pad(d.getMonth() + 1)}/${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`
}

onMounted(refresh)
</script>

<template>
  <div class="flex h-full min-h-0 bg-canvas text-surface">
    <aside
      class="hidden w-[220px] shrink-0 flex-col border-r border-border bg-panel md:flex"
      aria-label="主导航"
    >
      <div class="flex items-center gap-2.5 px-5 py-5">
        <BrandMark
          variant="app-icon"
          :appearance="resolvedAppTheme"
          class="size-8 shrink-0"
          decorative
        />
        <div class="min-w-0 leading-tight">
          <p class="truncate text-[15px] font-semibold tracking-tight text-surface">屏幕设计</p>
          <p class="mt-0.5 truncate text-[11px] text-muted">设计文件管理</p>
        </div>
      </div>

      <nav class="flex-1 space-y-1 px-3 pt-1">
        <RouterLink
          to="/designs"
          class="flex items-center gap-2.5 rounded-md py-2.5 pr-3 pl-3 text-[13px] font-medium text-muted outline-none transition-colors hover:bg-hover hover:text-surface"
        >
          <icon-lucide-layout-template class="size-4 shrink-0 opacity-90" />
          设计文件
        </RouterLink>
        <div
          class="relative flex items-center gap-2.5 rounded-md bg-accent/10 py-2.5 pr-3 pl-3 text-[13px] font-medium text-primary"
          aria-current="page"
        >
          <span
            class="absolute top-1.5 bottom-1.5 left-0 w-[3px] rounded-r-full bg-primary"
            aria-hidden="true"
          />
          <icon-lucide-key-round class="size-4 shrink-0 opacity-90" />
          访问令牌
        </div>
      </nav>

      <div class="mt-auto border-t border-border px-3 py-3">
        <PopoverRoot v-model:open="accountMenuOpen">
          <PopoverTrigger
            class="flex w-full cursor-pointer items-center justify-between gap-2 rounded-md px-2 py-1.5 text-left outline-none transition-colors hover:bg-hover focus-visible:ring-1 focus-visible:ring-panel-focus"
            :aria-label="displayName ? `${displayName}，账户菜单` : '账户菜单'"
          >
            <span class="min-w-0 truncate text-[13px] text-surface">{{ displayName }}</span>
            <AccountAvatar
              v-if="user"
              :id="user.id"
              :name="displayName || user.account"
              size="sm"
            />
          </PopoverTrigger>
          <PopoverPortal>
            <PopoverContent
              side="top"
              align="start"
              :side-offset="8"
              class="z-50 min-w-40 rounded-lg border border-border bg-panel p-1 shadow-md outline-none"
            >
              <button
                type="button"
                class="flex w-full cursor-pointer items-center gap-2 rounded-md px-2.5 py-2 text-left text-[13px] text-surface outline-none hover:bg-hover"
                @click="openSystemSettings"
              >
                <icon-lucide-settings class="size-3.5 text-muted" />
                系统设置
              </button>
              <button
                type="button"
                class="flex w-full cursor-pointer items-center gap-2 rounded-md px-2.5 py-2 text-left text-[13px] text-surface outline-none hover:bg-hover"
                @click="onLogout"
              >
                <icon-lucide-log-out class="size-3.5 text-muted" />
                退出登录
              </button>
            </PopoverContent>
          </PopoverPortal>
        </PopoverRoot>
      </div>
    </aside>

    <div class="flex min-w-0 flex-1 flex-col overflow-auto">
      <header
        class="flex items-center justify-between gap-3 border-b border-border bg-panel px-4 py-3 md:hidden"
      >
        <div class="flex min-w-0 items-center gap-2">
          <BrandMark
            variant="app-icon"
            :appearance="resolvedAppTheme"
            class="size-7 shrink-0"
            decorative
          />
          <span class="truncate text-[15px] font-semibold">访问令牌</span>
        </div>
        <PopoverRoot>
          <PopoverTrigger
            class="flex cursor-pointer items-center gap-2 rounded-md outline-none focus-visible:ring-1 focus-visible:ring-panel-focus"
            :aria-label="displayName ? `${displayName}，账户菜单` : '账户菜单'"
          >
            <span class="max-w-24 truncate text-[13px] text-surface">{{ displayName }}</span>
            <AccountAvatar
              v-if="user"
              :id="user.id"
              :name="displayName || user.account"
              size="sm"
            />
          </PopoverTrigger>
          <PopoverPortal>
            <PopoverContent
              side="bottom"
              align="end"
              :side-offset="8"
              class="z-50 min-w-40 rounded-lg border border-border bg-panel p-1 shadow-md outline-none"
            >
              <RouterLink
                to="/tokens"
                class="flex w-full cursor-pointer items-center gap-2 rounded-md px-2.5 py-2 text-left text-[13px] text-surface outline-none hover:bg-hover"
              >
                <icon-lucide-key-round class="size-3.5 text-muted" />
                访问令牌
              </RouterLink>
              <button
                type="button"
                class="flex w-full cursor-pointer items-center gap-2 rounded-md px-2.5 py-2 text-left text-[13px] text-surface outline-none hover:bg-hover"
                @click="openSystemSettings"
              >
                <icon-lucide-settings class="size-3.5 text-muted" />
                系统设置
              </button>
              <button
                type="button"
                class="flex w-full cursor-pointer items-center gap-2 rounded-md px-2.5 py-2 text-left text-[13px] text-surface outline-none hover:bg-hover"
                @click="onLogout"
              >
                <icon-lucide-log-out class="size-3.5 text-muted" />
                退出登录
              </button>
            </PopoverContent>
          </PopoverPortal>
        </PopoverRoot>
      </header>

      <main class="flex w-full flex-1 flex-col gap-4 px-5 py-5 sm:px-6 lg:px-8">
        <div class="flex flex-wrap items-end justify-between gap-3">
          <div class="min-w-0">
            <span
              class="inline-flex h-5 items-center rounded px-1.5 text-[11px] font-medium text-primary"
              style="background: color-mix(in srgb, var(--color-accent) 14%, transparent)"
            >
              访问令牌
            </span>
            <h1 class="mt-2 text-[22px] leading-none font-semibold tracking-tight text-surface">
              访问令牌
            </h1>
            <p class="mt-2 text-[13px] text-muted">
              给第三方 MCP 客户端使用。明文只在创建时显示一次。
            </p>
          </div>
          <AppButton
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
        </div>

        <AppAlert v-if="error" tone="error" :heading="error" />

        <section
          class="flex min-h-0 flex-1 flex-col overflow-hidden rounded-xl border border-border bg-panel shadow-sm"
        >
          <AppPlaceholder
            v-if="!loading && !error && !tokens.length"
            label="还没有访问令牌"
            description="创建后用于连接 MCP 画稿。"
            size="panel"
            class="min-h-[320px]"
          >
            <template #icon>
              <icon-lucide-key-round class="size-5" />
            </template>
            <template #action>
              <AppButton color="primary" variant="solid" size="sm" @click="openCreate">
                创建令牌
              </AppButton>
            </template>
          </AppPlaceholder>

          <AppTable
            v-else
            label="访问令牌列表"
            :loading="loading ? 'first' : false"
            loading-label="加载中…"
            :ui="{
              root: 'flex min-h-0 flex-1 flex-col overflow-hidden rounded-none border-0 bg-transparent',
              scroller: 'min-h-0 flex-1 overflow-auto',
              footer: 'mt-auto border-t border-border px-5 py-2.5'
            }"
          >
            <AppTableHeader>
              <AppTableRow>
                <AppTableHead class="h-10 px-4 text-[12px] first:pl-5 last:pr-5">名称</AppTableHead>
                <AppTableHead class="h-10 px-4 text-[12px] first:pl-5 last:pr-5">前缀</AppTableHead>
                <AppTableHead class="h-10 px-4 text-[12px] first:pl-5 last:pr-5">
                  创建时间
                </AppTableHead>
                <AppTableHead class="h-10 px-4 text-[12px] first:pl-5 last:pr-5">
                  最近使用
                </AppTableHead>
                <AppTableHead class="h-10 w-28 px-4 text-[12px] first:pl-5 last:pr-5">
                  操作
                </AppTableHead>
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
              <AppTableEmpty v-if="!tokens.length" :colspan="5">暂无访问令牌</AppTableEmpty>
              <AppTableRow v-for="token in tokens" :key="token.id">
                <AppTableCell class="h-14 px-4 text-[13px] first:pl-5 last:pr-5">
                  <span class="font-medium text-surface">{{ token.name }}</span>
                </AppTableCell>
                <AppTableCell
                  class="h-14 px-4 font-mono text-[13px] tabular-nums text-muted first:pl-5 last:pr-5"
                >
                  {{ token.tokenPrefix }}…
                </AppTableCell>
                <AppTableCell
                  class="h-14 px-4 text-[13px] tabular-nums text-muted first:pl-5 last:pr-5"
                >
                  {{ formatTime(token.createdAt) }}
                </AppTableCell>
                <AppTableCell
                  class="h-14 px-4 text-[13px] tabular-nums text-muted first:pl-5 last:pr-5"
                >
                  {{ formatTime(token.lastUsedAt) }}
                </AppTableCell>
                <AppTableCell class="h-14 px-4 text-[13px] first:pl-5 last:pr-5">
                  <button
                    type="button"
                    class="cursor-pointer text-[13px] text-error hover:underline"
                    @click="openRevoke(token)"
                  >
                    撤销
                  </button>
                </AppTableCell>
              </AppTableRow>
            </AppTableBody>
            <template #footer>
              <div class="flex items-center justify-end text-[12px] text-muted">
                <template v-if="loading">加载中…</template>
                <template v-else>共 {{ tokens.length }} 条</template>
              </div>
            </template>
          </AppTable>
        </section>
      </main>
    </div>

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
        <AppButton color="primary" variant="solid" @click="copyRevealedToken">复制令牌</AppButton>
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
  </div>
</template>

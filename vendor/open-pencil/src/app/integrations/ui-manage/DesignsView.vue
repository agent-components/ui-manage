<script setup lang="ts">
import { computed, nextTick, onMounted, ref, useTemplateRef } from 'vue'
import { RouterLink, useRouter } from 'vue-router'
import { PopoverContent, PopoverPortal, PopoverRoot, PopoverTrigger } from 'reka-ui'

import { openSettingsDialog } from '@/app/settings/dialog'
import { resolvedAppTheme } from '@/app/shell/theme'
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
import { useUiManageDesigns, type Design } from './designs-api'
import ShareDialog from './ShareDialog.vue'

const DEFAULT_NAME = '未命名设计文件'

const router = useRouter()
const { user, logout } = useUiManageAuth()
const api = useUiManageDesigns()

const designs = ref<Design[]>([])
const loading = ref(true)
const error = ref('')
const draftQuery = ref('')
const query = ref('')
const creating = ref(false)
const renaming = ref(false)

const createOpen = ref(false)
const createName = ref(DEFAULT_NAME)
const createInput = useTemplateRef<{ focus: (o?: FocusOptions) => void; select: () => void }>(
  'createInput'
)

const renameOpen = ref(false)
const renameTarget = ref<Design | null>(null)
const renameName = ref('')
const renameInput = useTemplateRef<{ focus: (o?: FocusOptions) => void; select: () => void }>(
  'renameInput'
)

const deleteOpen = ref(false)
const deleteTarget = ref<Design | null>(null)

const shareOpen = ref(false)
const shareDesignId = ref('')
const accountMenuOpen = ref(false)

const displayName = computed(() => user.value?.displayName || user.value?.account || '')

const filtered = computed(() => {
  const q = query.value.trim().toLowerCase()
  if (!q) return designs.value
  return designs.value.filter((d) => d.name.toLowerCase().includes(q))
})

const showTable = computed(
  () => loading.value || (designs.value.length > 0 && filtered.value.length > 0)
)

async function refresh() {
  loading.value = true
  error.value = ''
  try {
    designs.value = await api.list()
  } catch (e: unknown) {
    error.value = e instanceof Error ? e.message : '加载失败'
  } finally {
    loading.value = false
  }
}

function applySearch() {
  query.value = draftQuery.value
}

function resetSearch() {
  draftQuery.value = ''
  query.value = ''
}

async function openCreate() {
  createName.value = DEFAULT_NAME
  createOpen.value = true
  await nextTick()
  createInput.value?.focus()
  createInput.value?.select()
}

async function submitCreate() {
  const name = createName.value.trim() || DEFAULT_NAME
  creating.value = true
  try {
    const design = await api.create(name)
    createOpen.value = false
    await router.push(`/designs/${design.id}`)
  } catch (e: unknown) {
    error.value = e instanceof Error ? e.message : '创建失败'
  } finally {
    creating.value = false
  }
}

async function openRename(design: Design) {
  renameTarget.value = design
  renameName.value = design.name
  renameOpen.value = true
  await nextTick()
  renameInput.value?.focus()
  renameInput.value?.select()
}

async function submitRename() {
  const design = renameTarget.value
  if (!design) return
  const name = renameName.value.trim()
  if (!name) return
  renaming.value = true
  try {
    await api.rename(design.id, name)
    renameOpen.value = false
    renameTarget.value = null
    await refresh()
  } catch (e: unknown) {
    error.value = e instanceof Error ? e.message : '重命名失败'
  } finally {
    renaming.value = false
  }
}

function openDelete(design: Design) {
  deleteTarget.value = design
  deleteOpen.value = true
}

function openShare(design: Design) {
  shareDesignId.value = design.id
  shareOpen.value = true
}

async function confirmDelete() {
  const design = deleteTarget.value
  if (!design) return
  try {
    await api.remove(design.id)
    deleteTarget.value = null
    await refresh()
  } catch (e: unknown) {
    error.value = e instanceof Error ? e.message : '删除失败'
  }
}

function openSystemSettings() {
  accountMenuOpen.value = false
  openSettingsDialog()
}

async function onLogout() {
  accountMenuOpen.value = false
  await logout()
  await router.replace('/login')
}

function formatTime(value: string) {
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

      <nav class="flex-1 px-3 pt-1">
        <div
          class="relative flex items-center gap-2.5 rounded-md bg-accent/10 py-2.5 pr-3 pl-3 text-[13px] font-medium text-primary"
          aria-current="page"
        >
          <span
            class="absolute top-1.5 bottom-1.5 left-0 w-[3px] rounded-r-full bg-primary"
            aria-hidden="true"
          />
          <icon-lucide-layout-template class="size-4 shrink-0 opacity-90" />
          设计文件
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
          <span class="truncate text-[15px] font-semibold">屏幕设计</span>
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
              设计文件
            </span>
            <h1 class="mt-2 text-[22px] leading-none font-semibold tracking-tight text-surface">
              设计文件
            </h1>
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
            新建设计文件
          </AppButton>
        </div>

        <AppAlert v-if="error" tone="error" :heading="error" />

        <section class="rounded-xl border border-border bg-panel px-5 py-4 shadow-sm">
          <form
            class="flex flex-col gap-4 sm:flex-row sm:flex-wrap sm:items-end"
            @submit.prevent="applySearch"
          >
            <label class="block w-full min-w-0 sm:max-w-[280px]">
              <span class="mb-1.5 block text-[12px] text-muted">关键词</span>
              <AppInput
                v-model="draftQuery"
                class="w-full"
                size="md"
                placeholder="按名称搜索"
                aria-label="按名称搜索"
              />
            </label>
            <div class="flex gap-2 pb-px">
              <AppButton color="primary" variant="solid" size="md" type="submit">
                <template #leading>
                  <icon-lucide-search class="size-3.5" />
                </template>
                搜索
              </AppButton>
              <AppButton
                color="neutral"
                variant="outline"
                size="md"
                type="button"
                @click="resetSearch"
              >
                重置
              </AppButton>
            </div>
          </form>
        </section>

        <section
          class="flex min-h-0 flex-1 flex-col overflow-hidden rounded-xl border border-border bg-panel shadow-sm"
        >
          <AppPlaceholder
            v-if="!loading && !error && !designs.length"
            label="还没有设计文件"
            description="点击右上角「新建设计文件」开始。"
            size="panel"
            class="min-h-[320px]"
          >
            <template #icon>
              <icon-lucide-layout-template class="size-5" />
            </template>
            <template #action>
              <AppButton color="primary" variant="solid" size="sm" @click="openCreate">
                新建设计文件
              </AppButton>
            </template>
          </AppPlaceholder>

          <AppPlaceholder
            v-else-if="!loading && designs.length && !filtered.length"
            label="没有匹配的文件"
            description="调整关键词后重新搜索。"
            size="panel"
            class="min-h-[280px]"
          >
            <template #action>
              <AppButton color="neutral" variant="outline" size="sm" @click="resetSearch">
                重置
              </AppButton>
            </template>
          </AppPlaceholder>

          <AppTable
            v-else-if="showTable"
            label="设计文件列表"
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
                <AppTableHead class="h-10 px-4 text-[12px] first:pl-5 last:pr-5">
                  更新时间
                </AppTableHead>
                <AppTableHead class="h-10 px-4 text-[12px] first:pl-5 last:pr-5">
                  创建时间
                </AppTableHead>
                <AppTableHead class="h-10 w-56 px-4 text-[12px] first:pl-5 last:pr-5">
                  操作
                </AppTableHead>
              </AppTableRow>
            </AppTableHeader>
            <AppTablePlaceholder
              v-if="loading"
              :columns="[
                { id: 'name' },
                { id: 'updated' },
                { id: 'created' },
                { id: 'actions', actions: true }
              ]"
            />
            <AppTableBody v-else>
              <AppTableEmpty v-if="!filtered.length" :colspan="4">暂无设计文件</AppTableEmpty>
              <AppTableRow v-for="design in filtered" :key="design.id">
                <AppTableCell class="h-14 px-4 text-[13px] first:pl-5 last:pr-5">
                  <RouterLink
                    :to="`/designs/${design.id}`"
                    class="font-medium text-surface hover:text-primary"
                  >
                    {{ design.name }}
                  </RouterLink>
                </AppTableCell>
                <AppTableCell
                  class="h-14 px-4 text-[13px] tabular-nums text-muted first:pl-5 last:pr-5"
                >
                  {{ formatTime(design.updatedAt) }}
                </AppTableCell>
                <AppTableCell
                  class="h-14 px-4 text-[13px] tabular-nums text-muted first:pl-5 last:pr-5"
                >
                  {{ formatTime(design.createdAt) }}
                </AppTableCell>
                <AppTableCell class="h-14 px-4 text-[13px] first:pl-5 last:pr-5">
                  <div class="flex items-center gap-3">
                    <button
                      type="button"
                      class="cursor-pointer text-[13px] text-primary hover:underline"
                      @click="router.push(`/designs/${design.id}`)"
                    >
                      编辑
                    </button>
                    <button
                      type="button"
                      class="cursor-pointer text-[13px] text-muted hover:text-surface"
                      @click="openRename(design)"
                    >
                      重命名
                    </button>
                    <button
                      type="button"
                      class="cursor-pointer text-[13px] text-muted hover:text-surface"
                      @click="openShare(design)"
                    >
                      分享
                    </button>
                    <button
                      type="button"
                      class="cursor-pointer text-[13px] text-error hover:underline"
                      @click="openDelete(design)"
                    >
                      删除
                    </button>
                  </div>
                </AppTableCell>
              </AppTableRow>
            </AppTableBody>
            <template #footer>
              <div class="flex items-center justify-end text-[12px] text-muted">
                <template v-if="loading">加载中…</template>
                <template v-else-if="query.trim()">
                  找到 {{ filtered.length }} 条，共 {{ designs.length }} 条
                </template>
                <template v-else>共 {{ designs.length }} 条</template>
              </div>
            </template>
          </AppTable>
        </section>
      </main>
    </div>

    <AppDialog
      v-model:open="createOpen"
      heading="新建设计文件"
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
          maxlength="120"
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

    <AppDialog v-model:open="renameOpen" heading="重命名" size="sm" :show-close="!renaming">
      <label class="block text-xs font-medium text-surface">
        名称
        <AppInput
          ref="renameInput"
          v-model="renameName"
          class="mt-1.5 w-full"
          size="md"
          maxlength="120"
          :disabled="renaming"
          required
          @enter="submitRename"
        />
      </label>
      <template #footer>
        <AppButton
          color="neutral"
          variant="ghost"
          :disabled="renaming"
          @click="renameOpen = false"
        >
          取消
        </AppButton>
        <AppButton color="primary" variant="solid" :loading="renaming" @click="submitRename">
          保存
        </AppButton>
      </template>
    </AppDialog>

    <AppConfirmationDialog
      v-model:open="deleteOpen"
      heading="删除设计文件"
      :description="
        deleteTarget ? `确认删除「${deleteTarget.name}」？此操作不可恢复。` : undefined
      "
      cancel-label="取消"
      confirm-label="删除"
      tone="danger"
      @confirm="confirmDelete"
      @cancel="deleteTarget = null"
    />

    <ShareDialog v-model:open="shareOpen" :design-id="shareDesignId" />
  </div>
</template>

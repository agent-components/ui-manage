<script setup lang="ts">
import { computed, nextTick, onMounted, ref, useTemplateRef } from 'vue'
import { RouterLink, useRouter } from 'vue-router'

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

import { useUiManageDesigns, type Design } from './designs-api'
import ManageShell from './ManageShell.vue'
import ShareDialog from './ShareDialog.vue'

const DEFAULT_NAME = '未命名设计文件'

const router = useRouter()
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

const filtered = computed(() => {
  const q = query.value.trim().toLowerCase()
  if (!q) return designs.value
  return designs.value.filter((d) => d.name.toLowerCase().includes(q))
})

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

function formatTime(value: string) {
  const d = new Date(value)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`
}

onMounted(refresh)
</script>

<template>
  <ManageShell active="designs" title="设计文件">
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
        新建设计文件
      </AppButton>
    </template>

    <AppAlert v-if="error" tone="error" :heading="error" />

    <section class="console-card">
      <form class="console-filter" @submit.prevent="applySearch">
        <label class="console-field-label">
          <span>关键词</span>
          <AppInput
            v-model="draftQuery"
            class="console-field w-full"
            size="md"
            placeholder="按名称搜索"
            aria-label="按名称搜索"
          />
        </label>
        <div class="console-filter-actions">
          <AppButton class="console-btn" color="primary" variant="solid" size="md" type="submit">
            搜索
          </AppButton>
          <AppButton
            class="console-btn console-btn-plain"
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

    <section class="console-card console-card-fill">
      <AppTable
        label="设计文件列表"
        :loading="loading ? 'first' : false"
        loading-label="加载中…"
        :ui="tableUi"
      >
        <AppTableHeader>
          <AppTableRow>
            <AppTableHead class="console-col-name">名称</AppTableHead>
            <AppTableHead class="console-col-time">更新时间</AppTableHead>
            <AppTableHead class="console-col-time">创建时间</AppTableHead>
            <AppTableHead class="console-col-ops">操作</AppTableHead>
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
          <tr v-if="!filtered.length" class="console-empty-row">
            <td class="console-empty-cell" colspan="4">
              <div class="console-empty">
                <svg
                  class="console-empty-icon"
                  width="40"
                  height="40"
                  viewBox="0 0 40 40"
                  fill="none"
                  aria-hidden="true"
                >
                  <path
                    d="M12 8.5h10.4L30 16.1V31a1.5 1.5 0 0 1-1.5 1.5h-16.5A1.5 1.5 0 0 1 10.5 31V10A1.5 1.5 0 0 1 12 8.5Z"
                    stroke="currentColor"
                    stroke-width="1.4"
                  />
                  <path d="M22.2 8.8V16H29.6" stroke="currentColor" stroke-width="1.4" />
                  <path
                    d="M16 23.5h10M16 27.5h6.5"
                    stroke="currentColor"
                    stroke-width="1.4"
                    stroke-linecap="round"
                  />
                </svg>
                <template v-if="designs.length">
                  <p class="console-empty-title">没有匹配的文件</p>
                  <p class="console-empty-desc">调整关键词后重新搜索。</p>
                  <button type="button" class="console-empty-action is-plain" @click="resetSearch">
                    重置
                  </button>
                </template>
                <template v-else>
                  <p class="console-empty-title">还没有设计文件</p>
                  <p class="console-empty-desc">点击右上角「新建设计文件」开始。</p>
                  <button type="button" class="console-empty-action" @click="openCreate">
                    新建设计文件
                  </button>
                </template>
              </div>
            </td>
          </tr>
          <AppTableRow v-for="design in filtered" :key="design.id">
            <AppTableCell>
              <RouterLink :to="`/designs/${design.id}`" class="console-name">
                <span class="console-glyph">
                  <svg width="13" height="13" viewBox="0 0 14 14" fill="none" aria-hidden="true">
                    <path
                      d="M3 1.75h5.1L11.5 5.1V12.25H3V1.75Z"
                      stroke="currentColor"
                      stroke-width="1.15"
                    />
                    <path d="M8 1.85V5.1h3.35" stroke="currentColor" stroke-width="1.15" />
                  </svg>
                </span>
                <span class="console-name-text">{{ design.name }}</span>
              </RouterLink>
            </AppTableCell>
            <AppTableCell class="console-time">{{ formatTime(design.updatedAt) }}</AppTableCell>
            <AppTableCell class="console-time">{{ formatTime(design.createdAt) }}</AppTableCell>
            <AppTableCell>
              <div class="console-ops">
                <button type="button" class="console-op" @click="router.push(`/designs/${design.id}`)">
                  编辑
                </button>
                <button type="button" class="console-op" @click="openRename(design)">重命名</button>
                <button type="button" class="console-op" @click="openShare(design)">分享</button>
                <button type="button" class="console-op is-danger" @click="openDelete(design)">
                  删除
                </button>
              </div>
            </AppTableCell>
          </AppTableRow>
        </AppTableBody>
        <template #footer>
          <template v-if="loading">加载中…</template>
          <template v-else-if="query.trim()">
            找到 {{ filtered.length }} 条，共 {{ designs.length }} 条
          </template>
          <template v-else>共 {{ designs.length }} 条</template>
        </template>
      </AppTable>
    </section>

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
  </ManageShell>
</template>

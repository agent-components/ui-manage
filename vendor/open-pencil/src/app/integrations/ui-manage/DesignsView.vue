<script setup lang="ts">
import { nextTick, onMounted, ref, useTemplateRef } from 'vue'
import { RouterLink, useRouter } from 'vue-router'

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

const router = useRouter()
const { user, logout } = useUiManageAuth()
const api = useUiManageDesigns()

const designs = ref<Design[]>([])
const loading = ref(true)
const error = ref('')
const creating = ref(false)
const renaming = ref(false)

const createOpen = ref(false)
const createName = ref('未命名设计稿')
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

async function openCreate() {
  createName.value = '未命名设计稿'
  createOpen.value = true
  await nextTick()
  createInput.value?.focus()
  createInput.value?.select()
}

async function submitCreate() {
  const name = createName.value.trim() || '未命名设计稿'
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

async function onLogout() {
  await logout()
  await router.replace('/login')
}

function formatTime(value: string) {
  return new Date(value).toLocaleString()
}

onMounted(refresh)
</script>

<template>
  <div class="flex h-full min-h-0 flex-col overflow-auto bg-canvas text-surface">
    <header class="shrink-0 border-b border-border bg-panel">
      <div class="mx-auto flex max-w-5xl items-center justify-between gap-3 px-4 py-3">
        <div class="min-w-0">
          <h1 class="text-sm font-semibold text-surface">设计稿</h1>
          <p class="truncate text-2xs text-muted">
            {{ user?.displayName || user?.account }}
          </p>
        </div>
        <div class="flex shrink-0 items-center gap-2">
          <AppButton
            color="primary"
            variant="solid"
            size="sm"
            :disabled="creating"
            @click="openCreate"
          >
            新建
          </AppButton>
          <AppButton color="neutral" variant="outline" size="sm" @click="onLogout">
            退出
          </AppButton>
        </div>
      </div>
    </header>

    <main class="mx-auto w-full max-w-5xl flex-1 px-4 py-6">
      <AppAlert v-if="error" class="mb-4" tone="error" :heading="error" />

      <AppPlaceholder
        v-if="!loading && !error && !designs.length"
        label="还没有设计稿"
        description="点击右上角「新建」开始。"
        size="page"
      >
        <template #action>
          <AppButton color="primary" variant="solid" size="sm" @click="openCreate">
            新建
          </AppButton>
        </template>
      </AppPlaceholder>

      <AppTable
        v-else
        label="设计稿列表"
        :loading="loading ? 'first' : false"
        loading-label="加载中…"
      >
        <AppTableHeader>
          <AppTableRow>
            <AppTableHead>名称</AppTableHead>
            <AppTableHead>更新时间</AppTableHead>
            <AppTableHead class="w-48">操作</AppTableHead>
          </AppTableRow>
        </AppTableHeader>
        <AppTablePlaceholder
          v-if="loading"
          :columns="[{ id: 'name' }, { id: 'updated' }, { id: 'actions', actions: true }]"
        />
        <AppTableBody v-else>
          <AppTableEmpty v-if="!designs.length" :colspan="3">暂无设计稿</AppTableEmpty>
          <AppTableRow v-for="design in designs" :key="design.id">
            <AppTableCell>
              <RouterLink
                :to="`/designs/${design.id}`"
                class="font-medium text-surface hover:text-primary hover:underline"
              >
                {{ design.name }}
              </RouterLink>
            </AppTableCell>
            <AppTableCell class="text-muted">{{ formatTime(design.updatedAt) }}</AppTableCell>
            <AppTableCell>
              <div class="flex flex-wrap items-center gap-1">
                <AppButton
                  color="primary"
                  variant="link"
                  size="xs"
                  :ui="{ base: 'px-1' }"
                  @click="router.push(`/designs/${design.id}`)"
                >
                  打开
                </AppButton>
                <AppButton
                  color="neutral"
                  variant="ghost"
                  size="xs"
                  @click="openRename(design)"
                >
                  重命名
                </AppButton>
                <AppButton
                  color="neutral"
                  variant="ghost"
                  size="xs"
                  @click="openShare(design)"
                >
                  分享
                </AppButton>
                <AppButton
                  color="error"
                  variant="ghost"
                  size="xs"
                  @click="openDelete(design)"
                >
                  删除
                </AppButton>
              </div>
            </AppTableCell>
          </AppTableRow>
        </AppTableBody>
      </AppTable>
    </main>

    <AppDialog
      v-model:open="createOpen"
      heading="新建设计稿"
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
        <AppButton
          color="primary"
          variant="solid"
          :loading="creating"
          @click="submitCreate"
        >
          创建
        </AppButton>
      </template>
    </AppDialog>

    <AppDialog
      v-model:open="renameOpen"
      heading="重命名"
      size="sm"
      :show-close="!renaming"
    >
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
        <AppButton
          color="primary"
          variant="solid"
          :loading="renaming"
          @click="submitRename"
        >
          保存
        </AppButton>
      </template>
    </AppDialog>

    <AppConfirmationDialog
      v-model:open="deleteOpen"
      heading="删除设计稿"
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

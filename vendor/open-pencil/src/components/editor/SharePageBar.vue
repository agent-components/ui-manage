<script setup lang="ts">
import { RadioGroupItem, RadioGroupRoot } from 'reka-ui'
import { computed, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'

import { isPageDivider, usePageList } from '@open-pencil/vue/primitives/PageList'

const route = useRoute()
const router = useRouter()
const { pages: rawPages, currentPageId, switchPage } = usePageList()

const switching = ref(false)

const pages = computed(() =>
  rawPages.value
    .filter((page) => !isPageDivider(page))
    .map((page, index) => ({
      id: page.id,
      name: page.name?.trim() || `页面 ${index + 1}`,
      index
    }))
)

const model = computed({
  get: () => currentPageId.value,
  set: (pageId: string) => {
    void selectPage(pageId, { fromUser: true })
  }
})

function decodeHashValue(hash: string): string {
  const raw = (hash || '').replace(/^#/, '').trim()
  if (!raw) return ''
  try {
    // 兼容误双重 encode 的旧链接
    let value = decodeURIComponent(raw)
    if (/%[0-9A-Fa-f]{2}/.test(value)) value = decodeURIComponent(value)
    return value.trim()
  } catch {
    return raw
  }
}

/** hash 有值但页列表里还没有对应页时返回 null（等文档加载完再定位，绝不回写错误 hash）。 */
function readHashTarget(): { id: string; name: string; index: number } | null {
  const list = pages.value
  if (!list.length) return null

  const raw = decodeHashValue(route.hash)
  if (!raw) return list[0]

  const asIndex = /^(\d+)$/.exec(raw)
  if (asIndex) {
    const index = Number(asIndex[1]) - 1
    return list[index] ?? null
  }

  return list.find((page) => page.name === raw) ?? null
}

function writeHash(pageName: string) {
  if (decodeHashValue(route.hash) === pageName) return
  void router.replace({ hash: `#${pageName}` })
}

async function selectPage(
  pageId: string,
  options: { fromUser?: boolean; writeUrl?: boolean } = {}
) {
  if (!pageId || switching.value) return
  const page = pages.value.find((item) => item.id === pageId)
  if (!page) return
  if (page.id === currentPageId.value) {
    if (options.fromUser || options.writeUrl) writeHash(page.name)
    return
  }

  switching.value = true
  try {
    await switchPage(page.id)
    if (options.fromUser || options.writeUrl) writeHash(page.name)
  } finally {
    switching.value = false
  }
}

async function syncFromHash() {
  if (!pages.value.length || switching.value) return

  const hash = decodeHashValue(route.hash)
  const target = readHashTarget()

  // 有 hash 但目标页尚未出现在列表里：等下一次 pages 变化，不要改 URL。
  if (hash && !target) return

  // 无 hash：默认第一页，不改写 URL。
  if (!hash) {
    const first = pages.value[0]
    if (first && first.id !== currentPageId.value) {
      await selectPage(first.id)
    }
    return
  }

  if (!target) return

  if (target.id !== currentPageId.value) {
    await selectPage(target.id)
  }

  // 仅在已匹配到真实页时，把 hash 规范成页名（例如 #2 → #登录成功）。
  if (decodeHashValue(route.hash) !== target.name) {
    writeHash(target.name)
  }
}

watch([pages, () => route.hash, currentPageId], () => {
  void syncFromHash()
}, { immediate: true })
</script>

<template>
  <div
    class="pointer-events-none absolute inset-x-0 bottom-0 z-30 flex justify-center px-3 pb-3"
    data-test-id="share-page-bar"
  >
    <div
      class="pointer-events-auto max-w-[min(560px,calc(100vw-1.5rem))] rounded-full border border-white/10 bg-[#0B1220]/78 p-1 shadow-[0_8px_28px_rgba(0,0,0,0.28)] backdrop-blur-xl"
    >
      <RadioGroupRoot
        v-model="model"
        orientation="horizontal"
        aria-label="切换页面"
        class="flex max-w-full items-center gap-0.5 overflow-x-auto"
      >
        <RadioGroupItem
          v-for="page in pages"
          :key="page.id"
          :value="page.id"
          :data-test-id="'share-page-' + page.index"
          class="group flex shrink-0 items-center gap-1.5 rounded-full px-2.5 py-1.5 text-left outline-none transition-colors duration-150 data-[state=checked]:bg-white data-[state=checked]:text-slate-900 data-[state=unchecked]:text-white/70 data-[state=unchecked]:hover:bg-white/10 data-[state=unchecked]:hover:text-white focus-visible:ring-2 focus-visible:ring-sky-400/70"
        >
          <span
            class="size-1.5 shrink-0 rounded-full transition-colors group-data-[state=checked]:bg-sky-500 group-data-[state=unchecked]:bg-white/35"
            aria-hidden="true"
          />
          <span class="max-w-[5.5rem] truncate text-[11px] font-medium leading-none">
            {{ page.name }}
          </span>
        </RadioGroupItem>
      </RadioGroupRoot>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue'

import { takeEmbedGateMessage } from '@/router'

import { productName } from './brand'
import ProductMark from './ProductMark.vue'

const props = defineProps<{
  message?: string
}>()

const message = ref(props.message || '请从 Harness Admin 打开')

onMounted(() => {
  const detail = takeEmbedGateMessage()
  if (detail) message.value = detail
})
</script>

<template>
  <div class="flex h-full min-h-0 items-center justify-center overflow-auto bg-canvas px-4 py-10">
    <div class="w-full max-w-sm rounded-lg border border-border bg-panel p-6 shadow-sm">
      <div class="flex items-center gap-3">
        <ProductMark class="size-10 shrink-0" />
        <div>
          <h1 class="text-base font-semibold text-surface">{{ productName }}</h1>
          <p class="mt-1 text-xs text-muted">{{ message }}</p>
        </div>
      </div>
    </div>
  </div>
</template>

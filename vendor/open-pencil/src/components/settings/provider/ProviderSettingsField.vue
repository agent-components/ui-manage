<script setup lang="ts">
defineProps<{
  label?: string
  hint?: string
  description?: string
  error?: string
  labelFor?: string
  clearLabel?: string
}>()
defineEmits<{ blur: []; clear: [] }>()
</script>
<template>
  <div class="flex flex-col gap-1.5">
    <div class="flex items-center justify-between gap-2">
      <label v-if="label" :for="labelFor" class="text-xs font-medium text-surface">{{
        label
      }}</label>
      <button
        v-if="clearLabel"
        type="button"
        class="text-2xs text-muted hover:text-surface"
        @click="$emit('clear')"
      >
        {{ clearLabel }}
      </button>
    </div>
    <slot :control="{}" />
    <p v-if="hint || description" class="text-2xs text-muted">{{ hint || description }}</p>
    <p v-if="error" class="text-2xs text-error">{{ error }}</p>
  </div>
</template>

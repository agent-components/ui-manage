<script setup lang="ts">
/**
 * Single-user: page presence hover is a pass-through wrapper (no peers).
 */
defineProps<{ pageId: string }>()
</script>

<template>
  <slot />
</template>

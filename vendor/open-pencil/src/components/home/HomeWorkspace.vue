<script setup lang="ts">
import type { DocumentKind } from '@open-pencil/scene-graph'

/** ui-manage: OpenPencil Home / recent files removed — designs list is the entry. */
defineEmits<{ 'new-document': [kind: DocumentKind] }>()
</script>

<template>
  <div class="hidden" data-test-id="recent-files-home" />
</template>

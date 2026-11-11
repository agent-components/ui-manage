<script setup lang="ts">
withDefaults(
  defineProps<{
    modelValue?: string
    type?: string
    placeholder?: string
    autocomplete?: string
  }>(),
  { modelValue: '', type: 'text' }
)
defineEmits<{ 'update:modelValue': [value: string] }>()
</script>
<template>
  <input
    class="h-8 w-full rounded-md border border-border bg-transparent px-2 text-xs text-surface outline-none"
    :type="type === 'url' ? 'url' : type === 'password' ? 'password' : 'text'"
    :value="modelValue"
    :placeholder="placeholder"
    :autocomplete="autocomplete"
    @input="$emit('update:modelValue', ($event.target as HTMLInputElement).value)"
  />
</template>

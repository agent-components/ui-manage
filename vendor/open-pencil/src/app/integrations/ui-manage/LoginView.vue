<script setup lang="ts">
import { ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'

import AppButton from '@/components/ui/button/AppButton.vue'
import AppAlert from '@/components/ui/feedback/AppAlert.vue'
import AppInput from '@/components/ui/input/AppInput.vue'
import AppPasswordInput from '@/components/ui/input/AppPasswordInput.vue'

import { useUiManageAuth } from './auth'

const router = useRouter()
const route = useRoute()
const { login } = useUiManageAuth()

const account = ref('')
const password = ref('')
const loading = ref(false)
const error = ref('')

async function onSubmit() {
  error.value = ''
  loading.value = true
  try {
    await login(account.value.trim(), password.value)
    const redirect = typeof route.query.redirect === 'string' ? route.query.redirect : '/designs'
    await router.replace(redirect || '/designs')
  } catch (e: unknown) {
    error.value = e instanceof Error ? e.message : '登录失败'
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="flex h-full min-h-0 items-center justify-center overflow-auto bg-canvas px-4 py-10">
    <form
      class="w-full max-w-sm rounded-lg border border-border bg-panel p-6 shadow-sm"
      @submit.prevent="onSubmit"
    >
      <h1 class="text-base font-semibold text-surface">屏幕设计</h1>
      <p class="mt-1 text-xs text-muted">登录后管理并编辑设计文件</p>

      <label class="mt-6 block text-xs font-medium text-surface">
        账号
        <AppInput
          v-model="account"
          class="mt-1.5 w-full"
          type="text"
          size="md"
          autocomplete="username"
          :disabled="loading"
          required
        />
      </label>

      <label class="mt-4 block text-xs font-medium text-surface">
        密码
        <AppPasswordInput
          v-model="password"
          class="mt-1.5 w-full"
          size="md"
          autocomplete="current-password"
          :disabled="loading"
          required
        />
      </label>

      <AppAlert v-if="error" class="mt-4" tone="error" :heading="error" />

      <AppButton
        class="mt-6 w-full"
        type="submit"
        color="primary"
        variant="solid"
        size="md"
        :loading="loading"
      >
        登录
      </AppButton>
    </form>
  </div>
</template>

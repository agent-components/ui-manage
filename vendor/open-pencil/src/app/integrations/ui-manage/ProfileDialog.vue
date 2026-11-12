<script setup lang="ts">
import { ref, watch } from 'vue'

import { toast } from '@/app/shell/ui'
import AppButton from '@/components/ui/button/AppButton.vue'
import { AppDialog } from '@/components/ui/dialog'
import AppAlert from '@/components/ui/feedback/AppAlert.vue'
import AppInput from '@/components/ui/input/AppInput.vue'
import AppPasswordInput from '@/components/ui/input/AppPasswordInput.vue'
import AppTextarea from '@/components/ui/input/AppTextarea.vue'

import { useUiManageAuth, type AuthUser } from './auth'

const open = defineModel<boolean>('open', { default: false })
const { user, refreshUser, updateProfile } = useUiManageAuth()

const displayName = ref('')
const email = ref('')
const phone = ref('')
const aboutMe = ref('')
const currentPassword = ref('')
const newPassword = ref('')
const saving = ref(false)
const error = ref('')

function fill(source: AuthUser | null) {
  displayName.value = source?.displayName || source?.account || ''
  email.value = source?.email || ''
  phone.value = source?.phone || ''
  aboutMe.value = source?.aboutMe || ''
  currentPassword.value = ''
  newPassword.value = ''
  error.value = ''
}

watch(open, async (value) => {
  if (!value) return
  fill(user.value)
  try {
    fill(await refreshUser())
  } catch (e: unknown) {
    error.value = e instanceof Error ? e.message : '加载资料失败'
  }
})

async function submit() {
  const name = displayName.value.trim()
  if (!name) {
    error.value = '请输入显示名称'
    return
  }
  saving.value = true
  error.value = ''
  try {
    const body: Parameters<typeof updateProfile>[0] = {
      displayName: name,
      email: email.value.trim(),
      phone: phone.value.trim(),
      aboutMe: aboutMe.value.trim()
    }
    if (currentPassword.value || newPassword.value) {
      body.currentPassword = currentPassword.value
      body.newPassword = newPassword.value
    }
    await updateProfile(body)
    open.value = false
    toast.info('资料已更新')
  } catch (e: unknown) {
    error.value = e instanceof Error ? e.message : '保存失败'
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <AppDialog v-model:open="open" heading="修改资料" size="sm" :show-close="!saving">
    <div class="flex flex-col gap-4">
      <label class="block text-xs font-medium text-surface">
        账号
        <AppInput
          class="mt-1.5 w-full"
          size="md"
          :model-value="user?.account || ''"
          readonly
          aria-label="账号"
        />
      </label>
      <label class="block text-xs font-medium text-surface">
        显示名称
        <AppInput
          v-model="displayName"
          class="mt-1.5 w-full"
          size="md"
          maxlength="64"
          :disabled="saving"
          required
          @enter="submit"
        />
      </label>
      <label class="block text-xs font-medium text-surface">
        邮箱
        <AppInput
          v-model="email"
          class="mt-1.5 w-full"
          type="email"
          size="md"
          maxlength="120"
          :disabled="saving"
          @enter="submit"
        />
      </label>
      <label class="block text-xs font-medium text-surface">
        手机
        <AppInput
          v-model="phone"
          class="mt-1.5 w-full"
          size="md"
          maxlength="32"
          :disabled="saving"
          @enter="submit"
        />
      </label>
      <label class="block text-xs font-medium text-surface">
        个人简介
        <AppTextarea
          v-model="aboutMe"
          class="mt-1.5 w-full"
          :rows="3"
          maxlength="500"
          :disabled="saving"
        />
      </label>
      <div class="border-t border-border pt-4">
        <p class="text-xs font-medium text-surface">修改密码</p>
        <p class="mt-1 text-[11px] text-muted">留空则不修改密码。</p>
        <label class="mt-3 block text-xs font-medium text-surface">
          当前密码
          <AppPasswordInput
            v-model="currentPassword"
            class="mt-1.5 w-full"
            size="md"
            autocomplete="current-password"
            :disabled="saving"
          />
        </label>
        <label class="mt-3 block text-xs font-medium text-surface">
          新密码
          <AppPasswordInput
            v-model="newPassword"
            class="mt-1.5 w-full"
            size="md"
            autocomplete="new-password"
            :disabled="saving"
          />
        </label>
      </div>
      <AppAlert v-if="error" tone="error" :heading="error" />
    </div>
    <template #footer>
      <AppButton color="neutral" variant="ghost" :disabled="saving" @click="open = false">
        取消
      </AppButton>
      <AppButton color="primary" variant="solid" :loading="saving" @click="submit">
        保存
      </AppButton>
    </template>
  </AppDialog>
</template>

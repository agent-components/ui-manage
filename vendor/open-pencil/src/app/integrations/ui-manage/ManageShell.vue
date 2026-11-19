<script setup lang="ts">
import { RouterLink } from 'vue-router'

import AccountMenu from './AccountMenu.vue'
import { productName, productTagline } from './brand'
import ProductMark from './ProductMark.vue'
import './console.css'

defineProps<{
  active: 'designs'
  title: string
  description?: string
}>()
</script>

<template>
  <div class="console">
    <aside class="console-side" aria-label="主导航">
      <div class="console-brand">
        <ProductMark class="console-brand-mark" />
        <div class="min-w-0">
          <p class="console-brand-name">{{ productName }}</p>
          <p class="console-brand-sub">{{ productTagline }}</p>
        </div>
      </div>

      <nav class="console-nav">
        <RouterLink
          to="/designs"
          class="console-nav-item"
          :class="{ 'is-active': active === 'designs' }"
          :aria-current="active === 'designs' ? 'page' : undefined"
        >
          <icon-lucide-layout-template class="console-nav-icon" />
          设计文件
        </RouterLink>
      </nav>

      <div class="console-side-foot">
        <AccountMenu placement="sidebar" />
      </div>
    </aside>

    <div class="console-body">
      <header class="console-mobile">
        <div class="console-mobile-brand">
          <ProductMark class="console-brand-mark" />
          <span class="truncate">{{ productName }}</span>
        </div>
        <AccountMenu placement="header" />
      </header>

      <main class="console-page">
        <div class="console-heading">
          <div class="min-w-0">
            <h1 class="console-title">{{ title }}</h1>
            <p v-if="description" class="console-desc">{{ description }}</p>
          </div>
          <div class="shrink-0">
            <slot name="actions" />
          </div>
        </div>
        <slot />
      </main>
    </div>
  </div>
</template>

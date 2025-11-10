<template>
  <div class="project-config-page">
    <div class="page-header">
      <button class="back-btn" @click="router.back()">
        <ArrowLeft :size="20" />
        返回
      </button>
      <h1>Launcher 配置</h1>
    </div>
    <div class="page-content">
      <div class="config-placeholder">
        <p>Launcher 配置页面</p>
        <p class="config-hint">配置文件：launcher.config.ts</p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useRoute, useRouter } from 'vue-router'
import { ArrowLeft } from 'lucide-vue-next'

const route = useRoute()
const router = useRouter()
</script>

<style scoped>
.project-config-page {
  padding: var(--content-padding);
  background: var(--content-bg);
  color: var(--color-text-primary);
  min-height: 100%;
}

.page-header {
  display: flex;
  align-items: center;
  gap: var(--size-spacing-md);
  margin-bottom: var(--size-spacing-xl);
}

.back-btn {
  display: flex;
  align-items: center;
  gap: var(--size-spacing-xs);
  padding: var(--size-spacing-sm) var(--size-spacing-md);
  background: var(--color-bg-component);
  color: var(--color-text-primary);
  border: 1px solid var(--color-border-light);
  border-radius: var(--size-radius-md);
  cursor: pointer;
  font-size: var(--font-size-base);
  transition: all 0.2s ease;
}

.back-btn:hover {
  background: var(--color-bg-component-hover);
  border-color: var(--theme-color-primary);
}

.page-header h1 {
  font-size: var(--font-size-2xl);
  font-weight: var(--size-font-weight-semibold);
  margin: 0;
  color: var(--color-text-primary);
}

.page-content {
  max-width: 1200px;
}

.config-placeholder {
  text-align: center;
  padding: var(--size-spacing-3xl);
  background: var(--color-bg-container);
  border: 1px solid var(--color-border-light);
  border-radius: var(--size-radius-lg);
}

.config-placeholder p {
  font-size: var(--font-size-lg);
  color: var(--color-text-primary);
  margin: 0 0 var(--size-spacing-sm) 0;
}

.config-hint {
  font-size: var(--font-size-sm);
  color: var(--color-text-secondary);
}
</style>


























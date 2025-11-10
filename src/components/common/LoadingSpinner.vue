<template>
  <div :class="['loading-spinner', size, { fullscreen, overlay }]">
    <div class="spinner-container">
      <div class="spinner"></div>
      <p v-if="text" class="loading-text">{{ text }}</p>
    </div>
  </div>
</template>

<script setup lang="ts">
defineProps<{
  /**
   * 加载文本
   */
  text?: string
  /**
   * 大小：small, medium, large
   */
  size?: 'small' | 'medium' | 'large'
  /**
   * 是否全屏显示
   */
  fullscreen?: boolean
  /**
   * 是否显示遮罩层
   */
  overlay?: boolean
}>()
</script>

<style scoped>
.loading-spinner {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 1rem;
}

.loading-spinner.fullscreen {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 9999;
}

.loading-spinner.overlay {
  background-color: rgba(255, 255, 255, 0.9);
}

.spinner-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1rem;
}

.spinner {
  border: 3px solid #f3f3f3;
  border-top: 3px solid #3b82f6;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

.small .spinner {
  width: 20px;
  height: 20px;
  border-width: 2px;
}

.medium .spinner,
.spinner {
  width: 40px;
  height: 40px;
}

.large .spinner {
  width: 60px;
  height: 60px;
  border-width: 4px;
}

.loading-text {
  margin: 0;
  color: #666;
  font-size: 0.875rem;
}

@keyframes spin {
  0% {
    transform: rotate(0deg);
  }
  100% {
    transform: rotate(360deg);
  }
}

/* Dark mode support */
@media (prefers-color-scheme: dark) {
  .loading-spinner.overlay {
    background-color: rgba(26, 32, 44, 0.9);
  }

  .spinner {
    border-color: #2d3748;
    border-top-color: #3b82f6;
  }

  .loading-text {
    color: #cbd5e0;
  }
}
</style>

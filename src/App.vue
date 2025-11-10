<template>
  <div id="app" class="app-container">
    <SystemLayout>
      <router-view />
    </SystemLayout>
    <!-- 全局消息提示组件 -->
    <Message />
  </div>
</template>

<script setup lang="ts">
import { onMounted } from 'vue'
import { useAppStore } from './stores/app'
import { useThemeStore } from './stores/theme'
import SystemLayout from './components/SystemLayout.vue'
import Message from './components/common/Message.vue'

const appStore = useAppStore()
const themeStore = useThemeStore()

onMounted(() => {
  appStore.initialize()
  // 初始化主题（从 localStorage 加载）
  themeStore.loadFromStorage()
})
</script>

<style scoped>
.app-container {
  width: 100%;
  height: 100vh;
  overflow: hidden;
}
</style>

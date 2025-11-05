<template>
  <div 
    class="system-layout"
    :class="{
      'sidebar-collapsed': themeStore.sidebarCollapsed,
      'dark-mode': themeStore.actualDarkMode === 'dark',
    }"
    :data-theme-mode="themeStore.actualDarkMode"
    :data-sidebar-collapsed="themeStore.sidebarCollapsed"
  >
    <!-- 左侧菜单 -->
    <aside class="sidebar">
      <!-- Logo 区域 -->
      <div class="sidebar-header">
        <div class="logo" @click="themeStore.toggleSidebar">
          <div class="logo-icon">
            <LayoutDashboard :size="20" />
          </div>
          <span v-if="!themeStore.sidebarCollapsed" class="logo-text">LDesign</span>
        </div>
      </div>

      <!-- 导航菜单 -->
      <nav class="sidebar-nav">
        <router-link
          v-for="item in menuItems"
          :key="item.path"
          :to="item.path"
          :class="['nav-item', { active: isActive(item.path) }]"
        >
          <div class="nav-icon-wrapper">
            <component :is="item.icon" :size="20" class="nav-icon-component" />
          </div>
          <span v-if="!themeStore.sidebarCollapsed" class="nav-text">{{ item.title }}</span>
        </router-link>
      </nav>

      <!-- 底部操作区 -->
      <div class="sidebar-footer">
        <!-- 服务器状态 -->
        <div :class="['server-status', { connected: appStore.isConnected, disconnected: !appStore.isConnected }]">
          <component 
            :is="appStore.isConnected ? Server : ServerOff" 
            :size="16" 
            class="status-icon"
          />
          <div v-if="!themeStore.sidebarCollapsed" class="status-info">
            <span class="status-text">{{ appStore.isConnected ? '服务器运行中' : '服务器未运行' }}</span>
            <span class="status-port">:{{ appStore.serverPort }}</span>
          </div>
        </div>
      </div>
    </aside>

    <!-- 主内容区域 -->
    <main class="main-content">
      <!-- 顶部头部 -->
      <header class="header">
        <div class="header-left">
          <button class="sidebar-toggle" @click="themeStore.toggleSidebar">
            <Menu :size="20" />
          </button>
          <h1 class="header-title">{{ currentPageTitle }}</h1>
        </div>
        <div class="header-actions">
          <!-- 设置按钮 -->
          <button class="settings-btn" @click="showSettingsDrawer = true" title="设置">
            <Settings :size="20" />
          </button>
        </div>
      </header>

      <!-- 内容区域 -->
      <div class="content">
        <slot />
      </div>
    </main>

    <!-- 设置抽屉 -->
    <SettingsDrawer v-model:visible="showSettingsDrawer" />
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRoute } from 'vue-router'
import { LayoutDashboard, Settings, Server, ServerOff, Menu, FolderKanban } from 'lucide-vue-next'
import { useAppStore } from '../stores/app'
import { useThemeStore } from '../stores/theme'
import SettingsDrawer from './SettingsDrawer.vue'
import '../styles/theme.css'

interface MenuItem {
  icon: any
  title: string
  path: string
}

const props = defineProps<{
  title?: string
}>()

const route = useRoute()
const appStore = useAppStore()
const themeStore = useThemeStore()

const showSettingsDrawer = ref(false)

// 菜单项配置
const menuItems: MenuItem[] = [
  { 
    icon: LayoutDashboard,
    title: '概览', 
    path: '/',
  },
  { 
    icon: FolderKanban,
    title: '项目管理', 
    path: '/projects',
  },
]

// 计算当前页面标题
const currentPageTitle = computed(() => {
  if (props.title) return props.title
  const routeMeta = route.meta as { title?: string } | undefined
  if (routeMeta?.title) return routeMeta.title
  const currentMenu = menuItems.find(item => isActive(item.path))
  return currentMenu?.title || '系统信息'
})

// 判断路由是否激活
function isActive(path: string): boolean {
  if (path === '/') {
    return route.path === '/'
  }
  return route.path.startsWith(path)
}
</script>

<style scoped>
.system-layout {
  display: flex;
  height: 100vh;
  overflow: hidden;
  font-size: var(--font-size-base);
  background: var(--content-bg);
  transition: background-color 0.3s ease;
}

/* ========== 左侧菜单 ========== */
.sidebar {
  width: var(--sidebar-width);
  background: var(--sidebar-bg);
  border-right: 1px solid var(--sidebar-border);
  display: flex;
  flex-direction: column;
  transition: width 0.3s cubic-bezier(0.4, 0, 0.2, 1), 
              opacity 0.3s cubic-bezier(0.4, 0, 0.2, 1),
              background-color 0.3s ease,
              border-color 0.3s ease;
  overflow: hidden;
  position: relative;
  flex-shrink: 0;
  will-change: width;
}

.sidebar-header {
  height: 64px;
  padding: 0 var(--size-spacing-lg);
  display: flex;
  align-items: center;
  border-bottom: 1px solid var(--sidebar-border);
  cursor: pointer;
  user-select: none;
}

.logo {
  display: flex;
  align-items: center;
  gap: var(--size-spacing-md);
  width: 100%;
}

.logo-icon {
  width: 32px;
  height: 32px;
  border-radius: var(--size-radius-lg);
  border: 2px solid var(--theme-color-primary);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  background: var(--color-bg-container);
  color: var(--theme-color-primary);
}

.logo-text {
  font-size: var(--font-size-lg);
  font-weight: var(--size-font-weight-semibold);
  color: var(--sidebar-text-color);
  white-space: nowrap;
  transition: opacity 0.3s cubic-bezier(0.4, 0, 0.2, 1), transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}


/* 导航菜单 */
.sidebar-nav {
  flex: 1;
  padding: var(--size-spacing-md);
  overflow-y: auto;
  overflow-x: hidden;
}

.nav-item {
  display: flex;
  align-items: center;
  gap: var(--size-spacing-md);
  padding: var(--size-spacing-md) var(--size-spacing-lg);
  margin: 2px 0;
  border-radius: var(--size-radius-md);
  text-decoration: none;
  color: var(--sidebar-text-color);
  transition: all 0.2s ease;
  position: relative;
  min-height: 40px;
}

.nav-item:hover {
  background: var(--sidebar-item-hover-bg);
}

.nav-item.active {
  background: var(--sidebar-item-active-bg);
  color: var(--sidebar-item-active-color);
  font-weight: var(--size-font-weight-medium);
}

.nav-icon-wrapper {
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.nav-icon-component {
  color: inherit;
}

.nav-text {
  flex: 1;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  transition: opacity 0.3s cubic-bezier(0.4, 0, 0.2, 1), transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}


/* 底部操作区 */
.sidebar-footer {
  border-top: 1px solid var(--sidebar-border);
  padding: var(--size-spacing-md);
}

.server-status {
  display: flex;
  align-items: center;
  gap: var(--size-spacing-md);
  padding: var(--size-spacing-md);
  border-radius: var(--size-radius-md);
  transition: all 0.2s ease;
}

.server-status.connected {
  background: var(--color-success-light);
  color: var(--color-success-default);
}

.server-status.disconnected {
  background: var(--color-danger-light);
  color: var(--color-danger-default);
}

.status-icon {
  flex-shrink: 0;
}

.status-info {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 2px;
  transition: opacity 0.3s cubic-bezier(0.4, 0, 0.2, 1), transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.status-text {
  font-size: var(--font-size-sm);
  font-weight: var(--size-font-weight-medium);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.status-port {
  font-size: var(--font-size-sm);
  opacity: 0.7;
}

/* ========== 主内容区域 ========== */
.main-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  min-width: 0;
}

.header {
  height: var(--header-height);
  padding: 0 var(--size-spacing-xl);
  display: flex;
  align-items: center;
  justify-content: space-between;
  background: var(--header-bg);
  border-bottom: 1px solid var(--header-border);
}

.header-left {
  display: flex;
  align-items: center;
  gap: var(--size-spacing-lg);
}

.sidebar-toggle {
  width: 36px;
  height: 36px;
  border: none;
  background: transparent;
  color: var(--header-text-color);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: var(--size-radius-md);
  transition: all 0.2s ease;
}

.sidebar-toggle:hover {
  background: var(--color-bg-component-hover);
  color: var(--theme-color-primary);
}

.header-title {
  font-size: var(--font-size-xl);
  font-weight: var(--size-font-weight-semibold);
  margin: 0;
  color: var(--header-text-color);
}

.header-actions {
  display: flex;
  align-items: center;
  gap: var(--size-spacing-md);
}

.settings-btn {
  width: 36px;
  height: 36px;
  border: none;
  background: transparent;
  color: var(--header-text-color);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: var(--size-radius-md);
  transition: all 0.2s ease;
}

.settings-btn:hover {
  background: var(--color-bg-component-hover);
  color: var(--theme-color-primary);
}

.content {
  flex: 1;
  overflow-y: auto;
  overflow-x: hidden;
  background: var(--content-bg);
  padding: var(--content-padding);
}

/* 侧边栏折叠状态 - 文本已在模板中用 v-if 控制，这里只需要处理特殊情况 */

.sidebar-collapsed .nav-item {
  justify-content: center;
  padding: var(--size-spacing-md);
}

.sidebar-collapsed .server-status {
  justify-content: center;
  padding: var(--size-spacing-md);
}

/* 侧边栏动画优化 */
.sidebar-header,
.sidebar-nav,
.sidebar-footer {
  transition: opacity 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.nav-item {
  transition: padding 0.3s cubic-bezier(0.4, 0, 0.2, 1), justify-content 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.server-status {
  transition: padding 0.3s cubic-bezier(0.4, 0, 0.2, 1), justify-content 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.logo {
  transition: gap 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.sidebar-collapsed .logo {
  gap: 0;
}

/* 滚动条样式 */
.sidebar-nav::-webkit-scrollbar,
.content::-webkit-scrollbar {
  width: 6px;
  height: 6px;
}

.sidebar-nav::-webkit-scrollbar-track,
.content::-webkit-scrollbar-track {
  background: transparent;
}

.sidebar-nav::-webkit-scrollbar-thumb,
.content::-webkit-scrollbar-thumb {
  background: var(--color-gray-300);
  border-radius: var(--size-radius-full);
}

.sidebar-nav::-webkit-scrollbar-thumb:hover,
.content::-webkit-scrollbar-thumb:hover {
  background: var(--color-gray-400);
}

/* 暗黑模式下的滚动条 */
:root[data-theme-mode='dark'] .sidebar-nav::-webkit-scrollbar-thumb,
:root[data-theme-mode='dark'] .content::-webkit-scrollbar-thumb {
  background: var(--color-gray-700);
}

:root[data-theme-mode='dark'] .sidebar-nav::-webkit-scrollbar-thumb:hover,
:root[data-theme-mode='dark'] .content::-webkit-scrollbar-thumb:hover {
  background: var(--color-gray-600);
}
</style>

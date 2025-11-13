<script setup lang="ts">
import { ref } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { HomeIcon, AppIcon, SettingIcon, ServerIcon } from 'tdesign-icons-vue-next'
import SettingsDrawer from '@/components/SettingsDrawer.vue'
import { useThemeStore } from '@/stores/theme'

const router = useRouter()
const route = useRoute()
const themeStore = useThemeStore()
const settingsDrawerRef = ref<InstanceType<typeof SettingsDrawer>>()

const menuValue = ref(route.path)

const menuItems = [
  {
    value: '/',
    label: '首页',
    icon: HomeIcon,
  },
  {
    value: '/project',
    label: '项目管理',
    icon: AppIcon,
  },
  {
    value: '/system-info',
    label: '系统信息',
    icon: ServerIcon,
  },
]

const handleMenuClick = (value: string) => {
  menuValue.value = value
  router.push(value)
}

const openSettings = () => {
  settingsDrawerRef.value?.open()
}
</script>

<template>
  <t-config-provider :global-config="{ size: themeStore.size }">
    <div class="main-layout">
      <t-layout>
        <t-aside width="240px" class="aside">
          <div class="logo">
            <h2>管理系统</h2>
          </div>
          <t-menu :value="menuValue" theme="light" @change="handleMenuClick">
            <t-menu-item
              v-for="item in menuItems"
              :key="item.value"
              :value="item.value"
            >
              <template #icon>
                <component :is="item.icon" />
              </template>
              {{ item.label }}
            </t-menu-item>
          </t-menu>
        </t-aside>
        <t-layout>
          <t-header class="header">
            <div class="header-content">
              <span class="header-title">{{ route.meta.title || '欢迎' }}</span>
              <t-button
                theme="default"
                variant="text"
                shape="square"
                @click="openSettings"
              >
                <template #icon>
                  <setting-icon />
                </template>
              </t-button>
            </div>
          </t-header>
          <t-content class="content">
            <router-view />
          </t-content>
        </t-layout>
      </t-layout>
    </div>
    <SettingsDrawer ref="settingsDrawerRef" />
  </t-config-provider>
</template>

<style scoped>
.main-layout {
  height: 100vh;
  width: 100vw;
  overflow: hidden;
}

.main-layout :deep(.t-layout) {
  height: 100%;
}

.aside {
  height: 100vh;
  background: var(--td-bg-color-container);
  border-right: 1px solid var(--td-border-level-1-color);
}

.logo {
  height: 64px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-bottom: 1px solid var(--td-border-level-1-color);
}

.logo h2 {
  margin: 0;
  font-size: 18px;
  color: var(--td-text-color-primary);
}

.header {
  height: 64px;
  background: var(--td-bg-color-container);
  border-bottom: 1px solid var(--td-border-level-1-color);
  padding: 0 24px;
  display: flex;
  align-items: center;
}

.header-content {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
}

.header-title {
  font-size: 16px;
  font-weight: 500;
  color: var(--td-text-color-primary);
}

.content {
  height: calc(100vh - 64px);
  background: var(--td-bg-color-page);
  overflow-y: auto;
}
</style>

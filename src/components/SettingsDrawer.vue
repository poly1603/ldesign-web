<template>
  <Teleport to="body">
    <Transition name="drawer-overlay">
      <div v-if="visible" class="drawer-overlay" @click="handleClose"></div>
    </Transition>
    <Transition name="drawer-slide">
      <div v-if="visible" class="drawer-container">
        <div class="drawer-header">
          <h2 class="drawer-title">设置</h2>
          <button class="drawer-close" @click="handleClose">
            <X :size="20" />
          </button>
        </div>
        <div class="drawer-content">
          <!-- 主题色选择 -->
          <div class="setting-section">
            <h3 class="section-title">主题色</h3>
            <div class="color-options">
              <button
                v-for="(colorValue, colorName) in themeColors"
                :key="colorName"
                :class="['color-option', { active: themeStore.themeColor === colorName }]"
                :style="{ backgroundColor: colorValue }"
                @click="themeStore.setThemeColor(colorName as ThemeColor)"
                :title="colorName"
              >
                <Check v-if="themeStore.themeColor === colorName" :size="16" />
              </button>
            </div>
          </div>

          <!-- 字体大小选择 -->
          <div class="setting-section">
            <h3 class="section-title">字体大小</h3>
            <div class="size-options">
              <button
                v-for="size in fontSizes"
                :key="size"
                :class="['size-option', { active: themeStore.fontSize === size }]"
                @click="themeStore.setFontSize(size)"
              >
                <Check v-if="themeStore.fontSize === size" :size="16" />
                <span>{{ size === 'small' ? '小' : size === 'medium' ? '中' : '大' }}</span>
              </button>
            </div>
          </div>

          <!-- 模式切换 -->
          <div class="setting-section">
            <h3 class="section-title">模式切换</h3>
            <div class="mode-options">
              <button
                :class="['mode-option', { active: themeStore.darkMode === 'light' }]"
                @click="themeStore.setDarkMode('light')"
              >
                <Sun :size="20" />
                <span>浅色模式</span>
                <Check v-if="themeStore.darkMode === 'light'" :size="16" />
              </button>
              <button
                :class="['mode-option', { active: themeStore.darkMode === 'dark' }]"
                @click="themeStore.setDarkMode('dark')"
              >
                <Moon :size="20" />
                <span>暗黑模式</span>
                <Check v-if="themeStore.darkMode === 'dark'" :size="16" />
              </button>
              <button
                :class="['mode-option', { active: themeStore.darkMode === 'auto' }]"
                @click="themeStore.setDarkMode('auto')"
              >
                <Monitor :size="20" />
                <span>跟随系统</span>
                <Check v-if="themeStore.darkMode === 'auto'" :size="16" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { X, Check, Sun, Moon, Monitor } from 'lucide-vue-next'
import { useThemeStore, type ThemeColor, type FontSize } from '../stores/theme'

interface Props {
  visible: boolean
}

interface Emits {
  (e: 'update:visible', value: boolean): void
  (e: 'close'): void
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()

const themeStore = useThemeStore()

const themeColors: Record<ThemeColor, string> = {
  blue: '#1890ff',
  green: '#52c41a',
  purple: '#722ed1',
  orange: '#fa8c16',
  red: '#f5222d',
}

const fontSizes: FontSize[] = ['small', 'medium', 'large']

function handleClose() {
  emit('update:visible', false)
  emit('close')
}
</script>

<style scoped>
.drawer-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.45);
  z-index: var(--z-index-modal-backdrop, 1040);
}

.drawer-container {
  position: fixed;
  top: 0;
  right: 0;
  bottom: 0;
  width: 400px;
  max-width: 90vw;
  background: var(--color-bg-container);
  box-shadow: var(--shadow-xl);
  z-index: var(--z-index-modal, 1050);
  display: flex;
  flex-direction: column;
}

.drawer-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: var(--size-spacing-xl);
  border-bottom: 1px solid var(--color-border-light);
}

.drawer-title {
  font-size: var(--font-size-xl);
  font-weight: var(--size-font-weight-semibold);
  margin: 0;
  color: var(--color-text-primary);
}

.drawer-close {
  width: 32px;
  height: 32px;
  border: none;
  background: transparent;
  color: var(--color-text-secondary);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: var(--size-radius-md);
  transition: all 0.2s ease;
}

.drawer-close:hover {
  background: var(--color-bg-component-hover);
  color: var(--color-text-primary);
}

.drawer-content {
  flex: 1;
  overflow-y: auto;
  padding: var(--size-spacing-xl);
}

.setting-section {
  margin-bottom: var(--size-spacing-2xl);
}

.setting-section:last-child {
  margin-bottom: 0;
}

.section-title {
  font-size: var(--font-size-base);
  font-weight: var(--size-font-weight-medium);
  color: var(--color-text-primary);
  margin: 0 0 var(--size-spacing-lg) 0;
}

.color-options {
  display: flex;
  gap: var(--size-spacing-md);
  flex-wrap: wrap;
}

.color-option {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  border: 2px solid transparent;
  cursor: pointer;
  transition: all 0.2s ease;
  padding: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
}

.color-option:hover {
  transform: scale(1.1);
}

.color-option.active {
  border-color: var(--color-text-primary);
  box-shadow: 0 0 0 2px var(--color-bg-container), 0 0 0 4px var(--color-text-primary);
}

.size-options {
  display: flex;
  gap: var(--size-spacing-md);
}

.size-option {
  flex: 1;
  padding: var(--size-spacing-md);
  border: 1px solid var(--color-border);
  background: var(--color-bg-container);
  border-radius: var(--size-radius-md);
  cursor: pointer;
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: var(--size-spacing-xs);
  color: var(--color-text-primary);
  font-size: var(--font-size-base);
}

.size-option:hover {
  border-color: var(--theme-color-primary);
  background: var(--color-bg-component-hover);
}

.size-option.active {
  border-color: var(--theme-color-primary);
  background: var(--theme-color-primary-light);
  color: var(--theme-color-primary);
  font-weight: var(--size-font-weight-medium);
}

.mode-options {
  display: flex;
  flex-direction: column;
  gap: var(--size-spacing-md);
}

.mode-option {
  padding: var(--size-spacing-lg);
  border: 1px solid var(--color-border);
  background: var(--color-bg-container);
  border-radius: var(--size-radius-md);
  cursor: pointer;
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  gap: var(--size-spacing-md);
  color: var(--color-text-primary);
  font-size: var(--font-size-base);
  text-align: left;
}

.mode-option:hover {
  border-color: var(--theme-color-primary);
  background: var(--color-bg-component-hover);
}

.mode-option.active {
  border-color: var(--theme-color-primary);
  background: var(--theme-color-primary-light);
  color: var(--theme-color-primary);
  font-weight: var(--size-font-weight-medium);
}

.mode-option span {
  flex: 1;
}

/* 动画 */
.drawer-overlay-enter-active,
.drawer-overlay-leave-active {
  transition: opacity 0.3s ease;
}

.drawer-overlay-enter-from,
.drawer-overlay-leave-to {
  opacity: 0;
}

.drawer-slide-enter-active,
.drawer-slide-leave-active {
  transition: transform 0.3s ease;
}

.drawer-slide-enter-from {
  transform: translateX(100%);
}

.drawer-slide-leave-to {
  transform: translateX(100%);
}
</style>





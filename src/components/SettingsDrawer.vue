<script setup lang="ts">
import { ref } from 'vue'
import { useThemeStore, type ThemeMode, type ThemeColor, type ThemeSize } from '@/stores/theme'

const visible = ref(false)
const themeStore = useThemeStore()

const open = () => {
  visible.value = true
}

const close = () => {
  visible.value = false
}

const themeColors: { label: string; value: ThemeColor; color: string }[] = [
  { label: '默认蓝', value: 'default', color: '#0052d9' },
  { label: '清新青', value: 'cyan', color: '#00a4d4' },
  { label: '活力绿', value: 'green', color: '#00a870' },
  { label: '温暖橙', value: 'orange', color: '#e37318' },
  { label: '优雅紫', value: 'purple', color: '#6e4ff5' },
]

const themeSizes: { label: string; value: ThemeSize }[] = [
  { label: '紧凑', value: 'small' },
  { label: '中等', value: 'medium' },
  { label: '宽松', value: 'large' },
]

defineExpose({
  open,
  close,
})
</script>

<template>
  <t-drawer v-model:visible="visible" title="主题设置" size="400px" :footer="false">
    <div class="settings-content">
      <!-- 主题模式 -->
      <div class="setting-section">
        <div class="setting-title">主题模式</div>
        <t-radio-group
          v-model="themeStore.mode"
          @change="(value: ThemeMode) => themeStore.applyMode(value)"
        >
          <t-radio-button value="light">浅色</t-radio-button>
          <t-radio-button value="dark">暗黑</t-radio-button>
        </t-radio-group>
      </div>

      <!-- 主题色 -->
      <div class="setting-section">
        <div class="setting-title">主题色</div>
        <div class="color-picker">
          <div
            v-for="item in themeColors"
            :key="item.value"
            class="color-item"
            :class="{ active: themeStore.color === item.value }"
            :style="{ backgroundColor: item.color }"
            @click="themeStore.applyColor(item.value)"
          >
            <span v-if="themeStore.color === item.value" class="check-icon">✓</span>
          </div>
        </div>
        <div class="color-labels">
          <span
            v-for="item in themeColors"
            :key="item.value"
            class="color-label"
            :class="{ active: themeStore.color === item.value }"
          >
            {{ item.label }}
          </span>
        </div>
      </div>

      <!-- 组件尺寸 -->
      <div class="setting-section">
        <div class="setting-title">组件尺寸</div>
        <t-radio-group
          v-model="themeStore.size"
          @change="(value: ThemeSize) => themeStore.applySize(value)"
        >
          <t-radio-button
            v-for="item in themeSizes"
            :key="item.value"
            :value="item.value"
          >
            {{ item.label }}
          </t-radio-button>
        </t-radio-group>
      </div>
    </div>
  </t-drawer>
</template>

<style scoped>
.settings-content {
  padding: 12px 0;
}

.setting-section {
  margin-bottom: 32px;
}

.setting-title {
  font-size: 14px;
  font-weight: 500;
  color: var(--td-text-color-primary);
  margin-bottom: 16px;
}

.color-picker {
  display: flex;
  gap: 12px;
  margin-bottom: 8px;
}

.color-item {
  width: 48px;
  height: 48px;
  border-radius: 4px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.3s;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.color-item:hover {
  transform: scale(1.1);
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.15);
}

.color-item.active {
  box-shadow: 0 0 0 2px var(--td-bg-color-container),
    0 0 0 4px var(--td-brand-color);
}

.check-icon {
  color: #fff;
  font-size: 20px;
  font-weight: bold;
}

.color-labels {
  display: flex;
  gap: 12px;
}

.color-label {
  width: 48px;
  text-align: center;
  font-size: 12px;
  color: var(--td-text-color-secondary);
}

.color-label.active {
  color: var(--td-brand-color);
  font-weight: 500;
}
</style>

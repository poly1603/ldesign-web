import { ref, watch } from 'vue'
import { defineStore } from 'pinia'

export type ThemeMode = 'light' | 'dark'
export type ThemeColor = 'default' | 'cyan' | 'green' | 'orange' | 'purple'
export type ThemeSize = 'small' | 'medium' | 'large'

export const useThemeStore = defineStore('theme', () => {
  // 从 localStorage 读取保存的设置
  const mode = ref<ThemeMode>((localStorage.getItem('theme-mode') as ThemeMode) || 'light')
  const color = ref<ThemeColor>((localStorage.getItem('theme-color') as ThemeColor) || 'default')
  const size = ref<ThemeSize>((localStorage.getItem('theme-size') as ThemeSize) || 'medium')

  // 主题色映射
  const colorMap: Record<ThemeColor, string> = {
    default: '#0052d9',
    cyan: '#00a4d4',
    green: '#00a870',
    orange: '#e37318',
    purple: '#6e4ff5',
  }

  // 应用主题模式
  const applyMode = (newMode: ThemeMode) => {
    mode.value = newMode
    document.documentElement.setAttribute('theme-mode', newMode)
    localStorage.setItem('theme-mode', newMode)
  }

  // 应用主题色
  const applyColor = (newColor: ThemeColor) => {
    color.value = newColor
    const primaryColor = colorMap[newColor]
    document.documentElement.style.setProperty('--td-brand-color', primaryColor)
    localStorage.setItem('theme-color', newColor)
  }

  // 应用尺寸
  const applySize = (newSize: ThemeSize) => {
    size.value = newSize
    localStorage.setItem('theme-size', newSize)
  }

  // 初始化应用主题
  const initTheme = () => {
    applyMode(mode.value)
    applyColor(color.value)
    applySize(size.value)
  }

  return {
    mode,
    color,
    size,
    applyMode,
    applyColor,
    applySize,
    initTheme,
    colorMap,
  }
})

import { defineStore } from 'pinia'
import { ref, watch, computed } from 'vue'

/**
 * 主题色选项
 */
export type ThemeColor = 'blue' | 'green' | 'purple' | 'orange' | 'red'

/**
 * 暗黑模式选项
 */
export type DarkMode = 'light' | 'dark' | 'auto'

/**
 * 字体大小选项
 */
export type FontSize = 'small' | 'medium' | 'large'

/**
 * 主题配置 Store
 */
export const useThemeStore = defineStore('theme', () => {
  // State
  const themeColor = ref<ThemeColor>('blue')
  const darkMode = ref<DarkMode>('light')
  const fontSize = ref<FontSize>('medium')
  const sidebarCollapsed = ref(false)

  // 从 localStorage 加载配置
  function loadFromStorage() {
    const savedThemeColor = localStorage.getItem('theme-color') as ThemeColor | null
    const savedDarkMode = localStorage.getItem('dark-mode') as DarkMode | null
    const savedFontSize = localStorage.getItem('font-size') as FontSize | null
    const savedSidebarCollapsed = localStorage.getItem('sidebar-collapsed')

    if (savedThemeColor) themeColor.value = savedThemeColor
    if (savedDarkMode) darkMode.value = savedDarkMode
    if (savedFontSize) fontSize.value = savedFontSize
    if (savedSidebarCollapsed !== null) {
      sidebarCollapsed.value = savedSidebarCollapsed === 'true'
    }
  }

  // 初始化时加载配置
  loadFromStorage()

  // 主题色配置
  const themeColors: Record<ThemeColor, string> = {
    blue: '#1890ff',
    green: '#52c41a',
    purple: '#722ed1',
    orange: '#fa8c16',
    red: '#f5222d',
  }

  // 字体大小配置（相对于基础 14px）
  const fontSizes: Record<FontSize, number> = {
    small: 0.857, // 12px
    medium: 1, // 14px
    large: 1.143, // 16px
  }

  // Computed - 当前主题色值
  const currentThemeColor = computed(() => themeColors[themeColor.value])

  // Computed - 当前字体大小比例
  const currentFontSizeScale = computed(() => fontSizes[fontSize.value])

  // Computed - 实际暗黑模式（如果是 auto，则检测系统偏好）
  const actualDarkMode = computed(() => {
    if (darkMode.value === 'auto') {
      return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
    }
    return darkMode.value
  })

  // Actions - 设置主题色
  function setThemeColor(color: ThemeColor) {
    themeColor.value = color
    localStorage.setItem('theme-color', color)
    applyThemeColor(color)
  }

  // Actions - 设置暗黑模式
  function setDarkMode(mode: DarkMode) {
    darkMode.value = mode
    localStorage.setItem('dark-mode', mode)
    applyDarkMode(actualDarkMode.value)
  }

  // Actions - 设置字体大小
  function setFontSize(size: FontSize) {
    fontSize.value = size
    localStorage.setItem('font-size', size)
    applyFontSize(size)
  }

  // Actions - 切换侧边栏折叠状态
  function toggleSidebar() {
    sidebarCollapsed.value = !sidebarCollapsed.value
    localStorage.setItem('sidebar-collapsed', String(sidebarCollapsed.value))
  }

  // Actions - 设置侧边栏折叠状态
  function setSidebarCollapsed(collapsed: boolean) {
    sidebarCollapsed.value = collapsed
    localStorage.setItem('sidebar-collapsed', String(collapsed))
  }

  // 应用主题色
  function applyThemeColor(color: ThemeColor) {
    const root = document.documentElement
    const colorValue = themeColors[color]
    
    // 设置主色变量
    root.style.setProperty('--theme-color-primary', colorValue)
    
    // 可以根据主题色生成其他颜色变量
    // 这里简化处理，使用固定映射
  }

  // 应用暗黑模式
  function applyDarkMode(mode: 'light' | 'dark') {
    const root = document.documentElement
    if (mode === 'dark') {
      root.setAttribute('data-theme-mode', 'dark')
    } else {
      root.removeAttribute('data-theme-mode')
    }
  }

  // 应用字体大小
  function applyFontSize(size: FontSize) {
    const root = document.documentElement
    const scale = fontSizes[size]
    root.style.setProperty('--theme-font-size-scale', String(scale))
  }

  // 监听系统主题变化（当 darkMode 为 auto 时）
  if (typeof window !== 'undefined') {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
    const handleChange = () => {
      if (darkMode.value === 'auto') {
        applyDarkMode(actualDarkMode.value)
      }
    }
    mediaQuery.addEventListener('change', handleChange)
  }

  // 初始化时应用主题
  applyThemeColor(themeColor.value)
  applyDarkMode(actualDarkMode.value)
  applyFontSize(fontSize.value)

  // 监听变化并应用
  watch(themeColor, (newColor) => {
    applyThemeColor(newColor)
  })

  watch(actualDarkMode, (newMode) => {
    applyDarkMode(newMode)
  })

  watch(fontSize, (newSize) => {
    applyFontSize(newSize)
  })

  return {
    themeColor,
    darkMode,
    fontSize,
    sidebarCollapsed,
    currentThemeColor,
    currentFontSizeScale,
    actualDarkMode,
    setThemeColor,
    setDarkMode,
    setFontSize,
    toggleSidebar,
    setSidebarCollapsed,
    loadFromStorage,
  }
})


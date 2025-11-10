<template>
  <div ref="selectRef" class="custom-select" :class="{ 'is-open': isOpen }">
    <button
      class="select-trigger"
      :disabled="disabled"
      @click="toggleDropdown"
      :title="title"
    >
      <component :is="iconComponent" :size="16" class="select-icon" :style="{ color: iconColor }" />
      <span class="select-text">{{ displayText }}</span>
      <ChevronDown :size="16" class="select-arrow" :class="{ 'is-open': isOpen }" />
    </button>
    <Transition name="dropdown">
      <div v-if="isOpen" ref="dropdownRef" class="select-dropdown" :style="dropdownStyle" @click.stop>
        <div class="select-options">
          <button
            v-for="option in options"
            :key="option.value"
            class="select-option"
            :class="{ 'is-selected': modelValue === option.value, 'is-disabled': option.disabled }"
            :disabled="option.disabled"
            @click="selectOption(option.value)"
          >
            <component :is="getIconComponent(option.value)" :size="16" class="option-icon" :class="{ 'icon-spinning': option.badge === '打包中' }" :style="{ color: getIconColor(option.value) }" />
            <div class="option-content">
              <span class="option-label">{{ option.label }}</span>
              <span v-if="option.buildStatus?.built" class="option-build-time">{{ formatBuildTime(option.buildStatus.buildTime) }}</span>
            </div>
            <span v-if="option.badge" class="option-badge" :class="getBadgeClass(option)">{{ option.badge }}</span>
          </button>
        </div>
      </div>
    </Transition>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch, nextTick } from 'vue'
import { ChevronDown, Circle, CheckCircle2, Loader2, Database, Terminal, Rocket, FlaskConical, Monitor } from 'lucide-vue-next'

interface SelectOption {
  value: string
  label: string
  icon?: string
  badge?: string
  disabled?: boolean
  buildStatus?: {
    built: boolean
    buildTime?: number
  }
}

interface Props {
  modelValue: string
  options: SelectOption[]
  disabled?: boolean
  title?: string
}

const props = withDefaults(defineProps<Props>(), {
  disabled: false,
  title: '',
})

const emit = defineEmits<{
  'update:modelValue': [value: string]
}>()

const isOpen = ref(false)
const dropdownStyle = ref<Record<string, string>>({})
const selectRef = ref<HTMLElement | null>(null)
const dropdownRef = ref<HTMLElement | null>(null)

const selectedOption = computed(() => {
  return props.options.find(opt => opt.value === props.modelValue) || props.options[0]
})

const displayText = computed(() => {
  return selectedOption.value?.label || ''
})

const iconComponent = computed(() => {
  const option = selectedOption.value
  if (!option) return Circle
  
  // 根据环境和状态返回不同的图标
  if (option.badge === '打包中') {
    return Loader2
  } else if (option.buildStatus?.built) {
    return CheckCircle2
  }
  
  // 根据环境返回对应的图标
  return getEnvironmentIcon(option.value)
})

function getEnvironmentIcon(value: string) {
  const iconMap: Record<string, any> = {
    production: Database,   // 生产环境：数据库图标（稳定、可靠）
    development: Terminal,   // 开发环境：终端图标（开发工具）
    staging: Rocket,         // 预发布环境：火箭图标（发布）
    test: FlaskConical,      // 测试环境：实验瓶图标（测试）
    preview: Monitor,        // 预览环境：显示器图标（预览展示）
  }
  return iconMap[value] || Circle
}

const iconColor = computed(() => {
  const option = selectedOption.value
  if (!option) return 'var(--color-text-secondary)'
  
  if (option.badge === '打包中') {
    return 'var(--theme-color-primary, #1890ff)'
  } else if (option.buildStatus?.built) {
    return 'var(--color-success-default, #52c41a)'
  }
  
  // 根据环境返回不同颜色
  const colorMap: Record<string, string> = {
    production: '#ff4d4f',
    development: '#52c41a',
    staging: '#faad14',
    test: '#1890ff',
    preview: '#722ed1',
  }
  return colorMap[option.value] || 'var(--color-text-secondary)'
})

function getIconComponent(value: string) {
  const option = props.options.find(opt => opt.value === value)
  if (!option) return getEnvironmentIcon(value)
  
  // 打包中显示加载图标
  if (option.badge === '打包中') {
    return Loader2
  }
  
  // 已打包时，在环境图标上叠加 CheckCircle2，但这里我们只显示环境图标
  // 因为已打包状态通过 badge 和颜色已经表示了
  return getEnvironmentIcon(value)
}

function getIconColor(value: string) {
  const option = props.options.find(opt => opt.value === value)
  if (!option) return 'var(--color-text-secondary)'
  
  if (option.badge === '打包中') {
    return 'var(--theme-color-primary, #1890ff)'
  } else if (option.buildStatus?.built) {
    return 'var(--color-success-default, #52c41a)'
  }
  
  // 根据环境返回不同颜色
  const colorMap: Record<string, string> = {
    production: '#ff4d4f',
    development: '#52c41a',
    staging: '#faad14',
    test: '#1890ff',
    preview: '#722ed1',
  }
  return colorMap[value] || 'var(--color-text-secondary)'
}

function getBadgeClass(option: SelectOption) {
  if (option.badge === '打包中') {
    return 'badge-building'
  } else if (option.badge === '已打包') {
    return 'badge-built'
  }
  return ''
}

function formatBuildTime(buildTime?: number): string {
  if (!buildTime) return ''
  const date = new Date(buildTime)
  const now = new Date()
  const diff = now.getTime() - date.getTime()
  const minutes = Math.floor(diff / 60000)
  const hours = Math.floor(minutes / 60)
  const days = Math.floor(hours / 24)
  
  if (days > 0) {
    return `${days} 天前`
  } else if (hours > 0) {
    return `${hours} 小时前`
  } else if (minutes > 0) {
    return `${minutes} 分钟前`
  } else {
    return '刚刚'
  }
}

function adjustDropdownPosition() {
  if (!selectRef.value || !dropdownRef.value) return
  
  // 使用双重 nextTick 确保 DOM 完全渲染
  nextTick(() => {
    nextTick(() => {
      const selectRect = selectRef.value!.getBoundingClientRect()
      const dropdownRect = dropdownRef.value!.getBoundingClientRect()
      const viewportWidth = window.innerWidth
      const viewportHeight = window.innerHeight
      
      // 预估下拉框宽度（使用 min-width）
      const estimatedDropdownWidth = 220
      const estimatedDropdownHeight = 300
      
      let left = '0'
      let right = 'auto'
      let top = 'auto'
      let bottom = 'auto'
      
      // 检查右侧空间
      const spaceRight = viewportWidth - selectRect.right
      const spaceLeft = selectRect.left
      
      // 如果右侧空间不足
      if (spaceRight < estimatedDropdownWidth) {
        // 如果左侧空间足够，则右对齐
        if (spaceLeft >= estimatedDropdownWidth) {
          left = 'auto'
          right = '0'
        } else {
          // 如果两侧空间都不足，则限制宽度并右对齐
          left = 'auto'
          right = '0'
          const maxWidth = Math.max(spaceLeft - 8, 150)
          dropdownRef.value!.style.maxWidth = `${maxWidth}px`
          dropdownRef.value!.style.width = `${maxWidth}px`
        }
      } else {
        // 右侧空间足够，左对齐
        left = '0'
        right = 'auto'
        dropdownRef.value!.style.maxWidth = ''
        dropdownRef.value!.style.width = ''
      }
      
      // 检查下方空间
      const spaceBottom = viewportHeight - selectRect.bottom
      const spaceTop = selectRect.top
      
      // 如果下方空间不足
      if (spaceBottom < estimatedDropdownHeight) {
        // 如果上方空间足够，则向上展开
        if (spaceTop >= estimatedDropdownHeight) {
          top = 'auto'
          bottom = 'calc(100% + var(--size-spacing-xs))'
        } else {
          // 如果上下空间都不足，则限制高度
          const maxHeight = Math.max(Math.min(spaceBottom - 8, estimatedDropdownHeight), 200)
          dropdownRef.value!.style.maxHeight = `${maxHeight}px`
        }
      } else {
        // 下方空间足够，向下展开
        top = 'calc(100% + var(--size-spacing-xs))'
        bottom = 'auto'
        dropdownRef.value!.style.maxHeight = ''
      }
      
      dropdownStyle.value = {
        left,
        right,
        top,
        bottom,
      }
    })
  })
}

function toggleDropdown() {
  if (props.disabled) return
  isOpen.value = !isOpen.value
  if (isOpen.value) {
    adjustDropdownPosition()
  }
}

function selectOption(value: string) {
  const option = props.options.find(opt => opt.value === value)
  if (option?.disabled) return
  
  emit('update:modelValue', value)
  isOpen.value = false
}

function handleClickOutside(event: MouseEvent) {
  const target = event.target as HTMLElement
  if (!target.closest('.custom-select')) {
    isOpen.value = false
  }
}

watch(isOpen, (newVal) => {
  if (newVal) {
    adjustDropdownPosition()
    // 监听窗口大小变化和滚动，重新调整位置
    window.addEventListener('resize', adjustDropdownPosition)
    window.addEventListener('scroll', adjustDropdownPosition, true)
  } else {
    window.removeEventListener('resize', adjustDropdownPosition)
    window.removeEventListener('scroll', adjustDropdownPosition, true)
  }
})

onMounted(() => {
  document.addEventListener('click', handleClickOutside)
})

onUnmounted(() => {
  document.removeEventListener('click', handleClickOutside)
  window.removeEventListener('resize', adjustDropdownPosition)
  window.removeEventListener('scroll', adjustDropdownPosition, true)
})
</script>

<style scoped>
.custom-select {
  position: relative;
  min-width: 140px;
}

.select-trigger {
  display: flex;
  align-items: center;
  gap: var(--size-spacing-xs);
  padding: var(--size-spacing-sm) var(--size-spacing-md);
  width: 100%;
  background: var(--color-bg-component);
  color: var(--color-text-primary);
  border: 1px solid var(--color-border-light);
  border-radius: var(--size-radius-md);
  font-size: var(--font-size-base);
  cursor: pointer;
  transition: all 0.2s ease;
}

.select-trigger:hover:not(:disabled) {
  background: var(--color-bg-component-hover);
  border-color: var(--theme-color-primary);
}

.select-trigger:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.select-trigger:focus {
  outline: none;
  border-color: var(--theme-color-primary);
  box-shadow: 0 0 0 2px rgba(var(--theme-color-primary-rgb, 24, 144, 255), 0.2);
}

.select-icon {
  flex-shrink: 0;
  display: flex;
  align-items: center;
}

.select-text {
  flex: 1;
  text-align: left;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.select-arrow {
  flex-shrink: 0;
  transition: transform 0.2s ease;
  color: var(--color-text-secondary);
}

.select-arrow.is-open {
  transform: rotate(180deg);
}

.select-dropdown {
  position: absolute;
  z-index: 1000;
  background: var(--color-bg-container);
  border: 1px solid var(--color-border-light);
  border-radius: var(--size-radius-md);
  box-shadow: var(--shadow-lg);
  overflow: hidden;
  width: max-content;
  min-width: 220px;
  max-width: 320px;
}

.select-options {
  max-height: 300px;
  overflow-y: auto;
}

.select-option {
  display: flex;
  align-items: center;
  gap: var(--size-spacing-sm, 8px);
  width: 100%;
  padding: var(--size-spacing-md, 12px) var(--size-spacing-lg, 16px);
  background: transparent;
  border: none;
  text-align: left;
  font-size: var(--font-size-base);
  color: var(--color-text-primary);
  cursor: pointer;
  transition: all 0.2s ease;
}

.select-option:hover:not(.is-disabled) {
  background: var(--color-bg-component-hover);
}

.select-option.is-selected {
  background: var(--theme-color-primary-light, rgba(24, 144, 255, 0.1));
  color: var(--theme-color-primary);
}

.select-option.is-disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.option-icon {
  flex-shrink: 0;
  display: flex;
  align-items: center;
}

.option-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}

.option-label {
  font-size: var(--font-size-base);
  font-weight: 500;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.option-build-time {
  font-size: var(--font-size-xs, 11px);
  color: var(--color-text-secondary, #666);
  white-space: nowrap;
}

.option-badge {
  flex-shrink: 0;
  padding: 2px 8px;
  border-radius: var(--size-radius-sm, 4px);
  font-size: var(--font-size-xs, 11px);
  font-weight: 500;
  white-space: nowrap;
}

.option-badge.badge-building {
  background: var(--theme-color-primary-light, rgba(24, 144, 255, 0.1));
  color: var(--theme-color-primary, #1890ff);
}

.option-badge.badge-built {
  background: var(--color-success-light, #f6ffed);
  color: var(--color-success-default, #52c41a);
}

.icon-spinning {
  animation: spin 1s linear infinite;
}

@keyframes spin {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}

.dropdown-enter-active,
.dropdown-leave-active {
  transition: all 0.2s ease;
}

.dropdown-enter-from,
.dropdown-leave-to {
  opacity: 0;
  transform: translateY(-8px);
}
</style>






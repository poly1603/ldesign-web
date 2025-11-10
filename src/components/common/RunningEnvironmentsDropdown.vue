<template>
  <div class="running-envs-dropdown" :class="{ 'is-open': isOpen }">
    <button
      class="dropdown-trigger"
      @click="toggleDropdown"
      :title="runningEnvironments.length > 0 ? `运行中: ${runningEnvironments.length} 个环境` : '没有运行中的环境'"
    >
      <Server :size="18" />
      <span v-if="runningEnvironments.length > 0" class="badge">{{ runningEnvironments.length }}</span>
      <ChevronDown :size="16" class="dropdown-arrow" :class="{ 'is-open': isOpen }" />
    </button>
    <Transition name="dropdown">
      <div v-if="isOpen && runningEnvironments.length > 0" class="dropdown-menu" @click.stop>
        <div class="dropdown-header">
          <span>运行中的环境</span>
          <span class="count">{{ runningEnvironments.length }}</span>
        </div>
        <div class="dropdown-options">
          <button
            v-for="env in runningEnvironments"
            :key="env.environment || 'development'"
            class="dropdown-option"
            :class="{ 'is-active': currentViewingEnvironment === (env.environment || 'development') }"
            @click="selectEnvironment(env.environment || 'development')"
          >
            <span class="option-icon">{{ getEnvironmentIcon(env.environment || 'development') }}</span>
            <span class="option-label">{{ getEnvironmentLabel(env.environment || 'development') }}</span>
            <span v-if="currentViewingEnvironment === (env.environment || 'development')" class="option-check">
              <Check :size="16" />
            </span>
          </button>
        </div>
      </div>
    </Transition>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import { Server, ChevronDown, Check } from 'lucide-vue-next'

interface RunningEnvironment {
  environment?: string
  executionId: string
  serviceUrl?: string
}

interface Props {
  runningEnvironments: RunningEnvironment[]
  currentViewingEnvironment: string | null
}

const props = defineProps<Props>()

const emit = defineEmits<{
  'select': [environment: string]
}>()

const isOpen = ref(false)

function toggleDropdown() {
  if (props.runningEnvironments.length === 0) return
  isOpen.value = !isOpen.value
}

function selectEnvironment(env: string) {
  emit('select', env)
  isOpen.value = false
}

function getEnvironmentIcon(env: string): string {
  const iconMap: Record<string, string> = {
    development: '🟢',
    production: '🔴',
    staging: '🟡',
    test: '🔵',
    preview: '🟣',
  }
  return iconMap[env] || '🟢'
}

function getEnvironmentLabel(env: string): string {
  const labelMap: Record<string, string> = {
    development: '开发环境',
    production: '生产环境',
    staging: '预发布环境',
    test: '测试环境',
    preview: '预览环境',
  }
  return labelMap[env] || env
}

function handleClickOutside(event: MouseEvent) {
  const target = event.target as HTMLElement
  if (!target.closest('.running-envs-dropdown')) {
    isOpen.value = false
  }
}

onMounted(() => {
  document.addEventListener('click', handleClickOutside)
})

onUnmounted(() => {
  document.removeEventListener('click', handleClickOutside)
})
</script>

<style scoped>
.running-envs-dropdown {
  position: relative;
}

.dropdown-trigger {
  display: flex;
  align-items: center;
  gap: var(--size-spacing-xs);
  padding: var(--size-spacing-sm) var(--size-spacing-md);
  background: var(--color-bg-component);
  color: var(--color-text-primary);
  border: 1px solid var(--color-border-light);
  border-radius: var(--size-radius-md);
  cursor: pointer;
  transition: all 0.2s ease;
}

.dropdown-trigger:hover {
  background: var(--color-bg-component-hover);
  border-color: var(--theme-color-primary);
}

.badge {
  display: flex;
  align-items: center;
  justify-content: center;
  min-width: 20px;
  height: 20px;
  padding: 0 6px;
  background: var(--theme-color-primary);
  color: white;
  border-radius: 10px;
  font-size: var(--font-size-xs);
  font-weight: var(--size-font-weight-medium);
}

.dropdown-arrow {
  flex-shrink: 0;
  transition: transform 0.2s ease;
  color: var(--color-text-secondary);
}

.dropdown-arrow.is-open {
  transform: rotate(180deg);
}

.dropdown-menu {
  position: absolute;
  top: calc(100% + var(--size-spacing-xs));
  right: 0;
  z-index: 1000;
  background: var(--color-bg-container);
  border: 1px solid var(--color-border-light);
  border-radius: var(--size-radius-md);
  box-shadow: var(--shadow-lg);
  min-width: 200px;
  overflow: hidden;
}

.dropdown-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: var(--size-spacing-sm) var(--size-spacing-md);
  background: var(--color-bg-component);
  border-bottom: 1px solid var(--color-border-light);
  font-size: var(--font-size-sm);
  font-weight: var(--size-font-weight-medium);
  color: var(--color-text-primary);
}

.count {
  padding: 2px 6px;
  background: var(--theme-color-primary);
  color: white;
  border-radius: var(--size-radius-sm);
  font-size: var(--font-size-xs);
}

.dropdown-options {
  max-height: 300px;
  overflow-y: auto;
}

.dropdown-option {
  display: flex;
  align-items: center;
  gap: var(--size-spacing-xs);
  width: 100%;
  padding: var(--size-spacing-sm) var(--size-spacing-md);
  background: transparent;
  border: none;
  text-align: left;
  font-size: var(--font-size-sm);
  color: var(--color-text-primary);
  cursor: pointer;
  transition: all 0.2s ease;
}

.dropdown-option:hover {
  background: var(--color-bg-component-hover);
}

.dropdown-option.is-active {
  background: var(--theme-color-primary-light, rgba(24, 144, 255, 0.1));
  color: var(--theme-color-primary);
}

.option-icon {
  flex-shrink: 0;
  font-size: var(--font-size-base);
}

.option-label {
  flex: 1;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.option-check {
  flex-shrink: 0;
  color: var(--theme-color-primary);
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



















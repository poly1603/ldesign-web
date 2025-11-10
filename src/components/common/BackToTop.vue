<template>
  <Transition name="back-to-top">
    <button
      v-if="visible"
      class="back-to-top-btn"
      @click="scrollToTop"
      :title="title"
    >
      <ChevronUp :size="20" />
    </button>
  </Transition>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, nextTick } from 'vue'
import { ChevronUp } from 'lucide-vue-next'

interface Props {
  /** 显示阈值（滚动多少像素后显示按钮） */
  threshold?: number
  /** 按钮标题 */
  title?: string
  /** 滚动行为 */
  behavior?: 'smooth' | 'auto'
}

const props = withDefaults(defineProps<Props>(), {
  threshold: 200,
  title: '回到顶部',
  behavior: 'smooth',
})

const visible = ref(false)
let scrollContainer: HTMLElement | Window | null = null

// 查找滚动容器
function findScrollContainer(): HTMLElement | Window {
  // 先尝试查找 .content 容器（SystemLayout 的滚动容器）
  const contentElement = document.querySelector('.content') as HTMLElement
  if (contentElement) {
    return contentElement
  }
  // 如果没有找到，使用 window
  return window
}

// 处理滚动事件
function handleScroll(): void {
  let scrollTop = 0
  
  if (scrollContainer === window) {
    scrollTop = window.pageYOffset || document.documentElement.scrollTop
  } else if (scrollContainer instanceof HTMLElement) {
    scrollTop = scrollContainer.scrollTop
  }
  
  visible.value = scrollTop > props.threshold
}

// 滚动到顶部
function scrollToTop(): void {
  if (scrollContainer === window) {
    window.scrollTo({
      top: 0,
      behavior: props.behavior,
    })
  } else if (scrollContainer instanceof HTMLElement) {
    scrollContainer.scrollTo({
      top: 0,
      behavior: props.behavior,
    })
  }
}

onMounted(async () => {
  await nextTick()
  scrollContainer = findScrollContainer()
  
  if (scrollContainer === window) {
    window.addEventListener('scroll', handleScroll, { passive: true })
  } else if (scrollContainer instanceof HTMLElement) {
    scrollContainer.addEventListener('scroll', handleScroll, { passive: true })
  }
  
  // 初始检查
  handleScroll()
})

onUnmounted(() => {
  if (scrollContainer === window) {
    window.removeEventListener('scroll', handleScroll)
  } else if (scrollContainer instanceof HTMLElement) {
    scrollContainer.removeEventListener('scroll', handleScroll)
  }
})
</script>

<style scoped>
.back-to-top-btn {
  position: fixed;
  bottom: var(--size-spacing-xl);
  right: var(--size-spacing-xl);
  z-index: 999;
  width: 48px;
  height: 48px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--theme-color-primary);
  color: white;
  border: none;
  border-radius: 50%;
  cursor: pointer;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  transition: all 0.3s ease;
}

.back-to-top-btn:hover {
  background: var(--theme-color-primary-hover, rgba(24, 144, 255, 0.9));
  transform: translateY(-2px);
  box-shadow: 0 6px 16px rgba(0, 0, 0, 0.2);
}

.back-to-top-btn:active {
  transform: translateY(0);
}

/* 动画 */
.back-to-top-enter-active,
.back-to-top-leave-active {
  transition: all 0.3s ease;
}

.back-to-top-enter-from {
  opacity: 0;
  transform: translateY(20px) scale(0.8);
}

.back-to-top-leave-to {
  opacity: 0;
  transform: translateY(20px) scale(0.8);
}

/* 响应式 */
@media (max-width: 768px) {
  .back-to-top-btn {
    bottom: var(--size-spacing-lg);
    right: var(--size-spacing-lg);
    width: 44px;
    height: 44px;
  }
}
</style>


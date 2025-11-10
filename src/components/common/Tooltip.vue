<template>
  <div class="tooltip-wrapper" @mouseenter="showTooltip" @mouseleave="hideTooltip">
    <slot />
    <Transition name="tooltip">
      <div
        v-if="visible"
        ref="tooltipRef"
        class="tooltip"
        :class="{
          [`tooltip--${computedPlacement}`]: true,
        }"
        :style="tooltipStyle"
      >
        <div class="tooltip-content">
          {{ content }}
        </div>
        <div class="tooltip-arrow" :style="arrowStyle"></div>
      </div>
    </Transition>
  </div>
</template>

<script setup lang="ts">
import { ref, nextTick, onMounted, onUnmounted } from 'vue'

interface Props {
  content?: string
  placement?: 'top' | 'bottom' | 'left' | 'right'
  delay?: number
}

const props = withDefaults(defineProps<Props>(), {
  placement: 'top',
  delay: 200,
})

const visible = ref(false)
const tooltipRef = ref<HTMLElement | null>(null)
const tooltipStyle = ref<Record<string, string>>({})
const arrowStyle = ref<Record<string, string>>({})
let timer: ReturnType<typeof setTimeout> | null = null

const computedPlacement = ref(props.placement)

function showTooltip(): void {
  if (timer) {
    clearTimeout(timer)
  }
  timer = setTimeout(async () => {
    visible.value = true
    await nextTick()
    adjustTooltipPosition()
  }, props.delay)
}

function hideTooltip(): void {
  if (timer) {
    clearTimeout(timer)
    timer = null
  }
  visible.value = false
  tooltipStyle.value = {}
  arrowStyle.value = {}
}

function adjustTooltipPosition(): void {
  if (!tooltipRef.value) return

  const tooltip = tooltipRef.value
  const wrapper = tooltip.parentElement
  if (!wrapper) return

  const wrapperRect = wrapper.getBoundingClientRect()
  const tooltipRect = tooltip.getBoundingClientRect()
  const viewportWidth = window.innerWidth
  const viewportHeight = window.innerHeight
  const margin = 8 // 距离边缘的最小距离

  let placement = props.placement
  const styles: Record<string, string> = {}

  // 根据触发元素的位置和 tooltip 的大小，计算最佳位置
  const wrapperCenterX = wrapperRect.left + wrapperRect.width / 2
  const wrapperCenterY = wrapperRect.top + wrapperRect.height / 2
  const tooltipWidth = tooltipRect.width
  const tooltipHeight = tooltipRect.height

  // 检查各个方向是否有足够空间
  const spaceTop = wrapperRect.top
  const spaceBottom = viewportHeight - wrapperRect.bottom
  const spaceLeft = wrapperRect.left
  const spaceRight = viewportWidth - wrapperRect.right

  // 根据可用空间和首选位置决定最终位置
  switch (placement) {
    case 'top':
      if (spaceTop < tooltipHeight + margin && spaceBottom > spaceTop) {
        placement = 'bottom'
      }
      break
    case 'bottom':
      if (spaceBottom < tooltipHeight + margin && spaceTop > spaceBottom) {
        placement = 'top'
      }
      break
    case 'left':
      if (spaceLeft < tooltipWidth + margin && spaceRight > spaceLeft) {
        placement = 'right'
      }
      break
    case 'right':
      if (spaceRight < tooltipWidth + margin && spaceLeft > spaceRight) {
        placement = 'left'
      }
      break
  }

  computedPlacement.value = placement

  // 根据最终位置计算偏移量
  // 箭头始终指向触发元素中心，所以箭头位置不变
  // 当 tooltip 需要避免超出屏幕时，调整 tooltip 的位置，箭头也相应调整以保持指向中心
  if (placement === 'top' || placement === 'bottom') {
    // 水平方向：计算 tooltip 的理想位置（箭头指向触发元素中心）
    const idealTooltipLeft = wrapperCenterX - tooltipWidth / 2
    let finalTooltipLeft = idealTooltipLeft
    
    // 检查并调整左边界
    if (idealTooltipLeft < margin) {
      finalTooltipLeft = margin
    }
    // 检查并调整右边界
    else if (idealTooltipLeft + tooltipWidth > viewportWidth - margin) {
      finalTooltipLeft = viewportWidth - margin - tooltipWidth
    }
    
    // 计算 tooltip 的偏移量（相对于理想位置）
    const tooltipOffset = finalTooltipLeft - idealTooltipLeft
    
    // 设置 tooltip 的位置：left: 50% + tooltipOffset
    styles.left = `calc(50% + ${tooltipOffset}px)`
    styles.transform = 'translateX(-50%)'
    
    // 箭头需要反向偏移，以保持指向触发元素中心
    // 箭头在 tooltip 中的位置是 left: 50%，需要偏移 -tooltipOffset 来补偿
    arrowStyle.value = {
      transform: `translateX(calc(-50% - ${tooltipOffset}px))`,
    }
  } else if (placement === 'left' || placement === 'right') {
    // 垂直方向：计算 tooltip 的理想位置（箭头指向触发元素中心）
    const idealTooltipTop = wrapperCenterY - tooltipHeight / 2
    let finalTooltipTop = idealTooltipTop
    
    // 检查并调整上边界
    if (idealTooltipTop < margin) {
      finalTooltipTop = margin
    }
    // 检查并调整下边界
    else if (idealTooltipTop + tooltipHeight > viewportHeight - margin) {
      finalTooltipTop = viewportHeight - margin - tooltipHeight
    }
    
    // 计算 tooltip 的偏移量（相对于理想位置）
    const tooltipOffset = finalTooltipTop - idealTooltipTop
    
    // 设置 tooltip 的位置：top: 50% + tooltipOffset
    styles.top = `calc(50% + ${tooltipOffset}px)`
    styles.transform = 'translateY(-50%)'
    
    // 箭头需要反向偏移，以保持指向触发元素中心
    // 箭头在 tooltip 中的位置是 top: 50%，需要偏移 -tooltipOffset 来补偿
    arrowStyle.value = {
      transform: `translateY(calc(-50% - ${tooltipOffset}px))`,
    }
  }

  tooltipStyle.value = styles
}

function handleResize(): void {
  if (visible.value) {
    adjustTooltipPosition()
  }
}

function handleScroll(): void {
  if (visible.value) {
    adjustTooltipPosition()
  }
}

onMounted(() => {
  window.addEventListener('resize', handleResize)
  window.addEventListener('scroll', handleScroll, true)
})

onUnmounted(() => {
  window.removeEventListener('resize', handleResize)
  window.removeEventListener('scroll', handleScroll, true)
  if (timer) {
    clearTimeout(timer)
  }
})
</script>

<style scoped>
.tooltip-wrapper {
  position: relative;
  display: inline-block;
}

.tooltip {
  position: absolute;
  z-index: 1000;
  pointer-events: none;
}

.tooltip--top {
  bottom: calc(100% + 6px);
  left: 50%;
}

.tooltip--bottom {
  top: calc(100% + 6px);
  left: 50%;
}

.tooltip--left {
  right: calc(100% + 6px);
  top: 50%;
}

.tooltip--right {
  left: calc(100% + 6px);
  top: 50%;
}

.tooltip-content {
  background: rgba(0, 0, 0, 0.9);
  color: white;
  padding: 10px 14px;
  border-radius: 8px;
  font-size: var(--font-size-xs);
  line-height: 1.6;
  white-space: normal;
  word-wrap: break-word;
  word-break: break-word;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.2);
  min-width: 120px;
  max-width: 400px;
  position: relative;
}

.tooltip-arrow {
  position: absolute;
  width: 0;
  height: 0;
  border-style: solid;
}

.tooltip--top .tooltip-arrow {
  top: 100%;
  left: 50%;
  border-width: 6px 6px 0 6px;
  border-color: rgba(0, 0, 0, 0.9) transparent transparent transparent;
}

.tooltip--bottom .tooltip-arrow {
  bottom: 100%;
  left: 50%;
  border-width: 0 6px 6px 6px;
  border-color: transparent transparent rgba(0, 0, 0, 0.9) transparent;
}

.tooltip--left .tooltip-arrow {
  left: 100%;
  top: 50%;
  border-width: 6px 0 6px 6px;
  border-color: transparent transparent transparent rgba(0, 0, 0, 0.9);
}

.tooltip--right .tooltip-arrow {
  right: 100%;
  top: 50%;
  border-width: 6px 6px 6px 0;
  border-color: transparent rgba(0, 0, 0, 0.9) transparent transparent;
}

/* Transition 动画 */
.tooltip-enter-active {
  transition: opacity 0.2s ease-out, transform 0.2s ease-out;
}

.tooltip-leave-active {
  transition: opacity 0.15s ease-in, transform 0.15s ease-in;
}

.tooltip--top.tooltip-enter-from {
  opacity: 0;
  transform: translateX(-50%) translateY(-8px);
}

.tooltip--top.tooltip-enter-to {
  opacity: 1;
  transform: translateX(-50%) translateY(0);
}

.tooltip--top.tooltip-leave-from {
  opacity: 1;
  transform: translateX(-50%) translateY(0);
}

.tooltip--top.tooltip-leave-to {
  opacity: 0;
  transform: translateX(-50%) translateY(-4px);
}

.tooltip--bottom.tooltip-enter-from {
  opacity: 0;
  transform: translateX(-50%) translateY(8px);
}

.tooltip--bottom.tooltip-enter-to {
  opacity: 1;
  transform: translateX(-50%) translateY(0);
}

.tooltip--bottom.tooltip-leave-from {
  opacity: 1;
  transform: translateX(-50%) translateY(0);
}

.tooltip--bottom.tooltip-leave-to {
  opacity: 0;
  transform: translateX(-50%) translateY(4px);
}

.tooltip--left.tooltip-enter-from {
  opacity: 0;
  transform: translateY(-50%) translateX(8px);
}

.tooltip--left.tooltip-enter-to {
  opacity: 1;
  transform: translateY(-50%) translateX(0);
}

.tooltip--left.tooltip-leave-from {
  opacity: 1;
  transform: translateY(-50%) translateX(0);
}

.tooltip--left.tooltip-leave-to {
  opacity: 0;
  transform: translateY(-50%) translateX(4px);
}

.tooltip--right.tooltip-enter-from {
  opacity: 0;
  transform: translateY(-50%) translateX(-8px);
}

.tooltip--right.tooltip-enter-to {
  opacity: 1;
  transform: translateY(-50%) translateX(0);
}

.tooltip--right.tooltip-leave-from {
  opacity: 1;
  transform: translateY(-50%) translateX(0);
}

.tooltip--right.tooltip-leave-to {
  opacity: 0;
  transform: translateY(-50%) translateX(-4px);
}
</style>


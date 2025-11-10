<template>
  <div 
    class="bg-white rounded-lg shadow-soft transition-all duration-300"
    :class="[
      paddingClass,
      hoverClass,
      { 'cursor-pointer': clickable }
    ]"
    @click="handleClick"
  >
    <div v-if="$slots.header || title" class="border-b border-gray-100 pb-4 mb-4">
      <slot name="header">
        <h3 class="text-lg font-semibold text-gray-900">{{ title }}</h3>
      </slot>
    </div>
    
    <div class="card-body">
      <slot></slot>
    </div>
    
    <div v-if="$slots.footer" class="border-t border-gray-100 pt-4 mt-4">
      <slot name="footer"></slot>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'

interface Props {
  title?: string
  padding?: 'none' | 'sm' | 'md' | 'lg'
  hover?: boolean
  clickable?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  padding: 'md',
  hover: false,
  clickable: false,
})

const emit = defineEmits<{
  click: [event: MouseEvent]
}>()

const paddingClass = computed(() => {
  const paddingMap = {
    none: 'p-0',
    sm: 'p-3',
    md: 'p-6',
    lg: 'p-8',
  }
  return paddingMap[props.padding]
})

const hoverClass = computed(() => {
  if (props.hover) {
    return 'hover:shadow-soft-lg hover:-translate-y-0.5'
  }
  return ''
})

function handleClick(event: MouseEvent) {
  if (props.clickable) {
    emit('click', event)
  }
}
</script>














































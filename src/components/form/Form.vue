<template>
  <div class="form-container" :class="{ 'form-container--horizontal': layout === 'horizontal' }">
    <div v-if="title" class="form-title">
      {{ title }}
    </div>
    <div class="form-content" :class="{ 'form-content--horizontal': layout === 'horizontal' }">
      <slot />
    </div>
  </div>
</template>

<script setup lang="ts">
interface Props {
  title?: string
  layout?: 'vertical' | 'horizontal'
}

withDefaults(defineProps<Props>(), {
  layout: 'vertical',
})
</script>

<style scoped>
.form-container {
  display: flex;
  flex-direction: column;
  gap: var(--size-spacing-md);
}

.form-container--horizontal {
  flex-direction: row;
  align-items: flex-start;
}

.form-title {
  font-size: var(--font-size-base);
  font-weight: var(--size-font-weight-semibold);
  color: var(--color-text-primary);
  margin-bottom: var(--size-spacing-xs);
  flex-shrink: 0;
}

.form-container--horizontal .form-title {
  min-width: 120px;
  margin-bottom: 0;
  padding-top: var(--size-spacing-xs);
}

.form-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: var(--size-spacing-sm);
}

.form-content--horizontal {
  flex-direction: row;
  align-items: flex-start;
  flex-wrap: wrap;
  gap: var(--size-spacing-md);
}
</style>
























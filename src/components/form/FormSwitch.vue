<template>
  <div class="form-switch" :class="{ 'form-switch--horizontal': layout === 'horizontal' }">
    <!-- 纵向布局：标签在上，开关在下 -->
    <template v-if="layout === 'vertical'">
      <label class="switch-label switch-label--vertical" @click="handleLabelClick">
        <span class="label-text">
          <span class="label-content">
            <span class="label-main">
              <span v-if="labelZh" class="label-zh">{{ labelZh }}</span>
              <span v-else-if="labelEn" class="label-en">{{ labelEn }}</span>
              <span v-else-if="label">{{ label }}</span>
              <span v-if="required" class="required-mark">*</span>
              <Tooltip v-if="description" :content="description" placement="top">
                <span class="info-icon" @click.stop>ℹ</span>
              </Tooltip>
            </span>
            <span v-if="labelEn && labelZh" class="label-en">{{ labelEn }}</span>
          </span>
        </span>
      </label>
      <div class="switch-wrapper" @click="handleSwitchClick">
        <input
          type="checkbox"
          :checked="modelValue"
          :disabled="disabled"
          class="switch-input"
          @change="handleChange"
        />
        <span class="switch-slider" :class="{ 'is-checked': modelValue }"></span>
      </div>
    </template>
    
    <!-- 横向布局：标签在左，开关在右 -->
    <label v-else class="switch-label switch-label--horizontal">
      <div class="label-content-wrapper">
        <span class="label-text">
          <span class="label-content">
            <span class="label-main">
              <span v-if="labelZh" class="label-zh">{{ labelZh }}</span>
              <span v-else-if="labelEn" class="label-en">{{ labelEn }}</span>
              <span v-else-if="label">{{ label }}</span>
              <span v-if="required" class="required-mark">*</span>
              <Tooltip v-if="description" :content="description" placement="top">
                <span class="info-icon">ℹ</span>
              </Tooltip>
            </span>
            <span v-if="labelEn && labelZh" class="label-en">{{ labelEn }}</span>
          </span>
        </span>
      </div>
      <div class="switch-wrapper">
        <input
          type="checkbox"
          :checked="modelValue"
          :disabled="disabled"
          class="switch-input"
          @change="handleChange"
        />
        <span class="switch-slider" :class="{ 'is-checked': modelValue }"></span>
      </div>
    </label>
    
    <p v-if="error" class="error-message">{{ error }}</p>
    <p v-if="hint && !error" class="hint-message">{{ hint }}</p>
  </div>
</template>

<script setup lang="ts">
import Tooltip from '../common/Tooltip.vue'

interface Props {
  modelValue?: boolean
  label?: string
  labelZh?: string
  labelEn?: string
  description?: string
  hint?: string
  error?: string
  required?: boolean
  disabled?: boolean
  layout?: 'vertical' | 'horizontal'
}

const props = withDefaults(defineProps<Props>(), {
  layout: 'vertical',
})

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
}>()

function handleChange(event: Event): void {
  const checked = (event.target as HTMLInputElement).checked
  emit('update:modelValue', checked)
}

function handleLabelClick(): void {
  if (!props.disabled) {
    emit('update:modelValue', !props.modelValue)
  }
}

function handleSwitchClick(): void {
  if (!props.disabled) {
    emit('update:modelValue', !props.modelValue)
  }
}
</script>

<style scoped>
.form-switch {
  display: flex;
  flex-direction: column;
  gap: var(--size-spacing-xs);
}

.form-switch--horizontal {
  flex-direction: row;
  align-items: flex-start;
  gap: var(--size-spacing-md);
}

.switch-label--vertical {
  display: block;
  margin-bottom: 0;
  cursor: default;
}

.switch-label--vertical .label-text {
  display: flex;
  align-items: center;
  gap: var(--size-spacing-xs);
  line-height: 1.5;
  cursor: pointer;
}

.switch-label--horizontal {
  display: flex;
  flex-direction: row;
  align-items: center;
  justify-content: flex-start;
  gap: var(--size-spacing-md);
  flex: 1;
  min-height: 32px;
  cursor: pointer;
}

.form-switch--horizontal .switch-label {
  flex: 1;
}

.label-content-wrapper {
  flex: 1;
  min-width: 0;
}

.label-text {
  font-size: var(--font-size-sm);
  font-weight: var(--size-font-weight-medium);
  color: var(--color-text-primary);
  display: flex;
  align-items: center;
  gap: var(--size-spacing-xs);
  line-height: 1.5;
}

.label-content {
  display: flex;
  flex-direction: column;
  gap: 2px;
  line-height: 1.4;
}

.label-main {
  display: flex;
  align-items: center;
  gap: var(--size-spacing-xs);
  flex-wrap: wrap;
}

.label-zh {
  font-size: var(--font-size-sm);
  font-weight: var(--size-font-weight-medium);
  color: var(--color-text-primary);
}

.label-en {
  font-size: 11px;
  font-weight: var(--size-font-weight-normal);
  color: var(--color-text-secondary);
  opacity: 0.75;
  font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', 'Consolas', 'source-code-pro', monospace;
}

.switch-wrapper {
  position: relative;
  flex-shrink: 0;
  cursor: pointer;
  align-self: flex-start;
}

.form-switch--horizontal .switch-wrapper {
  margin-top: 0;
}

.switch-input {
  position: absolute;
  opacity: 0;
  width: 0;
  height: 0;
}

.switch-slider {
  display: block;
  width: 44px;
  height: 24px;
  background: var(--color-border-light);
  border-radius: 24px;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  position: relative;
  cursor: pointer;
}

.switch-slider::before {
  content: '';
  position: absolute;
  width: 18px;
  height: 18px;
  left: 3px;
  top: 3px;
  background: white;
  border-radius: 50%;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
}

.switch-slider.is-checked {
  background: var(--theme-color-primary);
}

.switch-slider.is-checked::before {
  transform: translateX(20px);
}

.switch-input:disabled + .switch-slider {
  opacity: 0.5;
  cursor: not-allowed;
}

.label-content {
  flex: 1;
  min-width: 0; /* 允许文本截断 */
}

.label-text {
  font-size: var(--font-size-sm);
  font-weight: var(--size-font-weight-medium);
  color: var(--color-text-primary);
  display: flex;
  align-items: center;
  gap: var(--size-spacing-xs);
  line-height: 1.5;
}

.required-mark {
  color: var(--color-danger-default);
}

.info-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 16px;
  height: 16px;
  border-radius: 50%;
  background: var(--color-border-light);
  color: var(--color-text-secondary);
  font-size: 11px;
  font-weight: normal;
  cursor: help;
  transition: all 0.2s;
}

.info-icon:hover {
  background: var(--theme-color-primary);
  color: white;
}

.error-message {
  font-size: var(--font-size-xs);
  color: var(--color-danger-default);
  margin: 0;
  margin-top: var(--size-spacing-xs);
  display: flex;
  align-items: center;
  gap: var(--size-spacing-xs);
}

.hint-message {
  font-size: var(--font-size-xs);
  color: var(--color-text-secondary);
  margin: 0;
  margin-top: var(--size-spacing-xs);
}

.error-message::before {
  content: '⚠';
  font-size: 12px;
}
</style>




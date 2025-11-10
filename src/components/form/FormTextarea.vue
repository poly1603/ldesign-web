<template>
  <div class="form-textarea" :class="{ 'has-error': error, 'form-textarea--horizontal': layout === 'horizontal' }">
    <label v-if="labelZh || labelEn || label" class="form-label">
      <span class="label-content">
        <span v-if="labelZh" class="label-zh">{{ labelZh }}</span>
        <span v-if="labelEn && labelZh" class="label-en">{{ labelEn }}</span>
        <span v-else-if="labelEn" class="label-en">{{ labelEn }}</span>
        <span v-else-if="label">{{ label }}</span>
        <span v-if="required" class="required-mark">*</span>
      </span>
    </label>
    <div class="textarea-wrapper">
      <textarea
        :value="modelValue"
        :placeholder="placeholder"
        :disabled="disabled"
        :readonly="readonly"
        :rows="rows"
        class="textarea"
        @input="handleInput"
        @blur="handleBlur"
        @focus="handleFocus"
      ></textarea>
      <div class="textarea-footer">
        <p v-if="error" class="error-message">{{ error }}</p>
        <p v-else-if="hint" class="hint-message">{{ hint }}</p>
        <span v-if="showCount" class="char-count">
          {{ (modelValue || '').length }}{{ maxLength ? ` / ${maxLength}` : '' }}
        </span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'

interface Props {
  modelValue?: string
  label?: string
  labelZh?: string
  labelEn?: string
  placeholder?: string
  hint?: string
  error?: string
  required?: boolean
  disabled?: boolean
  readonly?: boolean
  rows?: number
  maxLength?: number
  showCount?: boolean
  layout?: 'vertical' | 'horizontal'
}

const props = withDefaults(defineProps<Props>(), {
  rows: 4,
  showCount: false,
  layout: 'vertical',
})

const emit = defineEmits<{
  'update:modelValue': [value: string]
  'blur': []
  'focus': []
}>()

const isFocused = ref(false)

function handleInput(event: Event): void {
  const target = event.target as HTMLTextAreaElement
  let value = target.value
  if (props.maxLength && value.length > props.maxLength) {
    value = value.slice(0, props.maxLength)
  }
  emit('update:modelValue', value)
}

function handleBlur(): void {
  isFocused.value = false
  emit('blur')
}

function handleFocus(): void {
  isFocused.value = true
  emit('focus')
}
</script>

<style scoped>
.form-textarea {
  display: flex;
  flex-direction: column;
  gap: var(--size-spacing-xs);
}

.form-textarea--horizontal {
  flex-direction: row;
  align-items: flex-start;
  gap: var(--size-spacing-md);
}

.form-label {
  font-size: var(--font-size-sm);
  font-weight: var(--size-font-weight-medium);
  color: var(--color-text-primary);
  display: flex;
  align-items: center;
  gap: var(--size-spacing-xs);
  flex-shrink: 0;
  min-width: 100px;
}

.label-content {
  display: flex;
  flex-direction: column;
  gap: 2px;
  line-height: 1.4;
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

.form-textarea--horizontal .form-label {
  padding-top: var(--size-spacing-sm);
  min-width: 120px;
}

.required-mark {
  color: var(--color-danger-default);
}

.textarea-wrapper {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: var(--size-spacing-xs);
  width: 100%;
  min-width: 0;
}

.textarea {
  width: 100%;
  padding: var(--size-spacing-sm) var(--size-spacing-md);
  background: var(--color-bg-component);
  color: var(--color-text-primary);
  border: 1px solid var(--color-border-light);
  border-radius: var(--size-radius-md);
  font-size: var(--font-size-base);
  font-family: 'Courier New', monospace;
  resize: vertical;
  transition: all 0.2s ease;
  outline: none;
  line-height: 1.5;
}

.textarea:hover:not(:disabled):not(:readonly) {
  border-color: var(--theme-color-primary);
}

.textarea:focus:not(:disabled):not(:readonly) {
  border-color: var(--theme-color-primary);
  box-shadow: 0 0 0 3px rgba(24, 144, 255, 0.1);
}

.textarea:disabled,
.textarea:readonly {
  opacity: 0.6;
  cursor: not-allowed;
  background: var(--color-bg-disabled);
}

.form-textarea.has-error .textarea {
  border-color: var(--color-danger-default);
}

.form-textarea.has-error .textarea:focus {
  box-shadow: 0 0 0 3px rgba(255, 77, 79, 0.1);
}

.textarea-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: var(--size-spacing-sm);
}

.error-message {
  font-size: var(--font-size-xs);
  color: var(--color-danger-default);
  margin: 0;
  display: flex;
  align-items: center;
  gap: var(--size-spacing-xs);
  flex: 1;
}

.hint-message {
  font-size: var(--font-size-xs);
  color: var(--color-text-secondary);
  margin: 0;
  flex: 1;
}

.char-count {
  font-size: var(--font-size-xs);
  color: var(--color-text-secondary);
  font-variant-numeric: tabular-nums;
}

.error-message::before {
  content: '⚠';
  font-size: 12px;
}
</style>




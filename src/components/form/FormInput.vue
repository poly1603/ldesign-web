<template>
  <div class="form-input" :class="{ 'has-error': error, 'form-input--horizontal': layout === 'horizontal' }">
    <label v-if="labelZh || labelEn || label" class="form-label">
      <span class="label-content">
        <span v-if="labelZh" class="label-zh">{{ labelZh }}</span>
        <span v-if="labelEn && labelZh" class="label-en">{{ labelEn }}</span>
        <span v-else-if="labelEn" class="label-en">{{ labelEn }}</span>
        <span v-else-if="label">{{ label }}</span>
        <span v-if="required" class="required-mark">*</span>
      </span>
    </label>
    <div class="input-wrapper">
      <input
        :type="type"
        :value="modelValue"
        :placeholder="placeholder"
        :disabled="disabled"
        :readonly="readonly"
        class="input"
        @input="handleInput"
        @blur="handleBlur"
        @focus="handleFocus"
      />
      <p v-if="error" class="error-message">{{ error }}</p>
      <p v-if="hint && !error" class="hint-message">{{ hint }}</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'

interface Props {
  modelValue?: string | number
  label?: string
  labelZh?: string
  labelEn?: string
  type?: 'text' | 'number' | 'email' | 'password' | 'url'
  placeholder?: string
  hint?: string
  error?: string
  required?: boolean
  disabled?: boolean
  readonly?: boolean
  layout?: 'vertical' | 'horizontal'
}

const props = withDefaults(defineProps<Props>(), {
  type: 'text',
  layout: 'vertical',
})

const emit = defineEmits<{
  'update:modelValue': [value: string | number]
  'blur': []
  'focus': []
}>()

const isFocused = ref(false)

function handleInput(event: Event): void {
  const target = event.target as HTMLInputElement
  emit('update:modelValue', props.type === 'number' ? Number(target.value) : target.value)
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
.form-input {
  display: flex;
  flex-direction: column;
  gap: var(--size-spacing-xs);
}

.form-input--horizontal {
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

.form-input--horizontal .form-label {
  padding-top: var(--size-spacing-sm);
  min-width: 120px;
}

.input-wrapper {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: var(--size-spacing-xs);
  width: 100%;
  min-width: 0;
}

.required-mark {
  color: var(--color-danger-default);
}

.input {
  width: 100%;
  padding: var(--size-spacing-sm) var(--size-spacing-md);
  background: var(--color-bg-component);
  color: var(--color-text-primary);
  border: 1px solid var(--color-border-light);
  border-radius: var(--size-radius-md);
  font-size: var(--font-size-base);
  font-family: inherit;
  transition: all 0.2s ease;
  outline: none;
}

.input:hover:not(:disabled):not(:readonly) {
  border-color: var(--theme-color-primary);
}

.input:focus:not(:disabled):not(:readonly) {
  border-color: var(--theme-color-primary);
  box-shadow: 0 0 0 3px rgba(24, 144, 255, 0.1);
}

.input:disabled,
.input:readonly {
  opacity: 0.6;
  cursor: not-allowed;
  background: var(--color-bg-disabled);
}

.form-input.has-error .input {
  border-color: var(--color-danger-default);
}

.form-input.has-error .input:focus {
  box-shadow: 0 0 0 3px rgba(255, 77, 79, 0.1);
}

.error-message {
  font-size: var(--font-size-xs);
  color: var(--color-danger-default);
  margin: 0;
  display: flex;
  align-items: center;
  gap: var(--size-spacing-xs);
}

.hint-message {
  font-size: var(--font-size-xs);
  color: var(--color-text-secondary);
  margin: 0;
}

.error-message::before {
  content: '⚠';
  font-size: 12px;
}
</style>




<template>
  <div class="input-wrapper">
    <label v-if="label" :for="id" class="input-label">
      {{ label }}
      <span v-if="required" class="input-required">*</span>
    </label>
    <div class="input-container">
      <input
        :id="id"
        :type="type"
        :value="modelValue"
        :placeholder="placeholder"
        :disabled="disabled"
        :readonly="readonly"
        :class="inputClasses"
        @input="handleInput"
        @blur="handleBlur"
        @focus="handleFocus"
      />
      <div v-if="$slots.suffix" class="input-suffix">
        <slot name="suffix"></slot>
      </div>
    </div>
    <p v-if="error" class="input-error">{{ error }}</p>
    <p v-else-if="hint" class="input-hint">{{ hint }}</p>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'

interface Props {
  id?: string
  modelValue?: string | number
  type?: 'text' | 'password' | 'email' | 'number' | 'tel' | 'url'
  label?: string
  placeholder?: string
  disabled?: boolean
  readonly?: boolean
  required?: boolean
  error?: string
  hint?: string
}

const props = withDefaults(defineProps<Props>(), {
  type: 'text',
  disabled: false,
  readonly: false,
  required: false,
})

const emit = defineEmits<{
  'update:modelValue': [value: string | number]
  blur: [event: FocusEvent]
  focus: [event: FocusEvent]
}>()

const inputClasses = computed(() => {
  const classes = ['input-field']
  
  if (props.error) {
    classes.push('input-field--error')
  }
  
  if (props.disabled || props.readonly) {
    classes.push('input-field--disabled')
  }
  
  return classes.join(' ')
})

function handleInput(event: Event) {
  const target = event.target as HTMLInputElement
  const value = props.type === 'number' ? Number(target.value) : target.value
  emit('update:modelValue', value)
}

function handleBlur(event: FocusEvent) {
  emit('blur', event)
}

function handleFocus(event: FocusEvent) {
  emit('focus', event)
}
</script>

<style scoped>
.input-wrapper {
  width: 100%;
}

.input-label {
  display: block;
  font-size: var(--font-size-sm, 14px);
  font-weight: var(--size-font-weight-medium, 500);
  color: var(--color-text-primary, #1f2937);
  margin-bottom: var(--size-spacing-xs, 8px);
}

.input-required {
  color: var(--color-danger-default, #ef4444);
  margin-left: 2px;
}

.input-container {
  position: relative;
}

.input-field {
  display: block;
  width: 100%;
  padding: var(--size-spacing-sm, 12px) var(--size-spacing-md, 16px);
  font-size: var(--font-size-base, 14px);
  color: var(--color-text-primary, #1f2937);
  background: var(--color-bg-container, #ffffff);
  border: 1px solid var(--color-border-light, #e5e7eb);
  border-radius: var(--size-radius-md, 8px);
  transition: all 0.2s ease;
  outline: none;
}

.input-field::placeholder {
  color: var(--color-text-tertiary, #9ca3af);
}

.input-field:focus {
  border-color: var(--theme-color-primary, #3b82f6);
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
}

.input-field--error {
  border-color: var(--color-danger-default, #ef4444);
}

.input-field--error:focus {
  border-color: var(--color-danger-default, #ef4444);
  box-shadow: 0 0 0 3px rgba(239, 68, 68, 0.1);
}

.input-field--disabled {
  background: var(--color-bg-component, #f3f4f6);
  color: var(--color-text-disabled, #9ca3af);
  cursor: not-allowed;
}

.input-suffix {
  position: absolute;
  top: 50%;
  right: var(--size-spacing-md, 16px);
  transform: translateY(-50%);
  pointer-events: none;
}

.input-error {
  margin-top: var(--size-spacing-xs, 8px);
  font-size: var(--font-size-sm, 14px);
  color: var(--color-danger-default, #ef4444);
}

.input-hint {
  margin-top: var(--size-spacing-xs, 8px);
  font-size: var(--font-size-sm, 14px);
  color: var(--color-text-secondary, #6b7280);
}
</style>




































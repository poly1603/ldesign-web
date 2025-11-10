<template>
  <div class="form-author" :class="{ 'has-error': error, 'form-author--horizontal': layout === 'horizontal' }">
    <label v-if="labelZh || labelEn || label" class="form-label">
      <span class="label-content">
        <span v-if="labelZh" class="label-zh">{{ labelZh }}</span>
        <span v-if="labelEn && labelZh" class="label-en">{{ labelEn }}</span>
        <span v-else-if="labelEn" class="label-en">{{ labelEn }}</span>
        <span v-else-if="label">{{ label }}</span>
        <span v-if="required" class="required-mark">*</span>
      </span>
    </label>
    <div class="author-container">
      <div class="author-fields">
        <div class="author-field">
          <label class="field-label">作者名</label>
          <input
            type="text"
            :value="authorName"
            placeholder="输入作者名"
            class="author-input"
            @input="handleNameChange(($event.target as HTMLInputElement).value)"
          />
        </div>
        <div class="author-field">
          <label class="field-label">邮箱</label>
          <input
            type="email"
            :value="authorEmail"
            placeholder="输入邮箱"
            class="author-input"
            @input="handleEmailChange(($event.target as HTMLInputElement).value)"
          />
        </div>
      </div>
    </div>
    <p v-if="error" class="error-message">{{ error }}</p>
    <p v-if="hint && !error" class="hint-message">{{ hint }}</p>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'

interface Props {
  modelValue?: string | { name: string; email?: string; url?: string }
  label?: string
  labelZh?: string
  labelEn?: string
  hint?: string
  error?: string
  required?: boolean
  disabled?: boolean
  layout?: 'vertical' | 'horizontal'
}

const props = withDefaults(defineProps<Props>(), {
  modelValue: undefined,
  layout: 'vertical',
})

const emit = defineEmits<{
  'update:modelValue': [value: string | { name: string; email?: string; url?: string } | undefined]
}>()

// 解析作者信息
const authorInfo = computed(() => {
  if (!props.modelValue) {
    return { name: '', email: '' }
  }
  
  if (typeof props.modelValue === 'string') {
    // 解析字符串格式: "John Doe <john@example.com>"
    const match = props.modelValue.match(/^(.+?)(?:\s*<(.+?)>)?$/)
    if (match) {
      return {
        name: match[1].trim(),
        email: match[2]?.trim() || '',
      }
    }
    return { name: props.modelValue, email: '' }
  }
  
  // 对象格式
  return {
    name: props.modelValue.name || '',
    email: props.modelValue.email || '',
  }
})

const authorName = computed(() => authorInfo.value.name)
const authorEmail = computed(() => authorInfo.value.email)

// 处理名称变化
function handleNameChange(name: string): void {
  const email = authorEmail.value
  emitValue(name, email)
}

// 处理邮箱变化
function handleEmailChange(email: string): void {
  const name = authorName.value
  emitValue(name, email)
}

// 发送更新值
function emitValue(name: string, email: string): void {
  if (!name.trim() && !email.trim()) {
    emit('update:modelValue', undefined)
    return
  }
  
  // 如果有邮箱，使用对象格式；否则使用字符串格式
  if (email.trim()) {
    emit('update:modelValue', {
      name: name.trim(),
      email: email.trim(),
    })
  } else {
    emit('update:modelValue', name.trim())
  }
}
</script>

<style scoped>
.form-author {
  display: flex;
  flex-direction: column;
  gap: var(--size-spacing-xs);
}

.form-author--horizontal {
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

.form-author--horizontal .form-label {
  padding-top: var(--size-spacing-sm);
  min-width: 120px;
}

.author-container {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: var(--size-spacing-sm);
  width: 100%;
  min-width: 0;
}

.author-fields {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: var(--size-spacing-md);
}

.author-field {
  display: flex;
  flex-direction: column;
  gap: var(--size-spacing-xs);
}

.field-label {
  font-size: var(--font-size-xs);
  font-weight: var(--size-font-weight-medium);
  color: var(--color-text-secondary);
}

.author-input {
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

.author-input:hover:not(:disabled) {
  border-color: var(--theme-color-primary);
}

.author-input:focus:not(:disabled) {
  border-color: var(--theme-color-primary);
  box-shadow: 0 0 0 3px rgba(24, 144, 255, 0.1);
}

.form-author.has-error .author-input {
  border-color: var(--color-danger-default);
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

.required-mark {
  color: var(--color-danger-default);
  margin-left: 4px;
}

@media (max-width: 768px) {
  .author-fields {
    grid-template-columns: 1fr;
  }
}
</style>




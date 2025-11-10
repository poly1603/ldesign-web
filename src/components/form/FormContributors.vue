<template>
  <div class="form-contributors" :class="{ 'has-error': error, 'form-contributors--horizontal': layout === 'horizontal' }">
    <label v-if="labelZh || labelEn || label" class="form-label">
      <span class="label-content">
        <span v-if="labelZh" class="label-zh">{{ labelZh }}</span>
        <span v-if="labelEn && labelZh" class="label-en">{{ labelEn }}</span>
        <span v-else-if="labelEn" class="label-en">{{ labelEn }}</span>
        <span v-else-if="label">{{ label }}</span>
        <span v-if="required" class="required-mark">*</span>
      </span>
    </label>
    <div class="contributors-container">
      <div v-if="contributors.length > 0" class="contributors-list">
        <div
          v-for="(contributor, index) in contributors"
          :key="index"
          class="contributor-item"
        >
          <div class="contributor-fields">
            <div class="contributor-field">
              <input
                type="text"
                :value="contributor.name"
                placeholder="贡献者名"
                class="contributor-input"
                @input="handleNameChange(index, ($event.target as HTMLInputElement).value)"
              />
            </div>
            <div class="contributor-field">
              <input
                type="email"
                :value="contributor.email"
                placeholder="邮箱"
                class="contributor-input"
                @input="handleEmailChange(index, ($event.target as HTMLInputElement).value)"
              />
            </div>
          </div>
          <button
            type="button"
            class="remove-btn"
            @click="removeContributor(index)"
            :disabled="disabled"
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path
                d="M4 4L12 12M12 4L4 12"
                stroke="currentColor"
                stroke-width="1.5"
                stroke-linecap="round"
              />
            </svg>
          </button>
        </div>
      </div>
      <button
        type="button"
        class="add-btn"
        @click="addContributor"
        :disabled="disabled"
      >
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
          <path
            d="M8 4V12M4 8H12"
            stroke="currentColor"
            stroke-width="1.5"
            stroke-linecap="round"
          />
        </svg>
        <span>添加项</span>
      </button>
    </div>
    <p v-if="error" class="error-message">{{ error }}</p>
    <p v-if="hint && !error" class="hint-message">{{ hint }}</p>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'

interface Props {
  modelValue?: Array<string | { name: string; email?: string; url?: string }>
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
  modelValue: () => [],
  layout: 'vertical',
})

const emit = defineEmits<{
  'update:modelValue': [value: Array<string | { name: string; email?: string; url?: string }> | undefined]
}>()

// 本地贡献者列表（包括临时空项）
const localContributors = ref<Array<{ name: string; email: string }>>([])

// 解析贡献者列表
const parseContributors = (value: Array<string | { name: string; email?: string; url?: string }>): Array<{ name: string; email: string }> => {
  if (!Array.isArray(value)) {
    return []
  }
  
  return value.map((item) => {
    if (typeof item === 'string') {
      // 解析字符串格式: "John Doe <john@example.com>"
      const match = item.match(/^(.+?)(?:\s*<(.+?)>)?$/)
      if (match) {
        return {
          name: match[1].trim(),
          email: match[2]?.trim() || '',
        }
      }
      return { name: item, email: '' }
    }
    
    // 对象格式
    return {
      name: item.name || '',
      email: item.email || '',
    }
  })
}

// 显示的贡献者列表（使用本地状态）
const contributors = computed(() => {
  return localContributors.value
})

// 同步 modelValue 到本地状态
function syncFromModelValue(): void {
  const parsed = parseContributors(props.modelValue || [])
  // 检查是否有临时项（空名称和空邮箱）
  const hasTempEntries = localContributors.value.some(c => !c.name.trim() && !c.email.trim())
  
  if (!hasTempEntries) {
    // 没有临时项，完全同步
    localContributors.value = parsed
  } else {
    // 有临时项，只更新已存在的项，保留临时项
    const existingNames = new Set(parsed.map(c => c.name.trim()).filter(n => n))
    localContributors.value = localContributors.value.map(local => {
      if (local.name.trim() && existingNames.has(local.name.trim())) {
        const found = parsed.find(p => p.name.trim() === local.name.trim())
        return found || local
      }
      return local
    })
    // 添加新的项（如果存在）
    parsed.forEach(parsedItem => {
      if (parsedItem.name.trim() && !localContributors.value.some(l => l.name.trim() === parsedItem.name.trim())) {
        localContributors.value.push(parsedItem)
      }
    })
  }
}

// 监听 modelValue 变化
watch(() => props.modelValue, () => {
  // 检查是否有临时项（空名称和空邮箱）
  const hasTempEntries = localContributors.value.some(c => !c.name.trim() && !c.email.trim())
  if (hasTempEntries) {
    // 有临时项时，不执行同步，保留临时项
    return
  }
  syncFromModelValue()
}, { immediate: true, deep: true })

// 处理名称变化
function handleNameChange(index: number, name: string): void {
  localContributors.value[index].name = name
  emitContributors()
}

// 处理邮箱变化
function handleEmailChange(index: number, email: string): void {
  localContributors.value[index].email = email
  emitContributors()
}

// 发送更新值
function emitContributors(): void {
  // 过滤掉空项（名称和邮箱都为空）
  const validContributors = localContributors.value.filter(c => c.name.trim() || c.email.trim())
  
  const result = validContributors.map((c) => {
    if (c.email.trim()) {
      return {
        name: c.name.trim(),
        email: c.email.trim(),
      }
    }
    return c.name.trim()
  })
  
  emit('update:modelValue', result.length > 0 ? result : undefined)
}

// 添加贡献者
function addContributor(): void {
  // 直接添加到本地状态
  localContributors.value.push({ name: '', email: '' })
  // 不立即调用 emitContributors，因为名称和邮箱都为空，会被过滤掉
}

// 删除贡献者
function removeContributor(index: number): void {
  localContributors.value.splice(index, 1)
  emitContributors()
}
</script>

<style scoped>
.form-contributors {
  display: flex;
  flex-direction: column;
  gap: var(--size-spacing-xs);
}

.form-contributors--horizontal {
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

.form-contributors--horizontal .form-label {
  padding-top: var(--size-spacing-sm);
  min-width: 120px;
}

.contributors-container {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: var(--size-spacing-sm);
  width: 100%;
  min-width: 0;
}

.contributors-list {
  display: flex;
  flex-direction: column;
  gap: var(--size-spacing-xs);
}

.contributor-item {
  display: flex;
  gap: var(--size-spacing-xs);
  align-items: flex-start;
  padding: var(--size-spacing-sm);
  background: var(--color-bg-component);
  border: 1px solid var(--color-border-light);
  border-radius: var(--size-radius-md);
  transition: all 0.2s ease;
}

.contributor-item:hover {
  border-color: var(--theme-color-primary);
  box-shadow: 0 0 0 2px rgba(24, 144, 255, 0.05);
}

.contributor-fields {
  flex: 1;
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: var(--size-spacing-md);
}

.contributor-field {
  display: flex;
  flex-direction: column;
}

.contributor-input {
  width: 100%;
  padding: var(--size-spacing-sm) var(--size-spacing-md);
  background: var(--color-bg-container);
  color: var(--color-text-primary);
  border: 1px solid var(--color-border-light);
  border-radius: var(--size-radius-sm);
  font-size: var(--font-size-base);
  font-family: inherit;
  transition: all 0.2s ease;
  outline: none;
}

.contributor-input:hover:not(:disabled) {
  border-color: var(--theme-color-primary);
}

.contributor-input:focus:not(:disabled) {
  border-color: var(--theme-color-primary);
  box-shadow: 0 0 0 2px rgba(24, 144, 255, 0.1);
}

.remove-btn {
  width: 32px;
  height: 32px;
  padding: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--color-danger-light);
  color: var(--color-danger-default);
  border: 1px solid var(--color-danger-default);
  border-radius: var(--size-radius-sm);
  cursor: pointer;
  transition: all 0.2s ease;
  flex-shrink: 0;
  margin-top: 0;
}

.remove-btn:hover:not(:disabled) {
  background: var(--color-danger-default);
  color: white;
  transform: scale(1.05);
}

.remove-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.add-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: var(--size-spacing-xs);
  padding: var(--size-spacing-sm) var(--size-spacing-md);
  background: var(--color-bg-component);
  color: var(--color-text-primary);
  border: 1px dashed var(--color-border-light);
  border-radius: var(--size-radius-md);
  font-size: var(--font-size-sm);
  cursor: pointer;
  transition: all 0.2s ease;
}

.add-btn:hover:not(:disabled) {
  border-color: var(--theme-color-primary);
  color: var(--theme-color-primary);
  background: rgba(24, 144, 255, 0.05);
}

.add-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.form-contributors.has-error .contributor-input {
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
  .contributor-fields {
    grid-template-columns: 1fr;
  }
  
  .contributor-item {
    flex-direction: column;
  }
  
  .remove-btn {
    align-self: flex-end;
  }
}
</style>



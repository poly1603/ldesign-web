<template>
  <div class="form-array" :class="{ 'has-error': error, 'form-array--horizontal': layout === 'horizontal', 'form-array--keywords': isKeywords }">
    <label v-if="labelZh || labelEn || label" class="form-label">
      <span class="label-content">
        <span v-if="labelZh" class="label-zh">{{ labelZh }}</span>
        <span v-if="labelEn && labelZh" class="label-en">{{ labelEn }}</span>
        <span v-else-if="labelEn" class="label-en">{{ labelEn }}</span>
        <span v-else-if="label">{{ label }}</span>
        <span v-if="required" class="required-mark">*</span>
      </span>
    </label>
    <div class="array-container" :class="{ 'array-container--keywords': isKeywords }">
      <div v-if="arrayValue.length > 0 || isKeywords" class="array-items">
        <div
          v-for="(item, index) in arrayValue"
          :key="index"
          class="array-item"
        >
          <!-- 如果有固定选项，显示下拉框 -->
          <select
            v-if="arrayOptions && arrayOptions.length > 0"
            :value="item"
            class="array-select"
            @change="handleItemChange(index, ($event.target as HTMLSelectElement).value)"
          >
            <option :value="item">{{ item }}</option>
            <option
              v-for="option in arrayOptions"
              :key="option"
              :value="option"
              :disabled="arrayValue.includes(option) && arrayValue[index] !== option"
            >
              {{ option }}
            </option>
          </select>
          <!-- 否则显示输入框 -->
          <input
            v-else
            type="text"
            :value="item"
            :placeholder="itemPlaceholder"
            class="array-input"
            @input="handleItemChange(index, ($event.target as HTMLInputElement).value)"
          />
          <button
            type="button"
            class="remove-btn"
            @click="removeItem(index)"
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
      <!-- 如果有固定选项，显示下拉选择 -->
      <div v-if="arrayOptions && arrayOptions.length > 0" class="add-select-wrapper">
        <select
          v-model="selectedOption"
          class="add-select"
          :disabled="disabled || availableOptions.length === 0"
        >
          <option value="">选择要添加的项</option>
          <option
            v-for="option in availableOptions"
            :key="option"
            :value="option"
          >
            {{ option }}
          </option>
        </select>
        <button
          type="button"
          class="add-btn"
          @click="addSelectedItem"
          :disabled="disabled || !selectedOption || availableOptions.length === 0"
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path
              d="M8 4V12M4 8H12"
              stroke="currentColor"
              stroke-width="1.5"
              stroke-linecap="round"
            />
          </svg>
          <span>添加</span>
        </button>
      </div>
      <!-- 否则显示添加按钮 -->
      <div v-else class="add-item-wrapper" :class="{ 'add-item-wrapper--inline': isKeywords }">
        <button
          type="button"
          class="add-btn"
          :class="{ 'add-btn--inline': isKeywords }"
          @click="addItem"
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
    </div>
    <p v-if="error" class="error-message">{{ error }}</p>
    <p v-if="hint && !error" class="hint-message">{{ hint }}</p>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'

interface Props {
  modelValue?: (string | number)[]
  label?: string
  labelZh?: string
  labelEn?: string
  itemPlaceholder?: string
  hint?: string
  error?: string
  required?: boolean
  disabled?: boolean
  layout?: 'vertical' | 'horizontal'
  arrayOptions?: string[]
  isKeywords?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  modelValue: () => [],
  itemPlaceholder: '输入值',
  layout: 'vertical',
  arrayOptions: undefined,
  isKeywords: false,
})

const emit = defineEmits<{
  'update:modelValue': [value: (string | number)[] | undefined]
}>()

const selectedOption = ref('')

const arrayValue = computed(() => {
  if (!Array.isArray(props.modelValue)) {
    return []
  }
  return [...props.modelValue]
})

// 计算可用的选项（排除已选择的项）
const availableOptions = computed(() => {
  if (!props.arrayOptions || props.arrayOptions.length === 0) {
    return []
  }
  return props.arrayOptions.filter(option => !arrayValue.value.includes(option))
})

function handleItemChange(index: number, value: string): void {
  const newArray = [...arrayValue.value]
  newArray[index] = value
  // 保留空数组，不要 emit undefined
  // 空数组是有意义的配置值（表示清空所有项）
  emit('update:modelValue', newArray)
}

function addItem(): void {
  const newArray = [...arrayValue.value, '']
  emit('update:modelValue', newArray)
}

function addSelectedItem(): void {
  if (selectedOption.value && !arrayValue.value.includes(selectedOption.value)) {
    const newArray = [...arrayValue.value, selectedOption.value]
    emit('update:modelValue', newArray)
    selectedOption.value = ''
  }
}

function removeItem(index: number): void {
  const newArray = arrayValue.value.filter((_, i) => i !== index)
  // 保留空数组，不要 emit undefined
  emit('update:modelValue', newArray)
}
</script>

<style scoped>
.form-array {
  display: flex;
  flex-direction: column;
  gap: var(--size-spacing-xs);
}

.form-array--horizontal {
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

.form-array--horizontal .form-label {
  padding-top: var(--size-spacing-sm);
  min-width: 120px;
}

.array-container {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: var(--size-spacing-sm);
  width: 100%;
  min-width: 0;
}

.array-container--keywords {
  flex-direction: row;
  flex-wrap: wrap;
  align-items: center;
  gap: var(--size-spacing-xs);
}

.array-items {
  display: flex;
  flex-direction: column;
  gap: var(--size-spacing-xs);
}

.form-array--keywords .array-items {
  display: flex;
  flex-direction: row;
  flex-wrap: wrap;
  gap: var(--size-spacing-xs);
}

.array-item {
  display: flex;
  gap: var(--size-spacing-xs);
  align-items: center;
}

.form-array--keywords .array-item {
  flex: 0 0 auto;
}

.array-input {
  flex: 1;
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

.form-array--keywords .array-input {
  min-width: 120px;
  flex: 0 0 auto;
}

.array-input:hover:not(:disabled) {
  border-color: var(--theme-color-primary);
}

.array-input:focus:not(:disabled) {
  border-color: var(--theme-color-primary);
  box-shadow: 0 0 0 3px rgba(24, 144, 255, 0.1);
}

.array-select {
  flex: 1;
  padding: var(--size-spacing-sm) var(--size-spacing-md);
  background: var(--color-bg-component);
  color: var(--color-text-primary);
  border: 1px solid var(--color-border-light);
  border-radius: var(--size-radius-md);
  font-size: var(--font-size-base);
  font-family: inherit;
  cursor: pointer;
  transition: all 0.2s ease;
  outline: none;
  appearance: none;
  background-image: url("data:image/svg+xml,%3Csvg width='12' height='12' viewBox='0 0 12 12' fill='none' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M2 4L6 8L10 4' stroke='currentColor' stroke-width='1.5' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E");
  background-repeat: no-repeat;
  background-position: right var(--size-spacing-sm) center;
  padding-right: calc(var(--size-spacing-md) + 20px);
}

.array-select:hover:not(:disabled) {
  border-color: var(--theme-color-primary);
}

.array-select:focus:not(:disabled) {
  border-color: var(--theme-color-primary);
  box-shadow: 0 0 0 3px rgba(24, 144, 255, 0.1);
}

.array-select:disabled {
  opacity: 0.6;
  cursor: not-allowed;
  background: var(--color-bg-disabled);
}

.add-select-wrapper {
  display: flex;
  gap: var(--size-spacing-xs);
  align-items: center;
}

.add-select {
  flex: 1;
  padding: var(--size-spacing-sm) var(--size-spacing-md);
  background: var(--color-bg-component);
  color: var(--color-text-primary);
  border: 1px solid var(--color-border-light);
  border-radius: var(--size-radius-md);
  font-size: var(--font-size-sm);
  font-family: inherit;
  cursor: pointer;
  transition: all 0.2s ease;
  outline: none;
  appearance: none;
  background-image: url("data:image/svg+xml,%3Csvg width='12' height='12' viewBox='0 0 12 12' fill='none' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M2 4L6 8L10 4' stroke='currentColor' stroke-width='1.5' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E");
  background-repeat: no-repeat;
  background-position: right var(--size-spacing-sm) center;
  padding-right: calc(var(--size-spacing-md) + 20px);
}

.add-select:hover:not(:disabled) {
  border-color: var(--theme-color-primary);
}

.add-select:focus:not(:disabled) {
  border-color: var(--theme-color-primary);
  box-shadow: 0 0 0 3px rgba(24, 144, 255, 0.1);
}

.add-select:disabled {
  opacity: 0.6;
  cursor: not-allowed;
  background: var(--color-bg-disabled);
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
  border-radius: var(--size-radius-md);
  cursor: pointer;
  transition: all 0.2s ease;
  flex-shrink: 0;
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

.add-item-wrapper {
  display: flex;
}

.add-item-wrapper--inline {
  display: inline-flex;
  margin-left: var(--size-spacing-xs);
}

.add-btn {
  display: flex;
  align-items: center;
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

.add-btn--inline {
  padding: var(--size-spacing-sm) var(--size-spacing-md);
  height: 32px;
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

.form-array.has-error .array-select,
.form-array.has-error .add-select {
  border-color: var(--color-danger-default);
}

.form-array.has-error .array-input {
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
</style>




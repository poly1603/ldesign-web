<template>
  <div class="form-object" :class="{ 'has-error': error, 'form-object--horizontal': layout === 'horizontal' }">
    <label v-if="labelZh || labelEn || label" class="form-label">
      <span class="label-content">
        <span v-if="labelZh" class="label-zh">{{ labelZh }}</span>
        <span v-if="labelEn && labelZh" class="label-en">{{ labelEn }}</span>
        <span v-else-if="labelEn" class="label-en">{{ labelEn }}</span>
        <span v-else-if="label">{{ label }}</span>
        <span v-if="required" class="required-mark">*</span>
      </span>
      <!-- 视图切换按钮 -->
      <div class="view-toggle">
        <button
          type="button"
          class="toggle-btn"
          :class="{ active: viewMode === 'form' }"
          @click="viewMode = 'form'"
          title="表单视图"
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <rect x="2" y="3" width="12" height="2" rx="1" fill="currentColor"/>
            <rect x="2" y="7" width="12" height="2" rx="1" fill="currentColor"/>
            <rect x="2" y="11" width="12" height="2" rx="1" fill="currentColor"/>
          </svg>
        </button>
        <button
          type="button"
          class="toggle-btn"
          :class="{ active: viewMode === 'json' }"
          @click="viewMode = 'json'"
          title="JSON 视图"
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path d="M4 4L8 8L4 12M12 4L8 8L12 12" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
          </svg>
        </button>
      </div>
    </label>

    <!-- 表单视图 -->
    <div v-if="viewMode === 'form'" class="object-container">
      <div v-if="objectEntries.length > 0" class="object-entries">
        <div
          v-for="(entry, index) in objectEntries"
          :key="index"
          class="object-entry"
        >
          <input
            type="text"
            :value="entry.key"
            placeholder="键名"
            class="key-input"
            @input="handleKeyChange(index, ($event.target as HTMLInputElement).value)"
          />
          <span class="separator">:</span>
          <!-- 根据值类型显示不同的输入控件 -->
          <input
            v-if="getValueType(entry.value) === 'string'"
            type="text"
            :value="entry.value"
            placeholder="值"
            class="value-input"
            @input="handleValueChange(index, ($event.target as HTMLInputElement).value)"
          />
          <input
            v-else-if="getValueType(entry.value) === 'number'"
            type="number"
            :value="entry.value"
            placeholder="数值"
            class="value-input"
            @input="handleNumberChange(index, ($event.target as HTMLInputElement).value)"
          />
          <div v-else-if="getValueType(entry.value) === 'boolean'" class="boolean-input">
            <button
              type="button"
              class="boolean-btn"
              :class="{ active: entry.value === true }"
              @click="handleValueChange(index, true)"
            >
              是
            </button>
            <button
              type="button"
              class="boolean-btn"
              :class="{ active: entry.value === false }"
              @click="handleValueChange(index, false)"
            >
              否
            </button>
          </div>
          <textarea
            v-else-if="getValueType(entry.value) === 'object'"
            :value="formatObjectValue(entry.value)"
            placeholder="对象 (JSON)"
            rows="3"
            class="value-textarea"
            @input="handleObjectValueChange(index, ($event.target as HTMLTextAreaElement).value)"
          />
          <button
            type="button"
            class="remove-btn"
            @click="removeEntry(index)"
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
        @click="addEntry"
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

    <!-- JSON 视图 -->
    <div v-else class="json-container">
      <textarea
        :value="jsonValue"
        :placeholder="placeholder || '{}'"
        rows="6"
        class="json-textarea"
        @input="handleJsonChange(($event.target as HTMLTextAreaElement).value)"
      />
    </div>

    <p v-if="error" class="error-message">{{ error }}</p>
    <p v-if="hint && !error" class="hint-message">{{ hint }}</p>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'

interface Props {
  modelValue?: Record<string, any>
  label?: string
  labelZh?: string
  labelEn?: string
  placeholder?: string
  hint?: string
  error?: string
  required?: boolean
  disabled?: boolean
  layout?: 'vertical' | 'horizontal'
}

const props = withDefaults(defineProps<Props>(), {
  modelValue: () => ({}),
  placeholder: '{}',
  layout: 'vertical',
})

const emit = defineEmits<{
  'update:modelValue': [value: Record<string, any> | undefined]
}>()

const viewMode = ref<'form' | 'json'>('form')

// 本地条目列表（包括临时空键名的项）
const localEntries = ref<Array<{ key: string; value: any }>>([])

// 将对象转换为键值对数组
const objectEntries = computed(() => {
  // 始终使用本地条目（包括临时项）
  return localEntries.value
})

// 初始化本地条目
function initializeEntries(): void {
  const obj = props.modelValue || {}
  localEntries.value = Object.entries(obj).map(([key, value]) => ({ key, value }))
}

// 同步 modelValue 到本地条目
function syncEntriesFromModelValue(): void {
  if (viewMode.value === 'json') {
    return // JSON 视图不需要同步
  }
  
  const obj = props.modelValue || {}
  const currentEntries = Object.entries(obj).map(([key, value]) => ({ key, value }))
  
  // 检查是否有临时项（空键名）
  const hasTempEntries = localEntries.value.some(e => !e.key.trim())
  
  // 如果有临时项，保留临时项，只更新已存在的键值对
  if (hasTempEntries) {
    // 有临时项，只更新已存在的键名对应的值，保留临时项
    const existingKeys = new Set(currentEntries.map(e => e.key))
    localEntries.value = localEntries.value.map(entry => {
      if (entry.key.trim() && existingKeys.has(entry.key)) {
        const found = currentEntries.find(e => e.key === entry.key)
        return found || entry
      }
      return entry
    })
    // 添加新的键值对（如果存在）
    currentEntries.forEach(entry => {
      if (!localEntries.value.some(e => e.key === entry.key)) {
        localEntries.value.push(entry)
      }
    })
    return // 有临时项时，不继续执行下面的逻辑
  }
  
  // 没有临时项，直接同步（确保默认值能正确显示）
  localEntries.value = currentEntries
}

// 监听 modelValue 变化，同步到本地条目（但保留临时项）
watch(() => props.modelValue, (newValue, oldValue) => {
  // 检查是否有临时项（空键名）
  const hasTempEntries = localEntries.value.some(e => !e.key.trim())
  
  // 如果有临时项，不执行同步，保留临时项
  if (hasTempEntries) {
    return
  }
  
  // 初始化时（oldValue 为 undefined），强制同步
  if (oldValue === undefined) {
    syncEntriesFromModelValue()
    return
  }
  
  // 检查值是否真的变化了（避免不必要的同步）
  if (JSON.stringify(newValue) === JSON.stringify(oldValue)) {
    return
  }
  
  syncEntriesFromModelValue()
}, { immediate: true, deep: true })

// 监听视图模式切换
watch(viewMode, (newMode) => {
  if (newMode === 'form') {
    // 切换到表单视图时，重新同步条目
    syncEntriesFromModelValue()
  }
})

// JSON 字符串值
const jsonValue = computed({
  get: () => {
    if (!props.modelValue || Object.keys(props.modelValue).length === 0) {
      return ''
    }
    try {
      return JSON.stringify(props.modelValue, null, 2)
    } catch {
      return String(props.modelValue)
    }
  },
  set: (val) => {
    if (!val || !val.trim()) {
      emit('update:modelValue', undefined)
      return
    }
    try {
      const parsed = JSON.parse(val)
      if (typeof parsed === 'object' && parsed !== null && !Array.isArray(parsed)) {
        emit('update:modelValue', parsed)
      }
    } catch {
      // JSON 解析失败，不更新
    }
  },
})

// 监听 modelValue 变化，如果从外部更新，切换到表单视图
watch(() => props.modelValue, () => {
  if (viewMode.value === 'json') {
    // JSON 视图会自动更新，不需要切换
  }
}, { deep: true })

// 获取值的类型
function getValueType(value: any): 'string' | 'number' | 'boolean' | 'object' | 'array' {
  if (value === null || value === undefined) {
    return 'string'
  }
  if (typeof value === 'boolean') {
    return 'boolean'
  }
  if (typeof value === 'number') {
    return 'number'
  }
  if (Array.isArray(value)) {
    return 'array'
  }
  if (typeof value === 'object') {
    return 'object'
  }
  return 'string'
}

// 格式化对象值为 JSON 字符串
function formatObjectValue(value: any): string {
  try {
    return JSON.stringify(value, null, 2)
  } catch {
    return String(value)
  }
}

// 处理键名变化
function handleKeyChange(index: number, newKey: string): void {
  const entries = [...localEntries.value]
  const oldKey = entries[index].key
  
  if (newKey === oldKey) return
  
  // 检查新键名是否已存在（排除当前项）
  if (entries.some((e, i) => i !== index && e.key.trim() === newKey.trim() && newKey.trim())) {
    return
  }
  
  entries[index].key = newKey
  localEntries.value = entries
  updateObject(entries)
}

// 处理值变化
function handleValueChange(index: number, newValue: any): void {
  const entries = [...localEntries.value]
  // 如果新值是空字符串，保持为空字符串（而不是 undefined）
  entries[index].value = newValue === '' ? '' : (newValue === undefined ? '' : newValue)
  localEntries.value = entries
  updateObject(entries)
}

// 处理数字变化
function handleNumberChange(index: number, value: string): void {
  const entries = [...localEntries.value]
  if (value === '' || value === undefined || value === null) {
    entries[index].value = ''
  } else {
    const num = Number(value)
    entries[index].value = isNaN(num) ? value : num
  }
  localEntries.value = entries
  updateObject(entries)
}

// 处理对象值变化（嵌套对象）
function handleObjectValueChange(index: number, jsonString: string): void {
  const entries = [...localEntries.value]
  try {
    const parsed = JSON.parse(jsonString)
    entries[index].value = parsed
    localEntries.value = entries
    updateObject(entries)
  } catch {
    // JSON 解析失败，不更新
  }
}

// 处理 JSON 视图变化
function handleJsonChange(jsonString: string): void {
  jsonValue.value = jsonString
}

// 更新对象
function updateObject(entries: Array<{ key: string; value: any }>): void {
  const newObj: Record<string, any> = {}
  
  for (const entry of entries) {
    const key = entry.key.trim()
    if (key) {
      // 如果值是空字符串，保持为空字符串
      // 如果值是 undefined 或 null，设置为 undefined（会被删除）
      if (entry.value === undefined || entry.value === null) {
        // 跳过这个键值对
        continue
      }
      newObj[key] = entry.value
    }
  }
  
  emit('update:modelValue', Object.keys(newObj).length > 0 ? newObj : undefined)
}

// 添加新项
function addEntry(): void {
  // 使用 nextTick 确保在下一个 tick 中更新，避免 watch 干扰
  const newEntry = { key: '', value: '' }
  // 直接更新 localEntries，使用响应式更新
  localEntries.value.push(newEntry)
}

// 删除项
function removeEntry(index: number): void {
  const entries = localEntries.value.filter((_, i) => i !== index)
  localEntries.value = entries
  updateObject(entries)
}
</script>

<style scoped>
.form-object {
  display: flex;
  flex-direction: column;
  gap: var(--size-spacing-xs);
}

.form-object--horizontal {
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
  justify-content: space-between;
  gap: var(--size-spacing-xs);
  flex-shrink: 0;
  min-width: 100px;
}

.label-content {
  display: flex;
  flex-direction: column;
  gap: 2px;
  line-height: 1.4;
  flex: 1;
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

.form-object--horizontal .form-label {
  padding-top: var(--size-spacing-sm);
  min-width: 120px;
}

.view-toggle {
  display: flex;
  gap: 2px;
  background: var(--color-bg-component);
  border: 1px solid var(--color-border-light);
  border-radius: var(--size-radius-sm);
  padding: 2px;
}

.toggle-btn {
  width: 28px;
  height: 28px;
  padding: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: transparent;
  color: var(--color-text-secondary);
  border: none;
  border-radius: var(--size-radius-sm);
  cursor: pointer;
  transition: all 0.2s ease;
}

.toggle-btn:hover {
  background: var(--color-bg-component-hover);
  color: var(--color-text-primary);
}

.toggle-btn.active {
  background: var(--theme-color-primary);
  color: white;
}

.object-container {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: var(--size-spacing-sm);
  min-width: 0;
  overflow: visible;
  width: 100%;
}

.object-entries {
  display: flex;
  flex-direction: column;
  gap: var(--size-spacing-xs);
}

.object-entry {
  display: flex;
  align-items: center;
  gap: var(--size-spacing-xs);
  padding: var(--size-spacing-sm);
  background: var(--color-bg-component);
  border: 1px solid var(--color-border-light);
  border-radius: var(--size-radius-md);
  transition: all 0.2s ease;
  width: 100%;
  min-width: 0;
}

.object-entry:hover {
  border-color: var(--theme-color-primary);
  box-shadow: 0 0 0 2px rgba(24, 144, 255, 0.05);
}

.key-input {
  flex: 0 0 200px;
  min-width: 0;
  height: 32px;
  padding: var(--size-spacing-sm) var(--size-spacing-md);
  background: var(--color-bg-container);
  color: var(--color-text-primary);
  border: 1px solid var(--color-border-light);
  border-radius: var(--size-radius-sm);
  font-size: var(--font-size-sm);
  font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', 'Consolas', 'source-code-pro', monospace;
  transition: all 0.2s ease;
  outline: none;
  box-sizing: border-box;
}

.key-input:hover:not(:disabled) {
  border-color: var(--theme-color-primary);
}

.key-input:focus:not(:disabled) {
  border-color: var(--theme-color-primary);
  box-shadow: 0 0 0 2px rgba(24, 144, 255, 0.1);
}

.separator {
  color: var(--color-text-secondary);
  font-weight: var(--size-font-weight-medium);
  padding: var(--size-spacing-sm) 0;
  flex-shrink: 0;
  line-height: 32px;
  height: 32px;
  display: flex;
  align-items: center;
}

.value-input {
  flex: 1;
  height: 32px;
  padding: var(--size-spacing-sm) var(--size-spacing-md);
  background: var(--color-bg-container);
  color: var(--color-text-primary);
  border: 1px solid var(--color-border-light);
  border-radius: var(--size-radius-sm);
  font-size: var(--font-size-base);
  font-family: inherit;
  transition: all 0.2s ease;
  outline: none;
  box-sizing: border-box;
}

.value-input:hover:not(:disabled) {
  border-color: var(--theme-color-primary);
}

.value-input:focus:not(:disabled) {
  border-color: var(--theme-color-primary);
  box-shadow: 0 0 0 2px rgba(24, 144, 255, 0.1);
}

.value-textarea {
  flex: 1;
  padding: var(--size-spacing-sm) var(--size-spacing-md);
  background: var(--color-bg-container);
  color: var(--color-text-primary);
  border: 1px solid var(--color-border-light);
  border-radius: var(--size-radius-sm);
  font-size: var(--font-size-sm);
  font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', 'Consolas', 'source-code-pro', monospace;
  resize: vertical;
  transition: all 0.2s ease;
  outline: none;
}

.value-textarea:hover:not(:disabled) {
  border-color: var(--theme-color-primary);
}

.value-textarea:focus:not(:disabled) {
  border-color: var(--theme-color-primary);
  box-shadow: 0 0 0 2px rgba(24, 144, 255, 0.1);
}

.boolean-input {
  flex: 1;
  display: flex;
  gap: var(--size-spacing-xs);
  align-items: center;
  height: 32px;
}

.boolean-btn {
  flex: 1;
  height: 32px;
  padding: var(--size-spacing-sm) var(--size-spacing-md);
  background: var(--color-bg-container);
  color: var(--color-text-primary);
  border: 1px solid var(--color-border-light);
  border-radius: var(--size-radius-sm);
  font-size: var(--font-size-sm);
  cursor: pointer;
  transition: all 0.2s ease;
  box-sizing: border-box;
  display: flex;
  align-items: center;
  justify-content: center;
}

.boolean-btn:hover:not(:disabled) {
  border-color: var(--theme-color-primary);
  color: var(--theme-color-primary);
}

.boolean-btn.active {
  background: var(--theme-color-primary);
  color: white;
  border-color: var(--theme-color-primary);
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

.json-container {
  flex: 1;
}

.json-textarea {
  width: 100%;
  padding: var(--size-spacing-md);
  background: var(--color-bg-component);
  color: var(--color-text-primary);
  border: 1px solid var(--color-border-light);
  border-radius: var(--size-radius-md);
  font-size: var(--font-size-sm);
  font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', 'Consolas', 'source-code-pro', monospace;
  resize: vertical;
  transition: all 0.2s ease;
  outline: none;
  line-height: 1.6;
}

.json-textarea:hover:not(:disabled) {
  border-color: var(--theme-color-primary);
}

.json-textarea:focus:not(:disabled) {
  border-color: var(--theme-color-primary);
  box-shadow: 0 0 0 3px rgba(24, 144, 255, 0.1);
}

.form-object.has-error .key-input,
.form-object.has-error .value-input,
.form-object.has-error .value-textarea,
.form-object.has-error .json-textarea {
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
</style>


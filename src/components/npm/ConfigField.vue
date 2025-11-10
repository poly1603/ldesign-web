<template>
  <div class="config-field">
    <!-- 字符串类型：如果有 enum，使用下拉框；否则使用文本输入 -->
    <div v-if="schema.type === 'string'" class="field-item">
      <label class="field-label">
        {{ schema.description || fieldKey }}
        <span v-if="schema.required" class="required">*</span>
      </label>
      <select
        v-if="schema.enum && schema.enum.length > 0"
        v-model="localValue"
        class="field-select"
        :disabled="disabled"
      >
        <option value="" disabled>请选择</option>
        <option v-for="option in schema.enum" :key="option" :value="option">
          {{ option }}
        </option>
      </select>
      <input
        v-else
        v-model="localValue"
        type="text"
        class="field-input"
        :disabled="disabled"
        :placeholder="schema.description"
      />
    </div>

    <div v-else-if="schema.type === 'number'" class="field-item">
      <label class="field-label">
        {{ schema.description || fieldKey }}
        <span v-if="schema.required" class="required">*</span>
      </label>
      <input
        v-model.number="localValue"
        type="number"
        class="field-input"
        :disabled="disabled"
        :placeholder="schema.description"
      />
    </div>

    <div v-else-if="schema.type === 'boolean'" class="field-item">
      <label class="field-label checkbox-label">
        <input
          v-model="localValue"
          type="checkbox"
          class="field-checkbox"
          :disabled="disabled"
        />
        <span>{{ schema.description || fieldKey }}</span>
        <span v-if="schema.required" class="required">*</span>
      </label>
    </div>

    <div v-else-if="schema.type === 'array'" class="field-item">
      <label class="field-label">
        {{ schema.description || fieldKey }}
        <span v-if="schema.required" class="required">*</span>
      </label>
      <div class="array-items">
        <template v-if="Array.isArray(localValue) && localValue.length > 0">
          <div v-for="(item, index) in localValue" :key="`array-item-${index}-${item}`" class="array-item">
            <select
              v-if="schema.items?.type === 'string' && schema.items?.enum && schema.items.enum.length > 0"
              v-model="localValue[index]"
              class="field-select"
              :disabled="disabled"
            >
              <option value="" disabled>请选择</option>
              <option v-for="option in schema.items.enum" :key="option" :value="option">
                {{ option }}
              </option>
            </select>
            <input
              v-else-if="schema.items?.type === 'string'"
              v-model="localValue[index]"
              type="text"
              class="field-input"
              :disabled="disabled"
              :placeholder="schema.items?.description || '请输入'"
            />
            <input
              v-else-if="schema.items?.type === 'number'"
              v-model.number="localValue[index]"
              type="number"
              class="field-input"
              :disabled="disabled"
              :placeholder="schema.items?.description || '请输入数字'"
            />
            <button
              class="btn-remove"
              @click="removeArrayItem(index)"
              :disabled="disabled"
              type="button"
            >
              删除
            </button>
          </div>
        </template>
        <div v-else class="array-empty">
          <span class="empty-text">暂无项，点击"添加项"按钮添加</span>
        </div>
        <button
          class="btn-add"
          @click="addArrayItem"
          :disabled="disabled"
          type="button"
        >
          添加项
        </button>
      </div>
    </div>

    <div v-else-if="schema.type === 'object'" class="field-item">
      <div class="object-field">
        <label class="field-label">
          {{ schema.description || fieldKey }}
          <span v-if="schema.required" class="required">*</span>
        </label>
        <div v-if="schema.properties" class="object-properties">
          <ConfigField
            v-for="(propSchema, propKey) in schema.properties"
            :key="propKey"
            v-model="localValue[propKey]"
            :field-key="propKey"
            :schema="propSchema"
            :disabled="disabled"
          />
        </div>
        <div v-else-if="schema.additionalProperties" class="object-additional">
          <template v-if="localValue && Object.keys(localValue).length > 0">
            <div
              v-for="(value, key) in localValue"
              :key="`additional-item-${key}`"
              class="additional-item"
            >
              <input
                v-model="additionalKeys[key]"
                type="text"
                class="field-input"
                :disabled="disabled"
                placeholder="键名"
                @input="updateAdditionalKey(key, $event)"
              />
              <ConfigField
                v-model="localValue[key]"
                :field-key="key"
                :schema="schema.additionalProperties"
                :disabled="disabled"
              />
              <button
                class="btn-remove"
                @click="removeAdditionalItem(key)"
                :disabled="disabled"
                type="button"
              >
                删除
              </button>
            </div>
          </template>
          <div v-else class="additional-empty">
            <span class="empty-text">暂无项，点击"添加项"按钮添加</span>
          </div>
          <button
            class="btn-add"
            @click="addAdditionalItem"
            :disabled="disabled"
            type="button"
          >
            添加项
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, computed } from 'vue'

interface Props {
  modelValue: any
  fieldKey: string
  schema: any
  disabled?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  disabled: false,
})

const emit = defineEmits<{
  'update:modelValue': [value: any]
}>()

const localValue = computed({
  get: () => props.modelValue,
  set: (value) => emit('update:modelValue', value),
})

const additionalKeys = ref<Record<string, string>>({})

watch(() => props.modelValue, (newValue) => {
  if (props.schema.type === 'object' && props.schema.additionalProperties && newValue) {
    additionalKeys.value = Object.keys(newValue).reduce((acc, key) => {
      acc[key] = key
      return acc
    }, {} as Record<string, string>)
  }
}, { immediate: true })

function addArrayItem() {
  const currentValue = localValue.value
  // 确保 localValue 是数组
  if (!Array.isArray(currentValue)) {
    localValue.value = []
  }
  const newArray = Array.isArray(localValue.value) ? [...localValue.value] : []
  const defaultValue = getDefaultValue(props.schema.items)
  newArray.push(defaultValue)
  localValue.value = newArray
}

function removeArrayItem(index: number) {
  const currentValue = localValue.value
  if (Array.isArray(currentValue) && index >= 0 && index < currentValue.length) {
    const newArray = [...currentValue]
    newArray.splice(index, 1)
    localValue.value = newArray
  }
}

function addAdditionalItem() {
  const currentValue = localValue.value || {}
  const newKey = `new_key_${Date.now()}`
  const defaultValue = getDefaultValue(props.schema.additionalProperties)
  const newObject = { ...currentValue, [newKey]: defaultValue }
  localValue.value = newObject
  additionalKeys.value[newKey] = newKey
}

function removeAdditionalItem(key: string) {
  const currentValue = localValue.value
  if (currentValue && typeof currentValue === 'object' && key in currentValue) {
    const newObject = { ...currentValue }
    delete newObject[key]
    localValue.value = newObject
    delete additionalKeys.value[key]
  }
}

function updateAdditionalKey(oldKey: string, event: Event) {
  const newKey = (event.target as HTMLInputElement).value.trim()
  const currentValue = localValue.value
  if (newKey && newKey !== oldKey && currentValue && typeof currentValue === 'object' && oldKey in currentValue) {
    const newObject = { ...currentValue }
    newObject[newKey] = newObject[oldKey]
    delete newObject[oldKey]
    localValue.value = newObject
    additionalKeys.value[newKey] = newKey
    delete additionalKeys.value[oldKey]
  } else if (!newKey) {
    // 如果新键名为空，恢复旧键名
    additionalKeys.value[oldKey] = oldKey
  }
}

function getDefaultValue(schema: any): any {
  if (!schema) return null
  
  switch (schema.type) {
    case 'string':
      return ''
    case 'number':
      return 0
    case 'boolean':
      return false
    case 'array':
      return []
    case 'object':
      return {}
    default:
      return null
  }
}
</script>

<style scoped>
.config-field {
  width: 100%;
}

.field-item {
  margin-bottom: var(--size-spacing-md);
}

.field-label {
  display: block;
  font-size: var(--font-size-sm);
  font-weight: var(--size-font-weight-medium);
  color: var(--color-text-primary);
  margin-bottom: var(--size-spacing-xs);
}

.field-label.checkbox-label {
  display: flex;
  align-items: center;
  gap: var(--size-spacing-xs);
  cursor: pointer;
}

.required {
  color: var(--color-danger-default);
  margin-left: 2px;
}

.field-input {
  width: 100%;
  padding: var(--size-spacing-sm) var(--size-spacing-md);
  border: 1px solid var(--color-border-light);
  border-radius: var(--size-radius-md);
  font-size: var(--font-size-base);
  color: var(--color-text-primary);
  background: var(--color-bg-component);
}

.field-input:focus {
  outline: none;
  border-color: var(--theme-color-primary);
}

.field-input:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.field-select {
  width: 100%;
  padding: var(--size-spacing-sm) var(--size-spacing-md);
  padding-right: calc(var(--size-spacing-md) + 20px);
  border: 1px solid var(--color-border-light);
  border-radius: var(--size-radius-md);
  font-size: var(--font-size-base);
  color: var(--color-text-primary);
  background: var(--color-bg-component);
  cursor: pointer;
  appearance: none;
  background-image: url("data:image/svg+xml,%3Csvg width='12' height='12' viewBox='0 0 12 12' fill='none' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M2 4L6 8L10 4' stroke='%236b7280' stroke-width='1.5' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E");
  background-repeat: no-repeat;
  background-position: right var(--size-spacing-md) center;
  transition: all 0.2s ease;
}

.field-select:hover:not(:disabled) {
  border-color: var(--theme-color-primary);
}

.field-select:focus {
  outline: none;
  border-color: var(--theme-color-primary);
  box-shadow: 0 0 0 3px rgba(24, 144, 255, 0.1);
}

.field-select:disabled {
  opacity: 0.6;
  cursor: not-allowed;
  background: var(--color-bg-disabled);
}

.field-checkbox {
  width: 18px;
  height: 18px;
  cursor: pointer;
}

.array-items {
  display: flex;
  flex-direction: column;
  gap: var(--size-spacing-md);
}

.array-item {
  display: flex;
  gap: var(--size-spacing-sm);
  align-items: flex-start;
}

.array-empty,
.additional-empty {
  padding: var(--size-spacing-md);
  text-align: center;
  color: var(--color-text-secondary);
  background: var(--color-bg-component);
  border: 1px dashed var(--color-border-light);
  border-radius: var(--size-radius-md);
}

.empty-text {
  font-size: var(--font-size-sm);
}

.object-field {
  border-left: 2px solid var(--color-border-light);
  padding-left: var(--size-spacing-md);
}

.object-properties {
  display: flex;
  flex-direction: column;
  gap: var(--size-spacing-md);
  margin-top: var(--size-spacing-sm);
}

.property-item {
  display: flex;
  flex-direction: column;
  gap: var(--size-spacing-xs);
}

.object-additional {
  display: flex;
  flex-direction: column;
  gap: var(--size-spacing-md);
  margin-top: var(--size-spacing-sm);
}

.additional-item {
  display: flex;
  gap: var(--size-spacing-sm);
  align-items: flex-start;
}

.btn-add,
.btn-remove {
  padding: var(--size-spacing-xs) var(--size-spacing-sm);
  border: 1px solid var(--color-border-light);
  border-radius: var(--size-radius-sm);
  font-size: var(--font-size-sm);
  cursor: pointer;
  transition: all 0.2s ease;
}

.btn-add {
  background: var(--theme-color-primary);
  color: white;
  border-color: var(--theme-color-primary);
}

.btn-add:hover:not(:disabled) {
  background: var(--theme-color-primary-hover);
}

.btn-remove {
  background: var(--color-danger-light);
  color: var(--color-danger-default);
  border-color: var(--color-danger-default);
}

.btn-remove:hover:not(:disabled) {
  background: var(--color-danger-default);
  color: white;
}

.btn-add:disabled,
.btn-remove:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}
</style>


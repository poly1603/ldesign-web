<template>
  <div
    class="config-input"
    :class="{
      'is-deprecated': schema.deprecatedIn,
      [`col-span-${colSpan}`]: true,
    }"
  >
    <!-- Boolean 类型 - 使用 Switch -->
    <FormSwitch
      v-if="schema.type === 'boolean'"
      v-model="booleanValue"
      :label-zh="schema.nameZh"
      :label-en="schema.name"
      :description="schema.descriptionZh"
      :hint="getHint()"
      :layout="layout"
      @update:modelValue="handleChange"
    />

    <!-- Enum 类型 - 使用 Select -->
    <FormSelect
      v-else-if="schema.type === 'enum'"
      v-model="stringValue"
      :label-zh="schema.nameZh"
      :label-en="schema.name"
      :options="enumOptions"
      :placeholder="schema.defaultValue"
      :hint="getHint()"
      :layout="layout"
      @update:modelValue="handleChange"
    />

    <!-- Author 类型 - 使用 Author 组件 -->
    <FormAuthor
      v-else-if="schema.path === 'author'"
      v-model="authorValue"
      :label-zh="schema.nameZh"
      :label-en="schema.name"
      :hint="getHint()"
      :layout="layout"
      @update:modelValue="handleChange"
    />

    <!-- String 类型 - 使用 Input -->
    <FormInput
      v-else-if="schema.type === 'string'"
      v-model="stringValue"
      :label-zh="schema.nameZh"
      :label-en="schema.name"
      type="text"
      :placeholder="schema.example || schema.defaultValue"
      :hint="getHint()"
      :layout="layout"
      @update:modelValue="handleChange"
    />

    <!-- Number 类型 - 使用 Input number -->
    <FormInput
      v-else-if="schema.type === 'number'"
      v-model="numberValue"
      :label-zh="schema.nameZh"
      :label-en="schema.name"
      type="number"
      :placeholder="String(schema.defaultValue || '')"
      :hint="getHint()"
      :layout="layout"
      @update:modelValue="handleChange"
    />

    <!-- Contributors 类型 - 使用 Contributors 组件 -->
    <FormContributors
      v-else-if="schema.path === 'contributors'"
      v-model="contributorsValue"
      :label-zh="schema.nameZh"
      :label-en="schema.name"
      :hint="getHint()"
      :layout="layout"
      @update:modelValue="handleChange"
    />

    <!-- Array 类型 - 使用 Array 组件 -->
    <FormArray
      v-else-if="schema.type === 'array'"
      v-model="arrayValue"
      :label-zh="schema.nameZh"
      :label-en="schema.name"
      :item-placeholder="typeof schema.example?.[0] === 'string' ? schema.example[0] : '输入值'"
      :hint="getHint()"
      :layout="layout"
      :array-options="schema.arrayOptions"
      :is-keywords="schema.path === 'keywords'"
      @update:modelValue="handleChange"
    />

    <!-- Object 类型 - 使用 Object 编辑器 -->
    <FormObject
      v-else-if="schema.type === 'object'"
      v-model="objectValue"
      :label-zh="schema.nameZh"
      :label-en="schema.name"
      :placeholder="schema.example ? JSON.stringify(schema.example, null, 2) : '{}'"
      :hint="getHint()"
      :layout="layout"
      @update:modelValue="handleChange"
    />
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import FormInput from './form/FormInput.vue'
import FormSelect from './form/FormSelect.vue'
import FormSwitch from './form/FormSwitch.vue'
import FormArray from './form/FormArray.vue'
import FormObject from './form/FormObject.vue'
import FormAuthor from './form/FormAuthor.vue'
import FormContributors from './form/FormContributors.vue'

interface ConfigOptionSchema {
  name: string
  nameZh?: string
  path: string
  type: 'string' | 'number' | 'boolean' | 'array' | 'object' | 'enum'
  inCompilerOptions?: boolean
  defaultValue?: any
  description: string
  descriptionZh: string
  introducedIn?: string
  deprecatedIn?: string
  enumValues?: string[]
  arrayOptions?: string[]
  example?: any
}

const props = withDefaults(defineProps<{
  schema: ConfigOptionSchema
  value: any
  layout?: 'vertical' | 'horizontal'
}>(), {
  layout: 'vertical',
})

const emit = defineEmits<{
  'update:value': [value: any]
}>()

// 计算列数：根据配置项类型和内容智能分配
const colSpan = computed(() => {
  // Keywords 占用全宽
  if (props.schema.path === 'keywords') {
    return 3
  }
  
  // Author 和 Contributors 占用 2 列
  if (props.schema.path === 'author' || props.schema.path === 'contributors') {
    return 2
  }
  
  // Object 类型占用全宽
  if (props.schema.type === 'object') {
    return 3
  }
  
  // Array 类型占用 2 列
  if (props.schema.type === 'array') {
    return 2
  }
  
  // Enum 类型：如果选项很多（>10），占用 2 列
  if (props.schema.type === 'enum' && props.schema.enumValues && props.schema.enumValues.length > 10) {
    return 2
  }
  
  // Boolean 类型占用 1 列
  if (props.schema.type === 'boolean') {
    return 1
  }
  
  // 描述字段占用全宽
  if (props.schema.path === 'description') {
    return 3
  }
  
  // 主页字段占用全宽
  if (props.schema.path === 'homepage') {
    return 3
  }
  
  // String/Number 类型：如果有很长的描述，占用 2 列
  if (props.schema.descriptionZh && props.schema.descriptionZh.length > 50) {
    return 2
  }
  
  // 默认占用 1 列
  return 1
})

// 计算属性
const booleanValue = computed({
  get: () => {
    if (props.value === undefined || props.value === null) {
      return props.schema.defaultValue ?? false
    }
    return Boolean(props.value)
  },
  set: (val) => emit('update:value', val),
})

const stringValue = computed({
  get: () => {
    if (props.value === undefined || props.value === null) {
      return props.schema.defaultValue ?? ''
    }
    return String(props.value)
  },
  set: (val) => emit('update:value', val || undefined),
})

const numberValue = computed({
  get: () => {
    if (props.value === undefined || props.value === null) {
      return props.schema.defaultValue ?? 0
    }
    return Number(props.value)
  },
  set: (val) => {
    const num = val === '' ? undefined : Number(val)
    emit('update:value', isNaN(num as number) ? undefined : num)
  },
})

const arrayValue = computed({
  get: () => {
    if (!Array.isArray(props.value)) {
      return props.schema.defaultValue && Array.isArray(props.schema.defaultValue)
        ? [...props.schema.defaultValue]
        : []
    }
    return [...props.value]
  },
  set: (val) => emit('update:value', val),
})

const objectValue = computed({
  get: () => {
    if (props.value === undefined || props.value === null) {
      return props.schema.defaultValue || {}
    }
    if (typeof props.value === 'object' && props.value !== null && !Array.isArray(props.value)) {
      return props.value
    }
    return props.schema.defaultValue || {}
  },
  set: (val) => {
    emit('update:value', val)
  },
})

const authorValue = computed({
  get: () => props.value,
  set: (val) => emit('update:value', val),
})

const contributorsValue = computed({
  get: () => {
    if (!Array.isArray(props.value)) {
      return []
    }
    return props.value
  },
  set: (val) => emit('update:value', val),
})

const enumOptions = computed(() => {
  return props.schema.enumValues || []
})

// 不再需要 getLabel，直接传递 nameZh 和 name

function getHint(): string {
  const hints: string[] = []
  if (props.schema.defaultValue !== undefined && props.value === undefined) {
    hints.push(`默认: ${formatDefaultValue(props.schema.defaultValue)}`)
  }
  return hints.join(' | ')
}

function formatDefaultValue(value: any): string {
  if (typeof value === 'object') {
    return JSON.stringify(value)
  }
  return String(value)
}

function handleChange(value: any): void {
  emit('update:value', value)
}
</script>

<style scoped>
.config-input {
  display: flex;
  flex-direction: column;
  width: 100%;
  min-width: 0;
}

.config-input.is-deprecated {
  opacity: 0.7;
}

/* 列跨度样式 */
.config-input.col-span-1 {
  grid-column: span 1;
}

.config-input.col-span-2 {
  grid-column: span 2;
}

.config-input.col-span-3 {
  grid-column: span 3;
}

/* 响应式：小屏幕时全宽 */
@media (max-width: 768px) {
  .config-input.col-span-2,
  .config-input.col-span-3 {
    grid-column: span 1;
  }
}
</style>

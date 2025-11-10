<template>
  <div class="config-form">
    <template v-for="(fieldSchema, fieldKey) in schema" :key="fieldKey">
      <div v-if="fieldSchema.type === 'object' && fieldSchema.properties" class="form-section">
        <h3 class="section-title">{{ fieldSchema.description || fieldKey }}</h3>
        <div class="section-content">
          <ConfigForm
            v-model="localValue[fieldKey]"
            :schema="fieldSchema.properties"
            :disabled="disabled"
          />
        </div>
      </div>
      <div v-else class="form-section">
        <ConfigField
          v-model="localValue[fieldKey]"
          :field-key="fieldKey"
          :schema="fieldSchema"
          :disabled="disabled"
        />
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import ConfigField from './ConfigField.vue'

interface Props {
  modelValue: any
  schema: any
  disabled?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  disabled: false,
})

const emit = defineEmits<{
  'update:modelValue': [value: any]
}>()

const localValue = ref({ ...props.modelValue })

watch(() => props.modelValue, (newValue) => {
  localValue.value = { ...newValue }
}, { deep: true })

watch(localValue, (newValue) => {
  emit('update:modelValue', newValue)
}, { deep: true })
</script>

<style scoped>
.config-form {
  display: flex;
  flex-direction: column;
  gap: var(--size-spacing-xl);
}

.form-section {
  background: var(--color-bg-container);
  border: 1px solid var(--color-border-light);
  border-radius: var(--size-radius-md);
  padding: var(--size-spacing-lg);
  margin-bottom: var(--size-spacing-md);
}

.section-title {
  font-size: var(--font-size-lg);
  font-weight: var(--size-font-weight-semibold);
  color: var(--color-text-primary);
  margin: 0 0 var(--size-spacing-md) 0;
  padding-bottom: var(--size-spacing-sm);
  border-bottom: 1px solid var(--color-border-light);
}

.section-content {
  margin-top: var(--size-spacing-md);
}
</style>


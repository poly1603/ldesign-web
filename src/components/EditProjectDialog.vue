<template>
  <Teleport to="body">
    <Transition name="dialog-overlay">
      <div v-if="visible" class="dialog-overlay" @click="handleClose"></div>
    </Transition>
    <Transition name="dialog-scale">
      <div v-if="visible" class="dialog-container">
        <div class="dialog-header">
          <h2 class="dialog-title">编辑项目</h2>
          <button class="dialog-close" @click="handleClose">
            <X :size="20" />
          </button>
        </div>

        <div class="dialog-content">
          <div class="form-group">
            <label class="form-label">项目名称</label>
            <input
              v-model="formData.name"
              type="text"
              class="form-input"
              placeholder="项目名称"
            />
          </div>

          <div class="form-group">
            <label class="form-label">项目路径</label>
            <input
              v-model="formData.path"
              type="text"
              class="form-input"
              placeholder="项目路径"
            />
          </div>

          <div class="form-group">
            <label class="form-label">项目描述</label>
            <textarea
              v-model="formData.description"
              class="form-textarea"
              placeholder="项目描述（可选）"
              rows="3"
            />
          </div>

          <div v-if="error" class="error-message">
            {{ error }}
          </div>
        </div>

        <div class="dialog-footer">
          <button class="btn btn-secondary" @click="handleClose">取消</button>
          <button
            class="btn btn-primary"
            :disabled="!formData.name || !formData.path || updating"
            @click="handleUpdate"
          >
            {{ updating ? '更新中...' : '保存' }}
          </button>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import { X } from 'lucide-vue-next'
import { projectApi } from '../api/services'

interface Project {
  id: string
  name: string
  path: string
  description?: string
}

interface Props {
  visible: boolean
  project: Project | null
}

interface Emits {
  (e: 'update:visible', value: boolean): void
  (e: 'updated'): void
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()

const formData = ref({
  name: '',
  path: '',
  description: '',
})

const updating = ref(false)
const error = ref<string | null>(null)

watch(() => props.project, (newProject) => {
  if (newProject) {
    formData.value = {
      name: newProject.name,
      path: newProject.path,
      description: newProject.description || '',
    }
  }
}, { immediate: true })

watch(() => props.visible, (newVal) => {
  if (!newVal) {
    error.value = null
    updating.value = false
  }
})

async function handleUpdate() {
  if (!props.project) {
    return
  }

  updating.value = true
  error.value = null

  try {
    const response = await projectApi.update(props.project.id, {
      name: formData.value.name,
      path: formData.value.path,
      description: formData.value.description || undefined,
    })
    if (response.success) {
      emit('updated')
      handleClose()
    } else {
      throw new Error(response.message || '更新项目失败')
    }
  } catch (e: any) {
    console.error('更新项目失败:', e)
    error.value = e.message || '更新项目失败'
  } finally {
    updating.value = false
  }
}

function handleClose() {
  emit('update:visible', false)
}
</script>

<style scoped>
.dialog-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.45);
  z-index: var(--z-index-modal-backdrop, 1040);
}

.dialog-container {
  position: fixed;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 90%;
  max-width: 500px;
  background: var(--color-bg-container);
  border-radius: var(--size-radius-lg);
  box-shadow: var(--shadow-lg);
  z-index: var(--z-index-modal, 1050);
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.dialog-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: var(--size-spacing-xl);
  border-bottom: 1px solid var(--color-border-light);
  flex-shrink: 0;
}

.dialog-title {
  font-size: var(--font-size-xl);
  font-weight: var(--size-font-weight-semibold);
  margin: 0;
  color: var(--color-text-primary);
}

.dialog-close {
  width: 32px;
  height: 32px;
  border: none;
  background: transparent;
  color: var(--color-text-secondary);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: var(--size-radius-md);
  transition: all 0.2s ease;
}

.dialog-close:hover {
  background: var(--color-bg-component-hover);
  color: var(--color-text-primary);
}

.dialog-content {
  flex: 1;
  padding: var(--size-spacing-xl);
  overflow-y: auto;
}

.form-group {
  margin-bottom: var(--size-spacing-lg);
}

.form-label {
  display: block;
  font-size: var(--font-size-base);
  font-weight: var(--size-font-weight-medium);
  color: var(--color-text-primary);
  margin-bottom: var(--size-spacing-sm);
}

.form-input,
.form-textarea {
  width: 100%;
  padding: var(--size-spacing-sm) var(--size-spacing-md);
  border: 1px solid var(--color-border-light);
  border-radius: var(--size-radius-md);
  background: var(--color-bg-container);
  color: var(--color-text-primary);
  font-size: var(--font-size-base);
  transition: border-color 0.2s ease;
  font-family: inherit;
}

.form-input:focus,
.form-textarea:focus {
  outline: none;
  border-color: var(--theme-color-primary);
}

.form-textarea {
  resize: vertical;
  min-height: 80px;
}

.error-message {
  padding: var(--size-spacing-md);
  background: var(--color-danger-light);
  color: var(--color-danger-default);
  border-radius: var(--size-radius-md);
  margin-bottom: var(--size-spacing-md);
}

.dialog-footer {
  display: flex;
  justify-content: flex-end;
  gap: var(--size-spacing-md);
  padding: var(--size-spacing-xl);
  border-top: 1px solid var(--color-border-light);
  flex-shrink: 0;
}

.btn {
  padding: var(--size-spacing-sm) var(--size-spacing-lg);
  border: none;
  border-radius: var(--size-radius-md);
  font-size: var(--font-size-base);
  cursor: pointer;
  transition: all 0.2s ease;
}

.btn-secondary {
  background: var(--color-bg-component);
  color: var(--color-text-primary);
}

.btn-secondary:hover {
  background: var(--color-bg-component-hover);
}

.btn-primary {
  background: var(--theme-color-primary);
  color: var(--color-text-inverse);
}

.btn-primary:hover:not(:disabled) {
  background: var(--theme-color-primary-hover);
}

.btn-primary:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

/* 过渡动画 */
.dialog-overlay-enter-active,
.dialog-overlay-leave-active {
  transition: opacity 0.3s ease;
}

.dialog-overlay-enter-from,
.dialog-overlay-leave-to {
  opacity: 0;
}

.dialog-scale-enter-active,
.dialog-scale-leave-active {
  transition: all 0.3s ease;
}

.dialog-scale-enter-from,
.dialog-scale-leave-to {
  opacity: 0;
  transform: translate(-50%, -50%) scale(0.9);
}
</style>





























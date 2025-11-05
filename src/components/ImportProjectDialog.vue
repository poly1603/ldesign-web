<template>
  <Teleport to="body">
    <Transition name="dialog-overlay">
      <div v-if="visible" class="dialog-overlay" @click="handleClose"></div>
    </Transition>
    <Transition name="dialog-scale">
      <div v-if="visible" class="dialog-container">
        <div class="dialog-header">
          <h2 class="dialog-title">导入项目</h2>
          <button class="dialog-close" @click="handleClose">
            <X :size="20" />
          </button>
        </div>

        <div class="dialog-content">
          <div class="form-group">
            <label class="form-label">项目路径（绝对路径）</label>
            <div class="path-input-group">
              <input
                v-model="projectPath"
                type="text"
                class="form-input"
                placeholder="点击右侧按钮选择项目目录或手动输入完整路径"
                @input="handlePathInput"
              />
              <button
                class="path-select-btn"
                :disabled="selecting"
                @click="handleSelectDirectory"
              >
                <FolderOpen :size="16" />
                {{ selecting ? '选择中...' : '选择目录' }}
              </button>
            </div>
            <p class="form-hint">
              点击"选择目录"按钮打开系统目录选择器，或手动输入项目的绝对路径
            </p>
          </div>

          <div v-if="analyzing" class="analyzing">
            <Loader2 :size="20" class="spinner" />
            <span>正在分析项目...</span>
          </div>

          <div v-if="analysisResult" class="analysis-result">
            <h3 class="result-title">项目信息</h3>
            <div class="result-info">
              <div class="info-row">
                <span class="info-label">项目名称:</span>
                <span class="info-value">{{ analysisResult.name }}</span>
              </div>
              <div class="info-row">
                <span class="info-label">项目类别:</span>
                <span class="info-value">{{ getCategoryLabel(analysisResult.category) }}</span>
              </div>
              <div class="info-row">
                <span class="info-label">框架:</span>
                <span class="info-value">
                  {{ analysisResult.framework || '未知' }}
                  <span v-if="analysisResult.frameworkVersion"> {{ analysisResult.frameworkVersion }}</span>
                </span>
              </div>
              <div class="info-row">
                <span class="info-label">TypeScript:</span>
                <span class="info-value">{{ analysisResult.isTypeScript ? '是' : '否' }}</span>
              </div>
              <div class="info-row">
                <span class="info-label">包管理器:</span>
                <span class="info-value">{{ analysisResult.packageManager || '未知' }}</span>
              </div>
              <div v-if="analysisResult.description" class="info-row">
                <span class="info-label">描述:</span>
                <span class="info-value">{{ analysisResult.description }}</span>
              </div>
            </div>
          </div>

          <div v-if="error" class="error-message">
            {{ error }}
          </div>
        </div>

        <div class="dialog-footer">
          <button class="btn btn-secondary" @click="handleClose">取消</button>
          <button
            class="btn btn-primary"
            :disabled="!projectPath || analyzing || !analysisResult"
            @click="handleImport"
          >
            {{ importing ? '导入中...' : '确认导入' }}
          </button>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import { X, Loader2, FolderOpen } from 'lucide-vue-next'
import { projectApi, systemApi } from '../api/services'

interface Props {
  visible: boolean
}

interface Emits {
  (e: 'update:visible', value: boolean): void
  (e: 'imported'): void
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()

const projectPath = ref('')
const analyzing = ref(false)
const importing = ref(false)
const selecting = ref(false)
const analysisResult = ref<any>(null)
const error = ref<string | null>(null)

let analyzeTimeout: ReturnType<typeof setTimeout> | null = null

watch(() => props.visible, (newVal) => {
  if (!newVal) {
    // 关闭时重置状态
    projectPath.value = ''
    analyzing.value = false
    importing.value = false
    selecting.value = false
    analysisResult.value = null
    error.value = null
    if (analyzeTimeout) {
      clearTimeout(analyzeTimeout)
      analyzeTimeout = null
    }
  }
})

async function handleSelectDirectory() {
  selecting.value = true
  error.value = null

  try {
    const response = await systemApi.openDirectoryPicker(projectPath.value || undefined)

    if (response.success && response.data?.path) {
      projectPath.value = response.data.path
      error.value = null
      handlePathInput()
    } else {
      if (response.message && response.message !== '用户取消了选择') {
        error.value = response.message
      }
    }
  } catch (e: any) {
    console.error('打开目录选择器失败:', e)
    error.value = e.message || '打开目录选择器失败，请手动输入路径'
  } finally {
    selecting.value = false
  }
}

function handlePathInput() {
  error.value = null
  analysisResult.value = null
  
  if (!projectPath.value.trim()) {
    if (analyzeTimeout) {
      clearTimeout(analyzeTimeout)
      analyzeTimeout = null
    }
    return
  }

  // 防抖分析
  if (analyzeTimeout) {
    clearTimeout(analyzeTimeout)
  }
  analyzeTimeout = setTimeout(() => {
    analyzeProject()
  }, 500)
}

async function analyzeProject() {
  if (!projectPath.value.trim()) {
    return
  }

  analyzing.value = true
  error.value = null

  try {
    const response = await projectApi.analyze(projectPath.value.trim())
    if (response.success) {
      analysisResult.value = response.data
    } else {
      throw new Error(response.message || '分析项目失败')
    }
  } catch (e: any) {
    console.error('分析项目失败:', e)
    error.value = e.message || '分析项目失败，请检查路径是否正确'
    analysisResult.value = null
  } finally {
    analyzing.value = false
  }
}

async function handleImport() {
  if (!projectPath.value.trim() || !analysisResult.value) {
    return
  }

  importing.value = true
  error.value = null

  try {
    const response = await projectApi.import({
      path: projectPath.value.trim(),
      name: analysisResult.value.name,
    })
    if (response.success) {
      emit('imported')
      handleClose()
    } else {
      throw new Error(response.message || '导入项目失败')
    }
  } catch (e: any) {
    console.error('导入项目失败:', e)
    error.value = e.message || '导入项目失败'
  } finally {
    importing.value = false
  }
}

function handleClose() {
  emit('update:visible', false)
}

function getCategoryLabel(category?: string): string {
  const labels: Record<string, string> = {
    project: '项目',
    library: '库',
    'project-library': '项目+库',
    other: '其他',
  }
  return labels[category || ''] || category || '未知'
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
  max-width: 600px;
  max-height: 90vh;
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
  margin-bottom: var(--size-spacing-xl);
}

.form-label {
  display: block;
  font-size: var(--font-size-base);
  font-weight: var(--size-font-weight-medium);
  color: var(--color-text-primary);
  margin-bottom: var(--size-spacing-sm);
}

.path-input-group {
  display: flex;
  gap: var(--size-spacing-sm);
}

.path-input-group .form-input {
  flex: 1;
  padding: var(--size-spacing-sm) var(--size-spacing-md);
  border: 1px solid var(--color-border-light);
  border-radius: var(--size-radius-md);
  background: var(--color-bg-container);
  color: var(--color-text-primary);
  font-size: var(--font-size-base);
  transition: border-color 0.2s ease;
}

.path-input-group .form-input:focus {
  outline: none;
  border-color: var(--theme-color-primary);
}

.path-input-group .form-input[readonly] {
  cursor: pointer;
  background: var(--color-bg-component);
}

.path-select-btn {
  display: flex;
  align-items: center;
  gap: var(--size-spacing-xs);
  padding: var(--size-spacing-sm) var(--size-spacing-lg);
  border: 1px solid var(--theme-color-primary);
  border-radius: var(--size-radius-md);
  background: var(--theme-color-primary);
  color: var(--color-text-inverse);
  font-size: var(--font-size-base);
  cursor: pointer;
  transition: all 0.2s ease;
  white-space: nowrap;
}

.path-select-btn:hover:not(:disabled) {
  background: var(--theme-color-primary-hover);
  border-color: var(--theme-color-primary-hover);
}

.path-select-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.form-input {
  width: 100%;
  padding: var(--size-spacing-sm) var(--size-spacing-md);
  border: 1px solid var(--color-border-light);
  border-radius: var(--size-radius-md);
  background: var(--color-bg-container);
  color: var(--color-text-primary);
  font-size: var(--font-size-base);
  transition: border-color 0.2s ease;
}

.form-input:focus {
  outline: none;
  border-color: var(--theme-color-primary);
}

.form-hint {
  font-size: var(--font-size-sm);
  color: var(--color-text-secondary);
  margin-top: var(--size-spacing-xs);
  margin-bottom: 0;
}

.analyzing {
  display: flex;
  align-items: center;
  gap: var(--size-spacing-sm);
  padding: var(--size-spacing-lg);
  background: var(--color-primary-light);
  color: var(--color-primary-default);
  border-radius: var(--size-radius-md);
  margin-bottom: var(--size-spacing-md);
}

.spinner {
  animation: spin 1s linear infinite;
}

@keyframes spin {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}

.analysis-result {
  padding: var(--size-spacing-lg);
  background: var(--color-bg-component);
  border-radius: var(--size-radius-md);
  margin-bottom: var(--size-spacing-md);
}

.result-title {
  font-size: var(--font-size-lg);
  font-weight: var(--size-font-weight-semibold);
  color: var(--color-text-primary);
  margin: 0 0 var(--size-spacing-md) 0;
}

.result-info {
  display: flex;
  flex-direction: column;
  gap: var(--size-spacing-sm);
}

.info-row {
  display: flex;
  align-items: flex-start;
  gap: var(--size-spacing-md);
}

.info-label {
  font-weight: var(--size-font-weight-medium);
  color: var(--color-text-secondary);
  min-width: 100px;
  flex-shrink: 0;
}

.info-value {
  color: var(--color-text-primary);
  flex: 1;
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


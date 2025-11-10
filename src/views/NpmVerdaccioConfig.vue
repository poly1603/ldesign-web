<template>
  <div class="npm-verdaccio-config-page">
    <div class="page-header">
      <button class="btn-back" @click="goBack">
        <ArrowLeft :size="20" />
        返回
      </button>
      <h1>{{ registry?.name || 'Verdaccio 配置' }}</h1>
    </div>

    <!-- 骨架屏：加载中 -->
    <div v-if="loading && !configContent" class="skeleton-container">
      <Skeleton variant="card" :lines="5" />
    </div>

    <div v-else-if="error" class="error-message">{{ error }}</div>
    <div v-else class="config-content">
      <!-- 配置信息提示 -->
      <div class="config-info">
        <div class="info-item">
          <span class="info-label">配置文件路径:</span>
          <span class="info-value">{{ configPath }}</span>
        </div>
        <div v-if="verdaccioRunning" class="warning-banner">
          <AlertTriangle :size="20" />
          <span>Verdaccio 服务正在运行，修改配置后将自动重启服务</span>
        </div>
        <div v-if="restarting" class="restart-banner">
          <Loader2 :size="20" class="spinning" />
          <div class="restart-info">
            <span class="restart-message">{{ restartMessage }}</span>
            <div class="restart-progress">
              <div class="progress-bar" :style="{ width: `${restartProgress}%` }"></div>
            </div>
          </div>
        </div>
      </div>

      <!-- 模式切换 -->
      <div class="mode-switcher">
        <div class="mode-tabs">
          <button
            :class="['mode-tab', { active: editMode === 'code' }]"
            @click="editMode = 'code'"
          >
            <Code :size="18" />
            代码模式
          </button>
          <button
            :class="['mode-tab', { active: editMode === 'form' }]"
            @click="editMode = 'form'"
          >
            <FileText :size="18" />
            表单模式
          </button>
        </div>
      </div>

      <!-- 代码模式 -->
      <div v-if="editMode === 'code'" class="config-editor-section">
        <div class="section-header">
          <h2>配置文件内容</h2>
          <div class="header-actions">
            <button class="btn-secondary" @click="handleReset" :disabled="saving || !hasChanges">
              <RotateCcw :size="18" />
              重置
            </button>
            <button class="btn-secondary" @click="handleFormat" :disabled="saving">
              <Code :size="18" />
              格式化
            </button>
            <button class="btn-primary" @click="handleSave" :disabled="saving || !hasChanges">
              <Save :size="18" />
              {{ saving ? '保存中...' : '保存配置' }}
            </button>
          </div>
        </div>

        <div class="editor-container">
          <textarea
            v-model="configContent"
            class="config-editor"
            :disabled="saving"
            placeholder="请输入 YAML 配置内容..."
            spellcheck="false"
          />
        </div>
      </div>

      <!-- 表单模式 -->
      <div v-else-if="editMode === 'form'" class="config-form-section">
        <div class="section-header">
          <h2>配置项编辑</h2>
          <div class="header-actions">
            <button class="btn-secondary" @click="handleResetForm" :disabled="saving || !hasFormChanges">
              <RotateCcw :size="18" />
              重置
            </button>
            <button class="btn-primary" @click="handleSaveForm" :disabled="saving || !hasFormChanges">
              <Save :size="18" />
              {{ saving ? '保存中...' : '保存配置' }}
            </button>
          </div>
        </div>

        <div v-if="formLoading" class="form-loading">
          <Skeleton variant="card" :lines="10" />
        </div>
        <div v-else-if="formError" class="form-error">{{ formError }}</div>
        <div v-else class="form-container">
          <ConfigForm
            v-model="configObject"
            :schema="configSchema"
            :disabled="saving"
          />
        </div>
      </div>

      <!-- 配置说明 -->
      <div class="config-docs">
        <h3>配置说明</h3>
        <div class="docs-content">
          <p><strong>storage:</strong> 包存储路径</p>
          <p><strong>listen:</strong> 监听地址和端口（格式: 0.0.0.0:端口号）</p>
          <p><strong>auth.htpasswd.max_users:</strong> 最大用户数（-1 表示不允许注册，0 表示不允许注册，> 0 表示允许注册）</p>
          <p><strong>auth.htpasswd.file:</strong> htpasswd 文件路径</p>
          <p><strong>packages:</strong> 包访问权限配置</p>
          <p><strong>uplinks:</strong> 上游源配置</p>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, computed, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ArrowLeft, Save, RotateCcw, Code, AlertTriangle, FileText, Loader2 } from 'lucide-vue-next'
import { npmApi } from '../api/services'
import Skeleton from '../components/common/Skeleton.vue'
import ConfigForm from '../components/npm/ConfigForm.vue'
import { message } from '../utils/message'
import { useAppStore } from '../stores/app'

interface NpmRegistry {
  id: string
  name: string
  registry: string
  isDefault: boolean
  enabled: boolean
}

const route = useRoute()
const router = useRouter()

const loading = ref(false)
const saving = ref(false)
const error = ref<string | null>(null)
const registry = ref<NpmRegistry | null>(null)
const configContent = ref('')
const originalConfigContent = ref('')
const configPath = ref('')
const verdaccioRunning = ref(false)

// 模式切换
const editMode = ref<'code' | 'form'>('code')

// 表单模式相关
const configObject = ref<any>({})
const originalConfigObject = ref<any>({})
const configSchema = ref<any>({})
const formLoading = ref(false)
const formError = ref<string | null>(null)

const hasChanges = computed(() => {
  return configContent.value !== originalConfigContent.value
})

const hasFormChanges = computed(() => {
  return JSON.stringify(configObject.value) !== JSON.stringify(originalConfigObject.value)
})

// 重启状态
const restarting = ref(false)
const restartProgress = ref(0)
const restartMessage = ref('')
const appStore = useAppStore()

// WebSocket 事件监听
function setupWebSocketListeners() {
  const socket = appStore.socket
  if (!socket) {
    console.warn('[Verdaccio Config] WebSocket 未初始化')
    return
  }

  // 先移除旧的监听器，避免重复注册
  removeWebSocketListeners()

  // 加入 Verdaccio 房间（如果 socket 已连接）
  const registryId = route.params.id as string
  if (socket.connected && registryId) {
    socket.emit('joinRoom', { room: `verdaccio:${registryId}` })
    console.log(`[Verdaccio Config] 已加入房间: verdaccio:${registryId}`)
  }

  // 监听连接事件，连接后加入房间
  const onConnect = () => {
    if (registryId) {
      socket.emit('joinRoom', { room: `verdaccio:${registryId}` })
      console.log(`[Verdaccio Config] WebSocket 连接后加入房间: verdaccio:${registryId}`)
    }
  }
  socket.on('connect', onConnect)

  // 监听 Verdaccio 重启事件
  const onEvent = (event: any) => {
    if (!event || !event.type || !event.data) {
      console.warn('[Verdaccio Config] 收到无效的 WebSocket 事件:', event)
      return
    }
    
    const currentRegistryId = route.params.id as string
    
    // 只处理当前仓库的事件
    if (event.data.registryId && event.data.registryId !== currentRegistryId) {
      console.log(`[Verdaccio Config] 忽略其他仓库的事件: ${event.data.registryId} !== ${currentRegistryId}`)
      return
    }
    
    console.log(`[Verdaccio Config] 收到 WebSocket 事件: ${event.type}`, event.data)
    
    switch (event.type) {
      case 'verdaccio:restart:start':
        restarting.value = true
        restartProgress.value = 0
        restartMessage.value = event.data.message || '开始重启 Verdaccio 服务...'
        message.info(restartMessage.value)
        break
        
      case 'verdaccio:restart:stopping':
        restarting.value = true
        restartProgress.value = event.data.progress || 25
        restartMessage.value = event.data.message || '正在停止 Verdaccio 服务...'
        break
        
      case 'verdaccio:restart:starting':
        restarting.value = true
        restartProgress.value = event.data.progress || 75
        restartMessage.value = event.data.message || '正在启动 Verdaccio 服务...'
        break
        
      case 'verdaccio:restart:complete':
        restarting.value = false
        restartProgress.value = 100
        restartMessage.value = event.data.message || 'Verdaccio 服务重启成功'
        message.success(restartMessage.value)
        
        // 重启完成后更新配置和服务状态
        setTimeout(async () => {
          await checkVerdaccioStatus()
          await loadConfig()
          if (editMode.value === 'form') {
            await loadConfigParsed()
          }
          restartProgress.value = 0
          restartMessage.value = ''
        }, 500)
        break
        
      case 'verdaccio:restart:error':
        restarting.value = false
        restartProgress.value = 0
        restartMessage.value = event.data.message || '重启失败'
        message.error(restartMessage.value)
        setTimeout(() => {
          restartMessage.value = ''
        }, 3000)
        break
        
      case 'verdaccio:config:saved':
        // 配置保存事件（已在保存时处理，这里可以用于日志）
        console.log('[Verdaccio Config] 配置已保存')
        break
    }
  }
  socket.on('event', onEvent)
}

function removeWebSocketListeners() {
  const socket = appStore.socket
  if (!socket) return
  
  // 移除所有事件监听器
  socket.off('event')
  socket.off('connect')
}

// 监听模式切换，加载对应的数据
watch(editMode, async (newMode) => {
  if (newMode === 'form' && Object.keys(configSchema.value).length === 0) {
    await loadConfigSchema()
  }
  if (newMode === 'form' && Object.keys(configObject.value).length === 0) {
    await loadConfigParsed()
  }
})

async function loadRegistry() {
  const id = route.params.id as string
  if (!id) {
    error.value = '仓库 ID 不存在'
    return
  }

  try {
    const response = await npmApi.getRegistry(id)
    if (response.success) {
      registry.value = response.data
    } else {
      error.value = response.message || '加载仓库信息失败'
    }
  } catch (err: any) {
    error.value = err.message || '加载仓库信息失败'
  }
}

async function loadConfig() {
  const id = route.params.id as string
  if (!id) {
    error.value = '仓库 ID 不存在'
    return
  }

  loading.value = true
  error.value = null

  try {
    const response = await npmApi.getVerdaccioConfig(id)
    if (response.success && response.data) {
      configContent.value = response.data.content
      originalConfigContent.value = response.data.content
      configPath.value = response.data.path
    } else {
      error.value = response.message || '加载配置失败'
    }
  } catch (err: any) {
    error.value = err.message || '加载配置失败'
  } finally {
    loading.value = false
  }
}

async function checkVerdaccioStatus() {
  try {
    const response = await npmApi.getLocalVerdaccioStatus()
    if (response.success && response.data) {
      verdaccioRunning.value = response.data.running || false
    }
  } catch {
    verdaccioRunning.value = false
  }
}

async function handleSave() {
  if (!hasChanges.value) {
    message.warning('配置未修改')
    return
  }

  const id = route.params.id as string
  if (!id) {
    message.error('仓库 ID 不存在')
    return
  }

  saving.value = true

  try {
    // 总是传递 restart: true，让后端判断 Verdaccio 是否在运行并决定是否重启
    const response = await npmApi.saveVerdaccioConfig(id, configContent.value, true)
    
    if (response.success) {
      originalConfigContent.value = configContent.value
      
      // 如果正在重启，显示保存成功消息，并设置重启状态
      if (response.data?.restarted) {
        message.success(response.message || '配置保存成功，Verdaccio 服务正在重启...')
        // 设置重启状态，等待 WebSocket 事件更新进度
        restarting.value = true
        restartProgress.value = 0
        restartMessage.value = '配置保存成功，正在重启 Verdaccio 服务...'
        
        // 确保 WebSocket 已连接并加入房间
        const socket = appStore.socket
        if (socket) {
          const registryId = route.params.id as string
          if (socket.connected) {
            socket.emit('joinRoom', { room: `verdaccio:${registryId}` })
          } else {
            // 如果未连接，尝试连接
            appStore.connectWebSocket()
          }
        }
        
        // 设置超时：如果 30 秒内没有收到重启完成事件，显示提示并重置状态
        setTimeout(() => {
          if (restarting.value) {
            console.warn('[Verdaccio Config] 重启超时，未收到完成事件')
            restarting.value = false
            restartProgress.value = 0
            restartMessage.value = ''
            // 检查服务状态
            checkVerdaccioStatus().then(() => {
              if (verdaccioRunning.value) {
                message.success('配置保存成功，Verdaccio 服务已重启（可能已完成）')
              } else {
                message.warning('配置保存成功，但未检测到 Verdaccio 服务运行状态')
              }
            })
          }
        }, 30000) // 30 秒超时
      } else if (response.data?.restartError) {
        message.warning(response.message || '配置保存成功，但重启服务失败')
      } else if (response.data?.serviceNotRunning) {
        message.success('配置保存成功')
      } else {
        message.success('配置保存成功')
      }
    } else {
      message.error(response.message || '保存配置失败')
    }
  } catch (err: any) {
    message.error(err.message || '保存配置失败')
  } finally {
    saving.value = false
  }
}

function handleReset() {
  if (!confirm('确定要重置配置吗？未保存的修改将丢失。')) {
    return
  }
  configContent.value = originalConfigContent.value
  message.success('配置已重置')
}

function handleFormat() {
  // 简单的 YAML 格式化（保持缩进）
  // 这里可以后续优化为使用 YAML 库进行格式化
  try {
    const lines = configContent.value.split('\n')
    const formatted = lines.map(line => {
      // 移除行尾空格
      return line.trimEnd()
    }).join('\n')
    configContent.value = formatted
    message.success('格式化完成')
  } catch (err: any) {
    message.error('格式化失败: ' + err.message)
  }
}

async function loadConfigSchema() {
  formLoading.value = true
  formError.value = null
  
  try {
    const response = await npmApi.getVerdaccioConfigSchema()
    if (response.success && response.data) {
      configSchema.value = response.data
    } else {
      formError.value = response.message || '加载配置结构失败'
    }
  } catch (err: any) {
    formError.value = err.message || '加载配置结构失败'
  } finally {
    formLoading.value = false
  }
}

async function loadConfigParsed() {
  const id = route.params.id as string
  if (!id) {
    formError.value = '仓库 ID 不存在'
    return
  }

  formLoading.value = true
  formError.value = null

  try {
    const response = await npmApi.getVerdaccioConfigParsed(id)
    if (response.success && response.data) {
      configObject.value = response.data
      originalConfigObject.value = JSON.parse(JSON.stringify(response.data))
    } else {
      formError.value = response.message || '加载配置失败'
    }
  } catch (err: any) {
    formError.value = err.message || '加载配置失败'
  } finally {
    formLoading.value = false
  }
}

async function handleSaveForm() {
  if (!hasFormChanges.value) {
    message.warning('配置未修改')
    return
  }

  const id = route.params.id as string
  if (!id) {
    message.error('仓库 ID 不存在')
    return
  }

  saving.value = true

  try {
    // 总是传递 restart: true，让后端判断 Verdaccio 是否在运行并决定是否重启
    const response = await npmApi.saveVerdaccioConfigParsed(id, configObject.value, true)
    
    if (response.success) {
      originalConfigObject.value = JSON.parse(JSON.stringify(configObject.value))
      
      // 如果正在重启，不立即同步更新（等待 WebSocket 事件完成后更新）
      // 如果不在重启，立即同步更新代码模式的内容
      if (!response.data?.restarted) {
        await loadConfig()
      }
      
      // 根据重启结果显示不同的消息
      if (response.data?.restarted) {
        message.success(response.message || '配置保存成功，Verdaccio 服务正在重启...')
        // 设置重启状态，等待 WebSocket 事件更新进度
        restarting.value = true
        restartProgress.value = 0
        restartMessage.value = '配置保存成功，正在重启 Verdaccio 服务...'
        
        // 确保 WebSocket 已连接并加入房间
        const socket = appStore.socket
        if (socket) {
          const registryId = route.params.id as string
          if (socket.connected) {
            socket.emit('joinRoom', { room: `verdaccio:${registryId}` })
          } else {
            // 如果未连接，尝试连接
            appStore.connectWebSocket()
          }
        }
        
        // 设置超时：如果 30 秒内没有收到重启完成事件，显示提示并重置状态
        setTimeout(() => {
          if (restarting.value) {
            console.warn('[Verdaccio Config] 重启超时，未收到完成事件')
            restarting.value = false
            restartProgress.value = 0
            restartMessage.value = ''
            // 检查服务状态
            checkVerdaccioStatus().then(() => {
              if (verdaccioRunning.value) {
                message.success('配置保存成功，Verdaccio 服务已重启（可能已完成）')
              } else {
                message.warning('配置保存成功，但未检测到 Verdaccio 服务运行状态')
              }
            })
          }
        }, 30000) // 30 秒超时
      } else if (response.data?.restartError) {
        message.warning(response.message || '配置保存成功，但重启服务失败')
      } else if (response.data?.serviceNotRunning) {
        message.success('配置保存成功')
      } else {
        message.success('配置保存成功')
      }
    } else {
      message.error(response.message || '保存配置失败')
    }
  } catch (err: any) {
    message.error(err.message || '保存配置失败')
  } finally {
    saving.value = false
  }
}

function handleResetForm() {
  if (!confirm('确定要重置配置吗？未保存的修改将丢失。')) {
    return
  }
  configObject.value = JSON.parse(JSON.stringify(originalConfigObject.value))
  message.success('配置已重置')
}

function goBack() {
  router.push(`/npm/${route.params.id}`)
}

onMounted(async () => {
  await loadRegistry()
  await loadConfig()
  await checkVerdaccioStatus()
  
  // 设置 WebSocket 监听
  setupWebSocketListeners()
  
  // 确保 WebSocket 已连接
  if (!appStore.isConnected && !appStore.socket) {
    appStore.connectWebSocket()
  }
})

onUnmounted(() => {
  // 清理 WebSocket 监听
  removeWebSocketListeners()
})
</script>

<style scoped>
.npm-verdaccio-config-page {
  padding: var(--size-spacing-xl);
  max-width: 1400px;
  margin: 0 auto;
}

.page-header {
  display: flex;
  align-items: center;
  gap: var(--size-spacing-md);
  margin-bottom: var(--size-spacing-xl);
}

.btn-back {
  display: flex;
  align-items: center;
  gap: var(--size-spacing-xs);
  padding: var(--size-spacing-sm) var(--size-spacing-md);
  background: var(--color-bg-component);
  color: var(--color-text-primary);
  border: 1px solid var(--color-border-light);
  border-radius: var(--size-radius-md);
  cursor: pointer;
  transition: all 0.2s ease;
}

.btn-back:hover {
  background: var(--color-bg-component-hover);
  border-color: var(--theme-color-primary);
  color: var(--theme-color-primary);
}

.page-header h1 {
  font-size: var(--font-size-2xl);
  font-weight: var(--size-font-weight-semibold);
  margin: 0;
  color: var(--color-text-primary);
}

.skeleton-container {
  padding: var(--size-spacing-xl);
}

.error-message {
  text-align: center;
  padding: var(--size-spacing-xl);
  color: var(--color-danger-default);
}

.config-content {
  display: flex;
  flex-direction: column;
  gap: var(--size-spacing-xl);
}

.config-info {
  background: var(--color-bg-container);
  border: 1px solid var(--color-border-light);
  border-radius: var(--size-radius-lg);
  padding: var(--size-spacing-lg);
}

.info-item {
  display: flex;
  gap: var(--size-spacing-md);
  margin-bottom: var(--size-spacing-sm);
}

.info-label {
  font-size: var(--font-size-sm);
  color: var(--color-text-secondary);
  font-weight: var(--size-font-weight-medium);
  min-width: 120px;
}

.info-value {
  font-size: var(--font-size-base);
  color: var(--color-text-primary);
  font-family: monospace;
}

.warning-banner {
  display: flex;
  align-items: center;
  gap: var(--size-spacing-sm);
  padding: var(--size-spacing-md);
  background: var(--color-warning-light);
  color: var(--color-warning-default);
  border-radius: var(--size-radius-md);
  margin-top: var(--size-spacing-md);
  font-size: var(--font-size-sm);
}

.restart-banner {
  display: flex;
  align-items: center;
  gap: var(--size-spacing-md);
  padding: var(--size-spacing-md);
  background: var(--theme-color-primary-light);
  color: var(--theme-color-primary);
  border-radius: var(--size-radius-md);
  margin-top: var(--size-spacing-md);
  font-size: var(--font-size-sm);
}

.restart-info {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: var(--size-spacing-xs);
}

.restart-message {
  font-weight: var(--size-font-weight-medium);
}

.restart-progress {
  width: 100%;
  height: 4px;
  background: rgba(255, 255, 255, 0.3);
  border-radius: 2px;
  overflow: hidden;
}

.progress-bar {
  height: 100%;
  background: var(--theme-color-primary);
  transition: width 0.3s ease;
}

.spinning {
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

.config-editor-section {
  background: var(--color-bg-container);
  border: 1px solid var(--color-border-light);
  border-radius: var(--size-radius-lg);
  padding: var(--size-spacing-lg);
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: var(--size-spacing-lg);
}

.section-header h2 {
  font-size: var(--font-size-lg);
  font-weight: var(--size-font-weight-semibold);
  margin: 0;
  color: var(--color-text-primary);
}

.header-actions {
  display: flex;
  gap: var(--size-spacing-md);
  align-items: center;
}

.editor-container {
  border: 1px solid var(--color-border-light);
  border-radius: var(--size-radius-md);
  overflow: hidden;
  background: var(--color-bg-component);
}

.config-editor {
  width: 100%;
  min-height: 600px;
  padding: var(--size-spacing-md);
  font-family: 'Consolas', 'Monaco', 'Courier New', monospace;
  font-size: 14px;
  line-height: 1.6;
  color: var(--color-text-primary);
  background: var(--color-bg-component);
  border: none;
  resize: vertical;
  outline: none;
}

.config-editor:focus {
  outline: none;
}

.config-editor:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.mode-switcher {
  background: var(--color-bg-container);
  border: 1px solid var(--color-border-light);
  border-radius: var(--size-radius-lg);
  padding: var(--size-spacing-md);
}

.mode-tabs {
  display: flex;
  gap: var(--size-spacing-sm);
}

.mode-tab {
  display: flex;
  align-items: center;
  gap: var(--size-spacing-xs);
  padding: var(--size-spacing-sm) var(--size-spacing-md);
  border: 1px solid var(--color-border-light);
  border-radius: var(--size-radius-md);
  background: var(--color-bg-component);
  color: var(--color-text-secondary);
  cursor: pointer;
  transition: all 0.2s ease;
}

.mode-tab:hover {
  background: var(--color-bg-component-hover);
  color: var(--color-text-primary);
}

.mode-tab.active {
  background: var(--theme-color-primary);
  color: white;
  border-color: var(--theme-color-primary);
}

.config-form-section {
  background: var(--color-bg-container);
  border: 1px solid var(--color-border-light);
  border-radius: var(--size-radius-lg);
  padding: var(--size-spacing-lg);
}

.form-loading,
.form-error {
  padding: var(--size-spacing-xl);
  text-align: center;
}

.form-error {
  color: var(--color-danger-default);
}

.form-container {
  margin-top: var(--size-spacing-md);
}

.config-docs {
  background: var(--color-bg-container);
  border: 1px solid var(--color-border-light);
  border-radius: var(--size-radius-lg);
  padding: var(--size-spacing-lg);
}

.config-docs h3 {
  font-size: var(--font-size-lg);
  font-weight: var(--size-font-weight-semibold);
  margin: 0 0 var(--size-spacing-md) 0;
  color: var(--color-text-primary);
}

.docs-content {
  display: flex;
  flex-direction: column;
  gap: var(--size-spacing-sm);
}

.docs-content p {
  margin: 0;
  font-size: var(--font-size-sm);
  color: var(--color-text-secondary);
  line-height: 1.6;
}

.docs-content strong {
  color: var(--color-text-primary);
  font-weight: var(--size-font-weight-semibold);
}

.btn-primary,
.btn-secondary {
  display: flex;
  align-items: center;
  gap: var(--size-spacing-xs);
  padding: var(--size-spacing-sm) var(--size-spacing-md);
  border: none;
  border-radius: var(--size-radius-md);
  font-size: var(--font-size-base);
  cursor: pointer;
  transition: all 0.2s ease;
}

.btn-primary {
  background: var(--theme-color-primary);
  color: white;
}

.btn-primary:hover:not(:disabled) {
  background: var(--theme-color-primary-hover);
}

.btn-primary:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.btn-secondary {
  background: var(--color-bg-component);
  color: var(--color-text-primary);
  border: 1px solid var(--color-border-light);
}

.btn-secondary:hover:not(:disabled) {
  background: var(--color-bg-component-hover);
  border-color: var(--theme-color-primary);
}

.btn-secondary:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}
</style>


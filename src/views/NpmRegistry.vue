<template>
  <div class="npm-registry-page">
    <div class="page-header">
      <h1>NPM 仓库管理</h1>
      <div class="header-actions">
        <button
          v-if="selectedRegistries.length > 0"
          class="btn-danger"
          @click="handleBatchDelete"
        >
          <Trash2 :size="18" />
          批量删除 ({{ selectedRegistries.length }})
        </button>
        <button 
          v-if="!verdaccioRunning"
          class="btn-secondary" 
          @click="handleStartVerdaccio"
        >
          <Server :size="18" />
          启动本地 Verdaccio
        </button>
        <button 
          v-if="verdaccioRunning && verdaccioStartInfo"
          class="btn-secondary" 
          @click="handleShowVerdaccioInfo"
        >
          <Server :size="18" />
          服务信息
        </button>
        <button 
          v-if="verdaccioRunning"
          class="btn-secondary btn-danger" 
          @click="handleStopVerdaccio"
        >
          <Server :size="18" />
          停止本地 Verdaccio
        </button>
        <button class="btn-primary" @click="showAddDialog = true">
          <Plus :size="18" />
          添加仓库
        </button>
      </div>
    </div>

    <div v-if="loading" class="loading">加载中...</div>
    <div v-else-if="error" class="error-message">{{ error }}</div>
    <div v-else-if="registries.length === 0" class="empty-state">
      <Package :size="48" />
      <p>暂无仓库配置</p>
      <button class="btn-primary" @click="showAddDialog = true">添加第一个仓库</button>
    </div>
    <div v-else class="registries-grid">
      <div
        v-for="registry in registries"
        :key="registry.id"
        class="registry-card"
        :class="{ 
          'registry-card--default': registry.isDefault,
          'registry-card--selected': isSelected(registry.id)
        }"
        @click="handleCardClick(registry)"
      >
        <div class="registry-header">
          <div class="registry-info">
            <h3 class="registry-name">
              {{ registry.name }}
              <span v-if="registry.isDefault" class="badge badge--default">默认</span>
            </h3>
            <p class="registry-url">{{ registry.registry }}</p>
          </div>
          <div class="registry-actions">
            <input
              type="checkbox"
              :checked="isSelected(registry.id)"
              @change.stop="toggleSelect(registry.id)"
              @click.stop
              class="registry-checkbox"
              :disabled="registry.isDefault"
              :title="registry.isDefault ? '默认仓库不能删除' : '选择此仓库'"
            />
          </div>
        </div>

        <div class="registry-footer">
          <button
            v-if="isLocalVerdaccio(registry)"
            class="btn-secondary"
            @click.stop="handleRestartVerdaccio(registry)"
            :disabled="restartingRegistryId === registry.id"
          >
            <RotateCcw :size="16" :class="{ spinning: restartingRegistryId === registry.id }" />
            {{ restartingRegistryId === registry.id ? '重启中...' : '重启' }}
          </button>
          <button
            class="btn-secondary"
            @click.stop="handleEdit(registry)"
          >
            <Edit :size="16" />
            编辑
          </button>
          <button
            v-if="!registry.isDefault"
            class="btn-secondary btn-danger"
            @click.stop="handleDelete(registry)"
          >
            <Trash2 :size="16" />
            删除
          </button>
        </div>
      </div>
    </div>

    <!-- 添加/编辑对话框 -->
    <Modal
      v-model="showAddDialog"
      :title="editingRegistry ? '编辑仓库' : '添加仓库'"
      @close="resetForm"
    >
      <div class="form-group">
        <label>仓库名称</label>
        <Input v-model="formData.name" placeholder="例如: npm官方源" />
      </div>
      <div class="form-group">
        <label>仓库 URL</label>
        <Input v-model="formData.registry" placeholder="例如: https://registry.npmjs.org/" />
      </div>
      <div class="form-group">
        <label>
          <input type="checkbox" v-model="formData.isDefault" />
          设为默认仓库
        </label>
      </div>
      <div class="form-group">
        <label>
          <input type="checkbox" v-model="formData.enabled" />
          启用
        </label>
      </div>
      <template #footer>
        <button class="btn-secondary" @click="resetForm">取消</button>
        <button class="btn-primary" @click="handleSaveRegistry">确认</button>
      </template>
    </Modal>

    <!-- 删除确认对话框 -->
    <Modal
      v-model="showDeleteDialog"
      title="确认删除"
      @close="showDeleteDialog = false"
    >
      <p v-if="deletingRegistry" class="delete-confirm-text">
        确定要删除仓库 "{{ deletingRegistry.name }}" 吗？此操作不可恢复。
      </p>
      <p v-else-if="deletingIds.length > 0" class="delete-confirm-text">
        确定要删除选中的 {{ deletingIds.length }} 个仓库吗？此操作不可恢复。
      </p>
      <template #footer>
        <button class="btn-secondary" @click="showDeleteDialog = false">取消</button>
        <button class="btn-danger" @click="confirmDelete">确认删除</button>
      </template>
    </Modal>

    <!-- Verdaccio 启动对话框 -->
    <VerdaccioStartDialog
      v-model="showVerdaccioDialog"
      ref="verdaccioDialogRef"
      @close="showVerdaccioDialog = false"
    />
    
    <!-- Verdaccio 重启对话框 -->
    <VerdaccioStartDialog
      v-model="showRestartDialog"
      ref="restartDialogRef"
      title="重启 Verdaccio 服务"
      log-title="重启日志"
      @close="handleRestartDialogClose"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { Plus, Package, Edit, Trash2, Server, RotateCcw } from 'lucide-vue-next'
import { npmApi } from '../api/services'
import Modal from '../components/common/Modal.vue'
import Input from '../components/common/Input.vue'
import VerdaccioStartDialog from '../components/common/VerdaccioStartDialog.vue'
import { message } from '../utils/message'
import { useAppStore } from '../stores/app'

interface NpmRegistry {
  id: string
  name: string
  registry: string
  isDefault: boolean
  enabled: boolean
  order: number
  isLoggedIn: boolean
  username: string | null
  email: string | null
}

const router = useRouter()
const appStore = useAppStore()
const loading = ref(false)
const error = ref<string | null>(null)
const registries = ref<NpmRegistry[]>([])
const selectedRegistries = ref<string[]>([])

const showAddDialog = ref(false)
const editingRegistry = ref<NpmRegistry | null>(null)
const formData = ref({
  name: '',
  registry: '',
  isDefault: false,
  enabled: true,
})

const showDeleteDialog = ref(false)
const deletingRegistry = ref<NpmRegistry | null>(null)
const deletingIds = ref<string[]>([])
const showVerdaccioDialog = ref(false)
const verdaccioDialogRef = ref<InstanceType<typeof VerdaccioStartDialog> | null>(null)
const showRestartDialog = ref(false)
const restartDialogRef = ref<InstanceType<typeof VerdaccioStartDialog> | null>(null)
const verdaccioRunning = ref(false)
const verdaccioStartInfo = ref<{ port: number; url: string; logs: string[] } | null>(null)
const restartingRegistryId = ref<string | null>(null)
const restartEventHandler = ref<((event: any) => void) | null>(null)

async function checkVerdaccioStatus() {
  try {
    const response = await npmApi.getLocalVerdaccioStatus()
    if (response.success && response.data) {
      verdaccioRunning.value = response.data.running || false
      
      // 如果服务正在运行，设置启动信息
      if (response.data.running && response.data.port) {
        verdaccioStartInfo.value = {
          port: response.data.port,
          url: response.data.url || `http://localhost:${response.data.port}/`,
          logs: [],
        }
      } else {
        // 如果服务未运行，清除启动信息
        verdaccioStartInfo.value = null
      }
    } else {
      verdaccioRunning.value = false
      verdaccioStartInfo.value = null
    }
  } catch (err: any) {
    // 如果检查失败，假设服务未运行
    verdaccioRunning.value = false
    verdaccioStartInfo.value = null
  }
}

async function loadRegistries() {
  loading.value = true
  error.value = null
  
  try {
    const response = await npmApi.getRegistries()
    if (response.success) {
      registries.value = response.data
      // 清除已删除项的选中状态
      selectedRegistries.value = selectedRegistries.value.filter(id => 
        registries.value.some(r => r.id === id)
      )
    } else {
      error.value = '加载仓库列表失败'
    }
  } catch (err: any) {
    error.value = err.message || '加载仓库列表失败'
  } finally {
    loading.value = false
  }
}

function isSelected(id: string): boolean {
  return selectedRegistries.value.includes(id)
}

function toggleSelect(id: string) {
  const index = selectedRegistries.value.indexOf(id)
  if (index > -1) {
    selectedRegistries.value.splice(index, 1)
  } else {
    selectedRegistries.value.push(id)
  }
}

function handleCardClick(registry: NpmRegistry) {
  // 跳转到详情页
  router.push(`/npm/${registry.id}`)
}

function isLocalVerdaccio(registry: NpmRegistry): boolean {
  const registryUrl = registry.registry.toLowerCase().replace(/\/$/, '')
  const registryName = (registry.name || '').toLowerCase()
  const isLocalhost = registryUrl.includes('localhost') || registryUrl.includes('127.0.0.1')
  const hasVerdaccioName = registryName.includes('verdaccio') || registryName.includes('本地 verdaccio')
  return isLocalhost && hasVerdaccioName
}

async function handleRestartVerdaccio(registry: NpmRegistry) {
  if (restartingRegistryId.value === registry.id) {
    return // 正在重启中，忽略重复点击
  }
  
  restartingRegistryId.value = registry.id
  
  // 显示重启对话框
  showRestartDialog.value = true
  
  // 等待对话框渲染完成
  await new Promise(resolve => setTimeout(resolve, 100))
  
  const dialog = restartDialogRef.value
  if (!dialog) {
    restartingRegistryId.value = null
    return
  }
  
  // 重置对话框状态
  dialog.reset()
  dialog.setStatus('starting', '正在重启 Verdaccio 服务', '请稍候...')
  dialog.addLog('开始重启 Verdaccio 服务...', 'info')
  
  // 确保 WebSocket 已连接并加入房间
  const socket = appStore.socket
  if (socket) {
    if (socket.connected) {
      socket.emit('joinRoom', { room: `verdaccio:${registry.id}` })
    } else {
      appStore.connectWebSocket()
    }
  }
  
  // 设置 WebSocket 事件监听器（临时）
  let eventHandler: ((event: any) => void) | null = null
  
  // 保存事件处理器引用，以便在对话框关闭时清理
  restartEventHandler.value = null
  
  if (socket) {
    eventHandler = (event: any) => {
      if (!event || !event.type || !event.data) return
      
      // 只处理当前仓库的重启事件
      if (event.data.registryId && event.data.registryId !== registry.id) {
        return
      }
      
      switch (event.type) {
        case 'verdaccio:restart:start':
          dialog.setStatus('starting', '开始重启', event.data.message || '开始重启 Verdaccio 服务...')
          dialog.addLog(event.data.message || '开始重启 Verdaccio 服务...', 'info')
          break
          
        case 'verdaccio:restart:stopping':
          dialog.setStatus('starting', '正在停止', event.data.message || '正在停止 Verdaccio 服务...')
          dialog.addLog(event.data.message || '正在停止 Verdaccio 服务...', 'info')
          break
          
        case 'verdaccio:restart:starting':
          dialog.setStatus('starting', '正在启动', event.data.message || '正在启动 Verdaccio 服务...')
          dialog.addLog(event.data.message || '正在启动 Verdaccio 服务...', 'info')
          break
          
        case 'verdaccio:restart:complete':
          dialog.setStatus('success', '重启成功', event.data.message || 'Verdaccio 服务重启成功')
          dialog.addLog(event.data.message || 'Verdaccio 服务重启成功', 'success')
          if (event.data.port) {
            dialog.addLog(`服务地址: http://localhost:${event.data.port}/`, 'info')
          }
          // 刷新仓库列表和服务状态
          Promise.all([
            loadRegistries(),
            checkVerdaccioStatus(),
          ])
          // 移除事件监听器
          if (socket && eventHandler) {
            socket.off('event', eventHandler)
          }
          restartingRegistryId.value = null
          break
          
        case 'verdaccio:restart:error':
          dialog.setStatus('error', '重启失败', event.data.message || '重启失败')
          dialog.addLog(event.data.message || '重启失败', 'error')
          // 移除事件监听器
          if (socket && eventHandler) {
            socket.off('event', eventHandler)
          }
          restartingRegistryId.value = null
          break
      }
    }
    
    socket.on('event', eventHandler)
    restartEventHandler.value = eventHandler
  }
  
  try {
    const response = await npmApi.restartVerdaccio(registry.id)
    
    if (response.success && response.data) {
      // 如果后端返回了日志，显示它们（逐步显示）
      if (response.data.logs && response.data.logs.length > 0) {
        const showLogsProgressively = async (logMessages: string[]) => {
          for (const log of logMessages) {
            await new Promise(resolve => setTimeout(resolve, 50))
            let type: 'info' | 'success' | 'error' | 'warning' = 'info'
            const lowerLog = log.toLowerCase()
            if (lowerLog.includes('错误') || lowerLog.includes('失败') || lowerLog.includes('error') || lowerLog.includes('failed')) {
              type = 'error'
            } else if (lowerLog.includes('成功') || lowerLog.includes('完成') || lowerLog.includes('success') || lowerLog.includes('已启动') || lowerLog.includes('已停止')) {
              type = 'success'
            } else if (lowerLog.includes('警告') || lowerLog.includes('warning')) {
              type = 'warning'
            }
            // 移除时间戳（如果存在）
            const message = log.replace(/^\[\d{2}:\d{2}:\d{2}\]\s*/, '')
            dialog.addLog(message, type)
          }
        }
        await showLogsProgressively(response.data.logs)
      }
      
      // 如果 WebSocket 没有收到完成事件，等待一下后检查状态
      setTimeout(() => {
        if (dialog && dialog.status === 'starting') {
          // 可能 WebSocket 事件没有到达，检查服务状态
          checkVerdaccioStatus().then(() => {
            if (verdaccioRunning.value && dialog) {
              dialog.setStatus('success', '重启成功', 'Verdaccio 服务已重启')
              dialog.addLog('Verdaccio 服务重启成功', 'success')
            }
            if (socket && eventHandler) {
              socket.off('event', eventHandler)
            }
            restartingRegistryId.value = null
          })
        }
      }, 10000) // 10 秒超时
    } else {
      const errorMsg = response.message || '重启失败'
      dialog.setStatus('error', '重启失败', errorMsg)
      dialog.addLog(`重启失败: ${errorMsg}`, 'error')
      if (socket && eventHandler) {
        socket.off('event', eventHandler)
      }
      restartingRegistryId.value = null
    }
  } catch (err: any) {
    let errorMsg = err.message || '重启 Verdaccio 失败'
    dialog.setStatus('error', '重启失败', errorMsg)
    dialog.addLog(`错误: ${errorMsg}`, 'error')
    if (socket && eventHandler) {
      socket.off('event', eventHandler)
    }
    restartingRegistryId.value = null
  }
}

function handleRestartDialogClose() {
  showRestartDialog.value = false
  
  // 清理 WebSocket 事件监听器
  const socket = appStore.socket
  if (socket && restartEventHandler.value) {
    socket.off('event', restartEventHandler.value)
    restartEventHandler.value = null
  }
  
  // 重置重启状态
  restartingRegistryId.value = null
}

function handleEdit(registry: NpmRegistry) {
  editingRegistry.value = registry
  formData.value = {
    name: registry.name,
    registry: registry.registry,
    isDefault: registry.isDefault,
    enabled: registry.enabled,
  }
  showAddDialog.value = true
}

function resetForm() {
  editingRegistry.value = null
  formData.value = {
    name: '',
    registry: '',
    isDefault: false,
    enabled: true,
  }
  showAddDialog.value = false
}

async function handleSaveRegistry() {
  if (!formData.value.name || !formData.value.registry) {
    message.error('请填写完整信息')
    return
  }

  try {
    if (editingRegistry.value) {
      await npmApi.updateRegistry(editingRegistry.value.id, formData.value)
      message.success('更新成功')
    } else {
      await npmApi.createRegistry(formData.value)
      message.success('添加成功')
    }
    resetForm()
    await loadRegistries()
  } catch (err: any) {
    message.error(err.message || '操作失败')
  }
}

function handleDelete(registry: NpmRegistry) {
  deletingRegistry.value = registry
  deletingIds.value = [registry.id]
  showDeleteDialog.value = true
}

function handleBatchDelete() {
  if (selectedRegistries.value.length === 0) {
    message.warning('请先选择要删除的仓库')
    return
  }
  
  deletingRegistry.value = null
  deletingIds.value = [...selectedRegistries.value]
  showDeleteDialog.value = true
}

async function confirmDelete() {
  if (deletingIds.value.length === 0) {
    showDeleteDialog.value = false
    return
  }

  try {
    // 批量删除
    await Promise.all(
      deletingIds.value.map(id => npmApi.deleteRegistry(id))
    )
    
    message.success(`成功删除 ${deletingIds.value.length} 个仓库`)
    showDeleteDialog.value = false
    deletingRegistry.value = null
    deletingIds.value = []
    selectedRegistries.value = []
    await loadRegistries()
  } catch (err: any) {
    message.error(err.message || '删除失败')
  }
}

async function handleStartVerdaccio() {
  // 显示对话框
  showVerdaccioDialog.value = true
  
  // 等待对话框渲染完成
  await new Promise(resolve => setTimeout(resolve, 100))
  
  const dialog = verdaccioDialogRef.value
  if (!dialog) {
    return
  }
  
  // 重置对话框状态
  dialog.reset()
  dialog.setStatus('starting', '正在启动 Verdaccio 服务', '请稍候...')
  dialog.addLog('开始启动本地 Verdaccio 服务...', 'info')
  
  try {
    // 模拟实时显示日志（逐步显示后端返回的日志）
    const showLogsProgressively = async (logMessages: string[]) => {
      for (const log of logMessages) {
        await new Promise(resolve => setTimeout(resolve, 100))
        // 根据日志内容判断类型
        let type: 'info' | 'success' | 'error' | 'warning' = 'info'
        if (log.includes('错误') || log.includes('失败') || log.includes('error') || log.includes('Error')) {
          type = 'error'
        } else if (log.includes('成功') || log.includes('完成') || log.includes('success') || log.includes('已创建') || log.includes('可用')) {
          type = 'success'
        } else if (log.includes('警告') || log.includes('warning') || log.includes('Warning')) {
          type = 'warning'
        }
        // 移除时间戳（如果存在）
        const message = log.replace(/^\[\d{2}:\d{2}:\d{2}\]\s*/, '')
        dialog.addLog(message, type)
      }
    }
    
    const response = await npmApi.startLocalVerdaccio()
    
    if (response.success && response.data) {
      // 显示后端返回的日志
      if (response.data.logs && response.data.logs.length > 0) {
        await showLogsProgressively(response.data.logs)
      }
      
      dialog.addLog(`Verdaccio 已成功启动在端口 ${response.data.port}`, 'success')
      dialog.addLog(`服务地址: ${response.data.url}`, 'info')
      dialog.setStatus('success', '启动成功', `Verdaccio 已启动在端口 ${response.data.port}`)
      
      // 保存启动信息
      verdaccioStartInfo.value = {
        port: response.data.port,
        url: response.data.url,
        logs: response.data.logs || [],
      }
      
      // 更新服务状态
      verdaccioRunning.value = true
      
      // 刷新仓库列表
      await loadRegistries()
      
      // 不自动关闭，让用户手动关闭
    } else {
      const errorMsg = response.message || '启动失败'
      dialog.addLog(`启动失败: ${errorMsg}`, 'error')
      dialog.setStatus('error', '启动失败', errorMsg, errorMsg)
    }
  } catch (err: any) {
    let errorMsg = err.message || '启动 Verdaccio 失败'
    
    // 过滤掉 "signal is aborted" 相关的错误，这些是正常的超时情况
    if (errorMsg.includes('signal is aborted') || errorMsg.includes('aborted without reason')) {
      errorMsg = '启动超时，请检查 Verdaccio 服务是否正常启动'
    }
    
    dialog.addLog(`错误: ${errorMsg}`, 'error')
    
    // 检查是否是 Verdaccio 未安装的错误
    if (errorMsg.includes('Verdaccio 未安装') || (errorMsg.includes('verdaccio') && errorMsg.includes('未安装'))) {
      dialog.addLog('检测到 Verdaccio 未安装，开始自动安装...', 'info')
      dialog.setStatus('starting', '正在自动安装 Verdaccio', '请稍候，这可能需要几分钟...')
      // 自动开始安装，不需要用户确认
      await handleInstallVerdaccio()
      return
    }
    
    // 尝试解析错误详情
    let errorDetails = errorMsg
    if (err.response?.data) {
      // 尝试从响应中获取错误信息
      const responseData = err.response.data
      if (responseData.message) {
        errorDetails = responseData.message
      } else if (responseData.error) {
        errorDetails = responseData.error
      } else if (typeof responseData === 'string') {
        errorDetails = responseData
      } else if (responseData.details) {
        errorDetails = JSON.stringify(responseData.details, null, 2)
      }
    }
    
    // 添加更多日志信息
    if (err.response?.status) {
      dialog.addLog(`HTTP 状态码: ${err.response.status}`, 'error')
    }
    if (err.response?.data?.details) {
      dialog.addLog(`错误详情: ${JSON.stringify(err.response.data.details, null, 2)}`, 'error')
    }
    
    dialog.setStatus('error', '启动失败', errorMsg, errorDetails)
  }
}

async function handleInstallVerdaccio() {
  const dialog = verdaccioDialogRef.value
  if (!dialog) {
    return
  }
  
  dialog.addLog('开始安装 Verdaccio...', 'info')
  dialog.setStatus('starting', '正在自动安装 Verdaccio', '请稍候，这可能需要几分钟...')
  
  try {
    dialog.addLog('执行命令: npm install -g verdaccio', 'info')
    const response = await npmApi.installVerdaccio()
    
    if (response.success) {
      dialog.addLog('Verdaccio 安装成功！', 'success')
      
      // 安装成功后，自动启动
      dialog.addLog('开始启动 Verdaccio 服务...', 'info')
      await handleStartVerdaccioAfterInstall()
    } else {
      const errorMsg = response.message || '安装失败'
      dialog.addLog(`安装失败: ${errorMsg}`, 'error')
      dialog.setStatus('error', '安装失败', errorMsg, errorMsg)
    }
  } catch (err: any) {
    const errorMsg = err.message || '安装 Verdaccio 失败'
    dialog.addLog(`安装错误: ${errorMsg}`, 'error')
    
    // 尝试解析详细的错误信息
    let errorDetails = errorMsg
    if (err.response?.data) {
      const responseData = err.response.data
      if (responseData.message) {
        errorDetails = responseData.message
        dialog.addLog(`错误详情: ${responseData.message}`, 'error')
      }
      if (responseData.details) {
        const detailsStr = typeof responseData.details === 'string' 
          ? responseData.details 
          : JSON.stringify(responseData.details, null, 2)
        errorDetails = detailsStr
        dialog.addLog(`详细错误: ${detailsStr}`, 'error')
      }
    }
    
    dialog.setStatus('error', '安装失败', errorMsg, errorDetails)
  }
}

async function handleStartVerdaccioAfterInstall() {
  const dialog = verdaccioDialogRef.value
  if (!dialog) {
    return
  }
  
  try {
    const response = await npmApi.startLocalVerdaccio()
    
    if (response.success && response.data) {
      // 显示后端返回的日志
      if (response.data.logs && response.data.logs.length > 0) {
        const showLogsProgressively = async (logMessages: string[]) => {
          for (const log of logMessages) {
            await new Promise(resolve => setTimeout(resolve, 100))
            let type: 'info' | 'success' | 'error' | 'warning' = 'info'
            if (log.includes('错误') || log.includes('失败') || log.includes('error') || log.includes('Error')) {
              type = 'error'
            } else if (log.includes('成功') || log.includes('完成') || log.includes('success') || log.includes('已创建') || log.includes('可用')) {
              type = 'success'
            } else if (log.includes('警告') || log.includes('warning') || log.includes('Warning')) {
              type = 'warning'
            }
            const message = log.replace(/^\[\d{2}:\d{2}:\d{2}\]\s*/, '')
            dialog.addLog(message, type)
          }
        }
        await showLogsProgressively(response.data.logs)
      }
      
      dialog.addLog(`Verdaccio 已成功启动在端口 ${response.data.port}`, 'success')
      dialog.addLog(`服务地址: ${response.data.url}`, 'info')
      dialog.setStatus('success', '启动成功', `Verdaccio 已启动在端口 ${response.data.port}`)
      
      // 保存启动信息
      verdaccioStartInfo.value = {
        port: response.data.port,
        url: response.data.url,
        logs: response.data.logs || [],
      }
      
      // 更新服务状态
      verdaccioRunning.value = true
      
      // 刷新仓库列表
      await loadRegistries()
      
      // 不自动关闭，让用户手动关闭
    } else {
      const errorMsg = response.message || '启动失败'
      dialog.addLog(`启动失败: ${errorMsg}`, 'error')
      dialog.setStatus('error', '启动失败', errorMsg, errorMsg)
    }
  } catch (err: any) {
    let errorMsg = err.message || '启动 Verdaccio 失败'
    
    // 过滤掉 "signal is aborted" 相关的错误，这些是正常的超时情况
    if (errorMsg.includes('signal is aborted') || errorMsg.includes('aborted without reason')) {
      errorMsg = '启动超时，请检查 Verdaccio 服务是否正常启动'
    }
    
    dialog.addLog(`错误: ${errorMsg}`, 'error')
    
    let errorDetails = errorMsg
    if (err.response?.data?.message) {
      errorDetails = err.response.data.message
      // 同样过滤错误详情
      if (errorDetails.includes('signal is aborted') || errorDetails.includes('aborted without reason')) {
        errorDetails = '启动超时，请检查 Verdaccio 服务是否正常启动'
      }
    }
    
    dialog.setStatus('error', '启动失败', errorMsg, errorDetails)
  }
}

async function handleShowVerdaccioInfo() {
  if (!verdaccioStartInfo.value) {
    return
  }
  
  // 显示对话框
  showVerdaccioDialog.value = true
  
  // 等待对话框渲染完成
  await new Promise(resolve => setTimeout(resolve, 100))
  
  const dialog = verdaccioDialogRef.value
  if (!dialog) {
    return
  }
  
  // 重置对话框状态并显示之前的日志
  dialog.reset()
  dialog.setStatus('success', '启动成功', `Verdaccio 已启动在端口 ${verdaccioStartInfo.value.port}`)
  
  // 显示之前的日志
  if (verdaccioStartInfo.value.logs && verdaccioStartInfo.value.logs.length > 0) {
    for (const log of verdaccioStartInfo.value.logs) {
      let type: 'info' | 'success' | 'error' | 'warning' = 'info'
      if (log.includes('错误') || log.includes('失败') || log.includes('error') || log.includes('Error')) {
        type = 'error'
      } else if (log.includes('成功') || log.includes('完成') || log.includes('success') || log.includes('已创建') || log.includes('可用')) {
        type = 'success'
      } else if (log.includes('警告') || log.includes('warning') || log.includes('Warning')) {
        type = 'warning'
      }
      const message = log.replace(/^\[\d{2}:\d{2}:\d{2}\]\s*/, '')
      dialog.addLog(message, type)
    }
  }
  
  dialog.addLog(`Verdaccio 已成功启动在端口 ${verdaccioStartInfo.value.port}`, 'success')
  dialog.addLog(`服务地址: ${verdaccioStartInfo.value.url}`, 'info')
}

async function handleStopVerdaccio() {
  if (!confirm('确定要停止本地 Verdaccio 服务吗？')) {
    return
  }
  
  try {
    const response = await npmApi.stopLocalVerdaccio()
    if (response.success) {
      message.success('Verdaccio 服务已停止')
      verdaccioRunning.value = false
      verdaccioStartInfo.value = null // 清除启动信息
      await loadRegistries()
    } else {
      message.error(response.message || '停止服务失败')
    }
  } catch (err: any) {
    const errorMsg = err.message || '停止 Verdaccio 服务失败'
    message.error(errorMsg)
  }
}

onMounted(() => {
  loadRegistries()
  checkVerdaccioStatus()
})

onUnmounted(() => {
  // 清理 WebSocket 事件监听器
  const socket = appStore.socket
  if (socket && restartEventHandler.value) {
    socket.off('event', restartEventHandler.value)
    restartEventHandler.value = null
  }
})
</script>

<style scoped>
.npm-registry-page {
  padding: var(--size-spacing-xl);
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: var(--size-spacing-xl);
}

.page-header h1 {
  font-size: var(--font-size-2xl);
  font-weight: var(--size-font-weight-semibold);
  margin: 0;
  color: var(--color-text-primary);
}

.header-actions {
  display: flex;
  gap: var(--size-spacing-md);
  align-items: center;
}

.loading,
.error-message {
  text-align: center;
  padding: var(--size-spacing-xl);
  color: var(--color-text-secondary);
}

.error-message {
  color: var(--color-danger-default);
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: var(--size-spacing-2xl);
  color: var(--color-text-secondary);
  gap: var(--size-spacing-md);
}

.empty-state svg {
  opacity: 0.5;
}

.registries-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
  gap: var(--size-spacing-lg);
}

.registry-card {
  background: var(--color-bg-container);
  border: 1px solid var(--color-border-light);
  border-radius: var(--size-radius-lg);
  padding: var(--size-spacing-lg);
  transition: all 0.2s ease;
  cursor: pointer;
}

.registry-card:hover {
  border-color: var(--theme-color-primary);
  box-shadow: var(--shadow-md);
}

.registry-card--default {
  border-color: var(--theme-color-primary);
}

.registry-card--selected {
  border-color: var(--theme-color-primary);
  background: var(--theme-color-primary-light);
}

.registry-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: var(--size-spacing-md);
}

.registry-info {
  flex: 1;
}

.registry-name {
  font-size: var(--font-size-lg);
  font-weight: var(--size-font-weight-semibold);
  margin: 0 0 var(--size-spacing-xs) 0;
  color: var(--color-text-primary);
  display: flex;
  align-items: center;
  gap: var(--size-spacing-sm);
}

.registry-url {
  font-size: var(--font-size-sm);
  color: var(--color-text-secondary);
  margin: 0;
  word-break: break-all;
}

.badge {
  display: inline-block;
  padding: 2px 8px;
  border-radius: var(--size-radius-sm);
  font-size: var(--font-size-xs);
  font-weight: var(--size-font-weight-medium);
}

.badge--default {
  background: var(--theme-color-primary-light);
  color: var(--theme-color-primary);
}

.registry-actions {
  display: flex;
  align-items: center;
}

.registry-checkbox {
  width: 18px;
  height: 18px;
  cursor: pointer;
  accent-color: var(--theme-color-primary);
}

.registry-checkbox:disabled {
  cursor: not-allowed;
  opacity: 0.5;
}

.registry-footer {
  display: flex;
  gap: var(--size-spacing-sm);
  align-items: center;
}

.btn-primary,
.btn-secondary,
.btn-danger {
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

.btn-primary:hover {
  background: var(--theme-color-primary-hover);
}

.btn-secondary {
  background: var(--color-bg-component);
  color: var(--color-text-primary);
  border: 1px solid var(--color-border-light);
}

.btn-secondary:hover {
  background: var(--color-bg-component-hover);
  border-color: var(--theme-color-primary);
}

.btn-danger {
  background: var(--color-danger-default);
  color: white;
}

.btn-danger:hover {
  background: var(--color-danger-hover);
}

.btn-secondary.btn-danger {
  background: transparent;
  color: var(--color-danger-default);
  border-color: var(--color-danger-default);
}

.btn-secondary.btn-danger:hover {
  background: var(--color-danger-light);
}

.btn-secondary:disabled {
  opacity: 0.6;
  cursor: not-allowed;
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

.form-group {
  margin-bottom: var(--size-spacing-md);
}

.form-group label {
  display: block;
  margin-bottom: var(--size-spacing-xs);
  font-size: var(--font-size-sm);
  font-weight: var(--size-font-weight-medium);
  color: var(--color-text-primary);
}

.form-group label input[type="checkbox"] {
  margin-right: var(--size-spacing-xs);
  cursor: pointer;
}

.delete-confirm-text {
  color: var(--color-text-primary);
  font-size: var(--font-size-base);
  line-height: 1.6;
  margin: 0;
}
</style>

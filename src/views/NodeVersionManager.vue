<template>
  <div class="node-manager-page">
    <div class="page-header">
      <div class="page-header-text">
        <h1>Node 多版本管理</h1>
        <p class="page-subtitle">
          管理本机的 Node.js 运行时，支持查看当前版本、安装新版本、切换已安装版本,并快速安装常用的版本管理工具。
        </p>
      </div>
      <button class="btn-primary" :disabled="loading" @click="loadAll">
        <RefreshCw :size="18" :class="{ 'icon-spinning': loading }" />
        {{ loading ? '刷新中...' : '刷新数据' }}
      </button>
    </div>

    <div v-if="error" class="error-banner">
      <AlertCircle :size="18" />
      <span>{{ error }}</span>
    </div>

    <NodeManagerSkeleton v-if="loading && !initialLoaded" />

    <div v-else class="content-sections">
      <!-- 概览 -->
      <section class="section summary-section">
        <div class="section-header">
          <h2>运行环境概览</h2>
        </div>
        <div class="summary-grid">
          <div class="summary-card">
            <div class="summary-icon" :class="{ success: !!currentVersion }">
              <Cpu :size="22" />
            </div>
            <div class="summary-body">
              <span class="summary-label">当前版本</span>
              <span class="summary-value">
                {{ currentVersion || '未检测到版本' }}
              </span>
              <span v-if="currentError" class="summary-hint">{{ currentError }}</span>
            </div>
          </div>

          <div class="summary-card">
            <div class="summary-icon" :class="{ success: !!activeManager }">
              <SettingsIcon :size="22" />
            </div>
            <div class="summary-body">
              <span class="summary-label">版本管理工具</span>
              <span class="summary-value">
                {{ activeManager?.name || '未安装管理器' }}
              </span>
              <span class="summary-hint">
                {{ hasManager ? `类型：${activeManager?.type}` : '请先安装 Node 版本管理工具' }}
              </span>
            </div>
          </div>

          <div class="summary-card">
            <div class="summary-icon" :class="{ success: installedCount > 0 }">
              <Layers :size="22" />
            </div>
            <div class="summary-body">
              <span class="summary-label">已安装版本数</span>
              <span class="summary-value">{{ installedCount }}</span>
              <span class="summary-hint">
                {{ installedCount > 0 ? '可以在下方列表中切换版本' : '暂未发现已安装的 Node 版本' }}
              </span>
            </div>
          </div>
        </div>
      </section>

      <!-- 管理器状态 -->
      <section class="section manager-section">
        <div class="section-header">
          <h2>版本管理工具</h2>
          <p class="section-description">
            检测系统中可用的 Node 版本管理工具，支持安装 nvm-windows、nvs、fnm、Volta、Mise 等多平台管理器。
          </p>
        </div>

        <div v-if="managerStatusError" class="section-warning">
          <AlertCircle :size="18" />
          <span>{{ managerStatusError }}</span>
        </div>

        <div v-if="!hasManager" class="section-warning">
          <AlertCircle :size="18" />
          <span>尚未检测到任何 Node 版本管理工具，可尝试安装下方推荐的管理器后再刷新。</span>
        </div>

        <div v-if="managerStatuses.length > 0" class="manager-grid">
          <div v-for="manager in managerStatuses" :key="manager.type" class="manager-card">
            <div class="manager-card-header">
              <div class="manager-card-name">{{ manager.name }}</div>
              <span
                :class="[
                  'manager-tag',
                  manager.installed ? 'installed' : manager.supported ? 'missing' : 'unsupported',
                ]"
              >
                {{
                  manager.installed
                    ? '已安装'
                    : manager.supported
                      ? '未安装'
                      : '不支持当前系统'
                }}
              </span>
            </div>
            <div class="manager-meta">
              <span class="manager-type">类型：{{ manager.type }}</span>
              <span class="manager-platforms">支持平台：{{ formatPlatforms(manager.platforms) }}</span>
              <span class="manager-available">
                状态：
                <template v-if="manager.installed">可用于版本管理</template>
                <template v-else-if="!manager.supported">当前系统暂不支持</template>
                <template v-else>待安装</template>
              </span>
            </div>
          </div>
        </div>

        <div v-if="managersToInstall.length > 0" class="manager-actions">
          <h3>一键安装常用管理器</h3>
          <div class="manager-action-list">
            <button
              v-for="manager in managersToInstall"
              :key="manager.type"
              class="btn-secondary"
              :disabled="installManagerLoading === manager.type"
              @click="handleInstallManager(manager)"
            >
              <Download :size="18" />
              {{ installManagerLoading === manager.type ? `正在安装 ${manager.name}...` : `安装 ${manager.name}` }}
            </button>
          </div>
          <div v-if="installManagerError" class="section-warning">
            <AlertCircle :size="18" />
            <span>{{ installManagerError }}</span>
          </div>
        </div>
      </section>

      <!-- 安装管理 -->
      <section class="section install-section">
        <div class="section-header">
          <h2>安装新版本</h2>
          <p class="section-description">
            支持安装指定版本号（例如 18.17.0）或别名（如 lts、current）。安装成功后可在下方列表中切换为当前版本。
          </p>
        </div>

        <form class="install-form" @submit.prevent="handleInstallSubmit">
          <label class="form-label" for="install-version">版本号或别名</label>
          <div class="form-row">
            <input
              id="install-version"
              v-model="installInput"
              class="text-input"
              :placeholder="hasManager ? '例如 20.11.1 或 lts' : '请先安装版本管理工具'"
              :disabled="installLoading || !hasManager"
            />
            <button class="btn-primary" type="submit" :disabled="installLoading || !hasManager">
              <Download :size="18" v-if="installLoading" class="icon-spinning" />
              {{ installLoading ? '安装中...' : '开始安装' }}
            </button>
          </div>
          <p class="form-hint">
            {{ hasManager ? '安装过程可能需要几分钟，请耐心等待。' : '未检测到管理器，无法安装新版本。' }}
          </p>
        </form>

        <div v-if="availableError" class="section-warning">
          <AlertCircle :size="18" />
          <span>{{ availableError }}</span>
        </div>

        <div v-else-if="visibleAvailableVersions.length > 0" class="available-versions">
          <h3>常用版本（可点击快速安装）</h3>
          <div class="version-chip-list">
            <button
              v-for="version in visibleAvailableVersions"
              :key="version"
              class="version-chip"
              :disabled="suggestionLoading === version || !hasManager"
              @click="handleInstallSuggestion(version)"
            >
              <span>{{ version }}</span>
              <Download :size="16" v-if="suggestionLoading === version" class="icon-spinning" />
            </button>
          </div>
          <p v-if="availableVersions.length > visibleAvailableVersions.length" class="form-hint">
            已只展示前 {{ visibleAvailableVersions.length }} 个版本，可在终端中使用管理器命令查看完整列表。
          </p>
        </div>
      </section>

      <!-- 已安装版本 -->
      <section class="section versions-section">
        <div class="section-header">
          <h2>已安装版本</h2>
          <p class="section-description">
            当前管理器检测到的 Node.js 版本。可以切换为当前版本或删除不再需要的版本。
          </p>
        </div>

        <div v-if="versionsError" class="section-warning">
          <AlertCircle :size="18" />
          <span>{{ versionsError }}</span>
        </div>

        <div v-else-if="sortedVersions.length === 0">
          <div class="empty-state">
            <PackageIcon :size="36" />
            <p>尚未发现已安装的 Node 版本，您可以通过上方表单安装新的版本。</p>
          </div>
        </div>
        <div v-else class="versions-table">
          <div class="table-header">
            <span>版本号</span>
            <span>状态</span>
            <span>安装路径</span>
            <span>操作</span>
          </div>
          <div v-for="version in sortedVersions" :key="version.version" class="table-row">
            <span class="table-cell version-cell">
              {{ version.version }}
              <span v-if="version.active" class="badge badge-active">当前使用</span>
            </span>
            <span class="table-cell status-cell">
              {{ version.active ? '已激活' : '已安装' }}
            </span>
            <span class="table-cell path-cell">{{ version.path || '-' }}</span>
            <span class="table-cell actions-cell">
              <button
                v-if="!version.active"
                class="btn-secondary"
                :disabled="switchLoading === version.version || !hasManager"
                @click="handleSwitch(version.version)"
              >
                <Check :size="16" />
                {{ switchLoading === version.version ? '切换中...' : '切换为当前' }}
              </button>
              <button
                class="btn-danger"
                :disabled="version.active || removeLoading === version.version || !hasManager"
                @click="handleRemove(version.version)"
              >
                <Trash2 :size="16" />
                {{ removeLoading === version.version ? '删除中...' : '删除' }}
              </button>
            </span>
          </div>
        </div>
      </section>
    </div>
  </div>
  <Modal
    v-model="installDialog.visible"
    :title="installDialog.title"
    size="lg"
    :closable="installDialog.status !== 'running'"
    @close="handleInstallDialogClose"
  >
    <div class="install-progress">
      <div class="install-progress-info">
        <span class="install-manager-name">{{ installDialog.managerName }}</span>
        <span :class="['install-progress-status', `status-${installDialog.status}`]">
          {{ installStatusText }}
        </span>
      </div>
      <div class="progress-bar">
        <div class="progress-bar__value" :style="{ width: `${installDialog.progress}%` }"></div>
      </div>
      <p v-if="installDialog.message" class="install-progress-message">{{ installDialog.message }}</p>
      <Console ref="consoleRef" class="install-console" :max-lines="4000" />
      <p v-if="installDialog.error && installDialog.status === 'failed'" class="install-progress-error">
        {{ installDialog.error }}
      </p>
    </div>
    <template #footer>
      <button
        class="btn-secondary"
        @click="handleInstallDialogClose"
        :disabled="installDialog.status === 'running'"
      >
        {{ installDialog.status === 'running' ? '安装进行中...' : '关闭' }}
      </button>
      <button
        v-if="installDialog.status === 'completed'"
        class="btn-primary"
        @click="refreshAfterInstall"
      >
        立即刷新
      </button>
    </template>
  </Modal>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, reactive, watch, onBeforeUnmount, nextTick } from 'vue'
import { nodeApi } from '../api/services'
import { message } from '../utils/message'
import type { NodeVersion } from '@ldesign/shared'
import {
  RefreshCw,
  Cpu,
  Layers,
  Settings as SettingsIcon,
  AlertCircle,
  Download,
  Trash2,
  Check,
  Package as PackageIcon,
} from 'lucide-vue-next'
import Modal from '../components/common/Modal.vue'
import Console from '../components/Console.vue'
import NodeManagerSkeleton from '../components/skeletons/NodeManagerSkeleton.vue'
import { useAppStore } from '../stores/app'

interface ManagerInfo {
  type: string
  name: string
  installed: boolean
  available: boolean
  supported: boolean
  platforms: string[]
}

type InstallStatus = 'idle' | 'pending' | 'running' | 'completed' | 'failed'

const appStore = useAppStore()

const loading = ref(false)
const initialLoaded = ref(false)
const error = ref<string | null>(null)

const currentVersion = ref<string | null>(null)
const currentError = ref<string | null>(null)

const versions = ref<NodeVersion[]>([])
const versionsError = ref<string | null>(null)

const managerStatuses = ref<ManagerInfo[]>([])
const managerStatusError = ref<string | null>(null)

const installableManagers = ref<ManagerInfo[]>([])
const installManagerError = ref<string | null>(null)
const installManagerLoading = ref<string | null>(null)

const availableVersions = ref<string[]>([])
const availableError = ref<string | null>(null)

const installInput = ref('')
const installLoading = ref(false)
const suggestionLoading = ref<string | null>(null)
const switchLoading = ref<string | null>(null)
const removeLoading = ref<string | null>(null)

const installDialog = reactive({
  visible: false,
  title: '',
  managerType: '',
  managerName: '',
  status: 'idle' as InstallStatus,
  progress: 0,
  message: '',
  error: '',
  taskId: null as string | null,
})

const consoleRef = ref<InstanceType<typeof Console> | null>(null)
let socketEventHandler: ((event: any) => void) | null = null

const hasManager = computed(() => managerStatuses.value.some(manager => manager.installed))
const activeManager = computed(
  () => managerStatuses.value.find(manager => manager.installed) || null,
)
const installedCount = computed(() => versions.value.filter(version => version.installed).length)
const sortedVersions = computed(() => {
  const cloned = [...versions.value]
  cloned.sort((a, b) => {
    if (a.active === b.active) {
      return a.version.localeCompare(b.version)
    }
    return a.active ? -1 : 1
  })
  return cloned
})
const managersToInstall = computed(() =>
  installableManagers.value.filter(manager => manager.supported && manager.available),
)
const visibleAvailableVersions = computed(() => availableVersions.value.slice(0, 12))

const installStatusText = computed(() => {
  switch (installDialog.status) {
    case 'running':
      return '安装进行中'
    case 'completed':
      return '安装完成'
    case 'failed':
      return '安装失败'
    case 'pending':
      return '等待任务开始'
    default:
      return '准备中'
  }
})

function extractError(err: unknown): string {
  if (!err) return '未知错误'
  if (typeof err === 'string') return err
  if (err instanceof Error) return err.message
  if (typeof err === 'object' && err !== null) {
    const maybe = (err as any).response?.data?.message || (err as any).message || (err as any).error
    if (maybe) {
      return String(maybe)
    }
  }
  return '未知错误'
}

async function loadAll() {
  loading.value = true
  error.value = null
  currentError.value = null
  versionsError.value = null
  managerStatusError.value = null
  installManagerError.value = null
  availableError.value = null

  try {
    const [currentRes, versionsRes, statusRes, installableRes, availableRes] = await Promise.allSettled([
      nodeApi.getCurrent(),
      nodeApi.getVersions(),
      nodeApi.getCurrentManager(),
      nodeApi.getManagers(),
      nodeApi.getAvailable(),
    ])

    // 当前版本
    if (currentRes.status === 'fulfilled') {
      if (currentRes.value.success && currentRes.value.data) {
        currentVersion.value = currentRes.value.data.version || null
      } else {
        currentVersion.value = null
        currentError.value = currentRes.value.message || '未能获取当前版本'
      }
    } else {
      currentVersion.value = null
      currentError.value = extractError(currentRes.reason)
    }

    // 已安装版本
    if (versionsRes.status === 'fulfilled') {
      if (versionsRes.value.success && Array.isArray(versionsRes.value.data)) {
        versions.value = versionsRes.value.data
      } else {
        versions.value = []
        versionsError.value = versionsRes.value.message || '未能获取已安装的版本列表'
      }
    } else {
      versions.value = []
      versionsError.value = extractError(versionsRes.reason)
    }

    // 管理器状态
    if (statusRes.status === 'fulfilled') {
      if (statusRes.value.success && Array.isArray(statusRes.value.data)) {
        managerStatuses.value = statusRes.value.data.map((item: any) => ({
          type: item.type,
          name: item.name,
          installed: !!item.installed,
          available: !!item.available,
          supported: item.supported ?? true,
          platforms: Array.isArray(item.platforms) ? item.platforms : [],
        }))
      } else {
        managerStatuses.value = []
        managerStatusError.value = statusRes.value.message || '未能获取管理器状态'
      }
    } else {
      managerStatuses.value = []
      managerStatusError.value = extractError(statusRes.reason)
      if (!error.value) {
        error.value = managerStatusError.value
      }
    }

    // 可安装的管理器
    if (installableRes.status === 'fulfilled') {
      if (installableRes.value.success && Array.isArray(installableRes.value.data)) {
        installableManagers.value = installableRes.value.data.map((item: any) => ({
          type: item.type,
          name: item.name,
          installed: !!item.installed,
          available: !!item.available,
          supported: item.supported ?? true,
          platforms: Array.isArray(item.platforms) ? item.platforms : [],
        }))
      } else {
        installableManagers.value = []
        installManagerError.value = installableRes.value.message || '未能获取管理器列表'
      }
    } else {
      installableManagers.value = []
      installManagerError.value = extractError(installableRes.reason)
    }

    // 远程版本列表
    if (availableRes.status === 'fulfilled') {
      if (availableRes.value.success && Array.isArray(availableRes.value.data)) {
        availableVersions.value = availableRes.value.data
      } else {
        availableVersions.value = []
        availableError.value = availableRes.value.message || '未能获取可用版本列表'
      }
    } else {
      availableVersions.value = []
      availableError.value = extractError(availableRes.reason)
    }
  } finally {
    loading.value = false
    initialLoaded.value = true
  }
}

function appendLog(type: 'stdout' | 'stderr' | 'info' | 'error', content: string) {
  if (!content || !consoleRef.value) {
    return
  }

  if (type === 'stderr' || type === 'error') {
    consoleRef.value.appendError(content)
  } else if (type === 'info') {
    consoleRef.value.appendInfo(content)
  } else {
    consoleRef.value.appendStdout(content)
  }
}

function resetInstallDialog(manager: ManagerInfo) {
  installDialog.visible = true
  installDialog.title = `安装 ${manager.name}`
  installDialog.managerType = manager.type
  installDialog.managerName = manager.name
  installDialog.status = 'pending'
  installDialog.progress = 0
  installDialog.message = ''
  installDialog.error = ''
  installDialog.taskId = null
  nextTick(() => {
    consoleRef.value?.clear()
    appendLog('info', `正在准备安装 ${manager.name} ...`)
  })
}

async function executeInstall(version: string) {
  if (!hasManager.value) {
    message.warning('请先安装 Node 版本管理工具')
    return
  }

  const trimmed = version.trim()
  if (!trimmed) {
    message.warning('请输入有效的版本号或别名')
    return
  }

  try {
    const response = await nodeApi.install(trimmed)
    if (response.success) {
      message.success(response.message || `已开始安装版本 ${trimmed}`)
      installInput.value = ''
      await loadAll()
    } else {
      message.error(response.message || `安装版本 ${trimmed} 失败`)
    }
  } catch (err) {
    message.error(extractError(err))
  }
}

async function handleInstallSubmit() {
  if (installLoading.value) return
  installLoading.value = true
  try {
    await executeInstall(installInput.value)
  } finally {
    installLoading.value = false
  }
}

async function handleInstallSuggestion(version: string) {
  if (suggestionLoading.value || !hasManager.value) {
    if (!hasManager.value) {
      message.warning('请先安装 Node 版本管理工具')
    }
    return
  }
  suggestionLoading.value = version
  try {
    await executeInstall(version)
  } finally {
    suggestionLoading.value = null
  }
}

async function handleSwitch(version: string) {
  if (switchLoading.value || !hasManager.value) {
    if (!hasManager.value) {
      message.warning('请先安装 Node 版本管理工具')
    }
    return
  }

  switchLoading.value = version
  try {
    const response = await nodeApi.switch(version)
    if (response.success) {
      message.success(response.message || `已切换到 Node ${version}`)
      await loadAll()
    } else {
      message.error(response.message || '切换版本失败')
    }
  } catch (err) {
    message.error(extractError(err))
  } finally {
    switchLoading.value = null
  }
}

async function handleRemove(version: string) {
  if (removeLoading.value || !hasManager.value) {
    if (!hasManager.value) {
      message.warning('请先安装 Node 版本管理工具')
    }
    return
  }

  if (!confirm(`确定要删除 Node ${version} 吗？该操作不可恢复。`)) {
    return
  }

  removeLoading.value = version
  try {
    const response = await nodeApi.remove(version)
    if (response.success) {
      message.success(response.message || `已删除 Node ${version}`)
      await loadAll()
    } else {
      message.error(response.message || '删除版本失败')
    }
  } catch (err) {
    message.error(extractError(err))
  } finally {
    removeLoading.value = null
  }
}

async function handleInstallManager(manager: ManagerInfo) {
  if (installManagerLoading.value) {
    return
  }

  if (!manager.supported) {
    message.warning(`${manager.name} 不支持当前操作系统`)
    return
  }

  resetInstallDialog(manager)
  installManagerLoading.value = manager.type
  try {
    const response = await nodeApi.installManager(manager.type)
    if (response.success) {
      if (response.data?.alreadyInstalled) {
        installDialog.status = 'completed'
        installDialog.progress = 100
        installDialog.message = response.message || `${manager.name} 已经安装`
        appendLog('info', installDialog.message)
        message.info(installDialog.message)
        await loadAll()
        return
      }

      if (response.data?.taskId) {
        installDialog.taskId = response.data.taskId
        installDialog.status = 'running'
        installDialog.progress = 5
        installDialog.message = response.message || `正在安装 ${manager.name}`
        appendLog('info', installDialog.message)
      } else {
        installDialog.status = 'failed'
        installDialog.error = response.message || '未能启动安装任务'
        installDialog.message = installDialog.error
        appendLog('error', installDialog.error)
        message.error(installDialog.error)
      }
    } else {
      installDialog.status = 'failed'
      installDialog.error = response.message || '管理器安装启动失败'
      installDialog.message = installDialog.error
      appendLog('error', installDialog.error)
      message.error(installDialog.error)
    }
  } catch (err) {
    const msg = extractError(err)
    installDialog.status = 'failed'
    installDialog.error = msg
    installDialog.message = msg
    appendLog('error', msg)
    message.error(msg)
  } finally {
    installManagerLoading.value = null
  }
}

function handleInstallDialogClose() {
  if (installDialog.status === 'running') {
    message.warning('安装进行中，暂时无法关闭')
    return
  }
  installDialog.visible = false
  installDialog.status = 'idle'
  installDialog.progress = 0
  installDialog.message = ''
  installDialog.error = ''
  installDialog.taskId = null
}

async function refreshAfterInstall() {
  await loadAll()
  installDialog.visible = false
}

function handleSocketEvent(event: any) {
  if (!event || !event.type || !event.data) {
    return
  }

  const types = new Set([
    'node:manager:install:start',
    'node:manager:install:progress',
    'node:manager:install:log',
    'node:manager:install:complete',
    'node:manager:install:error',
  ])

  if (!types.has(event.type)) {
    return
  }

  const data = event.data as {
    taskId: string
    managerType: string
    managerName: string
    status?: string
    progress?: number
    message?: string
    error?: string
    log?: { type: 'stdout' | 'stderr' | 'info' | 'error'; content: string }
  }

  if (!data.managerType || (installDialog.managerType && data.managerType !== installDialog.managerType)) {
    return
  }

  if (installDialog.taskId && data.taskId && installDialog.taskId !== data.taskId) {
    return
  }

  if (!installDialog.visible) {
    return
  }

  if (!installDialog.taskId && data.taskId) {
    installDialog.taskId = data.taskId
  }

  switch (event.type) {
    case 'node:manager:install:start': {
      installDialog.status = 'running'
      installDialog.progress = data.progress ?? installDialog.progress
      if (data.message) {
        installDialog.message = data.message
        appendLog('info', data.message)
      }
      break
    }
    case 'node:manager:install:progress': {
      installDialog.status = 'running'
      if (typeof data.progress === 'number') {
        installDialog.progress = Math.max(installDialog.progress, Math.min(100, data.progress))
      }
      if (data.message) {
        installDialog.message = data.message
        appendLog('info', data.message)
      }
      break
    }
    case 'node:manager:install:log': {
      if (data.log) {
        appendLog(data.log.type, data.log.content)
      }
      break
    }
    case 'node:manager:install:complete': {
      installDialog.status = 'completed'
      installDialog.progress = data.progress ?? 100
      if (data.message) {
        installDialog.message = data.message
        appendLog('info', data.message)
        message.success(data.message)
      } else {
        message.success(`${installDialog.managerName} 安装完成`)
      }
      loadAll()
      break
    }
    case 'node:manager:install:error': {
      installDialog.status = 'failed'
      installDialog.progress = data.progress ?? installDialog.progress
      installDialog.error = data.error || '安装失败'
      installDialog.message = data.message || installDialog.error
      
      // 确保错误信息被完整显示在控制台中
      // 如果错误信息包含多行，确保每行都被正确显示
      if (installDialog.error) {
        appendLog('error', installDialog.error)
      }
      if (data.message && data.message !== installDialog.error) {
        appendLog('error', data.message)
      }
      
      // 显示简短错误消息给用户
      const shortError = installDialog.error.split('\n')[0] || '安装失败'
      message.error(shortError)
      loadAll()
      break
    }
    default:
      break
  }
}

function setupSocketListeners() {
  teardownSocketListeners()
  const socket = appStore.socket
  if (!socket) {
    return
  }
  socketEventHandler = (event: any) => {
    handleSocketEvent(event)
  }
  socket.on('event', socketEventHandler)
}

function teardownSocketListeners() {
  if (socketEventHandler && appStore.socket) {
    appStore.socket.off('event', socketEventHandler)
  }
  socketEventHandler = null
}

function joinNodeRoom() {
  const socket = appStore.socket
  if (socket) {
    socket.emit('joinRoom', { room: 'node' })
  }
}

function leaveNodeRoom() {
  const socket = appStore.socket
  if (socket) {
    socket.emit('leaveRoom', { room: 'node' })
  }
}

function formatPlatforms(platforms: string[] = []): string {
  if (!platforms.length) {
    return '未知'
  }
  const labels: Record<string, string> = {
    windows: 'Windows',
    macos: 'macOS',
    linux: 'Linux',
  }
  return platforms.map(item => labels[item] || item).join(' / ')
}

watch(
  () => appStore.socket,
  () => {
    setupSocketListeners()
    joinNodeRoom()
  },
)

onMounted(() => {
  loadAll()
  setupSocketListeners()
  joinNodeRoom()
})

onBeforeUnmount(() => {
  leaveNodeRoom()
  teardownSocketListeners()
})
</script>

<style scoped>
.node-manager-page {
  display: flex;
  flex-direction: column;
  gap: var(--size-spacing-xl);
  padding: var(--size-spacing-xl);
  background: var(--color-bg-page);
  min-height: 100%;
}

.page-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: var(--size-spacing-lg);
}

.page-header-text {
  display: flex;
  flex-direction: column;
  gap: var(--size-spacing-sm);
}

.page-header h1 {
  margin: 0;
  font-size: var(--font-size-2xl);
  font-weight: var(--size-font-weight-semibold);
  color: var(--color-text-primary);
}

.page-subtitle {
  margin: 0;
  color: var(--color-text-secondary);
  font-size: var(--font-size-base);
}

.btn-primary,
.btn-secondary,
.btn-danger {
  display: inline-flex;
  align-items: center;
  gap: var(--size-spacing-xs);
  padding: var(--size-spacing-sm) var(--size-spacing-lg);
  border-radius: var(--size-radius-md);
  font-size: var(--font-size-base);
  cursor: pointer;
  transition: all 0.2s ease;
  border: none;
}

.btn-primary {
  background: var(--theme-color-primary);
  color: var(--color-text-inverse);
}

.btn-primary:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.btn-primary:not(:disabled):hover {
  background: var(--theme-color-primary-hover);
}

.btn-secondary {
  background: var(--color-bg-component);
  color: var(--color-text-primary);
  border: 1px solid var(--color-border-light);
}

.btn-secondary:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.btn-secondary:not(:disabled):hover {
  background: var(--color-bg-component-hover);
  border-color: var(--theme-color-primary);
  color: var(--theme-color-primary);
}

.btn-danger {
  background: var(--color-danger-light);
  color: var(--color-danger-default);
  border: 1px solid var(--color-danger-default);
}

.btn-danger:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.btn-danger:not(:disabled):hover {
  background: var(--color-danger-default);
  color: var(--color-text-inverse);
}

.icon-spinning {
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

.error-banner {
  display: flex;
  align-items: center;
  gap: var(--size-spacing-sm);
  padding: var(--size-spacing-md);
  border-radius: var(--size-radius-md);
  background: var(--color-danger-light);
  color: var(--color-danger-default);
  border: 1px solid var(--color-danger-default);
}

.loading-state {
  padding: var(--size-spacing-xl);
  text-align: center;
  color: var(--color-text-secondary);
  background: var(--color-bg-container);
  border: 1px dashed var(--color-border-light);
  border-radius: var(--size-radius-lg);
}

.content-sections {
  display: flex;
  flex-direction: column;
  gap: var(--size-spacing-xl);
}

.section {
  background: var(--color-bg-container);
  border: 1px solid var(--color-border-light);
  border-radius: var(--size-radius-lg);
  padding: var(--size-spacing-xl);
  display: flex;
  flex-direction: column;
  gap: var(--size-spacing-lg);
}

.section-header {
  display: flex;
  flex-direction: column;
  gap: var(--size-spacing-xs);
}

.section-header h2 {
  margin: 0;
  font-size: var(--font-size-xl);
  font-weight: var(--size-font-weight-semibold);
  color: var(--color-text-primary);
}

.section-description {
  margin: 0;
  color: var(--color-text-secondary);
  font-size: var(--font-size-base);
}

.section-warning {
  display: flex;
  align-items: center;
  gap: var(--size-spacing-sm);
  padding: var(--size-spacing-md);
  border-radius: var(--size-radius-md);
  background: var(--color-warning-light);
  color: var(--color-warning-default);
  border: 1px solid var(--color-warning-default);
  font-size: var(--font-size-base);
}

.summary-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
  gap: var(--size-spacing-lg);
}

.summary-card {
  display: flex;
  gap: var(--size-spacing-md);
  padding: var(--size-spacing-lg);
  border-radius: var(--size-radius-lg);
  border: 1px solid var(--color-border-light);
  background: var(--color-bg-component);
  align-items: center;
}

.summary-icon {
  width: 48px;
  height: 48px;
  border-radius: var(--size-radius-full);
  background: var(--color-bg-container);
  color: var(--color-text-secondary);
  display: flex;
  align-items: center;
  justify-content: center;
}

.summary-icon.success {
  background: var(--theme-color-primary-light);
  color: var(--theme-color-primary);
}

.summary-body {
  display: flex;
  flex-direction: column;
  gap: var(--size-spacing-2xs);
}

.summary-label {
  font-size: var(--font-size-sm);
  color: var(--color-text-secondary);
}

.summary-value {
  font-size: var(--font-size-xl);
  font-weight: var(--size-font-weight-semibold);
  color: var(--color-text-primary);
}

.summary-hint {
  font-size: var(--font-size-sm);
  color: var(--color-text-secondary);
}

.manager-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
  gap: var(--size-spacing-lg);
}

.manager-card {
  padding: var(--size-spacing-lg);
  border-radius: var(--size-radius-lg);
  border: 1px solid var(--color-border-light);
  background: var(--color-bg-component);
  display: flex;
  flex-direction: column;
  gap: var(--size-spacing-sm);
}

.manager-card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: var(--size-spacing-sm);
}

.manager-card-name {
  font-size: var(--font-size-lg);
  font-weight: var(--size-font-weight-semibold);
  color: var(--color-text-primary);
}

.manager-tag {
  padding: 2px var(--size-spacing-sm);
  border-radius: var(--size-radius-full);
  font-size: var(--font-size-xs);
  font-weight: var(--size-font-weight-medium);
}

.manager-tag.installed {
  background: var(--color-success-light);
  color: var(--color-success-default);
}

.manager-tag.missing {
  background: var(--color-danger-light);
  color: var(--color-danger-default);
}

.manager-tag.unsupported {
  background: var(--color-warning-light);
  color: var(--color-warning-default);
}

.manager-meta {
  display: flex;
  flex-direction: column;
  gap: var(--size-spacing-2xs);
  color: var(--color-text-secondary);
  font-size: var(--font-size-sm);
}

.manager-platforms {
  color: var(--color-text-secondary);
}

.manager-actions {
  display: flex;
  flex-direction: column;
  gap: var(--size-spacing-md);
}

.manager-actions h3 {
  margin: 0;
  font-size: var(--font-size-base);
  font-weight: var(--size-font-weight-semibold);
  color: var(--color-text-primary);
}

.manager-action-list {
  display: flex;
  flex-wrap: wrap;
  gap: var(--size-spacing-sm);
}

.install-form {
  display: flex;
  flex-direction: column;
  gap: var(--size-spacing-md);
  border: 1px solid var(--color-border-light);
  border-radius: var(--size-radius-lg);
  padding: var(--size-spacing-lg);
  background: var(--color-bg-component);
}

.form-label {
  font-size: var(--font-size-sm);
  color: var(--color-text-secondary);
}

.form-row {
  display: flex;
  gap: var(--size-spacing-sm);
  align-items: center;
}

.text-input {
  flex: 1;
  min-width: 0;
  padding: var(--size-spacing-sm) var(--size-spacing-md);
  border-radius: var(--size-radius-md);
  border: 1px solid var(--color-border-light);
  background: var(--color-bg-container);
  color: var(--color-text-primary);
  font-size: var(--font-size-base);
  transition: border-color 0.2s ease, box-shadow 0.2s ease;
}

.text-input:focus {
  outline: none;
  border-color: var(--theme-color-primary);
  box-shadow: 0 0 0 2px color-mix(in srgb, var(--theme-color-primary) 20%, transparent);
}

.text-input:disabled {
  background: var(--color-bg-layout);
  color: var(--color-text-disabled);
  cursor: not-allowed;
}

.form-hint {
  margin: 0;
  font-size: var(--font-size-sm);
  color: var(--color-text-secondary);
}

.available-versions {
  display: flex;
  flex-direction: column;
  gap: var(--size-spacing-sm);
}

.available-versions h3 {
  margin: 0;
  font-size: var(--font-size-base);
  font-weight: var(--size-font-weight-semibold);
  color: var(--color-text-primary);
}

.version-chip-list {
  display: flex;
  flex-wrap: wrap;
  gap: var(--size-spacing-sm);
}

.version-chip {
  padding: var(--size-spacing-xs) var(--size-spacing-md);
  border-radius: var(--size-radius-full);
  background: var(--color-bg-component);
  color: var(--color-text-primary);
  border: 1px solid var(--color-border-light);
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  gap: var(--size-spacing-xs);
  transition: all 0.2s ease;
  font-size: var(--font-size-sm);
}

.version-chip:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.version-chip:not(:disabled):hover {
  border-color: var(--theme-color-primary);
  color: var(--theme-color-primary);
}

.versions-table {
  display: flex;
  flex-direction: column;
  border: 1px solid var(--color-border-light);
  border-radius: var(--size-radius-lg);
  overflow: hidden;
}

.table-header,
.table-row {
  display: grid;
  grid-template-columns: 1.2fr 1fr 1.6fr 1.4fr;
  gap: var(--size-spacing-sm);
  padding: var(--size-spacing-md) var(--size-spacing-lg);
  align-items: center;
}

.table-header {
  background: var(--color-bg-layout);
  color: var(--color-text-secondary);
  font-size: var(--font-size-sm);
  font-weight: var(--size-font-weight-medium);
}

.table-row:nth-child(even) {
  background: var(--color-bg-component);
}

.table-row + .table-row {
  border-top: 1px solid var(--color-border-light);
}

.table-cell {
  display: flex;
  align-items: center;
  gap: var(--size-spacing-xs);
  color: var(--color-text-primary);
  font-size: var(--font-size-base);
}

.version-cell {
  font-weight: var(--size-font-weight-medium);
}

.status-cell {
  color: var(--color-text-secondary);
}

.path-cell {
  color: var(--color-text-secondary);
  font-size: var(--font-size-sm);
  word-break: break-all;
}

.actions-cell {
  display: flex;
  gap: var(--size-spacing-sm);
  flex-wrap: wrap;
  justify-content: flex-start;
}

.badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 2px var(--size-spacing-sm);
  border-radius: var(--size-radius-full);
  font-size: var(--font-size-xs);
  font-weight: var(--size-font-weight-medium);
  color: var(--color-success-default);
  background: var(--color-success-light);
}

.badge-active {
  background: var(--color-success-light);
  color: var(--color-success-default);
}

.empty-state {
  padding: var(--size-spacing-xl);
  border-radius: var(--size-radius-lg);
  border: 1px dashed var(--color-border-light);
  background: var(--color-bg-component);
  display: flex;
  flex-direction: column;
  gap: var(--size-spacing-md);
  align-items: center;
  color: var(--color-text-secondary);
}

.empty-state p {
  margin: 0;
  max-width: 420px;
  text-align: center;
  line-height: var(--size-line-relaxed);
}

.install-progress {
  display: flex;
  flex-direction: column;
  gap: var(--size-spacing-md);
}

.install-progress-info {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--size-spacing-sm);
}

.install-manager-name {
  font-size: var(--font-size-base);
  font-weight: var(--size-font-weight-semibold);
  color: var(--color-text-primary);
}

.install-progress-status {
  font-size: var(--font-size-sm);
  font-weight: var(--size-font-weight-medium);
  padding: 2px var(--size-spacing-sm);
  border-radius: var(--size-radius-full);
  background: var(--color-bg-component);
  color: var(--color-text-secondary);
}

.install-progress-status.status-running {
  background: var(--theme-color-primary-light);
  color: var(--theme-color-primary);
}

.install-progress-status.status-completed {
  background: var(--color-success-light);
  color: var(--color-success-default);
}

.install-progress-status.status-failed {
  background: var(--color-danger-light);
  color: var(--color-danger-default);
}

.install-progress-status.status-pending,
.install-progress-status.status-idle {
  background: var(--color-warning-light);
  color: var(--color-warning-default);
}

.progress-bar {
  width: 100%;
  height: 8px;
  background: var(--color-border-light);
  border-radius: var(--size-radius-full);
  overflow: hidden;
}

.progress-bar__value {
  height: 100%;
  background: var(--theme-color-primary);
  transition: width 0.3s ease;
}

.install-progress-message {
  margin: 0;
  font-size: var(--font-size-sm);
  color: var(--color-text-secondary);
}

.install-progress-error {
  margin: 0;
  font-size: var(--font-size-sm);
  color: var(--color-danger-default);
}

.install-console {
  height: 240px;
}

@media (max-width: 960px) {
  .table-header,
  .table-row {
    grid-template-columns: 1fr;
    align-items: flex-start;
  }

  .actions-cell {
    justify-content: flex-start;
  }
}
</style>


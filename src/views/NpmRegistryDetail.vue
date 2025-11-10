<template>
  <div class="npm-registry-detail-page" :class="{ 'state-logged-in': isLoggedIn }">
    <div class="page-header">
      <div class="page-header-left">
        <button class="btn-back" @click="goBack">
          <ArrowLeft :size="20" />
          返回
        </button>
        <h1>{{ registry?.name || '仓库详情' }}</h1>
      </div>
      <div v-if="registry?.isLoggedIn" class="page-header-user">
        <div class="user-meta">
          <User :size="18" />
          <div class="user-meta-text">
            <span class="user-meta-name">{{ registry.username }}</span>
            <span v-if="registry.email" class="user-meta-email">{{ registry.email }}</span>
          </div>
        </div>
        <button class="btn-secondary" @click="handleLogout">
          <LogOut :size="18" />
          退出登录
        </button>
      </div>
    </div>

    <!-- 骨架屏：加载中 -->
    <div v-if="loading && !registry" class="skeleton-container">
      <Skeleton variant="card" :lines="3" />
    </div>

    <div v-else-if="error" class="error-message">{{ error }}</div>
    <div v-else-if="!registry" class="error-message">仓库不存在</div>
    <div v-else class="detail-content">
      <!-- 仓库基本信息 -->
      <div class="info-section">
        <h2>基本信息</h2>
        <div class="info-grid">
          <div class="info-item">
            <span class="info-label">仓库名称:</span>
            <span class="info-value">{{ registry.name }}</span>
          </div>
          <div class="info-item">
            <span class="info-label">仓库 URL:</span>
            <span class="info-value">{{ registry.registry }}</span>
          </div>
          <div class="info-item">
            <span class="info-label">状态:</span>
            <span class="info-value">
              <span v-if="registry.isDefault" class="badge badge--default">默认</span>
              <span v-if="registry.enabled" class="badge badge--success">启用</span>
              <span v-else class="badge badge--disabled">禁用</span>
            </span>
          </div>
          <div v-if="isLocalVerdaccio" class="info-item">
            <span class="info-label">操作:</span>
            <span class="info-value">
              <button class="btn-secondary" @click="goToConfig">
                <Settings :size="18" />
                配置
              </button>
            </span>
          </div>
        </div>
      </div>

      <!-- 登录状态 -->
      <div class="login-section">
        <h2>登录状态</h2>
        <div v-if="!isLoggedIn" class="login-prompt">
          <div class="prompt-content">
            <LogIn :size="48" class="prompt-icon" />
            <p class="prompt-text">请先登录以查看您发布的包列表</p>
            <div class="prompt-actions">
              <button class="btn-primary" @click="handleLoginClick">
                <LogIn :size="18" />
                登录
              </button>
              <button 
                v-if="supportsUserRegistration" 
                class="btn-secondary" 
                @click="handleAddUserClick"
              >
                <UserPlus :size="18" />
                添加用户
              </button>
            </div>
          </div>
        </div>
        <div v-else class="login-info">
        <div class="user-card">
            <div class="user-avatar">
              <User :size="24" />
            </div>
            <div class="user-details">
              <div class="user-name">{{ registry.username }}</div>
              <div v-if="registry.email" class="user-email">{{ registry.email }}</div>
            </div>
          <div class="user-actions">
            <button
              v-if="supportsUserRegistration"
              class="btn-secondary"
              @click="handleAddUserClick"
            >
              <UserPlus :size="18" />
              添加用户
            </button>
            <button class="btn-secondary" @click="handleLogout">
              <LogOut :size="18" />
              退出登录
            </button>
          </div>
          </div>
        </div>
      </div>

      <!-- 包列表 -->
      <div v-if="isLoggedIn" class="packages-section">
        <div class="section-header">
          <h2>
            我发布的包
            <span v-if="packagesTotal > 0 || packagesLoading" class="packages-count">
              ({{ packagesLoading ? '加载中...' : packagesTotal }})
            </span>
          </h2>
          <button class="btn-secondary" @click="loadPackages" :disabled="packagesLoading">
            <RefreshCw :size="18" :class="{ 'icon-spinning': packagesLoading }" />
            刷新
          </button>
        </div>

        <!-- 骨架屏：包列表加载中 -->
        <div v-if="packagesLoading && packages.length === 0" class="packages-skeleton">
          <Skeleton v-for="i in 5" :key="i" variant="list" :lines="2" />
        </div>

        <div v-else-if="packagesError" class="error-message">{{ packagesError }}</div>
        <div v-else-if="packages.length === 0 && !packagesLoading" class="empty-state">
          <Package :size="48" />
          <p>暂无发布的包</p>
        </div>
        <div v-else>
          <div class="packages-list">
            <div
              v-for="pkg in packages"
              :key="pkg.name"
              class="package-item"
              @click="goToPackageDetail(pkg.name)"
            >
              <div class="package-header">
                <h3 class="package-name">{{ pkg.name }}</h3>
                <span class="package-version">v{{ pkg.version }}</span>
              </div>
              <p v-if="pkg.description" class="package-description">{{ pkg.description }}</p>
              <div class="package-meta">
                <span v-if="pkg.author" class="package-author">
                  <User :size="14" />
                  {{ pkg.author }}
                </span>
                <span v-if="pkg.publishTime" class="package-time">
                  <Clock :size="14" />
                  {{ formatTime(pkg.publishTime) }}
                </span>
              </div>
            </div>
          </div>

          <!-- 分页 -->
          <div v-if="packagesTotalPages > 1" class="pagination">
            <button
              class="pagination-btn"
              :disabled="packagesPage === 1 || packagesLoading"
              @click="changePage(packagesPage - 1)"
            >
              上一页
            </button>
            <div class="pagination-info">
              第 {{ packagesPage }} / {{ packagesTotalPages }} 页
            </div>
            <button
              class="pagination-btn"
              :disabled="packagesPage >= packagesTotalPages || packagesLoading"
              @click="changePage(packagesPage + 1)"
            >
              下一页
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- 登录对话框 -->
    <Modal
      v-model="showLoginDialog"
      title="NPM 登录"
      size="lg"
      @close="resetLoginForm"
    >
      <form @submit.prevent="handleConfirmLogin" class="login-form">
        <div class="form-group">
          <Input
            v-model="loginForm.username"
            label="用户名"
            placeholder="请输入 NPM 用户名"
            :required="true"
            :disabled="loginLoading"
          />
        </div>
        <div class="form-group">
          <Input
            v-model="loginForm.password"
            type="password"
            label="密码"
            placeholder="请输入 NPM 密码"
            :required="true"
            :disabled="loginLoading"
          />
        </div>
        <div class="form-group">
          <Input
            v-model="loginForm.email"
            type="email"
            label="邮箱（可选）"
            placeholder="请输入邮箱"
            :disabled="loginLoading"
          />
        </div>
      </form>
      <template #footer>
        <button class="btn-secondary" @click="resetLoginForm" :disabled="loginLoading">取消</button>
        <button class="btn-primary" @click="handleConfirmLogin" :disabled="loginLoading">
          {{ loginLoading ? '登录中...' : '确认登录' }}
        </button>
      </template>
    </Modal>

    <!-- 添加用户对话框 -->
    <Modal
      v-model="showAddUserDialog"
      title="添加新用户"
      size="lg"
      @close="resetAddUserForm"
    >
      <form @submit.prevent="handleConfirmAddUser" class="add-user-form">
        <div class="form-group">
          <Input
            v-model="addUserForm.username"
            label="用户名"
            placeholder="请输入用户名"
            :required="true"
            :disabled="addUserLoading"
          />
        </div>
        <div class="form-group">
          <Input
            v-model="addUserForm.password"
            type="password"
            label="密码"
            placeholder="请输入密码"
            :required="true"
            :disabled="addUserLoading"
          />
        </div>
        <div class="form-group">
          <Input
            v-model="addUserForm.email"
            type="email"
            label="邮箱"
            placeholder="请输入邮箱"
            :required="true"
            :disabled="addUserLoading"
          />
        </div>
      </form>
      <template #footer>
        <button class="btn-secondary" @click="resetAddUserForm" :disabled="addUserLoading">取消</button>
        <button class="btn-primary" @click="handleConfirmAddUser" :disabled="addUserLoading">
          {{ addUserLoading ? '创建中...' : '确认创建' }}
        </button>
      </template>
    </Modal>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ArrowLeft, LogIn, LogOut, User, Package, RefreshCw, Clock, UserPlus, Settings } from 'lucide-vue-next'
import { npmApi } from '../api/services'
import Modal from '../components/common/Modal.vue'
import Input from '../components/common/Input.vue'
import Skeleton from '../components/common/Skeleton.vue'
import { message } from '../utils/message'

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

interface NpmPackage {
  name: string
  version: string
  description?: string
  author?: string
  publishTime?: string
  latest?: string
}

const route = useRoute()
const router = useRouter()

const loading = ref(false)
const error = ref<string | null>(null)
const registry = ref<NpmRegistry | null>(null)

const showLoginDialog = ref(false)
const loginLoading = ref(false)
const loginForm = ref({
  username: '',
  password: '',
  email: '',
})

const showAddUserDialog = ref(false)
const addUserLoading = ref(false)
const addUserForm = ref({
  username: '',
  password: '',
  email: '',
})
const supportsUserRegistration = ref(false)

// 判断是否为本地 Verdaccio
const isLocalVerdaccio = computed(() => {
  if (!registry.value) return false
  const registryUrl = registry.value.registry.toLowerCase()
  const registryName = (registry.value.name || '').toLowerCase()
  const isLocalhost = registryUrl.includes('localhost') || registryUrl.includes('127.0.0.1')
  const hasVerdaccioName = registryName.includes('verdaccio')
  return isLocalhost && hasVerdaccioName
})

const packagesLoading = ref(false)
const packagesError = ref<string | null>(null)
const packages = ref<NpmPackage[]>([])
const packagesPage = ref(1)
const packagesPageSize = ref(20)
const packagesTotal = ref(0)
const packagesTotalPages = ref(0)
const isLoggedIn = computed(() => !!registry.value?.isLoggedIn)

async function loadRegistry() {
  const id = route.params.id as string
  if (!id) {
    error.value = '仓库 ID 不存在'
    return
  }

  loading.value = true
  error.value = null

  try {
    console.log('[NPM Detail] 开始加载仓库信息，ID:', id)
    const response = await npmApi.getRegistry(id)
    console.log('[NPM Detail] 仓库信息响应:', response)
    
    if (response.success) {
      registry.value = response.data
      console.log('[NPM Detail] 仓库信息加载成功:', registry.value)
      
      // 如果是本地 Verdaccio 服务，检查服务是否正在运行
      if (isLocalVerdaccio.value) {
        try {
          const statusResponse = await npmApi.getLocalVerdaccioStatus()
          if (!statusResponse.success || !statusResponse.data?.running) {
            // 服务未运行，跳转回列表页
            message.warning('本地 Verdaccio 服务未启动，已返回仓库列表')
            router.push('/npm')
            return
          }
        } catch (statusError: any) {
          // 检查服务状态失败，也跳转回列表页
          console.error('[NPM Detail] 检查 Verdaccio 服务状态失败:', statusError)
          message.warning('无法检查 Verdaccio 服务状态，已返回仓库列表')
          router.push('/npm')
          return
        }
      }
      
      // 基本信息已加载完成，可以立即显示
      loading.value = false
      
      // 检查仓库是否支持用户注册
      checkRegistrySupportsUserRegistration()
      
      // 如果数据库显示已登录，异步验证实际登录状态（不阻塞显示）
      if (registry.value.isLoggedIn) {
        // 异步检查登录状态，不阻塞页面显示
        checkLoginStatusAsync(id)
      }
      
      // 如果已登录，异步加载包列表（不阻塞页面显示）
      if (registry.value.isLoggedIn) {
        loadPackages()
      }
    } else {
      error.value = response.message || '加载仓库信息失败'
      console.error('[NPM Detail] 加载失败:', error.value)
      loading.value = false
    }
  } catch (err: any) {
    error.value = err.message || '加载仓库信息失败'
    console.error('[NPM Detail] 加载异常:', err)
    loading.value = false
  }
}

// 异步检查登录状态，不阻塞页面显示
async function checkLoginStatusAsync(id: string) {
  try {
    console.log('[NPM Detail] 检查登录状态...')
    const statusResponse = await npmApi.checkLoginStatus(id)
    console.log('[NPM Detail] 登录状态响应:', statusResponse)
    
    if (statusResponse.success && statusResponse.data.isLoggedIn) {
      // 更新登录信息
      if (registry.value) {
        registry.value.isLoggedIn = true
        registry.value.username = statusResponse.data.username || registry.value.username
        registry.value.email = statusResponse.data.email || registry.value.email
      }
    } else {
      // 登录状态已失效
      if (registry.value) {
        registry.value.isLoggedIn = false
        registry.value.username = null
        registry.value.email = null
      }
    }
  } catch (err) {
    // 检查登录状态失败，保持数据库状态
    console.warn('[NPM Detail] 检查登录状态失败:', err)
  }
}

async function loadPackages(page?: number) {
  if (!registry.value?.id || !registry.value.isLoggedIn) {
    return
  }

  // 如果没有传入页码，使用当前页码，如果当前页码无效，重置为第1页
  const targetPage = page ?? packagesPage.value ?? 1
  if (targetPage < 1) {
    packagesPage.value = 1
  } else {
    packagesPage.value = targetPage
  }

  packagesLoading.value = true
  packagesError.value = null

  try {
    console.log('[NPM Detail] 加载包列表，页码:', packagesPage.value, '每页:', packagesPageSize.value)
    const response = await npmApi.getPackages(
      registry.value.id,
      packagesPage.value,
      packagesPageSize.value,
    )
    console.log('[NPM Detail] 包列表响应:', response)
    
    if (response.success && response.data) {
      packages.value = response.data.items || []
      packagesTotal.value = response.data.total || 0
      packagesTotalPages.value = response.data.totalPages || 0
      console.log('[NPM Detail] 包列表加载成功:', packages.value.length, '个包')
    } else {
      packagesError.value = response.message || '获取包列表失败'
      console.error('[NPM Detail] 包列表加载失败:', packagesError.value)
    }
  } catch (err: any) {
    packagesError.value = err.message || '获取包列表失败'
    console.error('[NPM Detail] 包列表加载异常:', err)
  } finally {
    packagesLoading.value = false
  }
}

function changePage(page: number) {
  if (page >= 1 && page <= packagesTotalPages.value) {
    loadPackages(page)
  }
}

function resetAddUserForm() {
  addUserForm.value = {
    username: '',
    password: '',
    email: '',
  }
  showAddUserDialog.value = false
}

function handleAddUserClick() {
  showAddUserDialog.value = true
}

async function handleConfirmAddUser() {
  if (!registry.value) return

  if (!addUserForm.value.username || !addUserForm.value.password || !addUserForm.value.email) {
    message.error('请填写完整信息')
    return
  }

  addUserLoading.value = true

  try {
    const response = await npmApi.createVerdaccioUser(
      registry.value.id,
      addUserForm.value.username,
      addUserForm.value.password,
      addUserForm.value.email,
    )

    if (response && response.success) {
      message.success('用户创建成功')
      resetAddUserForm()
    } else {
      const errorMsg = response?.message || '创建用户失败'
      message.error(errorMsg)
    }
  } catch (err: any) {
    const errorMsg = err.message || '创建用户失败'
    message.error(errorMsg)
  } finally {
    addUserLoading.value = false
  }
}

async function checkRegistrySupportsUserRegistration() {
  if (!registry.value?.id) return

  try {
    const response = await npmApi.checkRegistrySupportsUserRegistration(registry.value.id)
    if (response.success && response.data) {
      supportsUserRegistration.value = response.data.supports || false
    }
  } catch (err) {
    // 忽略错误，默认不支持
    supportsUserRegistration.value = false
  }
}

function resetLoginForm() {
  loginForm.value = {
    username: '',
    password: '',
    email: '',
  }
  showLoginDialog.value = false
}

function handleLoginClick() {
  showLoginDialog.value = true
}

async function handleConfirmLogin() {
  if (!registry.value) return

  if (!loginForm.value.username || !loginForm.value.password) {
    message.error('请填写用户名和密码')
    return
  }

  loginLoading.value = true

  try {
    const response = await npmApi.login({
      registryId: registry.value.id,
      username: loginForm.value.username,
      password: loginForm.value.password,
      email: loginForm.value.email || undefined,
    }, { timeout: 30000 })

    if (response && response.success) {
      message.success('登录成功')
      // 先更新本地状态，立即切换 UI
      if (registry.value) {
        registry.value.isLoggedIn = true
        registry.value.username = response.username || loginForm.value.username
        registry.value.email = response.email || loginForm.value.email || registry.value.email
      }
      resetLoginForm()
      packagesPage.value = 1
      packages.value = []
      await loadRegistry()
    } else {
      const errorMsg = response?.message || response?.error || '登录失败，请检查用户名和密码'
      message.error(errorMsg)
    }
  } catch (err: any) {
    let errorMessage = '登录失败'
    
    if (err.name === 'AbortError' || err.message?.includes('timeout')) {
      errorMessage = '登录超时，请检查网络连接或稍后重试'
    } else if (err.message) {
      errorMessage = err.message
    } else if (typeof err === 'string') {
      errorMessage = err
    }
    
    message.error(errorMessage)
  } finally {
    loginLoading.value = false
  }
}

async function handleLogout() {
  if (!registry.value) return

  if (!confirm('确定要登出吗？')) return

  try {
    await npmApi.logout(registry.value.id)
    message.success('登出成功')
    // 重新加载仓库信息（更新登录状态）
    await loadRegistry()
  } catch (err: any) {
    message.error(err.message || '登出失败')
  }
}

function formatTime(time: string): string {
  if (!time) return ''
  const date = new Date(time)
  return date.toLocaleString('zh-CN')
}

function goBack() {
  router.push('/npm')
}

function goToPackageDetail(packageName: string) {
  if (!registry.value?.id) return
  router.push(`/npm/${registry.value.id}/package/${encodeURIComponent(packageName)}`)
}

function goToConfig() {
  if (!registry.value?.id) return
  router.push(`/npm/${registry.value.id}/config`)
}

onMounted(() => {
  loadRegistry()
})
</script>

<style scoped>
.npm-registry-detail-page {
  padding: var(--size-spacing-xl);
  max-width: 1200px;
  margin: 0 auto;
}

.page-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--size-spacing-lg);
  margin-bottom: var(--size-spacing-xl);
}

.page-header-left {
  display: flex;
  align-items: center;
  gap: var(--size-spacing-md);
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

.page-header-user {
  display: flex;
  align-items: center;
  gap: var(--size-spacing-md);
}

.user-meta {
  display: flex;
  align-items: center;
  gap: var(--size-spacing-sm);
  padding: var(--size-spacing-sm) var(--size-spacing-md);
  background: var(--color-bg-component);
  border: 1px solid var(--color-border-light);
  border-radius: var(--size-radius-md);
  color: var(--color-text-primary);
}

.user-meta-text {
  display: flex;
  flex-direction: column;
  gap: var(--size-spacing-2xs);
  line-height: var(--size-line-tight);
}

.user-meta-name {
  font-size: var(--font-size-base);
  font-weight: var(--size-font-weight-medium);
}

.user-meta-email {
  font-size: var(--font-size-xs);
  color: var(--color-text-secondary);
}

.skeleton-container {
  padding: var(--size-spacing-xl);
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

.detail-content {
  display: flex;
  flex-direction: column;
  gap: var(--size-spacing-xl);
}

.info-section,
.login-section,
.packages-section {
  background: var(--color-bg-container);
  border: 1px solid var(--color-border-light);
  border-radius: var(--size-radius-lg);
  padding: var(--size-spacing-lg);
}

.info-section h2,
.login-section h2,
.packages-section h2 {
  font-size: var(--font-size-lg);
  font-weight: var(--size-font-weight-semibold);
  margin: 0 0 var(--size-spacing-lg) 0;
  color: var(--color-text-primary);
}

.packages-count {
  font-size: var(--font-size-sm);
  font-weight: var(--size-font-weight-normal);
  color: var(--color-text-secondary);
}

.info-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: var(--size-spacing-md);
}

.info-item {
  display: flex;
  flex-direction: column;
  gap: var(--size-spacing-xs);
}

.info-label {
  font-size: var(--font-size-sm);
  color: var(--color-text-secondary);
  font-weight: var(--size-font-weight-medium);
}

.info-value {
  font-size: var(--font-size-base);
  color: var(--color-text-primary);
  display: flex;
  align-items: center;
  gap: var(--size-spacing-xs);
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

.badge--success {
  background: var(--color-success-light);
  color: var(--color-success-default);
}

.badge--disabled {
  background: var(--color-danger-light);
  color: var(--color-danger-default);
}

.login-prompt {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: var(--size-spacing-2xl);
}

.prompt-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--size-spacing-md);
  text-align: center;
}

.prompt-actions {
  display: flex;
  gap: var(--size-spacing-md);
  align-items: center;
}

.prompt-icon {
  color: var(--color-text-tertiary);
  opacity: 0.5;
}

.prompt-text {
  font-size: var(--font-size-base);
  color: var(--color-text-secondary);
  margin: 0;
}

.login-info {
  padding: var(--size-spacing-md);
}

.user-card {
  display: flex;
  align-items: center;
  gap: var(--size-spacing-lg);
  padding: var(--size-spacing-md);
  background: var(--color-bg-component);
  border-radius: var(--size-radius-md);
  border: 1px solid var(--color-border-light);
}

.user-avatar {
  width: 48px;
  height: 48px;
  border-radius: var(--size-radius-full);
  background: var(--theme-color-primary-light);
  color: var(--theme-color-primary);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.user-details {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: var(--size-spacing-xs);
}

.user-name {
  font-size: var(--font-size-base);
  font-weight: var(--size-font-weight-semibold);
  color: var(--color-text-primary);
  margin-bottom: var(--size-spacing-xs);
}

.user-actions {
  display: flex;
  align-items: center;
  gap: var(--size-spacing-sm);
  flex-wrap: wrap;
}

.user-email {
  font-size: var(--font-size-sm);
  color: var(--color-text-secondary);
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: var(--size-spacing-lg);
}

.section-header h2 {
  margin: 0;
}

.packages-skeleton {
  display: flex;
  flex-direction: column;
  gap: var(--size-spacing-md);
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

.packages-list {
  display: flex;
  flex-direction: column;
  gap: var(--size-spacing-md);
  margin-bottom: var(--size-spacing-lg);
}

.package-item {
  padding: var(--size-spacing-md);
  background: var(--color-bg-component);
  border: 1px solid var(--color-border-light);
  border-radius: var(--size-radius-md);
  transition: all 0.2s ease;
  cursor: pointer;
}

.package-item:hover {
  border-color: var(--theme-color-primary);
  box-shadow: var(--shadow-sm);
  transform: translateY(-2px);
}

.package-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: var(--size-spacing-xs);
}

.package-name {
  font-size: var(--font-size-lg);
  font-weight: var(--size-font-weight-semibold);
  margin: 0;
  color: var(--theme-color-primary);
}

.package-version {
  font-size: var(--font-size-sm);
  color: var(--color-text-secondary);
  background: var(--color-bg-container);
  padding: 2px 8px;
  border-radius: var(--size-radius-sm);
}

.package-description {
  font-size: var(--font-size-sm);
  color: var(--color-text-secondary);
  margin: var(--size-spacing-xs) 0;
  line-height: 1.6;
}

.package-meta {
  display: flex;
  gap: var(--size-spacing-md);
  font-size: var(--font-size-xs);
  color: var(--color-text-tertiary);
  margin-top: var(--size-spacing-xs);
}

.package-author,
.package-time {
  display: flex;
  align-items: center;
  gap: var(--size-spacing-xs);
}

.pagination {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: var(--size-spacing-md);
  padding: var(--size-spacing-lg) 0;
  border-top: 1px solid var(--color-border-light);
  margin-top: var(--size-spacing-lg);
}

.pagination-btn {
  padding: var(--size-spacing-sm) var(--size-spacing-md);
  background: var(--color-bg-component);
  color: var(--color-text-primary);
  border: 1px solid var(--color-border-light);
  border-radius: var(--size-radius-md);
  cursor: pointer;
  transition: all 0.2s ease;
  font-size: var(--font-size-sm);
}

.pagination-btn:hover:not(:disabled) {
  background: var(--color-bg-component-hover);
  border-color: var(--theme-color-primary);
  color: var(--theme-color-primary);
}

.pagination-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.pagination-info {
  font-size: var(--font-size-sm);
  color: var(--color-text-secondary);
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

.login-form,
.add-user-form {
  display: flex;
  flex-direction: column;
  gap: var(--size-spacing-lg);
  padding: var(--size-spacing-sm) 0;
}

.form-group {
  margin-bottom: 0;
  display: flex;
  flex-direction: column;
  gap: var(--size-spacing-sm);
}

.login-form .form-group :deep(.input-wrapper),
.add-user-form .form-group :deep(.input-wrapper) {
  width: 100%;
}

.modal :deep(.modal__body) {
  padding: var(--size-spacing-xl) var(--size-spacing-lg);
}
</style>

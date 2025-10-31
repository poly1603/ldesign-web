<template>
  <div class="node-manager-page">
    <n-spin :show="loading">
      <!-- 当前版本 -->
      <n-card title="当前 Node 版本" class="current-version-card">
        <template #header-extra>
          <n-button @click="loadCurrentVersion" :loading="currentLoading">
            <template #icon>
              <n-icon><ReloadOutlined /></n-icon>
            </template>
            刷新
          </n-button>
        </template>

        <n-descriptions v-if="currentVersion" :column="2" bordered>
          <n-descriptions-item label="版本">
            <n-tag type="success" size="large">
              v{{ currentVersion.version }}
            </n-tag>
          </n-descriptions-item>
          <n-descriptions-item label="路径">
            <n-text code>{{ currentVersion.path }}</n-text>
          </n-descriptions-item>
        </n-descriptions>
        <n-empty v-else description="未检测到 Node.js" />
      </n-card>

      <!-- 版本管理工具 -->
      <n-card title="版本管理工具" class="tools-card">
        <template #header-extra>
          <n-button @click="loadTools" :loading="toolsLoading">
            <template #icon>
              <n-icon><ReloadOutlined /></n-icon>
            </template>
            刷新
          </n-button>
        </template>

        <n-space>
          <n-card
            v-for="tool in tools"
            :key="tool.name"
            :title="tool.name.toUpperCase()"
            size="small"
            :class="{ 'tool-card': true, 'tool-installed': tool.installed }"
            hoverable
            @click="selectTool(tool.name)"
          >
            <template #header-extra>
              <n-tag :type="tool.installed ? 'success' : 'default'">
                {{ tool.installed ? '已安装' : '未安装' }}
              </n-tag>
            </template>
            <n-text v-if="tool.installed" depth="3">
              版本: {{ tool.version }}
            </n-text>
            <n-text v-else depth="3">
              未检测到
            </n-text>
          </n-card>
        </n-space>
      </n-card>

      <!-- 已安装的版本 -->
      <n-card title="已安装的版本" class="versions-card">
        <template #header-extra>
          <n-space>
            <n-select
              v-model:value="selectedTool"
              :options="toolOptions"
              style="width: 120px"
              @update:value="loadInstalledVersions"
            />
            <n-button @click="loadInstalledVersions" :loading="versionsLoading">
              <template #icon>
                <n-icon><ReloadOutlined /></n-icon>
              </template>
              刷新
            </n-button>
            <n-button type="primary" @click="showInstallDialog = true">
              <template #icon>
                <n-icon><PlusOutlined /></n-icon>
              </template>
              安装新版本
            </n-button>
          </n-space>
        </template>

        <n-list v-if="installedVersions.length > 0" bordered>
          <n-list-item v-for="version in installedVersions" :key="version">
            <template #suffix>
              <n-space>
                <n-button
                  size="small"
                  type="primary"
                  @click="handleUseVersion(version)"
                  :loading="usingVersion === version"
                >
                  使用
                </n-button>
                <n-popconfirm
                  @positive-click="handleUninstallVersion(version)"
                >
                  <template #trigger>
                    <n-button
                      size="small"
                      type="error"
                      :loading="uninstallingVersion === version"
                    >
                      卸载
                    </n-button>
                  </template>
                  确定要卸载 Node.js {{ version }} 吗？
                </n-popconfirm>
              </n-space>
            </template>
            <n-thing>
              <template #header>
                <n-text strong>Node.js v{{ version }}</n-text>
              </template>
            </n-thing>
          </n-list-item>
        </n-list>
        <n-empty v-else description="暂无已安装的版本" />
      </n-card>
    </n-spin>

    <!-- 安装对话框 -->
    <n-modal
      v-model:show="showInstallDialog"
      preset="dialog"
      title="安装 Node.js 版本"
      positive-text="安装"
      negative-text="取消"
      :loading="installing"
      @positive-click="handleInstallVersion"
    >
      <n-form ref="installFormRef" :model="installForm" label-placement="left" label-width="100">
        <n-form-item label="版本号" path="version" required>
          <n-input
            v-model:value="installForm.version"
            placeholder="例如: 18.17.0"
          />
        </n-form-item>
        <n-form-item label="管理工具" path="tool">
          <n-select
            v-model:value="installForm.tool"
            :options="toolOptions"
          />
        </n-form-item>
      </n-form>
    </n-modal>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import {
  NCard,
  NSpace,
  NButton,
  NIcon,
  NTag,
  NText,
  NDescriptions,
  NDescriptionsItem,
  NEmpty,
  NList,
  NListItem,
  NThing,
  NSelect,
  NModal,
  NForm,
  NFormItem,
  NInput,
  NPopconfirm,
  NSpin,
  useMessage,
  type FormInst,
} from 'naive-ui'
import {
  ReloadOutlined,
  PlusOutlined,
} from '@vicons/antd'
import { nodeManagerApi, type VersionManager, type CurrentVersion } from '../api/node-manager'

const message = useMessage()

// 当前版本
const currentVersion = ref<CurrentVersion | null>(null)
const currentLoading = ref(false)

// 版本管理工具
const tools = ref<VersionManager[]>([])
const toolsLoading = ref(false)
const selectedTool = ref('nvm')

const toolOptions = computed(() => {
  return tools.value
    .filter(t => t.installed)
    .map(t => ({ label: t.name.toUpperCase(), value: t.name }))
})

// 已安装的版本
const installedVersions = ref<string[]>([])
const versionsLoading = ref(false)

// 操作状态
const usingVersion = ref<string | null>(null)
const uninstallingVersion = ref<string | null>(null)
const installing = ref(false)

// 安装对话框
const showInstallDialog = ref(false)
const installFormRef = ref<FormInst | null>(null)
const installForm = ref({
  version: '',
  tool: 'nvm',
})

const loading = ref(false)

// 加载当前版本
const loadCurrentVersion = async () => {
  currentLoading.value = true
  try {
    currentVersion.value = await nodeManagerApi.getCurrentVersion()
  } catch (error: any) {
    message.error(error.message || '获取当前版本失败')
  } finally {
    currentLoading.value = false
  }
}

// 加载版本管理工具
const loadTools = async () => {
  toolsLoading.value = true
  try {
    tools.value = await nodeManagerApi.getTools()
    
    // 选择第一个已安装的工具
    const installedTool = tools.value.find(t => t.installed)
    if (installedTool) {
      selectedTool.value = installedTool.name
    }
  } catch (error: any) {
    message.error(error.message || '获取版本管理工具失败')
  } finally {
    toolsLoading.value = false
  }
}

// 选择工具
const selectTool = (toolName: string) => {
  const tool = tools.value.find(t => t.name === toolName)
  if (tool && tool.installed) {
    selectedTool.value = toolName
    loadInstalledVersions()
  }
}

// 加载已安装的版本
const loadInstalledVersions = async () => {
  versionsLoading.value = true
  try {
    installedVersions.value = await nodeManagerApi.getInstalledVersions(selectedTool.value)
  } catch (error: any) {
    message.error(error.message || '获取已安装版本失败')
  } finally {
    versionsLoading.value = false
  }
}

// 使用版本
const handleUseVersion = async (version: string) => {
  usingVersion.value = version
  try {
    await nodeManagerApi.useVersion(version, selectedTool.value)
    message.success(`已切换到 Node.js ${version}`)
    await loadCurrentVersion()
  } catch (error: any) {
    message.error(error.message || '切换版本失败')
  } finally {
    usingVersion.value = null
  }
}

// 卸载版本
const handleUninstallVersion = async (version: string) => {
  uninstallingVersion.value = version
  try {
    await nodeManagerApi.uninstallVersion(version, selectedTool.value)
    message.success(`Node.js ${version} 已卸载`)
    await loadInstalledVersions()
  } catch (error: any) {
    message.error(error.message || '卸载失败')
  } finally {
    uninstallingVersion.value = null
  }
}

// 安装版本
const handleInstallVersion = async () => {
  if (!installForm.value.version) {
    message.error('请输入版本号')
    return false
  }

  installing.value = true
  try {
    await nodeManagerApi.installVersion(
      installForm.value.version,
      installForm.value.tool
    )
    message.success(`Node.js ${installForm.value.version} 安装成功`)
    showInstallDialog.value = false
    installForm.value.version = ''
    await loadInstalledVersions()
    return true
  } catch (error: any) {
    message.error(error.message || '安装失败')
    return false
  } finally {
    installing.value = false
  }
}

onMounted(() => {
  loadCurrentVersion()
  loadTools()
})
</script>

<style scoped>
.node-manager-page {
  padding: 24px;
}

.current-version-card,
.tools-card,
.versions-card {
  margin-bottom: 24px;
}

.tool-card {
  width: 200px;
  cursor: pointer;
  transition: all 0.3s;
}

.tool-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}

.tool-installed {
  border-color: #18a058;
}
</style>


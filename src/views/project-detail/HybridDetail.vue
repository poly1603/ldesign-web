<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { MessagePlugin } from 'tdesign-vue-next'
import { ArrowLeftIcon, LayersIcon } from 'tdesign-icons-vue-next'

interface Project {
  id: number
  name: string
  path: string
  description?: string
  version?: string
  type: string
  framework?: string
  createdAt: string
  updatedAt: string
}

const API_BASE = 'http://localhost:7001/api/v1'
const route = useRoute()
const router = useRouter()
const project = ref<Project | null>(null)
const loading = ref(false)

const fetchProjectDetail = async () => {
  loading.value = true
  try {
    const response = await fetch(`${API_BASE}/projects/${route.params.id}`)
    const result = await response.json()
    if (result.code === 200) {
      project.value = result.data
    } else {
      throw new Error(result.message)
    }
  } catch (error) {
    MessagePlugin.error('获取混合项目详情失败')
    console.error(error)
  } finally {
    loading.value = false
  }
}

const goBack = () => router.push('/project')
const formatDate = (dateStr: string) => new Date(dateStr).toLocaleString('zh-CN')

onMounted(() => {
  fetchProjectDetail()
})
</script>

<template>
  <div class="hybrid-detail-page">
    <div class="page-header">
      <t-button theme="default" @click="goBack">
        <template #icon><ArrowLeftIcon /></template>
        返回列表
      </t-button>
    </div>

    <div v-if="loading" class="loading-container">
      <t-loading text="加载中..." />
    </div>

    <div v-else-if="project" class="detail-content">
      <t-card class="detail-card" :bordered="false">
        <div class="card-title">
          <LayersIcon class="title-icon" />
          <h2>{{ project.name }}</h2>
          <t-tag theme="warning">库+项目</t-tag>
        </div>

        <t-divider />

        <div class="detail-section">
          <h3>基本信息</h3>
          <div class="info-grid">
            <div class="info-item">
              <span class="label">项目名称：</span>
              <span class="value">{{ project.name }}</span>
            </div>
            <div class="info-item">
              <span class="label">版本：</span>
              <span class="value">{{ project.version || '-' }}</span>
            </div>
            <div class="info-item">
              <span class="label">框架：</span>
              <span class="value">{{ project.framework || '-' }}</span>
            </div>
            <div class="info-item full-width">
              <span class="label">项目路径：</span>
              <span class="value path">{{ project.path }}</span>
            </div>
            <div v-if="project.description" class="info-item full-width">
              <span class="label">项目描述：</span>
              <span class="value">{{ project.description }}</span>
            </div>
          </div>
        </div>

        <t-divider />

        <div class="detail-section">
          <h3>时间信息</h3>
          <div class="info-grid">
            <div class="info-item">
              <span class="label">创建时间：</span>
              <span class="value">{{ formatDate(project.createdAt) }}</span>
            </div>
            <div class="info-item">
              <span class="label">更新时间：</span>
              <span class="value">{{ formatDate(project.updatedAt) }}</span>
            </div>
          </div>
        </div>

        <t-divider />

        <div class="detail-section">
          <h3>混合项目操作</h3>
          <t-space>
            <t-button theme="primary">启动项目</t-button>
            <t-button theme="success">构建库</t-button>
            <t-button theme="default">发布库</t-button>
            <t-button theme="default">打开终端</t-button>
          </t-space>
        </div>
      </t-card>
    </div>

    <div v-else class="empty-container">
      <t-empty description="项目不存在" />
    </div>
  </div>
</template>

<style scoped>
.hybrid-detail-page {
  max-width: 1200px;
  padding: 24px;
}

.page-header {
  margin-bottom: 24px;
}

.loading-container,
.empty-container {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 400px;
}

.detail-content {
  width: 100%;
}

.detail-card {
  padding: 24px;
}

.card-title {
  display: flex;
  align-items: center;
  gap: 12px;
}

.title-icon {
  font-size: 32px;
  color: #e37318;
}

.card-title h2 {
  margin: 0;
  flex: 1;
  font-size: 28px;
  color: #333;
}

.detail-section {
  margin: 24px 0;
}

.detail-section h3 {
  font-size: 18px;
  color: #333;
  margin-bottom: 16px;
}

.info-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 16px;
}

.info-item {
  display: flex;
  gap: 8px;
  font-size: 14px;
}

.info-item.full-width {
  grid-column: 1 / -1;
}

.info-item .label {
  color: #666;
  font-weight: 500;
  min-width: 100px;
}

.info-item .value {
  color: #333;
  flex: 1;
}

.info-item .value.path {
  font-family: 'Consolas', 'Monaco', monospace;
  word-break: break-all;
  color: #666;
}
</style>

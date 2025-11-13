<script setup lang="ts">
import { ref } from 'vue'

const stats = ref([
  { title: '总项目数', value: 12, color: '#0052d9' },
  { title: '进行中', value: 5, color: '#00a870' },
  { title: '已完成', value: 7, color: '#029cd4' },
  { title: '待审核', value: 3, color: '#e37318' },
])
</script>

<template>
  <div class="home">
    <h1 class="page-title">欢迎使用管理系统</h1>
    <div class="stats-container">
      <t-card
        v-for="(stat, index) in stats"
        :key="index"
        class="stat-card"
        :bordered="false"
        hover
      >
        <div class="stat-content">
          <div class="stat-info">
            <div class="stat-title">{{ stat.title }}</div>
            <div class="stat-value" :style="{ color: stat.color }">
              {{ stat.value }}
            </div>
          </div>
        </div>
      </t-card>
    </div>
    <t-card title="快速访问" class="quick-access" :bordered="false">
      <t-space>
        <t-button theme="primary" @click="$router.push('/project')">
          进入项目管理
        </t-button>
      </t-space>
    </t-card>
  </div>
</template>

<style scoped>
.home {
  max-width: 1200px;
  padding: 24px;
}

.page-title {
  font-size: 24px;
  margin-bottom: 24px;
  color: #333;
}

.stats-container {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
  gap: 16px;
  margin-bottom: 24px;
}

.stat-card {
  cursor: pointer;
  transition: all 0.3s;
}

.stat-content {
  padding: 8px 0;
}

.stat-info {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.stat-title {
  font-size: 14px;
  color: #666;
}

.stat-value {
  font-size: 32px;
  font-weight: 600;
}

.quick-access {
  margin-top: 24px;
}
</style>

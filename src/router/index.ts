import { createRouter, createWebHistory } from 'vue-router'
import MainLayout from '@/layouts/MainLayout.vue'
import Home from '@/views/Home.vue'
import Project from '@/views/Project.vue'
import SystemInfo from '@/views/SystemInfo.vue'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      component: MainLayout,
      children: [
        {
          path: '',
          name: 'Home',
          component: Home,
          meta: { title: '首页' },
        },
        {
          path: 'project',
          name: 'Project',
          component: Project,
          meta: { title: '项目管理' },
        },
        {
          path: 'system-info',
          name: 'SystemInfo',
          component: SystemInfo,
          meta: { title: '系统信息' },
        },
      ],
    },
  ],
})

// 路由守卫：更新页面标题
router.afterEach((to) => {
  const title = to.meta.title as string
  if (title) {
    document.title = `${title} - 管理系统`
  } else {
    document.title = '管理系统'
  }
})

export default router

import { createRouter, createWebHistory } from 'vue-router'
import MainLayout from '@/layouts/MainLayout.vue'
import Home from '@/views/Home.vue'
import Project from '@/views/Project.vue'
import SystemInfo from '@/views/SystemInfo.vue'
import ProjectDetail from '@/views/project-detail/ProjectDetail.vue'
import LibraryDetail from '@/views/project-detail/LibraryDetail.vue'
import HybridDetail from '@/views/project-detail/HybridDetail.vue'
import StaticDetail from '@/views/project-detail/StaticDetail.vue'
import DevRunner from '@/views/project-detail/DevRunner.vue'
import BuildRunner from '@/views/project-detail/BuildRunner.vue'
import PreviewRunner from '@/views/project-detail/PreviewRunner.vue'

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
          path: 'project/detail/:id',
          name: 'ProjectDetail',
          component: ProjectDetail,
          meta: { title: '项目详情' },
        },
        {
          path: 'library/detail/:id',
          name: 'LibraryDetail',
          component: LibraryDetail,
          meta: { title: '库详情' },
        },
        {
          path: 'hybrid/detail/:id',
          name: 'HybridDetail',
          component: HybridDetail,
          meta: { title: '混合项目详情' },
        },
        {
          path: 'static/detail/:id',
          name: 'StaticDetail',
          component: StaticDetail,
          meta: { title: '静态项目详情' },
        },
        {
          path: 'project/:id/dev',
          name: 'DevRunner',
          component: DevRunner,
          meta: { title: '启动开发服务器' },
        },
        {
          path: 'project/:id/build',
          name: 'BuildRunner',
          component: BuildRunner,
          meta: { title: '构建项目' },
        },
        {
          path: 'project/:id/preview',
          name: 'PreviewRunner',
          component: PreviewRunner,
          meta: { title: '预览构建结果' },
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

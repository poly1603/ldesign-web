import { createApp } from 'vue'
import App from './App.vue'
import router from './router'
import { createPinia } from 'pinia'
import { errorHandler } from './utils/errorHandler'
import './style.css'
import './styles/theme.css'

const app = createApp(App)
const pinia = createPinia()

// 全局错误处理
errorHandler.install()

// Vue 错误处理
app.config.errorHandler = (err, instance, info) => {
  console.error('Vue Error:', err, info)
  errorHandler.handle(err, { showToast: true })
}

app.use(pinia)
app.use(router)
app.mount('#app')

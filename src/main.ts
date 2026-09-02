import { createPinia } from 'pinia'
import { createApp } from 'vue'

import App from './App.vue'
import { router } from './router'
import { useAuthStore } from './stores/auth'
import './lib/fetch-interceptor'
import './style.css'

const pinia = createPinia()
const app = createApp(App)

app.use(router)
app.use(pinia)

const authStore = useAuthStore()
authStore.loadFromStorage()

app.mount('#app')

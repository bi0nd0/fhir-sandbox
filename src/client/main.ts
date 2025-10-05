import { createApp } from 'vue'

import App from './app.vue'
import { createRouter } from './router'
import { createStores } from './stores'
import './styles/tailwind.css'

const app = createApp(App)
const router = createRouter()
const pinia = createStores()

app.use(pinia)
app.use(router)

app.mount('#app')

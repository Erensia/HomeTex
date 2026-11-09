import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { registerSW } from 'virtual:pwa-register'
import { AppProvider } from './state/AppContext'
import App from './App'
import './style.css'

registerSW({ immediate: true })
try { sessionStorage.removeItem('hometex:recovered') } catch { /* index.html의 자동 복구 플래그 해제 */ }

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <AppProvider>
        <App />
      </AppProvider>
    </BrowserRouter>
  </StrictMode>,
)

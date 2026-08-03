import { createRoot } from 'react-dom/client'
import type { ComponentType } from 'react'
import './index.css'
import './i18n'

// If TEMP_OFFLINE.tsx exists → show offline page.
// Delete TEMP_OFFLINE.tsx → app boots normally.
const offlineModules = import.meta.glob('./TEMP_OFFLINE.tsx', { eager: true }) as Record<
  string,
  { default: ComponentType }
>
const Offline = Object.values(offlineModules)[0]?.default

async function boot() {
  const root = createRoot(document.getElementById("root")!)
  if (Offline) {
    root.render(<Offline />)
    return
  }
  const { default: App } = await import('./App.tsx')
  root.render(<App />)
}

boot()

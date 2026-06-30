import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './index.css'
import { exportAll, importAll } from './lib/backup'
import { getSettings } from './lib/db'
import { fetchGist, mergePayloads } from './lib/sync'

async function bootSync() {
  try {
    const settings = await getSettings()

    if (!settings.githubPat || !settings.githubGistId) {
      return
    }

    const remote = await fetchGist(settings.githubPat, settings.githubGistId)
    if (!remote) {
      return
    }

    const local = await exportAll()
    const { payload, conflicts } = mergePayloads(local, remote, settings.lastSyncAt ?? 0)

    if (conflicts.length > 0) {
      return
    }

    await importAll(payload)
  } catch {
    // ignore sync boot failures; manual sync remains available in settings
  }
}

void bootSync().finally(() => {
  ReactDOM.createRoot(document.getElementById('root')!).render(
    <React.StrictMode>
      <App />
    </React.StrictMode>,
  )
})

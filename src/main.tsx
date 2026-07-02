import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './index.css'

async function requestPersistentStorage() {
  try {
    if (typeof navigator !== 'undefined' && navigator.storage?.persist) {
      await navigator.storage.persist()
    }
  } catch {
    // ignore; persistence is best-effort
  }
}

void requestPersistentStorage()

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)

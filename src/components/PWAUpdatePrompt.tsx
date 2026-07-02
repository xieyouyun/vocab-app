import { useState } from 'react'
import { useRegisterSW } from 'virtual:pwa-register/react'

export default function PWAUpdatePrompt() {
  const [applying, setApplying] = useState(false)
  const {
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegisteredSW(_swUrl, registration) {
      if (!registration) return
      setInterval(() => {
        void registration.update()
      }, 60 * 60 * 1000)
    },
  })

  if (!needRefresh) return null

  const applyUpdate = async () => {
    if (applying) return
    setApplying(true)
    try {
      await updateServiceWorker(true)
    } finally {
      setTimeout(() => {
        window.location.reload()
      }, 400)
    }
  }

  return (
    <div
      className="fixed inset-x-0 z-40 flex items-center justify-between gap-3 rounded-lg border border-sky-200 bg-white px-3 py-2 text-sm shadow-lg"
      style={{ bottom: 'calc(env(safe-area-inset-bottom, 0px) + 72px)', margin: '0 12px' }}
      role="status"
      aria-live="polite"
    >
      <span className="text-slate-700">
        {applying ? '正在更新...' : '发现新版本'}
      </span>
      <div className="flex gap-2">
        <button
          type="button"
          className="rounded bg-slate-100 px-2 py-1 text-slate-600 disabled:opacity-50"
          onClick={() => setNeedRefresh(false)}
          disabled={applying}
        >
          稍后
        </button>
        <button
          type="button"
          className="rounded bg-sky-600 px-3 py-1 text-white disabled:opacity-50"
          onClick={() => void applyUpdate()}
          disabled={applying}
        >
          更新
        </button>
      </div>
    </div>
  )
}

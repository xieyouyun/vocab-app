import { useEffect, useRef, useState } from 'react'
import { exportAll, importAll } from '../lib/backup'
import { clearAll, getSettings, putSettings } from '../lib/db'

export default function Settings() {
  const [daily, setDaily] = useState(10)
  const [pat, setPat] = useState('')
  const [gist, setGist] = useState('')
  const [message, setMessage] = useState('')
  const fileRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    getSettings().then((settings) => {
      setDaily(settings.dailyNewCount)
      setPat(settings.githubPat ?? '')
      setGist(settings.githubGistId ?? '')
    })
  }, [])

  const save = async () => {
    const settings = await getSettings()
    await putSettings({
      ...settings,
      dailyNewCount: Math.min(100, Math.max(1, daily)),
      githubPat: pat || undefined,
      githubGistId: gist || undefined,
    })
    setMessage('已保存')
  }

  const exportJson = async () => {
    const blob = new Blob([JSON.stringify(await exportAll(), null, 2)], {
      type: 'application/json',
    })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `vocab-${Date.now()}.json`
    link.click()
    URL.revokeObjectURL(url)
  }

  const onImportFile = async (file: File) => {
    await importAll(JSON.parse(await file.text()))
    setMessage('导入完成')
  }

  const wipe = async () => {
    if (!confirm('确定清空所有数据？不可恢复')) return
    await clearAll()
    setMessage('已清空')
  }

  return (
    <main className="space-y-6 p-4 pb-24">
      <h1 className="text-2xl font-bold">设置</h1>

      <section className="space-y-2">
        <label className="block text-sm">每日新词数（1-100）</label>
        <input
          type="number"
          min={1}
          max={100}
          value={daily}
          onChange={(event) => setDaily(parseInt(event.target.value || '0', 10))}
          className="w-32 rounded border px-2 py-1"
        />
        <p className="text-xs text-slate-500">推荐 10 轻松 / 20 中等 / 30 高强度</p>
      </section>

      <section className="space-y-2">
        <h2 className="font-medium">GitHub 同步</h2>
        <input
          type="password"
          placeholder="Personal Access Token (gist 权限)"
          value={pat}
          onChange={(event) => setPat(event.target.value)}
          className="w-full rounded border px-2 py-1"
        />
        <input
          type="text"
          placeholder="Gist ID（首次留空，按需手动创建）"
          value={gist}
          onChange={(event) => setGist(event.target.value)}
          className="w-full rounded border px-2 py-1"
        />
      </section>

      <section className="space-y-2">
        <h2 className="font-medium">数据管理</h2>
        <div className="flex gap-2">
          <button className="rounded bg-slate-100 px-3 py-1" onClick={exportJson}>
            导出 JSON
          </button>
          <button
            className="rounded bg-slate-100 px-3 py-1"
            onClick={() => fileRef.current?.click()}
          >
            导入 JSON
          </button>
          <input
            ref={fileRef}
            type="file"
            accept="application/json"
            hidden
            onChange={(event) => {
              const file = event.target.files?.[0]
              if (file) {
                void onImportFile(file)
              }
            }}
          />
        </div>
      </section>

      <section>
        <button className="rounded bg-rose-100 px-3 py-1 text-rose-700" onClick={wipe}>
          清空所有数据
        </button>
      </section>

      <button
        className="fixed bottom-20 right-4 rounded bg-sky-600 px-4 py-2 text-white"
        onClick={save}
      >
        保存
      </button>

      {message && <p className="text-sm text-slate-600">{message}</p>}
    </main>
  )
}

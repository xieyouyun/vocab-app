import { useEffect, useRef, useState } from 'react'
import { exportAll, importAll } from '../lib/backup'
import { clearAll, getSettings, putSettings } from '../lib/db'
import {
  applyConflictResolutions,
  createGist,
  fetchGist,
  mergePayloads,
  pushGist,
  type Conflict,
} from '../lib/sync'
import ConflictDialog from '../components/ConflictDialog'

const clampDaily = (value: number) => Math.min(100, Math.max(1, value))

export default function Settings() {
  const [daily, setDaily] = useState(10)
  const [pat, setPat] = useState('')
  const [gist, setGist] = useState('')
  const [message, setMessage] = useState('')
  const [busy, setBusy] = useState(false)
  const [conflicts, setConflicts] = useState<Conflict[]>([])
  const [pendingPayload, setPendingPayload] = useState<Awaited<ReturnType<typeof exportAll>> | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    getSettings().then((settings) => {
      setDaily(settings.dailyNewCount)
      setPat(settings.githubPat ?? '')
      setGist(settings.githubGistId ?? '')
    })
  }, [])

  const buildSettings = async () => {
    const settings = await getSettings()

    return {
      ...settings,
      dailyNewCount: clampDaily(daily),
      githubPat: pat.trim() || undefined,
      githubGistId: gist.trim() || undefined,
    }
  }

  const save = async () => {
    const next = await buildSettings()
    await putSettings(next)
    setDaily(next.dailyNewCount)
    setGist(next.githubGistId ?? '')
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
    const settings = await getSettings()
    setDaily(settings.dailyNewCount)
    setPat(settings.githubPat ?? '')
    setGist(settings.githubGistId ?? '')
    setMessage('导入完成')
  }

  const wipe = async () => {
    if (!confirm('确定清空所有数据？不可恢复')) return
    await clearAll()
    setConflicts([])
    setPendingPayload(null)
    setMessage('已清空')
  }

  const applyAndPush = async (
    payload: Awaited<ReturnType<typeof exportAll>>,
    patValue: string,
    gistId: string,
    successMessage: string,
  ) => {
    const next = {
      ...payload,
      settings: {
        ...payload.settings,
        githubPat: patValue,
        githubGistId: gistId,
      },
    }

    await importAll(next)
    await pushGist(patValue, gistId, next)
    setDaily(next.settings.dailyNewCount)
    setPat(patValue)
    setGist(gistId)
    setMessage(successMessage)
  }

  const syncNow = async () => {
    setBusy(true)
    setMessage('')

    try {
      const currentSettings = await buildSettings()
      const patValue = currentSettings.githubPat

      if (!patValue) {
        setMessage('请先填写 GitHub PAT')
        return
      }

      await putSettings(currentSettings)

      const now = Date.now()
      const local = await exportAll(now)
      const localPayload = {
        ...local,
        settings: currentSettings,
      }

      let gistId = currentSettings.githubGistId
      if (!gistId) {
        gistId = await createGist(patValue, localPayload)
        await putSettings({
          ...currentSettings,
          githubGistId: gistId,
          lastSyncAt: now,
        })
        setGist(gistId)
        setMessage('已创建 Gist 并完成首次同步')
        return
      }

      const remote = await fetchGist(patValue, gistId)
      if (!remote) {
        await applyAndPush(
          {
            ...localPayload,
            settings: {
              ...localPayload.settings,
              lastSyncAt: now,
            },
          },
          patValue,
          gistId,
          '已上传到 Gist',
        )
        return
      }

      const { payload, conflicts: nextConflicts } = mergePayloads(
        localPayload,
        remote,
        currentSettings.lastSyncAt ?? 0,
        now,
      )

      if (nextConflicts.length > 0) {
        setConflicts(nextConflicts)
        setPendingPayload(payload)
        setMessage(`发现 ${nextConflicts.length} 个冲突，请先选择保留版本`)
        return
      }

      await applyAndPush(payload, patValue, gistId, '同步完成')
    } catch (error) {
      setMessage(error instanceof Error ? error.message : '同步失败')
    } finally {
      setBusy(false)
    }
  }

  const resolveConflicts = async (decisions: Record<string, 'local' | 'remote'>) => {
    if (!pendingPayload) {
      return
    }

    const resolvedPayload = {
      ...pendingPayload,
      words: applyConflictResolutions(pendingPayload.words, decisions, conflicts),
    }
    const patValue = resolvedPayload.settings.githubPat
    const gistId = resolvedPayload.settings.githubGistId

    if (!patValue || !gistId) {
      setMessage('缺少同步凭据，请重新同步')
      setConflicts([])
      setPendingPayload(null)
      return
    }

    setBusy(true)
    try {
      await applyAndPush(resolvedPayload, patValue, gistId, '冲突已处理并完成同步')
      setConflicts([])
      setPendingPayload(null)
    } catch (error) {
      setMessage(error instanceof Error ? error.message : '同步失败')
    } finally {
      setBusy(false)
    }
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
        <button
          className="rounded bg-sky-600 px-3 py-2 text-white disabled:opacity-40"
          onClick={() => void syncNow()}
          disabled={busy}
        >
          {busy ? '同步中...' : '立即同步'}
        </button>
      </section>

      <section className="space-y-2">
        <h2 className="font-medium">数据管理</h2>
        <div className="flex gap-2">
          <button className="rounded bg-slate-100 px-3 py-1" onClick={exportJson} disabled={busy}>
            导出 JSON
          </button>
          <button
            className="rounded bg-slate-100 px-3 py-1"
            onClick={() => fileRef.current?.click()}
            disabled={busy}
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
        <button
          className="rounded bg-rose-100 px-3 py-1 text-rose-700 disabled:opacity-40"
          onClick={wipe}
          disabled={busy}
        >
          清空所有数据
        </button>
      </section>

      <button
        className="fixed bottom-20 right-4 rounded bg-sky-600 px-4 py-2 text-white disabled:opacity-40"
        onClick={save}
        disabled={busy}
      >
        保存
      </button>

      {message && <p className="text-sm text-slate-600">{message}</p>}

      {conflicts.length > 0 && (
        <ConflictDialog
          conflicts={conflicts}
          onResolve={(decisions) => void resolveConflicts(decisions)}
          onCancel={() => {
            setConflicts([])
            setPendingPayload(null)
            setMessage('已取消本次冲突处理')
          }}
        />
      )}
    </main>
  )
}

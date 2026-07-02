import { useEffect, useRef, useState } from 'react'
import { exportAll, importAll } from '../lib/backup'
import { clearAll, getSettings, putSettings } from '../lib/db'
import {
  applyConflictResolutions,
  createGist,
  fetchGist,
  markPayloadSynced,
  mergePayloads,
  pushGist,
  type Conflict,
} from '../lib/sync'
import ConflictDialog from '../components/ConflictDialog'

const clampDaily = (value: number) => Math.min(100, Math.max(1, value))

const maskPat = (pat: string) => {
  if (pat.length <= 8) return '****'
  return `${pat.slice(0, 4)}${'*'.repeat(6)}${pat.slice(-4)}`
}

export default function Settings() {
  const [daily, setDaily] = useState(10)
  const [pat, setPat] = useState('')
  const [gist, setGist] = useState('')
  const [savedPat, setSavedPat] = useState('')
  const [editingPat, setEditingPat] = useState(false)
  const [message, setMessage] = useState('')
  const [busy, setBusy] = useState(false)
  const [conflicts, setConflicts] = useState<Conflict[]>([])
  const [pendingPayload, setPendingPayload] = useState<Awaited<ReturnType<typeof exportAll>> | null>(null)
  const [showGuide, setShowGuide] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)
  const hydratedRef = useRef(false)
  const autosaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    getSettings().then((settings) => {
      setDaily(settings.dailyNewCount)
      setSavedPat(settings.githubPat ?? '')
      setPat('')
      setEditingPat(!settings.githubPat)
      setGist(settings.githubGistId ?? '')
      hydratedRef.current = true
    })
  }, [])

  useEffect(() => {
    if (!hydratedRef.current) return

    const patToSave = editingPat ? pat.trim() : savedPat
    const gistToSave = gist.trim()

    if (autosaveTimer.current) {
      clearTimeout(autosaveTimer.current)
    }

    autosaveTimer.current = setTimeout(async () => {
      const current = await getSettings()
      const nextPat = patToSave || undefined
      const nextGist = gistToSave || undefined

      if (current.githubPat === nextPat && current.githubGistId === nextGist) {
        return
      }

      await putSettings({
        ...current,
        githubPat: nextPat,
        githubGistId: nextGist,
      })
      if (patToSave) setSavedPat(patToSave)
    }, 400)

    return () => {
      if (autosaveTimer.current) clearTimeout(autosaveTimer.current)
    }
  }, [pat, gist, editingPat, savedPat])

  const buildSettings = async () => {
    const settings = await getSettings()
    const effectivePat = editingPat ? pat.trim() : savedPat

    return {
      ...settings,
      dailyNewCount: clampDaily(daily),
      githubPat: effectivePat || undefined,
      githubGistId: gist.trim() || undefined,
    }
  }

  const save = async () => {
    const next = await buildSettings()
    await putSettings(next)
    setDaily(next.dailyNewCount)
    setGist(next.githubGistId ?? '')
    setSavedPat(next.githubPat ?? '')
    if (next.githubPat) {
      setEditingPat(false)
      setPat('')
    }
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
    setSavedPat(settings.githubPat ?? '')
    setPat('')
    setEditingPat(!settings.githubPat)
    setGist(settings.githubGistId ?? '')
    setMessage('导入完成')
  }

  const wipe = async () => {
    if (!confirm('确定清空所有数据？不可恢复')) return
    await clearAll()
    setConflicts([])
    setPendingPayload(null)
    setSavedPat('')
    setPat('')
    setGist('')
    setEditingPat(true)
    setMessage('已清空')
  }

  const applyAndPush = async (
    payload: Awaited<ReturnType<typeof exportAll>>,
    patValue: string,
    gistId: string,
    syncedAt: number,
    successMessage: string,
  ) => {
    const next = markPayloadSynced({
      ...payload,
      settings: {
        ...payload.settings,
        githubPat: patValue,
        githubGistId: gistId,
      },
    }, syncedAt)

    await pushGist(patValue, gistId, next)
    await importAll(next)
    setDaily(next.settings.dailyNewCount)
    setSavedPat(patValue)
    setPat('')
    setEditingPat(false)
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
          now,
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

      await applyAndPush(payload, patValue, gistId, now, '同步完成')
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
      await applyAndPush(resolvedPayload, patValue, gistId, Date.now(), '冲突已处理并完成同步')
      setConflicts([])
      setPendingPayload(null)
    } catch (error) {
      setMessage(error instanceof Error ? error.message : '同步失败')
    } finally {
      setBusy(false)
    }
  }

  return (
    <main className="app-page-shell">
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
        <div className="flex items-center justify-between">
          <h2 className="font-medium">GitHub 同步</h2>
          <button
            type="button"
            className="text-xs text-sky-600 underline"
            onClick={() => setShowGuide((prev) => !prev)}
            aria-expanded={showGuide}
          >
            {showGuide ? '收起说明' : '如何获取？'}
          </button>
        </div>
        {showGuide && (
          <div className="rounded border border-sky-100 bg-sky-50 p-3 text-xs leading-relaxed text-slate-700">
            <ol className="list-decimal space-y-1 pl-4">
              <li>
                打开{' '}
                <a
                  className="text-sky-700 underline"
                  href="https://github.com/settings/tokens?type=beta"
                  target="_blank"
                  rel="noreferrer"
                >
                  GitHub Fine-grained Tokens
                </a>
                {' '}或{' '}
                <a
                  className="text-sky-700 underline"
                  href="https://github.com/settings/tokens"
                  target="_blank"
                  rel="noreferrer"
                >
                  Classic Tokens
                </a>
                页面，登录你的 GitHub 账号。
              </li>
              <li>
                点击 <span className="font-mono">Generate new token</span>，设置一个有效期。
              </li>
              <li>
                权限选择：
                <ul className="mt-1 list-disc pl-4">
                  <li>Fine-grained：<span className="font-mono">Account permissions → Gists → Read and write</span></li>
                  <li>Classic：勾选 <span className="font-mono">gist</span></li>
                </ul>
              </li>
              <li>
                生成后复制 token，粘贴到下方 <span className="font-mono">Personal Access Token</span> 输入框，会自动保存到本地。
              </li>
              <li>
                <span className="font-mono">Gist ID</span> 首次留空，点“立即同步”会自动创建一个私有 Gist；创建后系统会自动填入 Gist ID。
              </li>
              <li>
                换设备时，在新设备粘贴同一个 token 和 Gist ID，即可双向同步词库。
              </li>
            </ol>
            <p className="mt-2 text-slate-500">
              说明：Token 仅保存在本机 IndexedDB，不会上传到 Gist 备份内容中。
            </p>
          </div>
        )}
        {savedPat && !editingPat ? (
          <div className="flex items-center gap-2 rounded border bg-slate-50 px-2 py-2 text-sm">
            <span className="flex-1 text-slate-700">
              已保存 GitHub PAT：<span className="font-mono">{maskPat(savedPat)}</span>
            </span>
            <button
              type="button"
              className="rounded bg-slate-200 px-2 py-1 text-xs"
              onClick={() => {
                setPat('')
                setEditingPat(true)
              }}
            >
              修改 PAT
            </button>
          </div>
        ) : (
          <input
            type="password"
            placeholder="Personal Access Token (gist 权限)"
            value={pat}
            onChange={(event) => setPat(event.target.value)}
            className="w-full rounded border px-2 py-1"
          />
        )}
        <input
          type="text"
          placeholder="Gist ID（首次留空，按需手动创建）"
          value={gist}
          onChange={(event) => setGist(event.target.value)}
          className="w-full rounded border px-2 py-1"
        />
        <p className="text-xs text-slate-500">输入后会自动保存到本地，无需再次输入</p>
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

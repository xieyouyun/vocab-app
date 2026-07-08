import { useEffect, useState } from 'react'
import { getLastImport } from '../lib/db'
import { importText, rollbackLastImport, TEMPLATE_TEXT } from '../lib/import'
import { uploadLocalToCloud, type UploadOutcome } from '../lib/sync'

function describeUpload(outcome: UploadOutcome): string {
  switch (outcome.status) {
    case 'uploaded':
      return '已上传到云端 ✓'
    case 'created':
      return '已创建云端 Gist 并上传 ✓'
    case 'skipped':
      return '未同步：请先在设置页填写 GitHub PAT'
    case 'error':
      return `云端同步失败：${outcome.error}`
  }
}

export default function Import() {
  const [text, setText] = useState('')
  const [result, setResult] = useState('')
  const [canRollback, setCanRollback] = useState(false)
  const [uploading, setUploading] = useState(false)

  const copyTemplate = async () => {
    await navigator.clipboard.writeText(TEMPLATE_TEXT)
    setResult('模板已复制')
  }

  useEffect(() => {
    getLastImport().then((record) => setCanRollback(Boolean(record)))
  }, [])

  const submit = async () => {
    const summary = await importText(text)
    setResult(`新增 ${summary.added}，覆盖 ${summary.overwritten}`)
    setText('')
    setCanRollback(true)
  }

  const rollback = async () => {
    if (!confirm('将删除最近一次导入新增的单词，并恢复被覆盖单词的旧内容。该操作不可再次回滚。')) {
      return
    }

    const summary = await rollbackLastImport()
    setResult(`已回滚最近一次导入：删除 ${summary.deleted}，恢复 ${summary.restored}`)
    setCanRollback(false)
  }

  const uploadNow = async () => {
    if (!confirm('确定用本地数据覆盖云端 Gist？这会替换云端全部内容。')) return

    setUploading(true)
    try {
      const outcome = await uploadLocalToCloud()
      setResult(describeUpload(outcome))
    } finally {
      setUploading(false)
    }
  }

  return (
    <main className="app-page-shell--compact">
      <h1 className="text-2xl font-bold">导入</h1>
      <button className="rounded border bg-slate-100 px-4 py-2" onClick={copyTemplate}>
        复制模板提示词
      </button>
      <textarea
        value={text}
        onChange={(event) => setText(event.target.value)}
        rows={10}
        aria-label="导入文本"
        placeholder="粘贴豆包返回的内容"
        className="w-full rounded border p-2 font-mono text-sm"
      />
      <div className="flex flex-wrap gap-2">
        <button className="rounded bg-sky-600 px-4 py-2 text-white" onClick={submit}>
          解析并导入
        </button>
        <button
          className="rounded bg-emerald-600 px-4 py-2 text-white disabled:opacity-40"
          onClick={uploadNow}
          disabled={uploading}
        >
          {uploading ? '上传中...' : '上传到云端'}
        </button>
        {canRollback && (
          <button
            className="rounded bg-amber-600 px-4 py-2 text-white"
            onClick={rollback}
          >
            回滚最近一次导入
          </button>
        )}
      </div>
      {result && (
        <p role="status" className="text-sm text-slate-600">
          {result}
        </p>
      )}
    </main>
  )
}

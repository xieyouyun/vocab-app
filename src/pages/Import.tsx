import { useEffect, useState } from 'react'
import { getLastImport } from '../lib/db'
import { importText, rollbackLastImport, TEMPLATE_TEXT } from '../lib/import'

export default function Import() {
  const [text, setText] = useState('')
  const [result, setResult] = useState('')
  const [canRollback, setCanRollback] = useState(false)

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
        placeholder="粘贴豆包返回的内容"
        className="w-full rounded border p-2 font-mono text-sm"
      />
      <div className="flex gap-2">
        <button className="rounded bg-sky-600 px-4 py-2 text-white" onClick={submit}>
          解析并导入
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
      {result && <p className="text-sm text-slate-600">{result}</p>}
    </main>
  )
}

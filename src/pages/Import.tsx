import { useState } from 'react'
import { commitImport, type ImportItem, prepareImport, TEMPLATE_TEXT } from '../lib/import'

export default function Import() {
  const [text, setText] = useState('')
  const [items, setItems] = useState<ImportItem[]>([])
  const [result, setResult] = useState('')

  const copyTemplate = async () => {
    await navigator.clipboard.writeText(TEMPLATE_TEXT)
    setResult('模板已复制')
  }

  const parse = async () => {
    const next = await prepareImport(text)
    setItems(next)
    setResult('')
  }

  const setDecision = (index: number, decision: 'overwrite' | 'skip') => {
    setItems((prev) =>
      prev.map((item, current) => (current === index ? { ...item, decision } : item)),
    )
  }

  const submit = async () => {
    const summary = await commitImport(items)
    setResult(`新增 ${summary.added}，覆盖 ${summary.overwritten}，跳过 ${summary.skipped}`)
    setItems([])
    setText('')
  }

  return (
    <main className="p-4 pb-24 space-y-4">
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
        <button className="rounded bg-sky-600 px-4 py-2 text-white" onClick={parse}>
          解析
        </button>
        {items.length > 0 && (
          <button
            className="rounded bg-emerald-600 px-4 py-2 text-white disabled:opacity-40"
            disabled={items.some((item) => item.existing && !item.decision)}
            onClick={submit}
          >
            提交
          </button>
        )}
      </div>
      {result && <p className="text-sm text-slate-600">{result}</p>}
      <ul className="divide-y rounded border">
        {items.map((item, index) => (
          <li key={item.entry.w} className="flex items-center justify-between p-2">
            <div>
              <span className="font-medium">{item.entry.w}</span>
              {item.entry.missing.length > 0 && (
                <span className="ml-2 text-xs text-amber-600">
                  缺 {item.entry.missing.join(',')}
                </span>
              )}
              {item.existing && <span className="ml-2 text-xs text-rose-600">已存在</span>}
            </div>
            {item.existing && (
              <div className="space-x-2 text-sm">
                <label>
                  <input
                    type="radio"
                    name={`decision-${index}`}
                    checked={item.decision === 'overwrite'}
                    onChange={() => setDecision(index, 'overwrite')}
                  />{' '}
                  覆盖
                </label>
                <label>
                  <input
                    type="radio"
                    name={`decision-${index}`}
                    checked={item.decision === 'skip'}
                    onChange={() => setDecision(index, 'skip')}
                  />{' '}
                  跳过
                </label>
              </div>
            )}
          </li>
        ))}
      </ul>
    </main>
  )
}

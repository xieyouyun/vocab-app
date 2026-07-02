import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { deleteWordAndCleanupSession, getAllWords } from '../lib/db'
import { filterAndSearch } from '../lib/library'
import type { Word, WordStatus } from '../lib/types'

const STATUS_LABELS: Record<WordStatus, string> = {
  new: '新词',
  learning: '学习中',
  mastered: '已掌握',
}

export default function Library() {
  const [tab, setTab] = useState<'learning' | 'mastered' | 'all'>('learning')
  const [query, setQuery] = useState('')
  const [allWords, setAllWords] = useState<Word[]>([])

  useEffect(() => {
    getAllWords().then(setAllWords)
  }, [])

  const words = filterAndSearch(allWords, tab, query)

  return (
    <main className="app-page-shell--compact">
      <h1 className="mb-2 text-2xl font-bold">词库</h1>
      <div className="mb-2 flex gap-2 text-sm">
        {(['learning', 'mastered', 'all'] as const).map((value) => (
          <button
            key={value}
            className={`rounded px-3 py-1 ${tab === value ? 'bg-sky-600 text-white' : 'bg-slate-100'}`}
            onClick={() => setTab(value)}
          >
            {value === 'learning' ? '学习中' : value === 'mastered' ? '已掌握' : '全部'}
          </button>
        ))}
      </div>
      <input
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        placeholder="搜索"
        className="mb-2 w-full rounded border px-2 py-1"
      />
      <ul className="divide-y rounded border">
        {words.map((word) => (
          <li key={word.w} className="flex items-start gap-3 p-3">
            <Link
              to={`/library/${encodeURIComponent(word.w)}`}
              className="min-w-0 flex-1 space-y-1"
            >
              <div>
                <span className="font-medium">{word.w}</span>{' '}
                <span className="text-sm text-slate-500">{word.cn}</span>
              </div>
              <div className="text-xs text-slate-500">
                {STATUS_LABELS[word.s]} · {word.streak}次
              </div>
            </Link>
            <button
              type="button"
              className="shrink-0 rounded bg-rose-100 px-2 py-1 text-xs text-rose-700"
              aria-label={`删除 ${word.w}`}
              onClick={async (event) => {
                event.preventDefault()
                event.stopPropagation()
                if (!confirm(`确定删除 ${word.w} 吗？`)) return
                await deleteWordAndCleanupSession(word.w)
                setAllWords((prev) => prev.filter((item) => item.w !== word.w))
              }}
            >
              删除
            </button>
          </li>
        ))}
      </ul>
    </main>
  )
}

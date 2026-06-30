import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { getAllWords } from '../lib/db'
import { filterAndSearch } from '../lib/library'
import type { Word } from '../lib/types'

export default function Library() {
  const [tab, setTab] = useState<'learning' | 'mastered' | 'all'>('learning')
  const [query, setQuery] = useState('')
  const [allWords, setAllWords] = useState<Word[]>([])

  useEffect(() => {
    getAllWords().then(setAllWords)
  }, [])

  const words = filterAndSearch(allWords, tab, query)

  return (
    <main className="p-4 pb-24">
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
          <li key={word.w}>
            <Link
              to={`/library/${encodeURIComponent(word.w)}`}
              className="flex items-center justify-between p-3"
            >
              <span>
                <span className="font-medium">{word.w}</span>{' '}
                <span className="text-sm text-slate-500">{word.cn}</span>
              </span>
              <span className="text-xs text-slate-500">
                {word.s} · streak {word.streak}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </main>
  )
}

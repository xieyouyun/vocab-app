import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { deleteWord, getWord, putWord } from '../lib/db'
import { markMastered, resetWordProgress } from '../lib/library'
import type { Word } from '../lib/types'

export default function WordDetail() {
  const { w } = useParams()
  const key = decodeURIComponent(w!)
  const navigate = useNavigate()
  const [word, setWord] = useState<Word>()

  useEffect(() => {
    getWord(key).then(setWord)
  }, [key])

  if (!word) {
    return <main className="p-4">未找到</main>
  }

  const update = async (next: Word) => {
    await putWord(next)
    setWord(next)
  }

  const remove = async () => {
    await deleteWord(key)
    navigate('/library')
  }

  return (
    <main className="space-y-3 p-4">
      <button className="text-sm text-slate-500" onClick={() => navigate(-1)}>
        ← 返回
      </button>
      <h1 className="text-3xl font-bold">{word.w}</h1>
      <div className="text-slate-600">{word.p}</div>
      <div>
        {word.pos} · {word.cn}
      </div>
      <div className="text-sm">{word.en}</div>
      <div className="text-sm text-slate-600">{word.enCn}</div>
      <div className="text-sm italic">{word.ex}</div>
      <div className="text-sm text-slate-600">{word.exCn}</div>
      <div className="text-xs text-slate-500">
        状态 {word.s} · streak {word.streak} · ef {word.ef.toFixed(2)}
      </div>
      <div className="flex flex-wrap gap-2 pt-2">
        <button
          className="rounded bg-slate-100 px-3 py-1"
          onClick={() => update(resetWordProgress(word))}
        >
          重置进度
        </button>
        <button
          className="rounded bg-emerald-100 px-3 py-1"
          onClick={() => update(markMastered(word))}
        >
          标记已掌握
        </button>
        {word.s === 'mastered' && (
          <button
            className="rounded bg-amber-100 px-3 py-1"
            onClick={() => update(resetWordProgress(word))}
          >
            重新学习
          </button>
        )}
        <button className="rounded bg-rose-100 px-3 py-1" onClick={remove}>
          删除
        </button>
      </div>
    </main>
  )
}

import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { deleteWordAndCleanupSession, getWord, putWord } from '../lib/db'
import { markMastered, resetWordProgress } from '../lib/library'
import { formatPhonetic } from '../lib/parser'
import type { Word, WordStatus } from '../lib/types'

const STATUS_LABELS: Record<WordStatus, string> = {
  new: '新词',
  learning: '学习中',
  mastered: '已掌握',
}

export default function WordDetail() {
  const { w } = useParams()
  const key = decodeURIComponent(w!)
  const navigate = useNavigate()
  const [word, setWord] = useState<Word>()
  const [showEfHelp, setShowEfHelp] = useState(false)

  useEffect(() => {
    getWord(key).then(setWord)
  }, [key])

  if (!word) {
    return <main className="p-4">未找到</main>
  }

  const phonetic = formatPhonetic(word.p)
  const statusLabel = STATUS_LABELS[word.s]

  const update = async (next: Word) => {
    await putWord(next)
    setWord(next)
  }

  const remove = async () => {
    if (!confirm(`确定删除 ${key} 吗？`)) return
    await deleteWordAndCleanupSession(key)
    navigate('/library')
  }

  return (
    <main className="space-y-3 p-4">
      <button className="text-sm text-slate-500" onClick={() => navigate(-1)}>
        ← 返回
      </button>
      <h1 className="text-3xl font-bold">{word.w}</h1>
      {phonetic && <div className="text-slate-600">{phonetic}</div>}
      <div>
        {word.pos} · {word.cn}
      </div>
      <div className="text-sm">{word.en}</div>
      <div className="text-sm text-slate-600">{word.enCn}</div>
      {word.tip && (
        <div className="rounded bg-amber-50 px-3 py-2 text-sm text-amber-900">
          💡 记忆技巧：{word.tip}
        </div>
      )}
      <div className="text-sm italic">{word.ex}</div>
      <div className="text-sm text-slate-600">{word.exCn}</div>
      <div className="space-y-2 rounded border border-slate-200 bg-white/80 p-3 text-sm text-slate-600">
        <div>学习状态：{statusLabel}</div>
        <div>连续记住：{word.streak} 次</div>
        <div className="relative">
          <div className="flex items-center gap-2">
            <span>记忆系数 EF：{word.ef.toFixed(2)}</span>
            <button
              type="button"
              className="inline-flex h-5 w-5 items-center justify-center rounded-full border border-slate-300 text-xs text-slate-500"
              aria-label="什么是 EF？"
              aria-expanded={showEfHelp}
              onClick={() => setShowEfHelp((value) => !value)}
            >
              ?
            </button>
          </div>
          {showEfHelp && (
            <div
              role="dialog"
              aria-label="EF 说明"
              className="absolute left-0 top-full z-10 mt-2 w-full rounded-lg border border-slate-200 bg-white p-3 text-xs leading-5 text-slate-600 shadow-lg"
            >
              <p>
                EF 用来表示你对这个词的熟悉程度。数值越高，系统会认为你更容易记住它，后续复习间隔通常会更长。
              </p>
              <p className="mt-2">
                答对时 EF 会略微上升，答错时会下降。它不会单独决定结果，而是和连续记住次数一起影响复习安排。
              </p>
            </div>
          )}
        </div>
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

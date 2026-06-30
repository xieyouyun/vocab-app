import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import AnswerButtons from '../components/AnswerButtons'
import WordCard from '../components/WordCard'
import { getAllWords, getSettings, getWord, putSettings, putWord } from '../lib/db'
import { applyAnswer } from '../lib/srs'
import { buildTodayQueue, insertAgain, nowDateString, resumeOrStartSession } from '../lib/session'
import type { SessionState, Word } from '../lib/types'

export default function Study() {
  const navigate = useNavigate()
  const [session, setSession] = useState<SessionState>()
  const [cursor, setCursor] = useState(0)
  const [revealed, setRevealed] = useState(false)
  const [current, setCurrent] = useState<Word>()

  useEffect(() => {
    ;(async () => {
      const settings = await getSettings()
      const words = await getAllWords()
      const today = nowDateString()
      const nextSession = resumeOrStartSession(settings.currentSession, today, () =>
        buildTodayQueue(words, settings.dailyNewCount),
      )
      await putSettings({ ...settings, currentSession: nextSession })
      setSession(nextSession)
      setCursor(nextSession.done.length)
    })()
  }, [])

  useEffect(() => {
    if (!session) return
    const key = session.queue[cursor]
    if (!key) {
      setCurrent(undefined)
      return
    }
    getWord(key).then(setCurrent)
  }, [session, cursor])

  if (!session) {
    return <main className="p-4">加载中</main>
  }

  if (cursor >= session.queue.length) {
    return (
      <main className="space-y-4 p-6 text-center">
        <div className="text-2xl">今日完成 🎉</div>
        <button
          className="rounded bg-sky-600 px-4 py-2 text-white"
          onClick={() => navigate('/')}
        >
          回首页
        </button>
      </main>
    )
  }

  if (!current) {
    return <main className="p-4">…</main>
  }

  const persistSession = async (next: SessionState) => {
    setSession(next)
    const settings = await getSettings()
    await putSettings({ ...settings, currentSession: next })
  }

  const alreadyReviewedToday = session.done.includes(current.w)

  const onKnow = async () => {
    if (!alreadyReviewedToday) {
      await putWord(applyAnswer(current, true))
      await persistSession({ ...session, done: [...session.done, current.w] })
    }
    setRevealed(false)
    setCursor((value) => value + 1)
  }

  const onUnknown = async () => {
    if (!alreadyReviewedToday) {
      await putWord(applyAnswer(current, false))
      const nextQueue = insertAgain(session.queue, cursor, current.w)
      await persistSession({ ...session, queue: nextQueue, done: [...session.done, current.w] })
    }
    setRevealed(true)
  }

  const onNext = () => {
    setRevealed(false)
    setCursor((value) => value + 1)
  }

  const exit = () => {
    if (confirm('退出后下次可续接，确认？')) {
      navigate('/')
    }
  }

  return (
    <main className="flex h-full flex-col p-4">
      <div className="flex items-center justify-between text-sm">
        <span>
          进度 {cursor + 1}/{session.queue.length}
        </span>
        <button className="text-slate-500" onClick={exit}>
          ×
        </button>
      </div>
      <div className="flex flex-1 items-center justify-center">
        <WordCard word={current} revealed={revealed} />
      </div>
      <AnswerButtons
        revealed={revealed}
        onKnow={onKnow}
        onUnknown={onUnknown}
        onNext={onNext}
      />
    </main>
  )
}

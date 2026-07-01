import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { getAllWords, getSettings } from '../lib/db'
import { nowDateString } from '../lib/session'
import { countWordsByStatus } from '../lib/stats'

export default function Home() {
  const [counts, setCounts] = useState({ dueLearning: 0, newCount: 0, mastered: 0 })
  const [resume, setResume] = useState<number>()

  useEffect(() => {
    ;(async () => {
      setCounts(countWordsByStatus(await getAllWords()))
      const settings = await getSettings()
      if (settings.currentSession && settings.currentSession.date === nowDateString()) {
        const left = settings.currentSession.queue.length - settings.currentSession.done.length
        if (left > 0) {
          setResume(left)
        }
      }
    })()
  }, [])

  return (
    <main className="mx-auto max-w-md space-y-6 p-6 pb-24">
      <h1 className="text-2xl font-bold">{nowDateString()}</h1>
      <div className="grid grid-cols-3 gap-2 text-center">
        <div>
          <div className="text-2xl font-bold">{counts.dueLearning}</div>
          <div className="text-xs">待复习</div>
        </div>
        <div>
          <div className="text-2xl font-bold">{counts.newCount}</div>
          <div className="text-xs">待学新词</div>
        </div>
        <div>
          <div className="text-2xl font-bold">{counts.mastered}</div>
          <div className="text-xs">已掌握</div>
        </div>
      </div>
      <Link
        to="/study"
        className="block rounded bg-sky-600 py-4 text-center text-lg text-white"
      >
        {resume ? `继续上次（剩 ${resume} 个）` : '开始今日学习'}
      </Link>
    </main>
  )
}

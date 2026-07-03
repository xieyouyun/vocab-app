import { useEffect, useState } from 'react'
import { getAllWords, getSettings } from '../lib/db'
import { calcLongestStreak, calcStreak, countStudiedWords } from '../lib/stats'
import type { Word } from '../lib/types'

function toDateStr(year: number, month: number, day: number): string {
  const pad = (n: number) => `${n}`.padStart(2, '0')
  return `${year}-${pad(month + 1)}-${pad(day)}`
}

function daysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate()
}

function firstDayOfWeek(year: number, month: number): number {
  return new Date(year, month, 1).getDay()
}

export default function Stats() {
  const [words, setWords] = useState<Word[]>([])
  const [completedDates, setCompletedDates] = useState<string[]>([])
  const [overachievedDates, setOverachievedDates] = useState<string[]>([])
  const [totalCompletedDays, setTotalCompletedDays] = useState(0)
  const [longestStreak, setLongestStreak] = useState(0)
  const [year, setYear] = useState(() => new Date().getFullYear())
  const [month, setMonth] = useState(() => new Date().getMonth())

  useEffect(() => {
    ;(async () => {
      setWords(await getAllWords())
      const s = await getSettings()
      setCompletedDates(s.completedDates)
      setOverachievedDates(s.overachievedDates)
      setTotalCompletedDays(s.totalCompletedDays)
      setLongestStreak(s.longestStreak)
    })()
  }, [])

  const today = toDateStr(new Date().getFullYear(), new Date().getMonth(), new Date().getDate())
  const streak = calcStreak(completedDates)
  const longest = Math.max(longestStreak, calcLongestStreak(completedDates))

  const prevMonth = () => {
    if (month === 0) {
      setYear((y) => y - 1)
      setMonth(11)
    } else {
      setMonth((m) => m - 1)
    }
  }

  const nextMonth = () => {
    if (month === 11) {
      setYear((y) => y + 1)
      setMonth(0)
    } else {
      setMonth((m) => m + 1)
    }
  }

  const days = daysInMonth(year, month)
  const startDay = firstDayOfWeek(year, month)
  const cells: Array<{ day: number | null; dateStr: string; isToday: boolean }> = []

  for (let i = 0; i < startDay; i++) {
    cells.push({ day: null, dateStr: '', isToday: false })
  }
  for (let d = 1; d <= days; d++) {
    const dateStr = toDateStr(year, month, d)
    cells.push({ day: d, dateStr, isToday: dateStr === today })
  }

  const getCellClass = (dateStr: string) => {
    if (!dateStr) return ''
    if (overachievedDates.includes(dateStr)) return 'bg-amber-500/30'
    if (completedDates.includes(dateStr)) return 'bg-emerald-500/30'
    if (dateStr < today) return 'bg-rose-500/30'
    return ''
  }

  const monthLabel = `${year}年${month + 1}月`

  return (
    <main className="app-page-shell">
      <h1 className="text-2xl font-bold">统计</h1>

      <div className="grid grid-cols-3 gap-2 text-center">
        <div className="rounded bg-slate-50 py-3">
          <div className="text-xl font-bold">{countStudiedWords(words)}</div>
          <div className="text-xs text-slate-500">累积完成单词</div>
        </div>
        <div className="rounded bg-slate-50 py-3">
          <div className="text-xl font-bold">{totalCompletedDays}</div>
          <div className="text-xs text-slate-500">累积完成天数</div>
        </div>
        <div className="rounded bg-slate-50 py-3">
          <div className="text-xl font-bold">{longest}</div>
          <div className="text-xs text-slate-500">最高连续天数</div>
        </div>
      </div>

      <div>
        <div className="flex items-center justify-between mb-3">
          <button className="text-slate-500 px-2" onClick={prevMonth}>
            ←
          </button>
          <span className="font-medium">{monthLabel}</span>
          <button className="text-slate-500 px-2" onClick={nextMonth}>
            →
          </button>
        </div>

        <div className="grid grid-cols-7 text-center text-xs text-slate-400 mb-1">
          {['日', '一', '二', '三', '四', '五', '六'].map((d) => (
            <div key={d}>{d}</div>
          ))}
        </div>

        <div className="grid grid-cols-7 gap-1">
          {cells.map((cell, i) => (
            <div
              key={i}
              className={`aspect-square flex items-center justify-center rounded text-sm font-medium ${
                cell.day === null
                  ? ''
                  : cell.isToday
                    ? `ring-2 ring-sky-500 ${getCellClass(cell.dateStr)}`
                    : getCellClass(cell.dateStr)
              }`}
            >
              {cell.day}
            </div>
          ))}
        </div>

        <div className="flex gap-4 mt-4 text-xs text-slate-500 justify-center">
          <span className="flex items-center gap-1">
            <span className="inline-block w-3 h-3 rounded bg-emerald-500/30" /> 完成
          </span>
          <span className="flex items-center gap-1">
            <span className="inline-block w-3 h-3 rounded bg-amber-500/30" /> 超额
          </span>
          <span className="flex items-center gap-1">
            <span className="inline-block w-3 h-3 rounded bg-rose-500/30" /> 未完成
          </span>
        </div>
      </div>

      {streak > 0 && (
        <p className="text-center text-sm text-slate-600">
          🔥 当前连续打卡 {streak} 天
        </p>
      )}
    </main>
  )
}

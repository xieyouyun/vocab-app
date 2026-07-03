import type { Word } from './types'

export function countWordsByStatus(words: Word[], now: number = Date.now()) {
  let dueLearning = 0
  let newCount = 0
  let mastered = 0

  for (const word of words) {
    if (word.s === 'new') {
      newCount += 1
    } else if (word.s === 'mastered') {
      mastered += 1
    } else if (word.s === 'learning' && word.dueAt <= now) {
      dueLearning += 1
    }
  }

  return { dueLearning, newCount, mastered }
}

export function countStudiedWords(words: Word[]): number {
  return words.filter((word) => word.s === 'learning' || word.s === 'mastered').length
}

export function calcStreak(completedDates: string[]): number {
  if (completedDates.length === 0) return 0

  const sorted = [...completedDates].sort()
  const today = toDateString(new Date())
  const yesterday = toDateString(new Date(Date.now() - 86_400_000))

  // streak must end today or yesterday
  const last = sorted[sorted.length - 1]
  if (last !== today && last !== yesterday) return 0

  let streak = 0
  for (let i = sorted.length - 1; i >= 0; i--) {
    const expected = toDateString(
      new Date(new Date(sorted[sorted.length - 1]).getTime() - streak * 86_400_000),
    )
    if (sorted[i] === expected) {
      streak += 1
    } else {
      break
    }
  }

  return streak
}

export function calcLongestStreak(completedDates: string[]): number {
  if (completedDates.length === 0) return 0

  const sorted = [...completedDates].sort()
  let longest = 1
  let current = 1

  for (let i = 1; i < sorted.length; i++) {
    const prev = new Date(sorted[i - 1]).getTime()
    const curr = new Date(sorted[i]).getTime()
    if (curr - prev === 86_400_000) {
      current += 1
    } else {
      longest = Math.max(longest, current)
      current = 1
    }
  }

  return Math.max(longest, current)
}

const NINETY_DAYS_MS = 90 * 86_400_000

export function pruneToRecent90Days(dates: string[], now: number = Date.now()): string[] {
  const cutoff = toDateString(new Date(now - NINETY_DAYS_MS))
  const set = new Set(dates.filter((d) => d >= cutoff))
  return [...set].sort()
}

export function mergeAttendance(
  local: {
    completedDates: string[]
    overachievedDates: string[]
    totalCompletedDays: number
    longestStreak: number
  },
  remote: {
    completedDates: string[]
    overachievedDates: string[]
    totalCompletedDays?: number
    longestStreak?: number
  },
  now: number = Date.now(),
): {
  completedDates: string[]
  overachievedDates: string[]
  totalCompletedDays: number
  longestStreak: number
} {
  const completedUnion = pruneToRecent90Days(
    [...new Set([...local.completedDates, ...remote.completedDates])],
    now,
  )
  const overachievedUnion = pruneToRecent90Days(
    [...new Set([...local.overachievedDates, ...remote.overachievedDates])],
    now,
  )
  const totalCompletedDays = Math.max(
    local.totalCompletedDays,
    remote.totalCompletedDays ?? 0,
    completedUnion.length,
  )
  const longestStreak = Math.max(
    local.longestStreak,
    remote.longestStreak ?? 0,
    calcLongestStreak(completedUnion),
  )

  return {
    completedDates: completedUnion,
    overachievedDates: overachievedUnion,
    totalCompletedDays,
    longestStreak,
  }
}

function toDateString(date: Date): string {
  const pad = (n: number) => `${n}`.padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
}

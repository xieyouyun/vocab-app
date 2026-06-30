import type { Word } from './types'

const DAY = 86_400_000
const EF_MIN = 1.3
const EF_MAX = 3.0
const STREAK_INTERVALS: Record<number, number> = {
  1: 1,
  2: 3,
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value))
}

export function newWord(
  input: Partial<Word> & { w: string },
  now: number = Date.now(),
): Word {
  return {
    s: 'new',
    streak: 0,
    ef: 2.5,
    interval: 0,
    dueAt: 0,
    reviewedAt: 0,
    createdAt: now,
    updatedAt: now,
    ...input,
  }
}

export function applyAnswer(
  word: Word,
  known: boolean,
  now: number = Date.now(),
): Word {
  const next: Word = {
    ...word,
    reviewedAt: now,
    updatedAt: now,
  }

  if (known) {
    next.streak = word.streak + 1
    next.ef = clamp(word.ef + 0.1, EF_MIN, EF_MAX)

    if (next.streak >= 3) {
      next.s = 'mastered'
      next.interval = 0
      next.dueAt = 0
      return next
    }

    next.interval = STREAK_INTERVALS[next.streak] ?? 1
    next.dueAt = now + next.interval * DAY
    next.s = word.s === 'new' ? 'learning' : word.s
    return next
  }

  next.streak = 0
  next.ef = clamp(word.ef - 0.2, EF_MIN, EF_MAX)
  next.interval = 0
  next.dueAt = now
  next.s = word.s === 'new' ? 'learning' : word.s
  return next
}

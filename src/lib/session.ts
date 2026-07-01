import type { SessionState, Word } from './types'

export function nowDateString(now: number = Date.now()): string {
  const date = new Date(now)
  const pad = (value: number) => `${value}`.padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
}

function shuffle<T>(items: T[], rng: () => number): T[] {
  const next = items.slice()

  for (let i = 0; i < next.length - 1; i += 1) {
    const j = i + Math.floor(rng() * (next.length - i))
    ;[next[i], next[j]] = [next[j], next[i]]
  }

  return next
}

export function buildTodayQueue(
  words: Word[],
  dailyNewCount: number,
  now: number = Date.now(),
  rng: () => number = Math.random,
): string[] {
  const due = words
    .filter((word) => word.s === 'learning' && word.dueAt <= now)
    .map((word) => word.w)

  const fresh = words
    .filter((word) => word.s === 'new')
    .slice(0, dailyNewCount)
    .map((word) => word.w)

  return shuffle([...due, ...fresh], rng)
}

export function insertAgain(
  queue: string[],
  cursor: number,
  word: string,
  offset: number = 6,
): string[] {
  const insertAt = Math.min(cursor + offset, queue.length)
  return [...queue.slice(0, insertAt), word, ...queue.slice(insertAt)]
}

export function resumeOrStartSession(
  current: SessionState | undefined,
  todayDate: string,
  builder: () => string[],
): SessionState {
  if (current && current.date === todayDate) {
    return current
  }

  return {
    date: todayDate,
    queue: builder(),
    done: [],
    startedAt: Date.now(),
  }
}

export function extendQueue(
  words: Word[],
  session: SessionState,
  count: number = 5,
): string[] {
  const fresh = words
    .filter((word) => word.s === 'new' && !session.queue.includes(word.w) && !session.done.includes(word.w))
    .slice(0, count)
    .map((word) => word.w)

  return [...session.queue, ...fresh]
}

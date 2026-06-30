import { describe, expect, it } from 'vitest'
import { buildTodayQueue, insertAgain, nowDateString, resumeOrStartSession } from './session'
import type { Word } from './types'

const make = (w: string, over: Partial<Word> = {}): Word => ({
  w,
  s: 'new',
  streak: 0,
  ef: 2.5,
  interval: 0,
  dueAt: 0,
  reviewedAt: 0,
  createdAt: 0,
  updatedAt: 0,
  ...over,
})

describe('nowDateString', () => {
  it('returns local YYYY-MM-DD', () => {
    const date = new Date(2026, 5, 30, 12, 0)
    expect(nowDateString(date.getTime())).toBe('2026-06-30')
  })
})

describe('buildTodayQueue', () => {
  it('includes due learning words and up to N new words', () => {
    const now = 1_000_000_000
    const words: Word[] = [
      make('due1', { s: 'learning', dueAt: now - 1 }),
      make('due2', { s: 'learning', dueAt: now - 2 }),
      make('future', { s: 'learning', dueAt: now + 86_400_000 }),
      make('new1'),
      make('new2'),
      make('new3'),
      make('done', { s: 'mastered' }),
    ]

    const queue = buildTodayQueue(words, 2, now, () => 0)
    expect(queue).toHaveLength(4)
    expect(queue).toContain('due1')
    expect(queue).toContain('due2')
    expect(queue.filter((word) => word.startsWith('new')).length).toBe(2)
    expect(queue).not.toContain('future')
    expect(queue).not.toContain('done')
  })

  it('rng=0 produces deterministic order', () => {
    const words = [make('a'), make('b'), make('c')]
    expect(buildTodayQueue(words, 3, 0, () => 0)).toEqual(['a', 'b', 'c'])
  })
})

describe('insertAgain', () => {
  it('inserts at cursor + offset', () => {
    const queue = ['a', 'b', 'c', 'd', 'e']
    expect(insertAgain(queue, 0, 'x', 2)).toEqual(['a', 'b', 'x', 'c', 'd', 'e'])
  })

  it('clips offset to end if past tail', () => {
    expect(insertAgain(['a', 'b'], 1, 'x', 10)).toEqual(['a', 'b', 'x'])
  })
})

describe('resumeOrStartSession', () => {
  it('returns existing when date matches', () => {
    const session = { date: '2026-06-30', queue: ['a'], done: [], startedAt: 1 }
    expect(resumeOrStartSession(session, '2026-06-30', () => ['z'])).toBe(session)
  })

  it('builds new when date mismatches', () => {
    const session = { date: '2026-06-29', queue: ['a'], done: [], startedAt: 1 }
    const next = resumeOrStartSession(session, '2026-06-30', () => ['z'])
    expect(next.date).toBe('2026-06-30')
    expect(next.queue).toEqual(['z'])
  })
})

import { describe, expect, it } from 'vitest'
import {
  calcLongestStreak,
  calcStreak,
  countStudiedWords,
  countWordsByStatus,
  mergeAttendance,
  pruneToRecent90Days,
} from './stats'
import { newWord } from './srs'

describe('countWordsByStatus', () => {
  it('counts by category at given time', () => {
    const now = 1_000_000
    const words = [
      newWord({ w: 'n1' }, 0),
      newWord({ w: 'n2' }, 0),
      { ...newWord({ w: 'd1' }, 0), s: 'learning' as const, dueAt: now - 1 },
      { ...newWord({ w: 'd2' }, 0), s: 'learning' as const, dueAt: now + 86_400_000 },
      { ...newWord({ w: 'm1' }, 0), s: 'mastered' as const },
    ]

    expect(countWordsByStatus(words, now)).toEqual({
      dueLearning: 1,
      newCount: 2,
      mastered: 1,
    })
  })
})

describe('countStudiedWords', () => {
  it('counts learning and mastered only', () => {
    const words = [
      newWord({ w: 'n1' }, 0),
      { ...newWord({ w: 'l1' }, 0), s: 'learning' as const },
      { ...newWord({ w: 'm1' }, 0), s: 'mastered' as const },
    ]
    expect(countStudiedWords(words)).toBe(2)
  })
})

const today = () => {
  const d = new Date()
  const pad = (n: number) => `${n}`.padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

const ago = (n: number) => {
  const d = new Date(Date.now() - n * 86_400_000)
  const pad = (x: number) => `${x}`.padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

describe('calcStreak', () => {
  it('returns 0 for empty list', () => {
    expect(calcStreak([])).toBe(0)
  })

  it('returns 1 if only today completed', () => {
    expect(calcStreak([today()])).toBe(1)
  })

  it('returns streak ending today', () => {
    expect(calcStreak([today(), ago(1), ago(2)])).toBe(3)
  })

  it('returns 0 if streak broke', () => {
    expect(calcStreak([ago(2), ago(4)])).toBe(0)
  })
})

describe('calcLongestStreak', () => {
  it('returns 0 for empty list', () => {
    expect(calcLongestStreak([])).toBe(0)
  })

  it('returns longest consecutive run', () => {
    expect(calcLongestStreak([ago(5), ago(4), ago(3), ago(1), today()])).toBe(3)
  })
})

describe('pruneToRecent90Days', () => {
  it('keeps only dates within the last 90 days', () => {
    const now = new Date('2026-07-01T00:00:00Z').getTime()
    const kept = pruneToRecent90Days(
      ['2026-06-30', '2026-04-05', '2026-01-01', '2025-12-31'],
      now,
    )
    expect(kept).toContain('2026-06-30')
    expect(kept).toContain('2026-04-05')
    expect(kept).not.toContain('2026-01-01')
    expect(kept).not.toContain('2025-12-31')
  })

  it('dedupes duplicates and returns sorted output', () => {
    const now = new Date('2026-07-01T00:00:00Z').getTime()
    expect(pruneToRecent90Days(['2026-06-30', '2026-06-30', '2026-06-29'], now)).toEqual([
      '2026-06-29',
      '2026-06-30',
    ])
  })
})

describe('mergeAttendance', () => {
  const now = new Date('2026-07-01T00:00:00Z').getTime()

  it('unions completedDates and overachievedDates', () => {
    const merged = mergeAttendance(
      {
        completedDates: ['2026-06-30', '2026-06-29'],
        overachievedDates: ['2026-06-30'],
        totalCompletedDays: 2,
        longestStreak: 2,
      },
      {
        completedDates: ['2026-06-29', '2026-06-28'],
        overachievedDates: [],
        totalCompletedDays: 2,
        longestStreak: 1,
      },
      now,
    )
    expect(merged.completedDates).toEqual(['2026-06-28', '2026-06-29', '2026-06-30'])
    expect(merged.overachievedDates).toEqual(['2026-06-30'])
  })

  it('takes max of local/remote/union length for totalCompletedDays', () => {
    const merged = mergeAttendance(
      {
        completedDates: ['2026-06-30'],
        overachievedDates: [],
        totalCompletedDays: 50,
        longestStreak: 0,
      },
      {
        completedDates: ['2026-06-29'],
        overachievedDates: [],
        totalCompletedDays: 40,
        longestStreak: 0,
      },
      now,
    )
    expect(merged.totalCompletedDays).toBe(50)
  })

  it('takes max of local/remote/recomputed for longestStreak', () => {
    const merged = mergeAttendance(
      {
        completedDates: ['2026-06-28'],
        overachievedDates: [],
        totalCompletedDays: 1,
        longestStreak: 10,
      },
      {
        completedDates: ['2026-06-29', '2026-06-30'],
        overachievedDates: [],
        totalCompletedDays: 2,
        longestStreak: 5,
      },
      now,
    )
    expect(merged.longestStreak).toBe(10)
  })

  it('recomputed longestStreak wins when it beats stored values', () => {
    const merged = mergeAttendance(
      {
        completedDates: ['2026-06-28', '2026-06-29'],
        overachievedDates: [],
        totalCompletedDays: 2,
        longestStreak: 2,
      },
      {
        completedDates: ['2026-06-30'],
        overachievedDates: [],
        totalCompletedDays: 1,
        longestStreak: 1,
      },
      now,
    )
    expect(merged.longestStreak).toBe(3)
  })

  it('prunes union to 90 days but keeps totals intact', () => {
    const merged = mergeAttendance(
      {
        completedDates: ['2025-01-01', '2026-06-30'],
        overachievedDates: [],
        totalCompletedDays: 100,
        longestStreak: 20,
      },
      {
        completedDates: ['2026-06-29'],
        overachievedDates: [],
      },
      now,
    )
    expect(merged.completedDates).not.toContain('2025-01-01')
    expect(merged.completedDates).toEqual(['2026-06-29', '2026-06-30'])
    expect(merged.totalCompletedDays).toBe(100)
    expect(merged.longestStreak).toBe(20)
  })
})

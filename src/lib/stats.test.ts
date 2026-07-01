import { describe, expect, it } from 'vitest'
import { calcLongestStreak, calcStreak, countStudiedWords, countWordsByStatus } from './stats'
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

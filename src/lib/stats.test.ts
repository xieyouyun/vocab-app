import { describe, expect, it } from 'vitest'
import { countWordsByStatus } from './stats'
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

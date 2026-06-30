import { describe, expect, it } from 'vitest'
import { applyAnswer, newWord } from './srs'

const DAY = 86_400_000

describe('newWord', () => {
  it('fills defaults', () => {
    const word = newWord({ w: 'apple' }, 1000)
    expect(word).toMatchObject({
      w: 'apple',
      s: 'new',
      streak: 0,
      ef: 2.5,
      interval: 0,
      dueAt: 0,
      reviewedAt: 0,
      createdAt: 1000,
      updatedAt: 1000,
    })
  })
})

describe('applyAnswer', () => {
  it('known on new -> learning, streak=1, due in 1d', () => {
    const before = newWord({ w: 'a' }, 0)
    const after = applyAnswer(before, true, 1000)

    expect(after.s).toBe('learning')
    expect(after.streak).toBe(1)
    expect(after.interval).toBe(1)
    expect(after.dueAt).toBe(1000 + DAY)
    expect(after.ef).toBeCloseTo(2.6)
  })

  it('two consecutive knowns -> streak=2, due in 3d', () => {
    let word = newWord({ w: 'a' }, 0)
    word = applyAnswer(word, true, 1000)
    word = applyAnswer(word, true, 2000)

    expect(word.streak).toBe(2)
    expect(word.interval).toBe(3)
    expect(word.dueAt).toBe(2000 + 3 * DAY)
    expect(word.s).toBe('learning')
  })

  it('three consecutive knowns -> mastered, interval=0', () => {
    let word = newWord({ w: 'a' }, 0)
    word = applyAnswer(word, true, 1)
    word = applyAnswer(word, true, 2)
    word = applyAnswer(word, true, 3)

    expect(word.s).toBe('mastered')
    expect(word.streak).toBe(3)
    expect(word.interval).toBe(0)
  })

  it('unknown resets streak and pulls dueAt to now', () => {
    let word = newWord({ w: 'a' }, 0)
    word = applyAnswer(word, true, 1000)
    word = applyAnswer(word, false, 2000)

    expect(word.streak).toBe(0)
    expect(word.interval).toBe(0)
    expect(word.dueAt).toBe(2000)
    expect(word.s).toBe('learning')
    expect(word.ef).toBeCloseTo(2.4)
  })

  it('EF stays in [1.3, 3.0]', () => {
    let low = newWord({ w: 'a', ef: 1.4 }, 0)
    low = applyAnswer(low, false, 1)
    expect(low.ef).toBe(1.3)

    let high = newWord({ w: 'b', ef: 2.95 }, 0)
    high = applyAnswer(high, true, 1)
    expect(high.ef).toBe(3.0)
  })

  it('updatedAt and reviewedAt set to now', () => {
    const word = applyAnswer(newWord({ w: 'a' }, 0), true, 12345)
    expect(word.updatedAt).toBe(12345)
    expect(word.reviewedAt).toBe(12345)
  })
})

import { describe, expect, it } from 'vitest'
import { filterAndSearch, markMastered, resetWordProgress } from './library'
import { newWord } from './srs'
import type { Word } from './types'

const make = (over: Partial<Word> & { w: string }): Word => ({
  ...newWord(over, 0),
  ...over,
})

describe('filterAndSearch', () => {
  const list: Word[] = [
    make({ w: 'apple', s: 'new', cn: '苹果' }),
    make({ w: 'apex', s: 'learning' }),
    make({ w: 'banana', s: 'mastered' }),
  ]

  it('learning tab includes new + learning', () => {
    expect(filterAndSearch(list, 'learning', '').map((word) => word.w)).toEqual(['apple', 'apex'])
  })

  it('mastered tab includes only mastered', () => {
    expect(filterAndSearch(list, 'mastered', '').map((word) => word.w)).toEqual(['banana'])
  })

  it('all tab returns everything', () => {
    expect(filterAndSearch(list, 'all', '')).toHaveLength(3)
  })

  it('search filters by prefix', () => {
    expect(filterAndSearch(list, 'all', 'ap').map((word) => word.w).sort()).toEqual([
      'apex',
      'apple',
    ])
  })
})

describe('resetWordProgress / markMastered', () => {
  it('resets srs state', () => {
    const reset = resetWordProgress(
      make({ w: 'a', s: 'mastered', streak: 3, ef: 2.9, interval: 7, dueAt: 1 }),
      1000,
    )

    expect(reset).toMatchObject({
      s: 'new',
      streak: 0,
      ef: 2.5,
      interval: 0,
      dueAt: 0,
      updatedAt: 1000,
    })
  })

  it('marks mastered', () => {
    const mastered = markMastered(make({ w: 'a' }), 1000)
    expect(mastered.s).toBe('mastered')
    expect(mastered.streak).toBe(3)
    expect(mastered.updatedAt).toBe(1000)
  })
})

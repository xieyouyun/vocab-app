import { beforeEach, describe, expect, it } from 'vitest'
import {
  bulkPutWords,
  clearAll,
  deleteWord,
  getAllWords,
  getSettings,
  getWord,
  putSettings,
  putWord,
} from './db'
import type { Word } from './types'

const make = (w: string, over: Partial<Word> = {}): Word => ({
  w,
  s: 'new',
  streak: 0,
  ef: 2.5,
  interval: 0,
  dueAt: 0,
  reviewedAt: 0,
  createdAt: 1,
  updatedAt: 1,
  ...over,
})

describe('db', () => {
  beforeEach(async () => {
    await clearAll()
  })

  it('put / get / getAll / delete a word', async () => {
    await putWord(make('protein', { cn: '蛋白质' }))
    expect((await getWord('protein'))?.cn).toBe('蛋白质')
    expect(await getAllWords()).toHaveLength(1)
    await deleteWord('protein')
    expect(await getWord('protein')).toBeUndefined()
  })

  it('bulkPutWords inserts many', async () => {
    await bulkPutWords([make('a'), make('b'), make('c')])
    expect(await getAllWords()).toHaveLength(3)
  })

  it('settings default + roundtrip', async () => {
    expect((await getSettings()).dailyNewCount).toBe(10)
    await putSettings({ dailyNewCount: 25, completedDates: [], overachievedDates: [] })
    expect((await getSettings()).dailyNewCount).toBe(25)
  })

  it('clearAll empties everything', async () => {
    await putWord(make('x'))
    await putSettings({ dailyNewCount: 99, completedDates: [], overachievedDates: [] })
    await clearAll()
    expect(await getAllWords()).toEqual([])
    expect((await getSettings()).dailyNewCount).toBe(10)
  })
})

import { beforeEach, describe, expect, it } from 'vitest'
import {
  bulkPutWords,
  clearAll,
  clearLastImport,
  deleteWordAndCleanupSession,
  deleteWord,
  getAllWords,
  getLastImport,
  getSettings,
  getWord,
  putLastImport,
  putSettings,
  putWord,
} from './db'
import type { LastImportRecord, Word } from './types'

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

  it('stores and clears last import metadata', async () => {
    const record: LastImportRecord = {
      importedAt: 123,
      addedWords: ['apple'],
      overwrittenBefore: [],
      summary: { added: 1, overwritten: 0 },
    }

    await putLastImport(record)
    expect(await getLastImport()).toEqual(record)

    await clearLastImport()
    expect(await getLastImport()).toBeUndefined()
  })

  it('deletes a word and removes it from the active session', async () => {
    await putWord(make('apple'))
    await putWord(make('banana'))
    await putSettings({
      dailyNewCount: 10,
      completedDates: [],
      overachievedDates: [],
      currentSession: {
        date: '2026-07-02',
        queue: ['apple', 'banana'],
        done: ['apple'],
        startedAt: 1,
      },
    })

    await deleteWordAndCleanupSession('apple')

    expect(await getWord('apple')).toBeUndefined()
    expect((await getSettings()).currentSession).toEqual({
      date: '2026-07-02',
      queue: ['banana'],
      done: [],
      startedAt: 1,
    })
  })
})

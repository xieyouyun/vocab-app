import { beforeEach, describe, expect, it } from 'vitest'
import { clearAll, getAllWords, getSettings, putSettings, putWord } from './db'
import { exportAll, importAll } from './backup'
import { newWord } from './srs'

describe('backup', () => {
  beforeEach(async () => {
    await clearAll()
  })

  it('roundtrip preserves words and settings', async () => {
    await putWord(newWord({ w: 'apple', cn: '苹果' }, 0))
    await putSettings({ dailyNewCount: 25 })

    const dump = await exportAll(1234)
    expect(dump.version).toBe(1)
    expect(dump.words).toHaveLength(1)
    expect(dump.exportedAt).toBe(1234)

    await clearAll()
    await importAll(dump)

    expect((await getAllWords())[0].cn).toBe('苹果')
    expect((await getSettings()).dailyNewCount).toBe(25)
  })

  it('importAll fully replaces existing state', async () => {
    await putWord(newWord({ w: 'old' }, 0))
    await importAll({
      version: 1,
      exportedAt: 0,
      words: [newWord({ w: 'new' }, 0)],
      settings: { dailyNewCount: 10 },
    })

    const all = await getAllWords()
    expect(all.map((word) => word.w)).toEqual(['new'])
  })
})

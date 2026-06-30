import { beforeEach, describe, expect, it } from 'vitest'
import { clearAll, getAllWords, putWord } from './db'
import { commitImport, prepareImport } from './import'
import { newWord } from './srs'

const TEXT = `【单词】：apple
【中文翻译】：苹果

【单词】：banana
【中文翻译】：香蕉`

describe('import flow', () => {
  beforeEach(async () => {
    await clearAll()
  })

  it('prepareImport marks duplicates', async () => {
    await putWord(newWord({ w: 'apple', cn: '苹果' }, 0))
    const items = await prepareImport(TEXT, 1)

    expect(items).toHaveLength(2)
    expect(items[0].existing?.w).toBe('apple')
    expect(items[1].existing).toBeUndefined()
  })

  it('commitImport respects per-item decision', async () => {
    await putWord(newWord({ w: 'apple', cn: '旧苹果' }, 0))
    const items = await prepareImport(TEXT, 1)

    items[0].decision = 'skip'
    items[1].decision = 'overwrite'

    const result = await commitImport(items, 100)
    expect(result).toEqual({ added: 1, overwritten: 0, skipped: 1 })

    const all = await getAllWords()
    expect(all.find((word) => word.w === 'apple')?.cn).toBe('旧苹果')
    expect(all.find((word) => word.w === 'banana')).toBeTruthy()
  })

  it('overwrite preserves srs state and updates content', async () => {
    await putWord({ ...newWord({ w: 'apple' }, 0), streak: 2, ef: 2.7, cn: 'old' })
    const items = await prepareImport(TEXT, 1)

    items[0].decision = 'overwrite'
    items[1].decision = 'skip'

    await commitImport(items, 200)

    const apple = (await getAllWords()).find((word) => word.w === 'apple')
    expect(apple?.cn).toBe('苹果')
    expect(apple?.streak).toBe(2)
    expect(apple?.ef).toBeCloseTo(2.7)
    expect(apple?.updatedAt).toBe(200)
  })
})

import { describe, expect, it } from 'vitest'
import { parseEntries } from './parser'

const SINGLE = `【单词】：protein
【音标（英 / 美）】：/ˈprəʊtiːn//ˈproʊtiːn/
【词性】：n.
【中文翻译】：蛋白质
【英文释义】：a natural substance found in meat, eggs, fish, etc. that your body needs to grow and stay healthy
【释义中文翻译】：存在于肉类、鸡蛋、鱼类等中的天然物质，人体生长和维持健康所需
【英文例句】：You need more protein to build muscle.
【例句中文翻译】：你需要更多蛋白质来增肌。`

describe('parseEntries', () => {
  it('parses a full single entry', () => {
    const [entry] = parseEntries(SINGLE)
    expect(entry).toMatchObject({
      w: 'protein',
      p: '/ˈprəʊtiːn//ˈproʊtiːn/',
      pos: 'n.',
      cn: '蛋白质',
      ex: 'You need more protein to build muscle.',
    })
    expect(entry.missing).toEqual([])
  })

  it('splits multiple entries by blank line', () => {
    const text = `${SINGLE}\n\n【单词】：muscle\n【中文翻译】：肌肉`
    const list = parseEntries(text)
    expect(list).toHaveLength(2)
    expect(list[1].w).toBe('muscle')
    expect(list[1].missing).toContain('p')
    expect(list[1].missing).toContain('en')
  })

  it('accepts both ASCII colon and full-width colon', () => {
    const text = `【单词】:hello\n【中文翻译】:你好`
    const [entry] = parseEntries(text)
    expect(entry.w).toBe('hello')
    expect(entry.cn).toBe('你好')
  })

  it('skips blocks without 【单词】', () => {
    const text = `【中文翻译】:孤儿\n\n【单词】:good\n【中文翻译】:好`
    const list = parseEntries(text)
    expect(list).toHaveLength(1)
    expect(list[0].w).toBe('good')
  })

  it('trims whitespace around values', () => {
    const [entry] = parseEntries('【单词】:  trim  \n【中文翻译】:  整理  ')
    expect(entry.w).toBe('trim')
    expect(entry.cn).toBe('整理')
  })
})

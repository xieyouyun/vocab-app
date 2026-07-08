import { describe, expect, it } from 'vitest'
import {
  WORD_ENTRY_CONFIRM,
  WORD_ENTRY_MAX_BATCH,
  WORD_ENTRY_TRIGGER,
  buildImportUrl,
  findIncompleteImportWords,
  parseWordEntryRequest,
} from './word-entry-skill'

const COMPLETE_ENTRY = `【单词】：apple
【音标（英 / 美）】：/ˈæpəl//ˈæpəl/
【词性】：n.
【中文翻译】：苹果
【英文释义】：a round fruit with red or green skin
【释义中文翻译】：一种表皮为红色或绿色的圆形水果
【英文例句】：I ate an apple after lunch.
【例句中文翻译】：我午饭后吃了一个苹果。
【单词记忆技巧】：联想常见水果`

describe('parseWordEntryRequest', () => {
  it('parses trigger text with comma space and newline separators while deduping in order', () => {
    expect(
      parseWordEntryRequest(`单词：apple, banana orange
pear apple, banana`),
    ).toEqual({
      words: ['apple', 'banana', 'orange', 'pear'],
    })
  })

  it('rejects missing trigger', () => {
    expect(parseWordEntryRequest('apple banana')).toEqual({
      words: [],
      error: `输入必须以“${WORD_ENTRY_TRIGGER}”开头`,
    })
  })

  it('rejects empty word lists and requests beyond the batch limit', () => {
    expect(parseWordEntryRequest('单词：   \n  ')).toEqual({
      words: [],
      error: '请至少提供 1 个单词',
    })

    expect(
      parseWordEntryRequest(
        `单词：${Array.from({ length: WORD_ENTRY_MAX_BATCH + 1 }, (_, index) => `w${index + 1}`).join(', ')}`,
      ),
    ).toEqual({
      words: [],
      error: `单次最多导入 ${WORD_ENTRY_MAX_BATCH} 个单词`,
    })
  })

  it('rejects requests whose raw submitted token count exceeds the batch limit even if dedupe would shrink them', () => {
    expect(
      parseWordEntryRequest(
        `单词：${Array.from({ length: WORD_ENTRY_MAX_BATCH + 1 }, (_, index) =>
          index % 2 === 0 ? 'apple' : 'banana'
        ).join(', ')}`,
      ),
    ).toEqual({
      words: [],
      error: `单次最多导入 ${WORD_ENTRY_MAX_BATCH} 个单词`,
    })
  })
})

describe('findIncompleteImportWords', () => {
  it('returns words whose parsed import entries are still missing required fields', () => {
    const text = `${COMPLETE_ENTRY}

【单词】：banana
【中文翻译】：香蕉

【中文翻译】：孤儿块`

    expect(findIncompleteImportWords(text)).toEqual(['banana'])
  })
})

describe('word entry contract constants and URLs', () => {
  it('builds a stable /import URL with or without a trailing slash', () => {
    expect(buildImportUrl('https://example.com')).toBe('https://example.com/import')
    expect(buildImportUrl('https://example.com/')).toBe('https://example.com/import')
  })

  it('exports the fixed trigger and confirmation phrases', () => {
    expect(WORD_ENTRY_TRIGGER).toBe('单词：')
    expect(WORD_ENTRY_CONFIRM).toBe('确认导入')
  })
})

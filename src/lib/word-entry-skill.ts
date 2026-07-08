import { parseEntries } from './parser'

export const WORD_ENTRY_TRIGGER = '单词：'
export const WORD_ENTRY_CONFIRM = '确认导入'
export const WORD_ENTRY_MAX_BATCH = 10

export function parseWordEntryRequest(input: string): { words: string[]; error?: string } {
  if (!input.startsWith(WORD_ENTRY_TRIGGER)) {
    return {
      words: [],
      error: `输入必须以“${WORD_ENTRY_TRIGGER}”开头`,
    }
  }

  const rawWords = input
    .slice(WORD_ENTRY_TRIGGER.length)
    .split(/[\s,，]+/)
    .map((word) => word.trim())
    .filter(Boolean)

  if (rawWords.length === 0) {
    return {
      words: [],
      error: '请至少提供 1 个单词',
    }
  }

  const words: string[] = []
  const seen = new Set<string>()

  for (const word of rawWords) {
    if (seen.has(word)) continue
    seen.add(word)
    words.push(word)
  }

  if (words.length > WORD_ENTRY_MAX_BATCH) {
    return {
      words: [],
      error: `单次最多导入 ${WORD_ENTRY_MAX_BATCH} 个单词`,
    }
  }

  return { words }
}

export function findIncompleteImportWords(text: string): string[] {
  return parseEntries(text)
    .filter((entry) => entry.missing.length > 0)
    .map((entry) => entry.w)
}

export function buildImportUrl(baseUrl: string): string {
  return new URL('/import', baseUrl).toString()
}

import { bulkPutWords, getWord } from './db'
import { parseEntries, type ParsedEntry } from './parser'
import { newWord } from './srs'
import type { Word } from './types'

export const TEMPLATE_TEXT = `请帮我按下面这个格式输出单词的信息，注意原样保留方括号、冒号、换行，不要加任何额外说明文字。多个单词之间用一个空行分隔。

【单词】：xxx
【音标（英 / 美）】：/xxx//xxx/
【词性】：xxx
【中文翻译】：xxx
【英文释义】：xxx
【释义中文翻译】：xxx
【英文例句】：xxx
【例句中文翻译】：xxx

需要解析的单词是：<在这里写单词>`

export interface ImportItem {
  entry: ParsedEntry
  existing?: Word
  decision?: 'overwrite' | 'skip'
}

const CONTENT_KEYS = ['p', 'pos', 'cn', 'en', 'enCn', 'ex', 'exCn'] as const

export async function prepareImport(
  text: string,
  _now: number = Date.now(),
  lookup: (w: string) => Promise<Word | undefined> = getWord,
): Promise<ImportItem[]> {
  const entries = parseEntries(text)
  const items: ImportItem[] = []

  for (const entry of entries) {
    const existing = await lookup(entry.w)
    items.push({
      entry,
      existing,
      decision: existing ? undefined : 'overwrite',
    })
  }

  return items
}

export async function commitImport(
  items: ImportItem[],
  now: number = Date.now(),
): Promise<{ added: number; overwritten: number; skipped: number }> {
  const toPut: Word[] = []
  let added = 0
  let overwritten = 0
  let skipped = 0

  for (const item of items) {
    if (item.decision === 'skip' || !item.decision) {
      skipped += 1
      continue
    }

    if (item.existing) {
      const merged: Word = { ...item.existing, updatedAt: now }
      for (const key of CONTENT_KEYS) {
        const value = item.entry[key]
        if (value !== undefined) {
          merged[key] = value
        }
      }
      toPut.push(merged)
      overwritten += 1
      continue
    }

    toPut.push(newWord({ ...item.entry, w: item.entry.w }, now))
    added += 1
  }

  await bulkPutWords(toPut)
  return { added, overwritten, skipped }
}

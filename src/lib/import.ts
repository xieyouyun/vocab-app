import {
  bulkPutWords,
  clearLastImport,
  deleteWordAndCleanupSession,
  getLastImport,
  getWord,
  putLastImport,
  putWord,
} from './db'
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
【单词记忆技巧】：xxx

需要解析的单词是：<在这里写单词>`

export interface ImportItem {
  entry: ParsedEntry
  existing?: Word
  decision?: 'overwrite' | 'skip'
}

const CONTENT_KEYS = ['p', 'pos', 'cn', 'en', 'enCn', 'ex', 'exCn', 'tip'] as const

export interface ImportSummary {
  added: number
  overwritten: number
}

function mergeImportedWord(existing: Word, entry: ParsedEntry, now: number): Word {
  const merged: Word = { ...existing, updatedAt: now }

  for (const key of CONTENT_KEYS) {
    const value = entry[key]
    if (value !== undefined) {
      merged[key] = value
    }
  }

  return merged
}

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
      toPut.push(mergeImportedWord(item.existing, item.entry, now))
      overwritten += 1
      continue
    }

    toPut.push(newWord({ ...item.entry, w: item.entry.w }, now))
    added += 1
  }

  await bulkPutWords(toPut)
  return { added, overwritten, skipped }
}

export async function importText(text: string, now: number = Date.now()): Promise<ImportSummary> {
  const items = await prepareImport(text, now)
  const decided = items.map((item) => ({
    ...item,
    decision: 'overwrite' as const,
  }))

  const overwrittenBefore = decided
    .map((item) => item.existing)
    .filter((word): word is Word => word !== undefined)

  const result = await commitImport(decided, now)

  await putLastImport({
    importedAt: now,
    addedWords: decided.filter((item) => !item.existing).map((item) => item.entry.w),
    overwrittenBefore,
    summary: { added: result.added, overwritten: result.overwritten },
  })

  return { added: result.added, overwritten: result.overwritten }
}

export async function rollbackLastImport(): Promise<{ deleted: number; restored: number }> {
  const record = await getLastImport()

  if (!record) {
    throw new Error('没有可回滚的最近导入')
  }

  await Promise.all(record.overwrittenBefore.map((word) => putWord(word)))
  await Promise.all(record.addedWords.map((word) => deleteWordAndCleanupSession(word)))
  await clearLastImport()

  return {
    deleted: record.addedWords.length,
    restored: record.overwrittenBefore.length,
  }
}

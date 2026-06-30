export interface ParsedEntry {
  w: string
  p?: string
  pos?: string
  cn?: string
  en?: string
  enCn?: string
  ex?: string
  exCn?: string
  missing: string[]
}

export const FIELD_MAP: Record<string, keyof Omit<ParsedEntry, 'missing'>> = {
  单词: 'w',
  '音标（英 / 美）': 'p',
  '音标(英 / 美)': 'p',
  音标: 'p',
  词性: 'pos',
  中文翻译: 'cn',
  英文释义: 'en',
  释义中文翻译: 'enCn',
  英文例句: 'ex',
  例句中文翻译: 'exCn',
}

const REQUIRED_FIELDS: Array<keyof Omit<ParsedEntry, 'missing'>> = [
  'w',
  'p',
  'pos',
  'cn',
  'en',
  'enCn',
  'ex',
  'exCn',
]

const LINE_RE = /【([^】]+)】[:：]\s*(.+)/

export function parseEntries(text: string): ParsedEntry[] {
  const blocks = text
    .split(/\n\s*\n/)
    .map((block) => block.trim())
    .filter(Boolean)

  const entries: ParsedEntry[] = []

  for (const block of blocks) {
    const entry: ParsedEntry = { w: '', missing: [] }

    for (const line of block.split('\n')) {
      const match = line.match(LINE_RE)
      if (!match) continue

      const key = FIELD_MAP[match[1].trim()]
      if (!key) continue

      ;(entry as Record<string, string>)[key] = match[2].trim()
    }

    if (!entry.w) continue

    entry.missing = REQUIRED_FIELDS.filter((key) => !entry[key])
    entries.push(entry)
  }

  return entries
}

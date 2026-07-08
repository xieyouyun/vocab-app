# Word Entry Skill Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a custom Skill triggered by `单词：` that uses dictionary facts plus AI-generated Chinese explanation fields, shows import-ready text for review, and after explicit confirmation imports it through the existing incremental Import page.

**Architecture:** Keep the vocab app responsible for parsing, incremental import, and rollback. Add a small pure helper module in the app to lock down the Skill contract, make the Import page easier for browser automation to drive, and implement the custom Skill in repo-local `.trae/skills` so the prompt workflow stays versioned with the project. The Skill generates strict template text, waits for `确认导入`, then uses browser automation against the configured app origin instead of writing IndexedDB directly.

**Tech Stack:** React 18, TypeScript 5, Vite 5, Vitest, Testing Library, IndexedDB via `idb`, Trae custom SKILL markdown, browser automation tools

## Global Constraints

- Trigger phrase is exactly `单词：`.
- Confirmation phrase is exactly `确认导入`.
- Batch size limit is 10 words per request.
- Dictionary owns `音标` / `词性` / `中文翻译` / `英文释义` / `英文例句`.
- AI owns `释义中文翻译` / `例句中文翻译` / `单词记忆技巧`.
- Final generated output must match the existing import block format consumed by [src/lib/parser.ts](file:///Users/bytedance/Documents/trae_projects/mlbb/vocab-app/src/lib/parser.ts).
- Import must remain incremental through [src/lib/import.ts](file:///Users/bytedance/Documents/trae_projects/mlbb/vocab-app/src/lib/import.ts); never use the full-library restore path in [src/lib/backup.ts](file:///Users/bytedance/Documents/trae_projects/mlbb/vocab-app/src/lib/backup.ts).
- The Skill must not write IndexedDB directly.
- Import automation must target the same origin the user actually uses, because `localhost` and deployed Pages store separate IndexedDB data.
- Follow TDD for application code: failing test first, verify red, minimal implementation, verify green.

---

### Task 1: Lock down the Skill contract in a pure helper module

**Files:**
- Create: `src/lib/word-entry-skill.ts`
- Create: `src/lib/word-entry-skill.test.ts`
- Modify: `src/lib/parser.ts`
- Test: `src/lib/word-entry-skill.test.ts`

**Interfaces:**
- Consumes:
  - `parseEntries(text: string): ParsedEntry[]`
  - `ParsedEntry`
- Produces:
  - `const WORD_ENTRY_TRIGGER = '单词：'`
  - `const WORD_ENTRY_CONFIRM = '确认导入'`
  - `const WORD_ENTRY_MAX_BATCH = 10`
  - `function parseWordEntryRequest(input: string): { words: string[]; error?: string }`
  - `function findIncompleteImportWords(text: string): string[]`
  - `function buildImportUrl(baseUrl: string): string`

- [ ] **Step 1: Write the failing helper tests**

```ts
import { describe, expect, it } from 'vitest'
import {
  WORD_ENTRY_CONFIRM,
  WORD_ENTRY_MAX_BATCH,
  WORD_ENTRY_TRIGGER,
  buildImportUrl,
  findIncompleteImportWords,
  parseWordEntryRequest,
} from './word-entry-skill'

describe('word entry skill helpers', () => {
  it('parses words from trigger text with comma, space, and newline separators', () => {
    expect(parseWordEntryRequest('单词：abandon, ability absorb')).toEqual({
      words: ['abandon', 'ability', 'absorb'],
    })
    expect(parseWordEntryRequest('单词：\nabandon\nability')).toEqual({
      words: ['abandon', 'ability'],
    })
  })

  it('rejects input without the trigger or with too many words', () => {
    expect(parseWordEntryRequest('abandon')).toEqual({
      words: [],
      error: `请输入以 ${WORD_ENTRY_TRIGGER} 开头的内容`,
    })

    expect(
      parseWordEntryRequest(
        `单词：${Array.from({ length: WORD_ENTRY_MAX_BATCH + 1 }, (_, index) => `w${index}`).join(',')}`,
      ),
    ).toEqual({
      words: [],
      error: `单次最多支持 ${WORD_ENTRY_MAX_BATCH} 个单词，请拆分后再试`,
    })
  })

  it('finds incomplete words from generated import text', () => {
    const text = `【单词】：abandon
【音标（英 / 美）】：/əˈbændən//əˈbændən/
【词性】：v.
【中文翻译】：放弃
【英文释义】：to leave something completely
【释义中文翻译】：完全离开某事物
【英文例句】：He had to abandon the plan.
【例句中文翻译】：他不得不放弃这个计划。
【单词记忆技巧】：a + bandon 联想放手

【单词】：ability
【音标（英 / 美）】：/əˈbɪləti//əˈbɪləti/
【词性】：n.
【中文翻译】：能力`

    expect(findIncompleteImportWords(text)).toEqual(['ability'])
  })

  it('builds a stable import url', () => {
    expect(buildImportUrl('https://vocab-app-4zk.pages.dev')).toBe(
      'https://vocab-app-4zk.pages.dev/import',
    )
    expect(buildImportUrl('http://localhost:5173/')).toBe('http://localhost:5173/import')
  })

  it('exports the fixed confirmation phrase', () => {
    expect(WORD_ENTRY_CONFIRM).toBe('确认导入')
  })
})
```

- [ ] **Step 2: Run the focused helper tests and verify red**

Run: `npm --prefix /Users/bytedance/Documents/trae_projects/mlbb/vocab-app run test:run -- src/lib/word-entry-skill.test.ts`
Expected: FAIL with `Cannot find module './word-entry-skill'` or missing exports.

- [ ] **Step 3: Add a tiny parser helper and implement the contract module**

```ts
// src/lib/parser.ts
export function splitEntryBlocks(text: string): string[] {
  return text
    .split(/\n\s*\n/)
    .map((block) => block.trim())
    .filter(Boolean)
}

export function parseEntries(text: string): ParsedEntry[] {
  const blocks = splitEntryBlocks(text)
  // keep the rest of the current implementation unchanged
}
```

```ts
// src/lib/word-entry-skill.ts
import { parseEntries } from './parser'

export const WORD_ENTRY_TRIGGER = '单词：'
export const WORD_ENTRY_CONFIRM = '确认导入'
export const WORD_ENTRY_MAX_BATCH = 10

export function parseWordEntryRequest(input: string): { words: string[]; error?: string } {
  const trimmed = input.trim()
  if (!trimmed.startsWith(WORD_ENTRY_TRIGGER)) {
    return { words: [], error: `请输入以 ${WORD_ENTRY_TRIGGER} 开头的内容` }
  }

  const raw = trimmed.slice(WORD_ENTRY_TRIGGER.length).trim()
  const words = raw
    .split(/[\s,，]+/)
    .map((word) => word.trim())
    .filter(Boolean)

  if (words.length === 0) {
    return { words: [], error: '请在触发词后提供至少一个单词' }
  }

  if (words.length > WORD_ENTRY_MAX_BATCH) {
    return { words: [], error: `单次最多支持 ${WORD_ENTRY_MAX_BATCH} 个单词，请拆分后再试` }
  }

  return { words: [...new Set(words)] }
}

export function findIncompleteImportWords(text: string): string[] {
  return parseEntries(text)
    .filter((entry) => entry.missing.length > 0)
    .map((entry) => entry.w)
}

export function buildImportUrl(baseUrl: string): string {
  return new URL('/import', baseUrl).toString()
}
```

- [ ] **Step 4: Re-run the focused helper tests and verify green**

Run: `npm --prefix /Users/bytedance/Documents/trae_projects/mlbb/vocab-app run test:run -- src/lib/word-entry-skill.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git -C /Users/bytedance/Documents/trae_projects/mlbb/vocab-app add \
  src/lib/parser.ts \
  src/lib/word-entry-skill.ts \
  src/lib/word-entry-skill.test.ts
git -C /Users/bytedance/Documents/trae_projects/mlbb/vocab-app commit -m "feat: add word entry skill contract helpers"
```

### Task 2: Make the Import page stable for browser-driven import

**Files:**
- Modify: `src/pages/Import.tsx`
- Modify: `src/pages/Import.test.tsx`
- Test: `src/pages/Import.test.tsx`

**Interfaces:**
- Consumes:
  - `importText(text: string): Promise<ImportSummary>`
  - `rollbackLastImport(): Promise<{ deleted: number; restored: number }>`
- Produces:
  - Import textarea accessible by `role="textbox"` and label `导入文本`
  - Result summary exposed through `role="status"`
  - Primary import action exposed through button name `解析并导入`

- [ ] **Step 1: Add failing page tests for automation-friendly selectors**

```tsx
it('exposes labeled import controls and a status region', async () => {
  const user = userEvent.setup()

  render(<Import />)

  const textbox = screen.getByRole('textbox', { name: '导入文本' })
  expect(textbox).toHaveValue('')

  await user.type(textbox, TEXT)
  await user.click(screen.getByRole('button', { name: '解析并导入' }))

  expect(await screen.findByRole('status')).toHaveTextContent('新增 1，覆盖 1')
})
```

- [ ] **Step 2: Run the import page test file and verify red**

Run: `npm --prefix /Users/bytedance/Documents/trae_projects/mlbb/vocab-app run test:run -- src/pages/Import.test.tsx`
Expected: FAIL because the textarea has no accessible label and the result paragraph has no `role="status"`.

- [ ] **Step 3: Add stable accessibility hooks without changing current behavior**

```tsx
<textarea
  aria-label="导入文本"
  value={text}
  onChange={(event) => setText(event.target.value)}
  rows={10}
  placeholder="粘贴豆包返回的内容"
  className="w-full rounded border p-2 font-mono text-sm"
/>

{result && (
  <p role="status" className="text-sm text-slate-600">
    {result}
  </p>
)}
```

- [ ] **Step 4: Re-run the import page test file and verify green**

Run: `npm --prefix /Users/bytedance/Documents/trae_projects/mlbb/vocab-app run test:run -- src/pages/Import.test.tsx`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git -C /Users/bytedance/Documents/trae_projects/mlbb/vocab-app add \
  src/pages/Import.tsx \
  src/pages/Import.test.tsx
git -C /Users/bytedance/Documents/trae_projects/mlbb/vocab-app commit -m "feat: stabilize import page automation hooks"
```

### Task 3: Create the custom Skill in repo-local `.trae/skills`

**Files:**
- Create: `.trae/skills/word-entry-import/SKILL.md`
- Create: `.trae/skills/word-entry-import/smoke-cases.md`
- Test: `.trae/skills/word-entry-import/smoke-cases.md`

**Interfaces:**
- Consumes:
  - Trigger: `单词：`
  - Confirmation: `确认导入`
  - Import URL from `buildImportUrl(baseUrl: string): string`
  - Import page controls from Task 2
- Produces:
  - Skill name: `word-entry-import`
  - Description that explains what it does and when to invoke it
  - Browser automation flow that imports only after explicit confirmation

- [ ] **Step 1: Write the Skill file with the exact workflow**

```md
---
name: "word-entry-import"
description: "Generates import-ready word cards using dictionary facts plus AI-translated Chinese helper fields, then imports them after explicit confirmation. Invoke when the user sends content starting with `单词：`."
---

# Word Entry Import

## Purpose

Use dictionary facts for:
- 音标
- 词性
- 中文翻译
- 英文释义
- 英文例句

Use AI for:
- 释义中文翻译
- 例句中文翻译
- 单词记忆技巧

## Trigger

Only run this workflow when the user input starts with `单词：`.

## Input Rules

1. Parse words from the trigger line using comma, Chinese comma, whitespace, or newline separators.
2. Reject requests with zero words.
3. Reject requests with more than 10 words.

## Output Rules

Return only import-ready blocks in this format, with one blank line between words:

【单词】：xxx
【音标（英 / 美）】：/xxx//xxx/
【词性】：xxx
【中文翻译】：xxx
【英文释义】：xxx
【释义中文翻译】：xxx
【英文例句】：xxx
【例句中文翻译】：xxx
【单词记忆技巧】：xxx

Do not add commentary before or after the blocks.

## Review Gate

1. Show the generated blocks first.
2. If any word is missing required fields, list it as incomplete and do not include it in the import-ready result.
3. Wait for the exact confirmation phrase `确认导入`.
4. Do not import on vague confirmations like `可以`, `继续`, or `没问题`.

## Import Action

After `确认导入`:

1. Determine the target app origin. Prefer the user's configured origin; otherwise use `https://vocab-app-4zk.pages.dev`.
2. Open `${origin}/import`.
3. Fill the `导入文本` textarea with the previously approved blocks.
4. Click `解析并导入`.
5. Read the `status` result and report it back.

## Failure Handling

If browser automation fails, keep the generated text in the reply and say that generation succeeded but automatic import failed.

## Safety Notes

1. Never write IndexedDB directly.
2. Never use the backup restore path.
3. Remind the user that `localhost` and the deployed site are separate IndexedDB origins if the target origin is unclear.
```

- [ ] **Step 2: Add a smoke-case file with concrete request/response checks**

```md
# Smoke Cases

## Case 1: Single word
Input:
`单词：abandon`

Expected:
- The Skill runs
- One block is returned
- No import happens before `确认导入`

## Case 2: Multi-word request
Input:
`单词：abandon, ability absorb`

Expected:
- Three words are parsed
- Blocks are separated by one blank line

## Case 3: Too many words
Input:
`单词：w1,w2,w3,w4,w5,w6,w7,w8,w9,w10,w11`

Expected:
- The Skill refuses the request
- The reply says `单次最多支持 10 个单词，请拆分后再试`

## Case 4: Ambiguous confirmation
Input sequence:
1. `单词：abandon`
2. `可以`

Expected:
- The Skill does not import
- The Skill asks for the exact phrase `确认导入`
```

- [ ] **Step 3: Validate the files exist and contain the required frontmatter**

Run: `rg -n "name: \"word-entry-import\"|description:|单词：|确认导入" /Users/bytedance/Documents/trae_projects/mlbb/vocab-app/.trae/skills/word-entry-import`
Expected: matches in `SKILL.md` for all four required strings.

- [ ] **Step 4: Commit**

```bash
git -C /Users/bytedance/Documents/trae_projects/mlbb/vocab-app add \
  .trae/skills/word-entry-import/SKILL.md \
  .trae/skills/word-entry-import/smoke-cases.md
git -C /Users/bytedance/Documents/trae_projects/mlbb/vocab-app commit -m "feat: add word entry import skill"
```

### Task 4: Run end-to-end verification against the real app flow

**Files:**
- Test: browser-driven manual verification against the configured import origin

**Interfaces:**
- Consumes:
  - The repo-local Skill from Task 3
  - Import page hooks from Task 2
  - Existing incremental import semantics
- Produces:
  - Verified browser smoke behavior for generation, explicit confirmation, incremental import, and rollback visibility

- [ ] **Step 1: Run app test, typecheck, and build before browser verification**

Run:

```bash
npm --prefix /Users/bytedance/Documents/trae_projects/mlbb/vocab-app run test:run
npm --prefix /Users/bytedance/Documents/trae_projects/mlbb/vocab-app run lint
npm --prefix /Users/bytedance/Documents/trae_projects/mlbb/vocab-app run build
```

Expected:
- All Vitest suites PASS
- TypeScript check PASS
- Vite build PASS

- [ ] **Step 2: Run a real browser smoke flow**

Run the app on the origin you want to keep as the canonical word library, then manually execute this scenario through the custom Skill:

```text
单词：abandon
确认导入
```

Expected:
- The Skill generates one valid import block before confirmation
- The Skill opens the configured `/import` page
- The import page reports a status like `新增 1，覆盖 0` or `新增 0，覆盖 1`
- Existing unrelated words remain untouched
- The rollback button still appears after a successful import

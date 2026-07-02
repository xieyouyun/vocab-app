# Import, Rollback, Safe Area, and Library Delete Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make import one-click with rollback, unify non-study page safe areas and bottom nav spacing, and add library inline delete without breaking active study sessions.

**Architecture:** Keep the current small-module style. Extend `db.ts` with typed `meta` storage and one transaction-backed delete helper that also cleans `currentSession`. Keep import orchestration in `import.ts`, pure queue cleanup in `session.ts`, page-shell styling in shared CSS classes, and UI behavior in `Import.tsx`, `Library.tsx`, and `WordDetail.tsx`.

**Tech Stack:** React 18, TypeScript, React Router 6, IndexedDB via `idb`, Vitest, Testing Library, Tailwind CSS

## Global Constraints

- Keep the app as a React + TypeScript + Tailwind + Vite SPA.
- Keep `Study` as a standalone page with no bottom nav.
- Import duplicate strategy is fixed: overwrite content fields, preserve SRS fields.
- Rollback only applies to the most recent successful import.
- `lastImport` stays local-only and must not become part of JSON backup or GitHub sync payloads.
- Deleting a word must not leave `currentSession.queue` or `currentSession.done` with dead keys.
- Do not introduce batch delete, management mode, or multi-level rollback.
- Follow TDD strictly: failing test first, verify red, minimal implementation, verify green.

---

### Task 1: Extend IndexedDB metadata and make delete session-safe

**Files:**
- Modify: `src/lib/types.ts`
- Modify: `src/lib/session.ts`
- Modify: `src/lib/db.ts`
- Modify: `src/lib/db.test.ts`
- Test: `src/lib/db.test.ts`

**Interfaces:**
- Consumes: `SessionState`, `Settings`, `Word`
- Produces:
  - `interface LastImportRecord`
  - `function removeWordFromSession(session: SessionState | undefined, word: string): SessionState | undefined`
  - `async function getLastImport(): Promise<LastImportRecord | undefined>`
  - `async function putLastImport(record: LastImportRecord): Promise<void>`
  - `async function clearLastImport(): Promise<void>`
  - `async function deleteWordAndCleanupSession(word: string): Promise<void>`

- [ ] **Step 1: Write the failing db tests**

```ts
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
```

- [ ] **Step 2: Run the focused db test file and verify red**

Run: `pnpm --dir /Users/bytedance/Documents/trae_projects/mlbb/vocab-app test:run src/lib/db.test.ts`  
Expected: FAIL with missing exports like `putLastImport` / `deleteWordAndCleanupSession`.

- [ ] **Step 3: Add the new types and pure session cleanup helper**

```ts
export interface LastImportRecord {
  importedAt: number
  addedWords: string[]
  overwrittenBefore: Word[]
  summary: {
    added: number
    overwritten: number
  }
}

export function removeWordFromSession(
  session: SessionState | undefined,
  word: string,
): SessionState | undefined {
  if (!session) return session

  const queue = session.queue.filter((key) => key !== word)
  const done = session.done.filter((key) => key !== word)

  return queue.length === session.queue.length && done.length === session.done.length
    ? session
    : { ...session, queue, done }
}
```

- [ ] **Step 4: Implement `meta.lastImport`, DB version upgrade, and the delete helper**

```ts
interface VocabSchema extends DBSchema {
  words: { /* existing fields */ }
  meta: {
    key: 'settings' | 'lastImport'
    value: Settings | LastImportRecord
  }
}

const DB_VERSION = 2

upgrade(db, oldVersion) {
  if (oldVersion < 1) {
    const words = db.createObjectStore('words', { keyPath: 'w' })
    words.createIndex('by-s', 's')
    words.createIndex('by-dueAt', 'dueAt')
    db.createObjectStore('meta')
  }
}

export async function deleteWordAndCleanupSession(word: string): Promise<void> {
  const db = await openDb()
  const tx = db.transaction(['words', 'meta'], 'readwrite')
  const settings = ((await tx.objectStore('meta').get('settings')) as Settings | undefined) ?? {
    ...DEFAULT_SETTINGS,
  }
  const nextSession = removeWordFromSession(settings.currentSession, word)

  await tx.objectStore('words').delete(word)
  await tx.objectStore('meta').put({ ...settings, currentSession: nextSession }, 'settings')
  await tx.done
}
```

- [ ] **Step 5: Re-run the db tests and verify green**

Run: `pnpm --dir /Users/bytedance/Documents/trae_projects/mlbb/vocab-app test:run src/lib/db.test.ts`  
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git -C /Users/bytedance/Documents/trae_projects/mlbb/vocab-app add \
  src/lib/types.ts \
  src/lib/session.ts \
  src/lib/db.ts \
  src/lib/db.test.ts
git -C /Users/bytedance/Documents/trae_projects/mlbb/vocab-app commit -m "feat: add import metadata and session-safe delete"
```

### Task 2: Add one-click import and rollback orchestration

**Files:**
- Modify: `src/lib/import.ts`
- Modify: `src/lib/import.test.ts`
- Test: `src/lib/import.test.ts`

**Interfaces:**
- Consumes:
  - `getWord(w: string): Promise<Word | undefined>`
  - `putLastImport(record: LastImportRecord): Promise<void>`
  - `getLastImport(): Promise<LastImportRecord | undefined>`
  - `clearLastImport(): Promise<void>`
  - `bulkPutWords(words: Word[]): Promise<void>`
  - `deleteWordAndCleanupSession(word: string): Promise<void>`
- Produces:
  - `interface ImportSummary { added: number; overwritten: number }`
  - `async function importText(text: string, now?: number): Promise<ImportSummary>`
  - `async function rollbackLastImport(): Promise<{ deleted: number; restored: number }>`

- [ ] **Step 1: Write the failing import tests**

```ts
it('imports text directly and records rollback metadata', async () => {
  await putWord({ ...newWord({ w: 'apple' }, 0), streak: 2, cn: 'old' })

  const summary = await importText(TEXT, 100)

  expect(summary).toEqual({ added: 1, overwritten: 1 })
  expect((await getAllWords()).find((word) => word.w === 'apple')?.streak).toBe(2)
  expect(await getLastImport()).toMatchObject({
    importedAt: 100,
    addedWords: ['banana'],
    summary: { added: 1, overwritten: 1 },
  })
})

it('rolls back the most recent import', async () => {
  await putWord({ ...newWord({ w: 'apple', cn: '旧苹果' }, 0), streak: 2 })
  await importText(TEXT, 100)

  await rollbackLastImport()

  expect((await getAllWords()).find((word) => word.w === 'apple')?.cn).toBe('旧苹果')
  expect((await getAllWords()).find((word) => word.w === 'banana')).toBeUndefined()
  expect(await getLastImport()).toBeUndefined()
})
```

- [ ] **Step 2: Run the import test file and verify red**

Run: `pnpm --dir /Users/bytedance/Documents/trae_projects/mlbb/vocab-app test:run src/lib/import.test.ts`  
Expected: FAIL with missing exports like `importText` / `rollbackLastImport`.

- [ ] **Step 3: Add minimal import orchestration**

```ts
export interface ImportSummary {
  added: number
  overwritten: number
}

export async function importText(
  text: string,
  now: number = Date.now(),
): Promise<ImportSummary> {
  const items = await prepareImport(text, now)
  const decided = items.map((item) => ({
    ...item,
    decision: 'overwrite' as const,
  }))

  const overwrittenBefore = decided
    .filter((item) => item.existing)
    .map((item) => item.existing as Word)

  const result = await commitImport(decided, now)
  await putLastImport({
    importedAt: now,
    addedWords: decided
      .filter((item) => !item.existing)
      .map((item) => item.entry.w),
    overwrittenBefore,
    summary: { added: result.added, overwritten: result.overwritten },
  })

  return { added: result.added, overwritten: result.overwritten }
}
```

- [ ] **Step 4: Add minimal rollback logic**

```ts
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
```

- [ ] **Step 5: Refactor `commitImport` to reuse the same merge rules**

```ts
function mergeImportedWord(existing: Word, entry: ParsedEntry, now: number): Word {
  const merged: Word = { ...existing, updatedAt: now }
  for (const key of CONTENT_KEYS) {
    const value = entry[key]
    if (value !== undefined) merged[key] = value
  }
  return merged
}
```

- [ ] **Step 6: Re-run the import tests and verify green**

Run: `pnpm --dir /Users/bytedance/Documents/trae_projects/mlbb/vocab-app test:run src/lib/import.test.ts`  
Expected: PASS

- [ ] **Step 7: Commit**

```bash
git -C /Users/bytedance/Documents/trae_projects/mlbb/vocab-app add \
  src/lib/import.ts \
  src/lib/import.test.ts
git -C /Users/bytedance/Documents/trae_projects/mlbb/vocab-app commit -m "feat: add one-click import rollback flow"
```

### Task 3: Make study resilient and expose safe delete behavior in the UI layer

**Files:**
- Modify: `src/pages/Study.tsx`
- Modify: `src/pages/WordDetail.tsx`
- Create: `src/pages/Library.test.tsx`
- Modify: `src/pages/Library.tsx`
- Test: `src/pages/Library.test.tsx`

**Interfaces:**
- Consumes:
  - `deleteWordAndCleanupSession(word: string): Promise<void>`
  - `removeWordFromSession(session: SessionState | undefined, word: string): SessionState | undefined`
- Produces:
  - Library list rows with a dedicated delete button
  - Detail-page delete with confirmation
  - Study-page skip behavior when a queued word is missing

- [ ] **Step 1: Write the failing library page test**

```tsx
it('deletes a word from the list without navigating to detail', async () => {
  const user = userEvent.setup()
  vi.spyOn(window, 'confirm').mockReturnValue(true)

  render(
    <MemoryRouter>
      <Library />
    </MemoryRouter>,
  )

  expect(await screen.findByText('apple')).toBeInTheDocument()
  await user.click(screen.getByRole('button', { name: '删除 apple' }))

  expect(screen.queryByText('apple')).not.toBeInTheDocument()
})
```

- [ ] **Step 2: Run the page test and verify red**

Run: `pnpm --dir /Users/bytedance/Documents/trae_projects/mlbb/vocab-app test:run src/pages/Library.test.tsx`  
Expected: FAIL because the delete button is not rendered yet.

- [ ] **Step 3: Add a dedicated delete button to `Library.tsx`**

```tsx
<li key={word.w} className="flex items-center justify-between p-3">
  <Link
    to={`/library/${encodeURIComponent(word.w)}`}
    className="min-w-0 flex-1"
  >
    <span className="font-medium">{word.w}</span>{' '}
    <span className="text-sm text-slate-500">{word.cn}</span>
  </Link>
  <button
    type="button"
    className="ml-3 rounded bg-rose-100 px-2 py-1 text-xs text-rose-700"
    onClick={async (event) => {
      event.preventDefault()
      event.stopPropagation()
      if (!confirm(`确定删除 ${word.w} 吗？`)) return
      await deleteWordAndCleanupSession(word.w)
      setAllWords((prev) => prev.filter((item) => item.w !== word.w))
    }}
    aria-label={`删除 ${word.w}`}
  >
    删除
  </button>
</li>
```

- [ ] **Step 4: Use the same delete helper from `WordDetail.tsx`**

```tsx
const remove = async () => {
  if (!confirm(`确定删除 ${key} 吗？`)) return
  await deleteWordAndCleanupSession(key)
  navigate('/library')
}
```

- [ ] **Step 5: Make `Study.tsx` skip missing words instead of hanging on `…`**

```tsx
useEffect(() => {
  if (!session) return
  const key = session.queue[cursor]
  if (!key) {
    setCurrent(undefined)
    return
  }

  getWord(key).then(async (word) => {
    if (word) {
      setCurrent(word)
      return
    }

    const nextSession = removeWordFromSession(session, key)
    if (nextSession) {
      setSession(nextSession)
      const settings = await getSettings()
      await putSettings({ ...settings, currentSession: nextSession })
    }
  })
}, [session, cursor])
```

- [ ] **Step 6: Re-run the library page test and the existing study-related tests**

Run: `pnpm --dir /Users/bytedance/Documents/trae_projects/mlbb/vocab-app test:run src/pages/Library.test.tsx src/lib/session.test.ts`  
Expected: PASS

- [ ] **Step 7: Commit**

```bash
git -C /Users/bytedance/Documents/trae_projects/mlbb/vocab-app add \
  src/pages/Library.tsx \
  src/pages/Library.test.tsx \
  src/pages/WordDetail.tsx \
  src/pages/Study.tsx
git -C /Users/bytedance/Documents/trae_projects/mlbb/vocab-app commit -m "feat: add safe inline delete for library words"
```

### Task 4: Unify page shell spacing and bottom-nav safe areas

**Files:**
- Modify: `src/index.css`
- Modify: `src/components/NavBar.tsx`
- Modify: `src/pages/Home.tsx`
- Modify: `src/pages/Library.tsx`
- Modify: `src/pages/Import.tsx`
- Modify: `src/pages/Stats.tsx`
- Modify: `src/pages/Settings.tsx`
- Test: manual verification plus existing React render coverage

**Interfaces:**
- Consumes: existing non-study page components and nav routing
- Produces:
  - `.app-page-shell`
  - `.app-page-shell--compact`
  - `.app-bottom-nav`

- [ ] **Step 1: Write a failing nav rendering test for safe-area classes**

```tsx
it('renders the bottom nav with the shared safe-area class', () => {
  render(
    <MemoryRouter initialEntries={['/']}>
      <NavBar />
    </MemoryRouter>,
  )

  expect(screen.getByRole('navigation')).toHaveClass('app-bottom-nav')
})
```

- [ ] **Step 2: Run the nav test and verify red**

Run: `pnpm --dir /Users/bytedance/Documents/trae_projects/mlbb/vocab-app test:run src/components/NavBar.test.tsx`  
Expected: FAIL because the test file or class does not exist yet.

- [ ] **Step 3: Add shared safe-area CSS classes**

```css
html, body, #root { height: 100%; }
body { @apply bg-slate-50 text-slate-900 antialiased; }

.app-page-shell {
  @apply mx-auto max-w-md space-y-6 px-4 pb-24;
  padding-top: calc(env(safe-area-inset-top, 0px) + 1rem);
  padding-bottom: calc(env(safe-area-inset-bottom, 0px) + 6rem);
}

.app-page-shell--compact {
  @apply app-page-shell space-y-4;
}

.app-bottom-nav {
  @apply fixed left-0 right-0 grid grid-cols-5 border-t bg-white;
  bottom: 0;
  padding-bottom: env(safe-area-inset-bottom, 0px);
}
```

- [ ] **Step 4: Apply the new classes to nav and non-study pages**

```tsx
<nav className="app-bottom-nav">
```

```tsx
<main className="app-page-shell">
```

```tsx
<main className="app-page-shell--compact">
```

- [ ] **Step 5: Re-run the nav test and do a local build**

Run: `pnpm --dir /Users/bytedance/Documents/trae_projects/mlbb/vocab-app test:run src/components/NavBar.test.tsx && pnpm --dir /Users/bytedance/Documents/trae_projects/mlbb/vocab-app build`  
Expected: PASS and successful Vite build

- [ ] **Step 6: Commit**

```bash
git -C /Users/bytedance/Documents/trae_projects/mlbb/vocab-app add \
  src/index.css \
  src/components/NavBar.tsx \
  src/components/NavBar.test.tsx \
  src/pages/Home.tsx \
  src/pages/Library.tsx \
  src/pages/Import.tsx \
  src/pages/Stats.tsx \
  src/pages/Settings.tsx
git -C /Users/bytedance/Documents/trae_projects/mlbb/vocab-app commit -m "fix: align safe area spacing across app pages"
```

### Task 5: Replace the two-step import page with one-click import and rollback UI

**Files:**
- Modify: `src/pages/Import.tsx`
- Create: `src/pages/Import.test.tsx`
- Test: `src/pages/Import.test.tsx`

**Interfaces:**
- Consumes:
  - `importText(text: string, now?: number): Promise<ImportSummary>`
  - `rollbackLastImport(): Promise<{ deleted: number; restored: number }>`
  - `getLastImport(): Promise<LastImportRecord | undefined>`
- Produces:
  - A single `解析并导入` action
  - A conditional `回滚最近一次导入` action

- [ ] **Step 1: Write the failing import page test**

```tsx
it('imports text directly and shows the rollback action', async () => {
  const user = userEvent.setup()

  render(<Import />)
  await user.type(screen.getByPlaceholderText('粘贴豆包返回的内容'), TEXT)
  await user.click(screen.getByRole('button', { name: '解析并导入' }))

  expect(await screen.findByText('新增 1，覆盖 1')).toBeInTheDocument()
  expect(screen.getByRole('button', { name: '回滚最近一次导入' })).toBeInTheDocument()
})
```

- [ ] **Step 2: Run the import page test and verify red**

Run: `pnpm --dir /Users/bytedance/Documents/trae_projects/mlbb/vocab-app test:run src/pages/Import.test.tsx`  
Expected: FAIL because the UI still renders parse/submit two-step controls.

- [ ] **Step 3: Remove preview-state UI and wire the page to `importText`**

```tsx
const submit = async () => {
  const summary = await importText(text)
  setResult(`新增 ${summary.added}，覆盖 ${summary.overwritten}`)
  setText('')
  setCanRollback(true)
}
```

```tsx
<button className="rounded bg-sky-600 px-4 py-2 text-white" onClick={submit}>
  解析并导入
</button>
```

- [ ] **Step 4: Add rollback UI with confirmation**

```tsx
const rollback = async () => {
  if (!confirm('将删除最近一次导入新增的单词，并恢复被覆盖单词的旧内容。该操作不可再次回滚。')) {
    return
  }
  const summary = await rollbackLastImport()
  setResult(`已回滚最近一次导入：删除 ${summary.deleted}，恢复 ${summary.restored}`)
  setCanRollback(false)
}
```

- [ ] **Step 5: Re-run the import page test and the import logic tests**

Run: `pnpm --dir /Users/bytedance/Documents/trae_projects/mlbb/vocab-app test:run src/pages/Import.test.tsx src/lib/import.test.ts`  
Expected: PASS

- [ ] **Step 6: Run the full verification suite**

Run: `pnpm --dir /Users/bytedance/Documents/trae_projects/mlbb/vocab-app test:run && pnpm --dir /Users/bytedance/Documents/trae_projects/mlbb/vocab-app lint && pnpm --dir /Users/bytedance/Documents/trae_projects/mlbb/vocab-app build`  
Expected: all tests PASS, `tsc --noEmit` clean, Vite build succeeds

- [ ] **Step 7: Commit**

```bash
git -C /Users/bytedance/Documents/trae_projects/mlbb/vocab-app add \
  src/pages/Import.tsx \
  src/pages/Import.test.tsx
git -C /Users/bytedance/Documents/trae_projects/mlbb/vocab-app commit -m "feat: simplify import page and add rollback action"
```

## Self-Review

- Spec coverage:
  - One-click import: Task 2 + Task 5
  - Recent rollback: Task 1 + Task 2 + Task 5
  - iPhone top safe area and bottom nav consistency: Task 4
  - Library inline delete: Task 3
  - Deletion/session conflict fix: Task 1 + Task 3
- Placeholder scan:
  - No `TODO`, `TBD`, or “similar to task N” references remain.
- Type consistency:
  - `LastImportRecord`, `ImportSummary`, `removeWordFromSession`, and `deleteWordAndCleanupSession` are defined in Task 1/2 before later tasks consume them.

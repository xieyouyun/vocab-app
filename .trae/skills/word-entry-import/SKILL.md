---
name: "word-entry-import"
description: "Generates import-ready word entry blocks from dictionary facts plus AI-completed Chinese helper fields, then imports them through the app's /import page only after the user sends the exact confirmation phrase `确认导入`. Invoke when the user message starts with `单词：`."
---

# Word Entry Import

## Purpose

Use this skill when the user wants to generate import-ready word blocks for the vocab app by sending a message that starts with `单词：`.

This skill has a narrow scope:

1. Parse the requested words.
2. Gather dictionary facts for each word.
3. Use AI only for the Chinese helper fields.
4. Show the generated import-ready blocks for review.
5. Wait for the exact confirmation phrase `确认导入`.
6. After confirmation, import through the existing app `/import` page by browser automation.

Do not expand this workflow into direct database writes, full-library restore, or any app-side feature work.

## Trigger

Only run this workflow when the user input starts with the exact trigger `单词：`.

Examples:

- `单词：abandon`
- `单词：abandon, ability absorb`
- `单词：`
  `abandon`
  `ability`

If the message does not start with `单词：`, do not run this skill.

## Input Rules

1. Parse words after `单词：` using comma, Chinese comma, whitespace, or newline separators.
2. Reject requests with zero words.
3. Reject requests with more than 10 submitted words in one request.
4. Preserve the user-visible order of valid words.
5. If duplicates appear, keep generation/import output deduplicated in first-seen order.

## Source of Truth

Dictionary-owned fields:

- `音标`
- `词性`
- `中文翻译`
- `英文释义`
- `英文例句`

AI-owned fields:

- `释义中文翻译`
- `例句中文翻译`
- `单词记忆技巧`

Do not let AI overwrite dictionary-owned fields.

## Output Format

The generated output must be import-ready text that matches the existing parser format exactly.

Return only blocks in this shape, with one blank line between words:

```text
【单词】：xxx
【音标（英 / 美）】：/xxx//xxx/
【词性】：xxx
【中文翻译】：xxx
【英文释义】：xxx
【释义中文翻译】：xxx
【英文例句】：xxx
【例句中文翻译】：xxx
【单词记忆技巧】：xxx
```

Rules:

1. Keep the field names exactly as shown above.
2. Do not add commentary before or after the import-ready blocks.
3. Separate multiple entries with exactly one blank line.
4. The final generated text must stay compatible with `src/lib/parser.ts`.

## Review Gate

1. Generate the blocks first and present them for review.
2. If any word is missing required import fields, treat it as incomplete.
3. Do not include incomplete words inside the import-ready block output.
4. Clearly list incomplete words separately and explain that they were withheld from import.
5. Wait for the exact confirmation phrase `确认导入`.
6. Do not import on ambiguous confirmations such as `可以`, `继续`, `没问题`, `好`, or similar variants.
7. If the user sends anything other than `确认导入`, keep the generated text available and continue waiting for explicit confirmation or revision.

## Import Action

After the user sends the exact confirmation phrase `确认导入`:

1. Determine the target app origin the user actually uses.
2. Build the import page URL as `${origin}/import`.
3. Navigate to `/import` on that same origin.
4. Fill the textarea labeled `导入文本` with the previously approved blocks.
5. Click the button named `解析并导入`.
6. Read the result from the element with role `status`.
7. Report the import summary back to the user.

Use the same origin the user actually uses. `localhost` and deployed Pages are different IndexedDB origins and do not share data.

If the origin is unclear, ask before importing. Do not guess between local and deployed instances when that choice affects where data is stored.

## Safety Rules

1. Never write IndexedDB directly.
2. Never bypass the existing import flow.
3. Never use the full-library restore path in `src/lib/backup.ts`.
4. Import only through the existing incremental flow behind the app `/import` page and `src/lib/import.ts`.

## Failure Handling

If generation succeeds but browser automation fails:

1. Keep the generated import-ready text available in the conversation.
2. Tell the user that generation succeeded but automatic import failed.
3. Include the target origin and the failing step if known.
4. Do not claim the words were imported.

If no complete entries remain after validation:

1. Do not offer `确认导入` as the next step.
2. Tell the user which words are incomplete and why.

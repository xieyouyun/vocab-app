---
name: "word-entry-import"
description: "Handles a two-stage vocab import workflow: generate import-ready word entry blocks when the user message starts with `单词：`, then import those already-reviewed blocks through the app's /import page only when a later user message is exactly `确认导入`."
---

# Word Entry Import

## Purpose

Use this skill for a narrow, two-stage vocab import workflow:

1. Generation stage: the user sends a message that starts with `单词：`.
2. Import stage: after review, the user later sends the exact confirmation message `确认导入`.

This skill has a narrow scope:

1. Parse the requested words.
2. Gather dictionary facts for each word.
3. Use AI only for the Chinese helper fields.
4. Show the generated import-ready blocks for review.
5. Wait for the exact confirmation phrase `确认导入`.
6. After confirmation, import through the existing app `/import` page by browser automation.

Do not expand this workflow into direct database writes, full-library restore, or any app-side feature work.

## Invocation Rules

Stage 1: generation

- Start the generation workflow only when the user input starts with the exact trigger `单词：`.
- Parse words, generate reviewable output, and stop before import.

Examples:

- `单词：abandon`
- `单词：abandon, ability absorb`
- `单词：`
  `abandon`
  `ability`

Stage 2: import

- Run the import stage only when the user sends a later message whose entire content is exactly `确认导入`.
- Import is allowed only if complete import-ready blocks from an earlier generation step already exist in the current conversation context and were kept pending for confirmation.
- `确认导入` must be a standalone exact confirmation message. Do not treat longer messages such as `请确认导入`, `确认导入一下`, or any other variant as the exact trigger.
- Do not import on ambiguous confirmations such as `可以`, `继续`, `没问题`, `好`, or similar variants.
- If the user sends `确认导入` but there are no pending approved import-ready blocks in context, do not import. Tell the user there is nothing pending to import and ask them to regenerate first.

Outside these two cases, do not run this skill.

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

### Import-Ready Block Content

Whenever this skill presents import-ready content, that content must match the existing parser format exactly.

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
2. **Each field must appear on its own line.** Do not wrap multiple fields on a single line.
3. Keep the import-ready content parser-compatible with `src/lib/parser.ts`.
4. Separate multiple entries with exactly one blank line.
5. Do not insert explanations, warnings, headings, bullets, or any other extra text inside the import-ready content.

### Explanatory Text

Review notes, incomplete-word explanations, waiting-for-confirmation instructions, and automation failure messages are allowed, but they must stay outside the import-ready block content.

Make the separation explicit:

1. If import-ready content is included in a response, place it in one dedicated fenced `text` block that contains only parser-compatible entries.
2. Put any explanatory text before or after that fenced block, never between field lines or between entry blocks.
3. Incomplete words, rejection reasons, and follow-up instructions must be written as normal prose or bullets outside the fenced block.
4. On automation failure after generation, keep the previously generated import-ready content unchanged and keep failure notes outside that content.

## Review Gate

1. Generate the blocks first and present them for review.
2. If any word is missing required import fields, treat it as incomplete.
3. Do not include incomplete words inside the import-ready block content.
4. Clearly list incomplete words separately outside the import-ready block content and explain that they were withheld from import.
5. If at least one complete entry remains, tell the user to send the later exact confirmation message `确认导入` to start import.
6. Wait for that later exact confirmation phrase `确认导入`.
7. Do not import on ambiguous confirmations such as `可以`, `继续`, `没问题`, `好`, or similar variants.
8. If the user sends anything other than `确认导入`, keep the generated text available and continue waiting for explicit confirmation or revision.

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

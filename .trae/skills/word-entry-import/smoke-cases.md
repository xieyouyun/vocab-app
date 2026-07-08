# Smoke Cases

## Case 1: Single word generation creates pending blocks only

Input:

`单词：abandon`

Expected:

- The skill runs because the message starts with `单词：`.
- Exactly one import-ready block is generated in a dedicated fenced `text` block.
- The fenced block contains only parser-compatible entry lines, with no commentary mixed into it.
- No import happens yet.
- Any explanation about next steps stays outside the fenced block.
- The workflow waits for a later exact message `确认导入`.

## Case 2: Multi-word request uses supported separators

Input:

`单词：abandon, ability absorb`

Expected:

- Three words are parsed.
- Three import-ready blocks are generated in one dedicated fenced `text` block.
- Blocks are separated by exactly one blank line.
- No bullets, warnings, or prose appear between entry blocks.
- The workflow still waits for a later exact `确认导入` message before importing.

## Case 3: Too many words are rejected

Input:

`单词：w1,w2,w3,w4,w5,w6,w7,w8,w9,w10,w11`

Expected:

- The skill refuses the request.
- No blocks are generated.
- No browser automation runs.
- The response explains that the batch limit is 10 words and asks the user to split the request.

## Case 4: Exact second-stage confirmation imports pending blocks

Input sequence:

1. `单词：abandon`
2. `确认导入`

Expected:

- Step 1 generates a pending import-ready block.
- Step 2 triggers import only because it is a later standalone exact `确认导入` message.
- The import uses the already-generated pending block content from step 1 rather than regenerating a new block.

## Case 5: `确认导入` without pending blocks does not import

Input:

`确认导入`

Expected:

- The skill does not import.
- The response explains there are no pending approved blocks in context.
- The response tells the user to start with `单词：...` first.

## Case 6: Ambiguous confirmation does not import

Input sequence:

1. `单词：abandon`
2. `可以`

Expected:

- The skill generates the block after step 1.
- The skill does not import after step 2.
- The skill asks for the exact phrase `确认导入`.

## Case 7: Incomplete dictionary result is withheld from import-ready content

Input:

`单词：rareword`

Expected:

- If required fields cannot be completed, the word is listed as incomplete.
- The incomplete word is not included in the import-ready block content.
- The explanation about the incomplete word stays outside the fenced import-ready block.
- The skill does not import that word.

## Case 8: Import automation failure preserves generated text and keeps failure notes separate

Input sequence:

1. `单词：abandon`
2. `确认导入`

Expected:

- Generation completes before import starts.
- If opening `/import`, filling `导入文本`, clicking `解析并导入`, or reading the `status` result fails, the generated text remains available.
- The user is told that generation succeeded but automatic import failed.
- The failure note stays outside the parser-compatible import-ready block content.

## Case 9: Wrong origin risk is called out

Situation:

- The user normally uses `http://localhost:5173`, but the skill is about to target a deployed Pages URL, or the reverse.

Expected:

- The skill warns that `localhost` and deployed Pages use separate IndexedDB storage.
- The skill asks for or uses the correct origin the user actually wants to modify.

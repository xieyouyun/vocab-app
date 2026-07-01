import type { Word } from '../lib/types'
import { formatPhonetic } from '../lib/parser'

export default function WordCard(props: { word: Word; revealed: boolean }) {
  const { word, revealed } = props
  const phonetic = formatPhonetic(word.p)

  return (
    <div className="space-y-4 text-center">
      <div className="text-5xl font-bold">{word.w}</div>
      {phonetic && <div className="text-slate-500">{phonetic}</div>}
      {revealed && (
        <div className="mt-6 space-y-2 text-left">
          <div>
            {word.pos} · {word.cn}
          </div>
          <div>{word.en || '—'}</div>
          <div className="text-slate-600">{word.enCn || '—'}</div>
          {word.tip && (
            <div className="rounded bg-amber-50 px-3 py-2 text-sm text-amber-900">
              💡 {word.tip}
            </div>
          )}
          <div className="italic">{word.ex || '—'}</div>
          <div className="text-slate-600">{word.exCn || '—'}</div>
        </div>
      )}
    </div>
  )
}

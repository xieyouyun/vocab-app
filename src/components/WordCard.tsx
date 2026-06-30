import type { Word } from '../lib/types'

export default function WordCard(props: { word: Word; revealed: boolean }) {
  const { word, revealed } = props

  return (
    <div className="space-y-4 text-center">
      <div className="text-5xl font-bold">{word.w}</div>
      <div className="text-slate-500">{word.p}</div>
      {revealed && (
        <div className="mt-6 space-y-2 text-left">
          <div>
            {word.pos} · {word.cn}
          </div>
          <div>{word.en || '—'}</div>
          <div className="text-slate-600">{word.enCn || '—'}</div>
          <div className="italic">{word.ex || '—'}</div>
          <div className="text-slate-600">{word.exCn || '—'}</div>
        </div>
      )}
    </div>
  )
}

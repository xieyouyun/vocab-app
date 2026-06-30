export default function AnswerButtons(props: {
  revealed: boolean
  onKnow: () => void
  onUnknown: () => void
  onNext: () => void
}) {
  if (props.revealed) {
    return (
      <button
        className="w-full rounded bg-sky-600 py-4 text-lg text-white"
        onClick={props.onNext}
      >
        下一个
      </button>
    )
  }

  return (
    <div className="grid grid-cols-2 gap-3">
      <button
        className="rounded bg-rose-500 py-4 text-lg text-white"
        onClick={props.onUnknown}
      >
        不认识
      </button>
      <button
        className="rounded bg-emerald-500 py-4 text-lg text-white"
        onClick={props.onKnow}
      >
        认识
      </button>
    </div>
  )
}

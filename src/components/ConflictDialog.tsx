import { useMemo, useState } from 'react'
import type { Conflict } from '../lib/sync'

interface ConflictDialogProps {
  conflicts: Conflict[]
  onResolve: (decisions: Record<string, 'local' | 'remote'>) => void
  onCancel: () => void
}

function optionClass(active: boolean): string {
  return [
    'rounded border p-3 text-left transition',
    active ? 'border-sky-500 bg-sky-50' : 'border-slate-200 bg-white',
  ].join(' ')
}

export default function ConflictDialog({
  conflicts,
  onResolve,
  onCancel,
}: ConflictDialogProps) {
  const [decisions, setDecisions] = useState<Record<string, 'local' | 'remote'>>({})

  const allDecided = useMemo(
    () => conflicts.every((conflict) => decisions[conflict.w]),
    [conflicts, decisions],
  )

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4">
      <div className="w-full max-w-lg rounded-2xl bg-white p-4 shadow-xl">
        <div className="mb-4">
          <h2 className="text-lg font-semibold text-slate-900">同步冲突</h2>
          <p className="text-sm text-slate-500">请选择每个单词保留本地版本还是远端版本。</p>
        </div>

        <ul className="max-h-[70vh] space-y-3 overflow-y-auto">
          {conflicts.map((conflict) => (
            <li key={conflict.w} className="rounded-xl border border-slate-200 p-3">
              <div className="mb-2 font-medium text-slate-900">{conflict.w}</div>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                <button
                  type="button"
                  aria-label="保留本地"
                  className={optionClass(decisions[conflict.w] === 'local')}
                  onClick={() =>
                    setDecisions((current) => ({
                      ...current,
                      [conflict.w]: 'local',
                    }))
                  }
                >
                  <div className="text-sm font-medium text-slate-900">保留本地</div>
                  <div className="mt-1 text-xs text-slate-500">{conflict.local.cn || '无中文释义'}</div>
                  <div className="mt-1 text-xs text-slate-400">{conflict.local.en || '无英文释义'}</div>
                </button>

                <button
                  type="button"
                  aria-label="保留远端"
                  className={optionClass(decisions[conflict.w] === 'remote')}
                  onClick={() =>
                    setDecisions((current) => ({
                      ...current,
                      [conflict.w]: 'remote',
                    }))
                  }
                >
                  <div className="text-sm font-medium text-slate-900">保留远端</div>
                  <div className="mt-1 text-xs text-slate-500">
                    {conflict.remote.cn || '无中文释义'}
                  </div>
                  <div className="mt-1 text-xs text-slate-400">
                    {conflict.remote.en || '无英文释义'}
                  </div>
                </button>
              </div>
            </li>
          ))}
        </ul>

        <div className="mt-4 flex justify-end gap-2">
          <button
            type="button"
            className="rounded-lg bg-slate-100 px-3 py-2 text-sm text-slate-700"
            onClick={onCancel}
          >
            取消
          </button>
          <button
            type="button"
            disabled={!allDecided}
            className="rounded-lg bg-sky-600 px-3 py-2 text-sm text-white disabled:opacity-40"
            onClick={() => onResolve(decisions)}
          >
            确认
          </button>
        </div>
      </div>
    </div>
  )
}

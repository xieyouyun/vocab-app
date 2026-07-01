import type { BackupPayload } from './backup'
import type { Settings, Word } from './types'

const API = 'https://api.github.com'
const FILE = 'vocab.json'

export interface Conflict {
  w: string
  local: Word
  remote: Word
}

interface GistResponse {
  id: string
  files?: Record<string, { content?: string }>
}

function headers(pat: string): HeadersInit {
  return {
    Authorization: `Bearer ${pat}`,
    Accept: 'application/vnd.github+json',
    'X-GitHub-Api-Version': '2022-11-28',
    'Content-Type': 'application/json',
  }
}

function assertOk(response: Response, action: string) {
  if (!response.ok) {
    throw new Error(`${action} ${response.status}`)
  }
}

function toJsonContent(payload: BackupPayload): string {
  return JSON.stringify(payload, null, 2)
}

export function sanitizePayloadForGist(payload: BackupPayload): BackupPayload {
  const { completedDates: _c, overachievedDates: _o, ...rest } = payload.settings
  return {
    version: payload.version,
    exportedAt: payload.exportedAt,
    words: payload.words,
    settings: {
      dailyNewCount: rest.dailyNewCount,
      completedDates: [],
      overachievedDates: [],
    },
  }
}

export async function fetchGist(pat: string, id: string): Promise<BackupPayload | null> {
  const response = await fetch(`${API}/gists/${id}`, {
    headers: headers(pat),
  })
  assertOk(response, 'fetchGist')

  const json = (await response.json()) as GistResponse
  const content = json.files?.[FILE]?.content

  return content ? (JSON.parse(content) as BackupPayload) : null
}

export async function createGist(pat: string, payload: BackupPayload): Promise<string> {
  const safePayload = sanitizePayloadForGist(payload)
  const response = await fetch(`${API}/gists`, {
    method: 'POST',
    headers: headers(pat),
    body: JSON.stringify({
      description: 'VocabTrainer data',
      public: false,
      files: {
        [FILE]: {
          content: toJsonContent(safePayload),
        },
      },
    }),
  })
  assertOk(response, 'createGist')

  return ((await response.json()) as GistResponse).id
}

export async function pushGist(pat: string, id: string, payload: BackupPayload): Promise<void> {
  const safePayload = sanitizePayloadForGist(payload)
  const response = await fetch(`${API}/gists/${id}`, {
    method: 'PATCH',
    headers: headers(pat),
    body: JSON.stringify({
      files: {
        [FILE]: {
          content: toJsonContent(safePayload),
        },
      },
    }),
  })
  assertOk(response, 'pushGist')
}

export function mergeWords(
  local: Word[],
  remote: Word[],
  lastSyncAt: number,
): { merged: Word[]; conflicts: Conflict[] } {
  const map = new Map<string, Word>()
  const conflicts: Conflict[] = []

  for (const word of local) {
    map.set(word.w, word)
  }

  for (const remoteWord of remote) {
    const localWord = map.get(remoteWord.w)

    if (!localWord) {
      map.set(remoteWord.w, remoteWord)
      continue
    }

    if (localWord.updatedAt === remoteWord.updatedAt) {
      continue
    }

    const localChanged = localWord.updatedAt > lastSyncAt
    const remoteChanged = remoteWord.updatedAt > lastSyncAt

    if (localChanged && remoteChanged) {
      conflicts.push({
        w: remoteWord.w,
        local: localWord,
        remote: remoteWord,
      })
      map.set(remoteWord.w, remoteWord.updatedAt > localWord.updatedAt ? remoteWord : localWord)
      continue
    }

    if (remoteChanged || remoteWord.updatedAt > localWord.updatedAt) {
      map.set(remoteWord.w, remoteWord)
    }
  }

  return {
    merged: [...map.values()],
    conflicts,
  }
}

export function applyConflictResolutions(
  merged: Word[],
  decisions: Record<string, 'local' | 'remote'>,
  conflicts: Conflict[],
): Word[] {
  const map = new Map(merged.map((word) => [word.w, word]))

  for (const conflict of conflicts) {
    const picked = decisions[conflict.w] === 'local' ? conflict.local : conflict.remote
    map.set(conflict.w, picked)
  }

  return [...map.values()]
}

export function mergeSettings(local: Settings, remote: Settings, lastSyncAt: number): Settings {
  return {
    ...remote,
    ...local,
    dailyNewCount: local.dailyNewCount,
    currentSession: local.currentSession,
    githubPat: local.githubPat,
    githubGistId: local.githubGistId ?? remote.githubGistId,
    lastSyncAt,
  }
}

export function mergePayloads(
  local: BackupPayload,
  remote: BackupPayload,
  lastSyncAt: number,
  now: number = Date.now(),
): { payload: BackupPayload; conflicts: Conflict[] } {
  const { merged, conflicts } = mergeWords(local.words, remote.words, lastSyncAt)

  return {
    payload: {
      version: 1,
      exportedAt: now,
      words: merged,
      settings: mergeSettings(local.settings, remote.settings, local.settings.lastSyncAt ?? 0),
    },
    conflicts,
  }
}

export function markPayloadSynced(payload: BackupPayload, syncedAt: number): BackupPayload {
  return {
    ...payload,
    settings: {
      ...payload.settings,
      lastSyncAt: syncedAt,
    },
  }
}

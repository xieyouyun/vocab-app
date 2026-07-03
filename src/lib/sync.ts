import { exportAll } from './backup'
import { getSettings, putSettings } from './db'
import type { BackupPayload } from './backup'
import type { Word } from './types'

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
  return {
    version: payload.version,
    exportedAt: payload.exportedAt,
    words: payload.words,
    settings: {
      dailyNewCount: payload.settings.dailyNewCount,
      completedDates: payload.settings.completedDates,
      overachievedDates: payload.settings.overachievedDates,
      totalCompletedDays: payload.settings.totalCompletedDays,
      longestStreak: payload.settings.longestStreak,
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
  const response = await fetch(`${API}/gists`, {
    method: 'POST',
    headers: headers(pat),
    body: JSON.stringify({
      description: 'VocabTrainer data',
      public: false,
      files: {
        [FILE]: {
          content: toJsonContent(sanitizePayloadForGist(payload)),
        },
      },
    }),
  })
  assertOk(response, 'createGist')

  return ((await response.json()) as GistResponse).id
}

export async function pushGist(pat: string, id: string, payload: BackupPayload): Promise<void> {
  const response = await fetch(`${API}/gists/${id}`, {
    method: 'PATCH',
    headers: headers(pat),
    body: JSON.stringify({
      files: {
        [FILE]: {
          content: toJsonContent(sanitizePayloadForGist(payload)),
        },
      },
    }),
  })
  assertOk(response, 'pushGist')
}

export type UploadOutcome =
  | { status: 'uploaded'; gistId: string }
  | { status: 'created'; gistId: string }
  | { status: 'skipped'; reason: 'no-pat' }
  | { status: 'error'; error: string }

export async function uploadLocalToCloud(): Promise<UploadOutcome> {
  const settings = await getSettings()
  const pat = settings.githubPat
  if (!pat) {
    return { status: 'skipped', reason: 'no-pat' }
  }

  try {
    const now = Date.now()
    const payload = await exportAll(now)
    const existingGistId = settings.githubGistId

    if (!existingGistId) {
      const newId = await createGist(pat, payload)
      await putSettings({ ...settings, githubGistId: newId, lastSyncAt: now })
      return { status: 'created', gistId: newId }
    }

    await pushGist(pat, existingGistId, payload)
    await putSettings({ ...settings, lastSyncAt: now })
    return { status: 'uploaded', gistId: existingGistId }
  } catch (error) {
    return { status: 'error', error: error instanceof Error ? error.message : String(error) }
  }
}

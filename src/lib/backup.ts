import { bulkPutWords, clearAll, getAllWords, getSettings, putSettings } from './db'
import type { Settings, Word } from './types'

export interface BackupPayload {
  version: 1
  exportedAt: number
  words: Word[]
  settings: Settings
}

export async function exportAll(now: number = Date.now()): Promise<BackupPayload> {
  return {
    version: 1,
    exportedAt: now,
    words: await getAllWords(),
    settings: await getSettings(),
  }
}

export async function importAll(payload: BackupPayload): Promise<void> {
  if (payload.version !== 1) {
    throw new Error(`unsupported backup version: ${payload.version}`)
  }

  await clearAll()
  await bulkPutWords(payload.words)
  await putSettings(payload.settings)
}

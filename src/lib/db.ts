import { openDB, type DBSchema, type IDBPDatabase } from 'idb'
import { removeWordFromSession } from './session'
import type { LastImportRecord, Settings, Word } from './types'

interface VocabSchema extends DBSchema {
  words: {
    key: string
    value: Word
    indexes: {
      'by-s': string
      'by-dueAt': number
    }
  }
  meta: {
    key: 'settings' | 'lastImport'
    value: Settings | LastImportRecord
  }
}

const DB_NAME = 'vocab'
const DB_VERSION = 2
const DEFAULT_SETTINGS: Settings = { dailyNewCount: 10, completedDates: [], overachievedDates: [] }

let dbPromise: Promise<IDBPDatabase<VocabSchema>> | null = null

export function openDb(): Promise<IDBPDatabase<VocabSchema>> {
  if (!dbPromise) {
    dbPromise = openDB<VocabSchema>(DB_NAME, DB_VERSION, {
      upgrade(db, oldVersion) {
        if (oldVersion < 1) {
          const words = db.createObjectStore('words', { keyPath: 'w' })
          words.createIndex('by-s', 's')
          words.createIndex('by-dueAt', 'dueAt')
          db.createObjectStore('meta')
        }
      },
    })
  }

  return dbPromise
}

export async function getAllWords(): Promise<Word[]> {
  return (await openDb()).getAll('words')
}

export async function getWord(w: string): Promise<Word | undefined> {
  return (await openDb()).get('words', w)
}

export async function putWord(word: Word): Promise<void> {
  await (await openDb()).put('words', word)
}

export async function bulkPutWords(words: Word[]): Promise<void> {
  const db = await openDb()
  const tx = db.transaction('words', 'readwrite')

  await Promise.all(words.map((word) => tx.store.put(word)))
  await tx.done
}

export async function deleteWord(w: string): Promise<void> {
  await (await openDb()).delete('words', w)
}

export async function getLastImport(): Promise<LastImportRecord | undefined> {
  const db = await openDb()
  return (await db.get('meta', 'lastImport')) as LastImportRecord | undefined
}

export async function putLastImport(record: LastImportRecord): Promise<void> {
  await (await openDb()).put('meta', record, 'lastImport')
}

export async function clearLastImport(): Promise<void> {
  await (await openDb()).delete('meta', 'lastImport')
}

export async function getSettings(): Promise<Settings> {
  const db = await openDb()
  return ((await db.get('meta', 'settings')) as Settings | undefined) ?? { ...DEFAULT_SETTINGS }
}

export async function putSettings(settings: Settings): Promise<void> {
  await (await openDb()).put('meta', settings, 'settings')
}

export async function deleteWordAndCleanupSession(word: string): Promise<void> {
  const db = await openDb()
  const tx = db.transaction(['words', 'meta'], 'readwrite')
  const settings = ((await tx.objectStore('meta').get('settings')) as Settings | undefined) ?? {
    ...DEFAULT_SETTINGS,
  }
  const nextSession = removeWordFromSession(settings.currentSession, word)

  await tx.objectStore('words').delete(word)
  await tx.objectStore('meta').put({ ...settings, currentSession: nextSession }, 'settings')
  await tx.done
}

export async function clearAll(): Promise<void> {
  const db = await openDb()
  const tx = db.transaction(['words', 'meta'], 'readwrite')

  await Promise.all([
    tx.objectStore('words').clear(),
    tx.objectStore('meta').clear(),
  ])
  await tx.done
}

export type WordStatus = 'new' | 'learning' | 'mastered'

export interface Word {
  w: string
  p?: string
  pos?: string
  cn?: string
  en?: string
  enCn?: string
  ex?: string
  exCn?: string
  tip?: string
  s: WordStatus
  streak: number
  ef: number
  interval: number
  dueAt: number
  reviewedAt: number
  createdAt: number
  updatedAt: number
}

export interface SessionState {
  date: string
  queue: string[]
  done: string[]
  startedAt: number
}

export interface LastImportRecord {
  importedAt: number
  addedWords: string[]
  overwrittenBefore: Word[]
  summary: {
    added: number
    overwritten: number
  }
}

export interface Settings {
  dailyNewCount: number
  githubPat?: string
  githubGistId?: string
  lastSyncAt?: number
  currentSession?: SessionState
  completedDates: string[]
  overachievedDates: string[]
}

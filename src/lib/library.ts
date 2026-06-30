import type { Word } from './types'

export function filterAndSearch(
  words: Word[],
  tab: 'learning' | 'mastered' | 'all',
  query: string,
): Word[] {
  const normalized = query.trim().toLowerCase()

  return words.filter((word) => {
    if (tab === 'learning' && word.s === 'mastered') return false
    if (tab === 'mastered' && word.s !== 'mastered') return false
    if (normalized && !word.w.toLowerCase().startsWith(normalized)) return false
    return true
  })
}

export function resetWordProgress(word: Word, now: number = Date.now()): Word {
  return {
    ...word,
    s: 'new',
    streak: 0,
    ef: 2.5,
    interval: 0,
    dueAt: 0,
    reviewedAt: 0,
    updatedAt: now,
  }
}

export function markMastered(word: Word, now: number = Date.now()): Word {
  return {
    ...word,
    s: 'mastered',
    streak: 3,
    interval: 0,
    dueAt: 0,
    updatedAt: now,
  }
}

import type { Word } from './types'

export function countWordsByStatus(words: Word[], now: number = Date.now()) {
  let dueLearning = 0
  let newCount = 0
  let mastered = 0

  for (const word of words) {
    if (word.s === 'new') {
      newCount += 1
    } else if (word.s === 'mastered') {
      mastered += 1
    } else if (word.s === 'learning' && word.dueAt <= now) {
      dueLearning += 1
    }
  }

  return { dueLearning, newCount, mastered }
}

import { describe, expect, it } from 'vitest'
import { newWord } from './srs'
import { sanitizePayloadForGist } from './sync'
import type { BackupPayload } from './backup'
import type { Word } from './types'

const W = (w: string, updatedAt: number, over: Partial<Word> = {}): Word => ({
  ...newWord({ w }, 0),
  updatedAt,
  ...over,
})

describe('sanitizePayloadForGist', () => {
  it('strips local-only settings and secrets before upload', () => {
    const payload: BackupPayload = {
      version: 1,
      exportedAt: 100,
      words: [W('a', 1)],
      settings: {
        dailyNewCount: 20,
        completedDates: ['2026-06-30'],
        overachievedDates: ['2026-06-30'],
        githubPat: 'secret',
        githubGistId: 'gist-1',
        lastSyncAt: 50,
        currentSession: {
          date: '2026-06-30',
          queue: ['a'],
          done: [],
          startedAt: 1,
        },
      },
    }

    expect(sanitizePayloadForGist(payload)).toEqual({
      version: 1,
      exportedAt: 100,
      words: [W('a', 1)],
      settings: {
        dailyNewCount: 20,
        completedDates: [],
        overachievedDates: [],
      },
    })
  })
})

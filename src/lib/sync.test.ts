import { describe, expect, it } from 'vitest'
import { newWord } from './srs'
import {
  applyConflictResolutions,
  markPayloadSynced,
  mergePayloads,
  mergeWords,
  sanitizePayloadForGist,
} from './sync'
import type { BackupPayload } from './backup'
import type { Word } from './types'

const W = (w: string, updatedAt: number, over: Partial<Word> = {}): Word => ({
  ...newWord({ w }, 0),
  updatedAt,
  ...over,
})

describe('mergeWords', () => {
  it('takes both words when they only exist on one side', () => {
    const { merged, conflicts } = mergeWords([W('a', 1)], [W('b', 1)], 0)

    expect(merged.map((word) => word.w).sort()).toEqual(['a', 'b'])
    expect(conflicts).toEqual([])
  })

  it('takes newer side when only local changed after last sync', () => {
    const { merged, conflicts } = mergeWords([W('a', 10, { cn: 'L' })], [W('a', 5)], 8)

    expect(merged[0]).toMatchObject({ w: 'a', updatedAt: 10, cn: 'L' })
    expect(conflicts).toEqual([])
  })

  it('takes newer side when only remote changed after last sync', () => {
    const { merged, conflicts } = mergeWords([W('a', 5)], [W('a', 10, { cn: 'R' })], 8)

    expect(merged[0]).toMatchObject({ w: 'a', updatedAt: 10, cn: 'R' })
    expect(conflicts).toEqual([])
  })

  it('emits conflict when both sides changed after last sync', () => {
    const local = W('a', 10, { cn: 'L' })
    const remote = W('a', 12, { cn: 'R' })
    const { merged, conflicts } = mergeWords([local], [remote], 5)

    expect(conflicts).toHaveLength(1)
    expect(conflicts[0]).toEqual({ w: 'a', local, remote })
    expect(merged.find((word) => word.w === 'a')?.cn).toBe('R')
  })

  it('does not emit conflict when timestamps are equal', () => {
    const { merged, conflicts } = mergeWords([W('a', 1, { cn: 'L' })], [W('a', 1, { cn: 'R' })], 0)

    expect(conflicts).toEqual([])
    expect(merged).toHaveLength(1)
  })
})

describe('applyConflictResolutions', () => {
  it('replaces conflicted entries based on user decisions', () => {
    const local = W('a', 10, { cn: '本地' })
    const remote = W('a', 12, { cn: '远端' })
    const merged = [remote, W('b', 1)]

    const resolved = applyConflictResolutions(
      merged,
      { a: 'local' },
      [{ w: 'a', local, remote }],
    )

    expect(resolved.find((word) => word.w === 'a')?.cn).toBe('本地')
    expect(resolved.find((word) => word.w === 'b')?.w).toBe('b')
  })
})

describe('sanitizePayloadForGist', () => {
  it('removes local-only settings before upload', () => {
    const payload: BackupPayload = {
      version: 1,
      exportedAt: 100,
      words: [W('a', 1)],
      settings: {
        dailyNewCount: 20,
        completedDates: [],
        overachievedDates: [],
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

describe('mergePayloads', () => {
  it('keeps local-only settings while merging shared data', () => {
    const local: BackupPayload = {
      version: 1,
      exportedAt: 100,
      words: [W('a', 10, { cn: 'local' })],
      settings: {
        dailyNewCount: 20,
        completedDates: [],
        overachievedDates: [],
        githubPat: 'secret',
        githubGistId: 'gist-1',
        lastSyncAt: 5,
        currentSession: {
          date: '2026-06-30',
          queue: ['a'],
          done: [],
          startedAt: 1,
        },
      },
    }
    const remote: BackupPayload = {
      version: 1,
      exportedAt: 120,
      words: [W('b', 12, { cn: 'remote' })],
      settings: {
        dailyNewCount: 10,
        completedDates: [],
        overachievedDates: [],
      },
    }

    const { payload, conflicts } = mergePayloads(local, remote, 0, 200)

    expect(conflicts).toEqual([])
    expect(payload.exportedAt).toBe(200)
    expect(payload.words.map((word) => word.w).sort()).toEqual(['a', 'b'])
    expect(payload.settings).toEqual({
      dailyNewCount: 20,
      completedDates: [],
      overachievedDates: [],
      githubPat: 'secret',
      githubGistId: 'gist-1',
      currentSession: {
        date: '2026-06-30',
        queue: ['a'],
        done: [],
        startedAt: 1,
      },
      lastSyncAt: 5,
    })
  })
})

describe('markPayloadSynced', () => {
  it('updates lastSyncAt only after a successful push', () => {
    const payload: BackupPayload = {
      version: 1,
      exportedAt: 100,
      words: [W('a', 10)],
      settings: {
        dailyNewCount: 20,
        completedDates: [],
        overachievedDates: [],
        githubPat: 'secret',
        githubGistId: 'gist-1',
        lastSyncAt: 5,
      },
    }

    expect(markPayloadSynced(payload, 200).settings.lastSyncAt).toBe(200)
    expect(payload.settings.lastSyncAt).toBe(5)
  })
})

import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { clearAll, getSettings, putSettings } from '../lib/db'
import Settings from './Settings'

describe('Settings page', () => {
  beforeEach(async () => {
    await clearAll()
    vi.restoreAllMocks()
    vi.useRealTimers()
  })

  it('masks a previously saved GitHub PAT and requires an explicit edit to change it', async () => {
    const user = userEvent.setup()
    await putSettings({
      dailyNewCount: 10,
      completedDates: [],
      overachievedDates: [],
      totalCompletedDays: 0,
      longestStreak: 0,
      githubPat: 'ghp_secretsecretsecretsecret1234',
      githubGistId: 'gist-abc',
    })

    render(<Settings />)

    expect(await screen.findByText(/已保存 GitHub PAT/)).toBeInTheDocument()
    expect(screen.queryByPlaceholderText(/Personal Access Token/)).not.toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: '修改 PAT' }))

    const patInput = await screen.findByPlaceholderText(/Personal Access Token/)
    expect(patInput).toHaveValue('')
  })

  it('auto-saves GitHub credentials shortly after they are typed', async () => {
    const user = userEvent.setup()

    render(<Settings />)

    await user.type(
      await screen.findByPlaceholderText(/Personal Access Token/),
      'ghp_autosave_token',
    )
    await user.type(screen.getByPlaceholderText(/Gist ID/), 'gist-auto')

    await waitFor(
      async () => {
        const settings = await getSettings()
        expect(settings.githubPat).toBe('ghp_autosave_token')
        expect(settings.githubGistId).toBe('gist-auto')
      },
      { timeout: 2000 },
    )
  })
})

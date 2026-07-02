import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { clearAll, putWord } from '../lib/db'
import { newWord } from '../lib/srs'
import Library from './Library'

describe('Library', () => {
  beforeEach(async () => {
    await clearAll()
    vi.restoreAllMocks()
  })

  it('deletes a word from the list after confirmation', async () => {
    const user = userEvent.setup()
    vi.spyOn(window, 'confirm').mockReturnValue(true)

    await putWord(newWord({ w: 'apple', cn: '苹果' }, 0))

    render(
      <MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <Library />
      </MemoryRouter>,
    )

    expect(await screen.findByText('apple')).toBeInTheDocument()
    expect(screen.getByText('新词 · 0次')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: '删除 apple' }))

    await waitFor(() => {
      expect(screen.queryByText('apple')).not.toBeInTheDocument()
    })
  })
})

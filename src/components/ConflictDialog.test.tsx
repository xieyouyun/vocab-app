import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import ConflictDialog from './ConflictDialog'

describe('ConflictDialog', () => {
  it('requires a decision for every conflict before confirming', async () => {
    const user = userEvent.setup()
    const onResolve = vi.fn()

    render(
      <ConflictDialog
        conflicts={[
          {
            w: 'apple',
            local: {
              w: 'apple',
              cn: '苹果',
              s: 'learning',
              streak: 1,
              ef: 2.5,
              interval: 1,
              dueAt: 0,
              reviewedAt: 0,
              createdAt: 0,
              updatedAt: 10,
            },
            remote: {
              w: 'apple',
              cn: '苹果-远端',
              s: 'learning',
              streak: 1,
              ef: 2.5,
              interval: 1,
              dueAt: 0,
              reviewedAt: 0,
              createdAt: 0,
              updatedAt: 12,
            },
          },
        ]}
        onResolve={onResolve}
        onCancel={() => {}}
      />,
    )

    const confirm = screen.getByRole('button', { name: '确认' })
    expect(confirm).toBeDisabled()

    await user.click(screen.getByRole('button', { name: '保留本地' }))
    expect(confirm).toBeEnabled()

    await user.click(confirm)
    expect(onResolve).toHaveBeenCalledWith({ apple: 'local' })
  })
})

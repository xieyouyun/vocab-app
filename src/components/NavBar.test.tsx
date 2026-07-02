import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it } from 'vitest'
import NavBar from './NavBar'

describe('NavBar', () => {
  it('renders the bottom nav with the shared safe-area class', () => {
    render(
      <MemoryRouter
        initialEntries={['/']}
        future={{ v7_startTransition: true, v7_relativeSplatPath: true }}
      >
        <NavBar />
      </MemoryRouter>,
    )

    expect(screen.getByRole('navigation')).toHaveClass('app-bottom-nav')
  })
})

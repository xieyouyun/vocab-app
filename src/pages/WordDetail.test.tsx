import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { beforeEach, describe, expect, it } from 'vitest'
import { clearAll, putWord } from '../lib/db'
import { newWord } from '../lib/srs'
import WordDetail from './WordDetail'

describe('WordDetail', () => {
  beforeEach(async () => {
    await clearAll()
  })

  it('shows user-friendly progress copy and expands EF help', async () => {
    const user = userEvent.setup()

    await putWord(
      newWord(
        {
          w: 'apple',
          cn: '苹果',
          pos: 'n.',
          en: 'a fruit',
          enCn: '一种水果',
          ex: 'I ate an apple.',
          exCn: '我吃了一个苹果。',
        },
        0,
      ),
    )

    render(
      <MemoryRouter
        initialEntries={['/library/apple']}
        future={{ v7_startTransition: true, v7_relativeSplatPath: true }}
      >
        <Routes>
          <Route path="/library/:w" element={<WordDetail />} />
        </Routes>
      </MemoryRouter>,
    )

    expect(await screen.findByText('学习状态：新词')).toBeInTheDocument()
    expect(screen.getByText('连续记住：0 次')).toBeInTheDocument()
    expect(screen.getByText('记忆系数 EF：2.50')).toBeInTheDocument()
    expect(screen.queryByText(/EF 用来表示你对这个词的熟悉程度/)).not.toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: '什么是 EF？' }))

    expect(screen.getByText(/EF 用来表示你对这个词的熟悉程度/)).toBeInTheDocument()
  })
})

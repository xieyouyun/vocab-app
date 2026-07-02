import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { clearAll, putWord } from '../lib/db'
import { newWord } from '../lib/srs'
import Import from './Import'

const TEXT = `【单词】：apple
【中文翻译】：苹果

【单词】：banana
【中文翻译】：香蕉`

describe('Import page', () => {
  beforeEach(async () => {
    await clearAll()
    vi.restoreAllMocks()
    vi.spyOn(window, 'confirm').mockReturnValue(true)
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: { writeText: vi.fn().mockResolvedValue(undefined) },
    })
  })

  it('imports text directly and shows the rollback action', async () => {
    const user = userEvent.setup()

    await putWord({ ...newWord({ w: 'apple', cn: '旧苹果' }, 0), streak: 2 })

    render(<Import />)
    await user.type(screen.getByPlaceholderText('粘贴豆包返回的内容'), TEXT)
    await user.click(screen.getByRole('button', { name: '解析并导入' }))

    expect(await screen.findByText('新增 1，覆盖 1')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '回滚最近一次导入' })).toBeInTheDocument()
  })
})

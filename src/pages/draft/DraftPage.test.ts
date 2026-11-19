import { describe, expect, it } from 'vitest'

import { isAbortError } from './DraftPage'

describe('isAbortError', () => {
  it('recognizes an AbortError', () => {
    expect(isAbortError(new DOMException('Запрос отменён', 'AbortError'))).toBe(
      true,
    )
  })

  it('does not classify regular errors as cancellation', () => {
    expect(isAbortError(new Error('Сервер недоступен'))).toBe(false)
    expect(isAbortError('AbortError')).toBe(false)
    expect(isAbortError(null)).toBe(false)
  })
})

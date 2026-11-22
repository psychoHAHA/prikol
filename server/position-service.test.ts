import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('./stratz-client.js', () => ({ query: vi.fn() }))
import { query } from './stratz-client.js'
import { fetchPositions } from './position-service.js'
import { cache } from './cache.js'

beforeEach(() => {
  cache.clear()
  vi.resetAllMocks()
})

describe('fetchPositions', () => {
  it('uses the latest available week and caches it', async () => {
    vi.mocked(query)
      .mockResolvedValueOnce({ heroStats: { stats: [] } })
      .mockResolvedValueOnce({ heroStats: { stats: [{ heroId: 1, position: 'POSITION_1', week: 100, matchCount: 50 }] } })
    const result = await fetchPositions()
    expect(result.positions[0].heroId).toBe(1)
    const firstWeek = vi.mocked(query).mock.calls[0][1]?.week as number
    expect(vi.mocked(query).mock.calls[1][1]?.week).toBe(firstWeek - 7 * 24 * 60 * 60)
    expect(result.weekStart).toBe(new Date((firstWeek - 7 * 24 * 60 * 60) * 1000).toISOString())
    await fetchPositions()
    expect(query).toHaveBeenCalledTimes(2)
  })

  it('reports missing data after searching recent weeks', async () => {
    vi.mocked(query).mockResolvedValue({ heroStats: { stats: [] } })
    await expect(fetchPositions()).rejects.toThrow('последние 12 недель')
    expect(query).toHaveBeenCalledTimes(12)
  })
})

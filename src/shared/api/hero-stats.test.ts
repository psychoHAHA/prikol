import { afterEach, describe, expect, it, vi } from 'vitest'

import { ApiError, getHeroes, getHeroItems } from './hero-stats'

afterEach(() => {
  vi.restoreAllMocks()
})

describe('hero stats API client', () => {
  it('returns a typed payload for a successful response', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({
            heroes: [{ id: 1, name: 'Axe' }],
            fetchedAt: '2026-01-01T00:00:00.000Z',
            gameVersion: { id: 190, name: '7.41f', asOfDateTime: 1789430400 },
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } },
        ),
      ),
    )

    await expect(getHeroes()).resolves.toMatchObject({
      heroes: [{ id: 1, name: 'Axe' }],
      gameVersion: { id: 190, name: '7.41f', asOfDateTime: 1789430400 },
    })
    expect(fetch).toHaveBeenCalledWith('/api/heroes', { signal: undefined })
  })

  it('uses the server error message when a request fails', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ error: 'Позиция не поддерживается' }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        }),
      ),
    )

    await expect(getHeroItems(1, 'POSITION_1')).rejects.toMatchObject({
      name: 'ApiError',
      message: 'Позиция не поддерживается',
      status: 400,
    })
  })

  it('throws an ApiError instance when the server responds with an error', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ error: 'Сервер недоступен' }), {
          status: 503,
          headers: { 'Content-Type': 'application/json' },
        }),
      ),
    )

    await expect(getHeroes()).rejects.toBeInstanceOf(ApiError)
  })

  it('converts a non-json server error into an ApiError', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        new Response('<html>Internal Server Error</html>', {
          status: 500,
          headers: { 'Content-Type': 'text/html' },
        }),
      ),
    )

    await expect(getHeroes()).rejects.toMatchObject({
      name: 'ApiError',
      status: 500,
      message: 'Не удалось загрузить героев',
    })
  })

  it('passes AbortSignal to fetch', async () => {
    const controller = new AbortController()

    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({
            heroes: [],
            fetchedAt: '2026-01-01T00:00:00.000Z',
          }),
          {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
          },
        ),
      ),
    )

    await getHeroes(controller.signal)

    expect(fetch).toHaveBeenCalledWith('/api/heroes', {
      signal: controller.signal,
    })
  })

  it('converts API heroes into domain models', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({
            heroes: [
              {
                id: 1,
                name: 'Axe',
                internalField: 'server-only',
              },
            ],
            fetchedAt: '2026-01-01T00:00:00.000Z',
          }),
          {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
          },
        ),
      ),
    )

    const result = await getHeroes()

    expect(result.heroes).toEqual([
      {
        id: 1,
        name: 'Axe',
      },
    ])
  })

  it('filters malformed heroes from the API response', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({
            heroes: [
              { id: 1, name: 'Axe' },
              { id: 'broken', name: 'Invalid' },
              { id: 2, name: '' },
              null,
            ],
            fetchedAt: '2026-01-01T00:00:00.000Z',
          }),
          {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
          },
        ),
      ),
    )

    const result = await getHeroes()

    expect(result.heroes).toEqual([{ id: 1, name: 'Axe' }])
  })

  it('rejects a response without a heroes array', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ fetchedAt: '2026-01-01' }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }),
      ),
    )

    await expect(getHeroes()).rejects.toThrow(
      'Сервер вернул некорректный список героев',
    )
  })

  it('rejects a malformed game version', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({
            heroes: [],
            fetchedAt: '2026-01-01T00:00:00.000Z',
            gameVersion: { id: 'invalid', name: '7.40' },
          }),
          {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
          },
        ),
      ),
    )

    await expect(getHeroes()).rejects.toThrow(
      'Сервер вернул некорректный список героев',
    )
  })
  it('uses a fallback message when the error response is null', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        new Response('null', {
          status: 500,
          headers: { 'Content-Type': 'application/json' },
        }),
      ),
    )

    await expect(getHeroes()).rejects.toMatchObject({
      name: 'ApiError',
      status: 500,
      message: 'Не удалось загрузить героев',
    })
  })

  it('propagates an aborted request', async () => {
    const controller = new AbortController()

    vi.stubGlobal(
      'fetch',
      vi.fn((_url: string, options: { signal: AbortSignal }) => {
        return new Promise((_resolve, reject) => {
          options.signal.addEventListener('abort', () => {
            reject(new DOMException('Запрос отменён', 'AbortError'))
          })
        })
      }),
    )

    const request = getHeroes(controller.signal)

    controller.abort()

    await expect(request).rejects.toMatchObject({
      name: 'AbortError',
    })
  })
})

import http from 'node:http'
import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { AppError } from './errors.js'
import { createRateLimiter } from './rate-limit.js'
import { fetchHeroes } from './hero-service.js'
import { fetchPositions } from './position-service.js'
import { fetchMatchups } from './matchup-service.js'
import { fetchItems } from './item-service.js'
import { fetchGuide } from './guide-service.js'
export { fetchHeroes, fetchPositions, fetchMatchups, fetchItems, fetchGuide }
const distDir = fileURLToPath(new URL('../dist/', import.meta.url))
const contentTypes: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.ico': 'image/x-icon',
}
const rateLimit = createRateLimiter()
function heroId(value: string) {
  const id = Number(value)
  if (!Number.isSafeInteger(id) || id < 1 || id > 32767)
    throw new AppError(400, 'Некорректный ID героя', 'client')
  return id
}
function position(url: URL) {
  const value = url.searchParams.get('position') ?? 'POSITION_1'
  if (!/^POSITION_[1-5]$/.test(value))
    throw new AppError(400, 'Неизвестная позиция', 'client')
  return value
}
function enemies(url: URL) {
  const value = url.searchParams.get('against')
  if (value === null || value === '') return []
  const ids = value.split(',')
  if (ids.length > 5 || ids.some((id) => !/^\d+$/.test(id)))
    throw new AppError(400, 'Некорректный список противников', 'client')
  const result = ids.map(heroId)
  if (new Set(result).size !== result.length)
    throw new AppError(400, 'Противники не должны повторяться', 'client')
  return result
}
export const server = http.createServer(async (req, res) => {
  res.setHeader('Content-Type', 'application/json; charset=utf-8')
  try {
    const url = new URL(req.url ?? '/', 'http://localhost')
    if (req.method !== 'GET') {
      res
        .writeHead(405)
        .end(JSON.stringify({ error: 'Метод не поддерживается' }))
      return
    }
    if (url.pathname.startsWith('/api/')) {
      const result = rateLimit(req.socket.remoteAddress || 'unknown')
      if (!result.allowed) {
        res.setHeader('Retry-After', result.retryAfter)
        throw new AppError(429, 'Слишком много запросов', 'rate_limit')
      }
    }
    if (url.pathname === '/api/heroes') {
      res.end(JSON.stringify(await fetchHeroes()))
      return
    }
    if (url.pathname === '/api/positions') {
      res.end(JSON.stringify(await fetchPositions()))
      return
    }
    const match = url.pathname.match(/^\/api\/heroes\/(\d+)\/matchups$/)
    if (match) {
      res.end(JSON.stringify(await fetchMatchups(heroId(match[1]))))
      return
    }
    const items = url.pathname.match(/^\/api\/heroes\/(\d+)\/items$/)
    if (items) {
      res.end(JSON.stringify(await fetchItems(heroId(items[1]), position(url))))
      return
    }
    const guide = url.pathname.match(/^\/api\/heroes\/(\d+)\/guide$/)
    if (guide) {
      res.end(
        JSON.stringify(
          await fetchGuide(heroId(guide[1]), enemies(url), position(url)),
        ),
      )
      return
    }
    if (!url.pathname.startsWith('/api/')) {
      const relativePath =
        url.pathname === '/'
          ? 'index.html'
          : decodeURIComponent(url.pathname).replace(/^\/+/, '')
      const filePath = path.resolve(distDir, relativePath)
      const relative = path.relative(distDir, filePath)
      if (
        relative &&
        !relative.startsWith('..') &&
        !path.isAbsolute(relative) &&
        contentTypes[path.extname(filePath)]
      ) {
        try {
          const content = await readFile(filePath)
          res.setHeader('Content-Type', contentTypes[path.extname(filePath)])
          res.end(content)
          return
        } catch (error) {
          if (
            (error as NodeJS.ErrnoException).code !== 'ENOENT' &&
            (error as NodeJS.ErrnoException).code !== 'EISDIR'
          )
            throw error
        }
      }
    }
    res.writeHead(404).end(JSON.stringify({ error: 'Маршрут не найден' }))
  } catch (error) {
    const known = error instanceof AppError
    res
      .writeHead(known ? error.status : 500)
      .end(
        JSON.stringify({
          error: known ? error.message : 'Внутренняя ошибка сервера',
          code: known ? error.code : 'internal',
        }),
      )
  }
})
if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href
) {
  const port = Number(process.env.PORT) || 3001
  server.listen(port, process.env.PORT ? '0.0.0.0' : '127.0.0.1', () =>
    console.log(`Сервер запущен на порту ${port}`),
  )
}

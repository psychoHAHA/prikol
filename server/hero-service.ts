import { query } from './stratz-client.js'
import { cache, ttl } from './cache.js'
import { AppError } from './errors.js'

export async function fetchHeroes() {
  const cached = cache.get('heroes')
  if (cached && Date.now() - cached.time < ttl) return cached.data
  const data = await query(
    '{ constants { gameVersions { id name asOfDateTime } heroes { id displayName } } }',
  )
  const versions = data.constants?.gameVersions
  if (
    !Array.isArray(versions) ||
    !versions.length ||
    !Array.isArray(data.constants?.heroes)
  )
    throw new AppError(502, 'STRATZ РЅРµ РІРµСЂРЅСѓР» СЃРїСЂР°РІРѕС‡РЅРёРє РіРµСЂРѕРµРІ', 'stratz')
  const version = versions.reduce((a, b) =>
    a.asOfDateTime > b.asOfDateTime ? a : b,
  )
  const heroes = (data.constants.heroes || [])
    .filter((h) => h.id && h.displayName)
    .map((h) => ({
      id: h.id,
      name: h.displayName,
    }))
  const result = {
    heroes,
    gameVersion: version,
    fetchedAt: new Date().toISOString(),
  }
  cache.set('heroes', { data: result, time: Date.now() })
  return result
}


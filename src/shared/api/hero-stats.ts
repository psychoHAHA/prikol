import type {
  Hero,
  Item,
  Matchup,
  Position,
  PositionStats,
} from '../types/domains'
import heroCatalog from '../data/hero-catalog.json'

export interface HeroApiDto {
  id: number
  name: string
  attribute?: 'strength' | 'agility' | 'intelligence' | 'universal'
}

function isHeroApiDto(value: unknown): value is HeroApiDto {
  if (typeof value !== 'object' || value === null) {
    return false
  }

  const hero = value as Record<string, unknown>

  return (
    typeof hero.id === 'number' &&
    typeof hero.name === 'string' &&
    hero.name.trim().length > 0
  )
}

function isGameVersionDto(value: unknown): value is GameVersionDto {
  if (typeof value !== 'object' || value === null) {
    return false
  }

  const version = value as Record<string, unknown>

  return (
    typeof version.id === 'number' &&
    typeof version.name === 'string' &&
    typeof version.asOfDateTime === 'number' &&
    Number.isFinite(version.asOfDateTime)
  )
}

function isHeroesApiResponse(value: unknown): value is {
  heroes: unknown[]
  fetchedAt: string
  gameVersion?: GameVersionDto
} {
  if (typeof value !== 'object' || value === null) {
    return false
  }

  const response = value as Record<string, unknown>

  return (
    Array.isArray(response.heroes) &&
    typeof response.fetchedAt === 'string' &&
    (response.gameVersion === undefined ||
      isGameVersionDto(response.gameVersion))
  )
}

function toHero(dto: HeroApiDto): Hero {
  const entry = (heroCatalog as Record<string, { attribute?: Hero['attribute']; image: string }>)[dto.id]
  return {
    id: dto.id,
    name: dto.name,
    attribute: entry?.attribute,
    image: entry ? `https://cdn.cloudflare.steamstatic.com${entry.image}` : undefined,
  }
}

export type { Item, Matchup, Position, PositionStats } from '../types/domains'

interface ApiErrorPayload {
  error?: string
}

interface GameVersionDto {
  id: number
  name: string
  asOfDateTime: number
}

export interface HeroesResponse {
  heroes: Hero[]
  gameVersion?: GameVersionDto
  fetchedAt: string
}

export interface MatchupsResponse {
  matchups: Matchup[]
  heroId: number
  fetchedAt: string
  sourceUrl: string
  weekStart?: string
}

export interface PositionsResponse {
  positions: PositionStats[]
  fetchedAt: string
  weekStart?: string
}

export interface ItemsResponse {
  items: Item[]
  heroId: number
  position: Position
  fetchedAt: string
  sourceUrl: string
}

export interface GuideSummary {
  againstHeroId: number
  matchCount: number
  matchIds: number[]
}

export interface GuideBuildItem {
  itemId: number
  name: string
  matches: number
  medianTime: number
}

interface GuideBase {
  guides: GuideSummary[]
  build: GuideBuildItem[]
}

export type GuideResponse = GuideBase & (
  | { sampleSize: number; requestedMatches: number; heroId: number; position: Position; sourceUrl: string }
  | { sampleSize?: never; requestedMatches?: never; heroId?: never; position?: never; sourceUrl?: never }
)

export class ApiError extends Error {
  readonly status: number

  constructor(message: string, status: number) {
    super(message)
    this.name = 'ApiError'
    this.status = status
  }
}

async function readResponse<T>(
  response: Response,
  fallbackMessage: string,
): Promise<T> {
  let data: (T & ApiErrorPayload) | null = null

  try {
    data = (await response.json()) as T & ApiErrorPayload
  } catch {
    if (!response.ok) {
      throw new ApiError(fallbackMessage, response.status)
    }

    throw new Error('!5@25@ вернул некорректный JSON')
  }

  if (!response.ok) {
    const message =
      data !== null &&
      typeof data === 'object' &&
      typeof data.error === 'string' &&
      data.error.trim().length > 0
        ? data.error
        : fallbackMessage

    throw new ApiError(message, response.status)
  }

  return data as T
}

export async function getHeroes(signal?: AbortSignal): Promise<HeroesResponse> {
  const response = await fetch('/api/heroes', { signal })

  const data = await readResponse<unknown>(
    response,
    'Не удалось загрузить героев',
  )

  if (!isHeroesApiResponse(data)) {
    throw new Error('!5@25@ вернул некорректный список героев')
  }

  const validHeroes = data.heroes.filter(isHeroApiDto)

  return {
    ...data,
    heroes: validHeroes.map(toHero),
  }
}

export async function getHeroMatchups(
  heroId: number,
  signal?: AbortSignal,
): Promise<MatchupsResponse> {
  const response = await fetch(`/api/heroes/${heroId}/matchups`, { signal })

  return readResponse<MatchupsResponse>(
    response,
    'Не удалось загрузить матчапы',
  )
}

export async function getPositions(
  signal?: AbortSignal,
): Promise<PositionsResponse> {
  const response = await fetch('/api/positions', { signal })

  return readResponse<PositionsResponse>(
    response,
    'Не удалось загрузить позиции',
  )
}

export async function getHeroItems(
  heroId: number,
  position: Position,
  signal?: AbortSignal,
): Promise<ItemsResponse> {
  const response = await fetch(
    `/api/heroes/${heroId}/items?position=${position}`,
    { signal },
  )

  return readResponse<ItemsResponse>(response, 'Не удалось загрузить предметы')
}

export async function getHeroGuide(
  heroId: number,
  enemyIds: number[],
  position: Position,
  signal?: AbortSignal,
): Promise<GuideResponse> {
  const response = await fetch(
    `/api/heroes/${heroId}/guide?position=${position}&against=${enemyIds.join(',')}`,
    { signal },
  )

  return readResponse<GuideResponse>(response, 'Не удалось загрузить гайд')
}

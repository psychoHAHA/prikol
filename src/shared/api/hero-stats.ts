import type {
  Hero,
  Item,
  Matchup,
  Position,
  PositionStats,
} from '../types/domains'

export type {
  Hero,
  Item,
  Matchup,
  Position,
  PositionStats,
} from '../types/domains'

interface ApiError {
  error?: string
}

export interface HeroesResponse {
  heroes: Hero[]
  gameVersion?: {
    id: number
    name: string
    asOfDateTime: string
  }
  fetchedAt: string
}

export interface MatchupsResponse {
  matchups: Matchup[]
  heroId: number
  fetchedAt: string
  sourceUrl: string
}

export interface PositionsResponse {
  positions: PositionStats[]
  fetchedAt: string
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

export interface GuideResponse {
  guides: GuideSummary[]
  build: GuideBuildItem[]
  sampleSize?: number
  requestedMatches?: number
  heroId?: number
  position?: Position
  sourceUrl?: string
}

async function readResponse<T>(
  response: Response,
  fallbackMessage: string,
): Promise<T> {
  const data = (await response.json()) as T & ApiError

  if (!response.ok) {
    throw new Error(data.error || fallbackMessage)
  }

  return data
}

export async function getHeroes(signal?: AbortSignal): Promise<HeroesResponse> {
  const response = await fetch('/api/heroes', { signal })

  return readResponse<HeroesResponse>(response, 'Не удалось загрузить героев')
}

export async function getHeroMatchups(
  heroId: number,
  signal?: AbortSignal,
): Promise<MatchupsResponse> {
  const response = await fetch(`/api/heroes/${heroId}/matchups`, { signal })

  return readResponse<MatchupsResponse>(response, 'Не удалось загрузить матчапы')
}

export async function getPositions(
  signal?: AbortSignal,
): Promise<PositionsResponse> {
  const response = await fetch('/api/positions', { signal })

  return readResponse<PositionsResponse>(response, 'Не удалось загрузить позиции')
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

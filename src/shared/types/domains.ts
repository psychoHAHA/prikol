export type Position =
  | 'POSITION_1'
  | 'POSITION_2'
  | 'POSITION_3'
  | 'POSITION_4'
  | 'POSITION_5'

export interface Hero {
  id: number
  name: string
}

export interface Item {
  itemId: number
  name: string
  games: number
  wins: number
  winRate: number
}

export interface PositionStats {
  heroId: number
  position: Position
  week: number
  matchCount: number
}

export interface Matchup {
  heroId1: number
  heroId2: number
  week?: number
  matchCount: number
  winCount: number
  winRateHeroId1?: number
  winRateHeroId2?: number
  synergy?: number
}

export interface Draft {
  position: Position
  allies: Hero[]
  enemies: Hero[]
}

export interface RecommendationAgainst {
  name?: string
  games: number
  winRate: number
}

export interface Recommendation {
  hero: Hero
  games: number
  score: number
  against: RecommendationAgainst[]
}
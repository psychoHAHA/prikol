import { describe, expect, it } from 'vitest'
import { expertInsightFor, recommendFromStratz } from './recommend'
import type { Hero, Matchup } from '../../shared/types/domains'

const heroes: Hero[] = [
  { id: 1, name: 'Axe' },
  { id: 2, name: 'Lion' },
  { id: 3, name: 'Sven' },
  { id: 82, name: 'Meepo' },
  { id: 32, name: 'Riki' },
]

describe('recommendFromStratz', () => {
  it('возвращает героя с подходящим матчапом', () => {
    const matchups: Matchup[][] = [
      [
        {
          heroId1: 2,
          heroId2: 1,
          matchCount: 100,
          winCount: 40,
        },
      ],
    ]

    const result = recommendFromStratz(heroes, ['Lion'], matchups)

    expect(result).toHaveLength(1)
    expect(result[0].hero.name).toBe('Axe')
    expect(result[0].games).toBe(100)
    expect(result[0].score).toBe(60)
  })

  it('игнорирует матчапы с количеством игр меньше 30', () => {
    const matchups: Matchup[][] = [
      [
        {
          heroId1: 2,
          heroId2: 1,
          matchCount: 29,
          winCount: 10,
        },
      ],
    ]

    const result = recommendFromStratz(heroes, ['Lion'], matchups)

    expect(result).toEqual([])
  })

  it('исключает Meepo и Riki', () => {
    const matchups: Matchup[][] = [
      [
        {
          heroId1: 2,
          heroId2: 82,
          matchCount: 100,
          winCount: 20,
        },
        {
          heroId1: 2,
          heroId2: 32,
          matchCount: 100,
          winCount: 20,
        },
      ],
    ]

    const result = recommendFromStratz(heroes, ['Lion'], matchups)

    expect(result).toEqual([])
  })

  it('объединяет статистику против нескольких врагов', () => {
    const matchups: Matchup[][] = [
      [
        {
          heroId1: 2,
          heroId2: 1,
          matchCount: 50,
          winCount: 20,
        },
      ],
      [
        {
          heroId1: 3,
          heroId2: 1,
          matchCount: 70,
          winCount: 35,
        },
      ],
    ]

    const result = recommendFromStratz(heroes, ['Lion', 'Sven'], matchups)

    expect(result[0].hero.name).toBe('Axe')
    expect(result[0].games).toBe(120)
    expect(result[0].score).toBe(65)
    expect(result[0].against).toHaveLength(2)
  })

  it('сортирует рекомендации по средней доле побед', () => {
    const extendedHeroes: Hero[] = [...heroes, { id: 4, name: 'Juggernaut' }]

    const matchups: Matchup[][] = [
      [
        {
          heroId1: 2,
          heroId2: 1,
          matchCount: 100,
          winCount: 40,
        },
        {
          heroId1: 2,
          heroId2: 4,
          matchCount: 100,
          winCount: 70,
        },
      ],
    ]

    const result = recommendFromStratz(extendedHeroes, ['Lion'], matchups)

    expect(result[0].hero.name).toBe('Axe')
    expect(result[1].hero.name).toBe('Juggernaut')
  })

  it('возвращает максимум пять рекомендаций', () => {
    const candidates: Hero[] = Array.from({ length: 7 }, (_, index) => ({
      id: index + 10,
      name: `Hero ${index + 1}`,
    }))

    const matchups: Matchup[][] = [
      [
        ...candidates.map((hero) => ({
          heroId1: 2,
          heroId2: hero.id,
          matchCount: 50,
          winCount: 20,
        })),
      ],
    ]

    const result = recommendFromStratz(
      [...heroes, ...candidates],
      ['Lion'],
      matchups,
    )

    expect(result).toHaveLength(7)
  })
})

describe('expertInsightFor', () => {
  it('returns knowledge reasons and items for the supplied enemy', () => {
    const insight = expertInsightFor('Lifestealer', ['Alchemist'])

    expect(insight?.reasons[0]).toContain('Lifestealer')
    expect(insight?.items.map((item) => item.item)).toContain('Spirit Vessel')
    expect(insight?.source).toBe('Экспертная база Draft Lab')
  })
})

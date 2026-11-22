import type { ExpertInsight, Hero, Matchup, Recommendation } from '../../shared/types/domains'
import { knowledge } from '../../shared/data/knowledge-catalog'

type KnowledgeEntry = (typeof knowledge.heroes)[number]

export function expertInsightFor(
  recommendedHero: string,
  enemyNames: string[],
): ExpertInsight | undefined {
  const entries = (knowledge.heroes as KnowledgeEntry[]).filter((entry) =>
    enemyNames.includes(entry.hero) && entry.counters.some((counter) => counter.hero === recommendedHero),
  )
  const reasons = entries.flatMap((entry) =>
    entry.counters
      .filter((counter) => counter.hero === recommendedHero)
      .map((counter) => `РџСЂРѕС‚РёРІ ${entry.hero}: ${counter.reason}`),
  )
  if (!reasons.length) return undefined
  const items = entries.flatMap((entry) => entry.items)
  const tips = [...new Set(entries.flatMap((entry) => entry.tips))]
  return { reasons, items, tips, source: knowledge.source }
}

const positionRoles: Record<string, string[]> = {
  POSITION_1: ['carry'],
  POSITION_2: ['mid'],
  POSITION_3: ['offlane'],
  POSITION_4: ['support'],
  POSITION_5: ['support'],
}

export function recommendFromKnowledge(
  allHeroes: Hero[],
  enemyNames: string[],
  position: string,
): Recommendation[] {
  const roles = positionRoles[position] || []
  const byName = new Map(allHeroes.map((hero) => [hero.name, hero]))
  const results = new Map<number, Recommendation>()
  for (const entry of knowledge.heroes) {
    if (!enemyNames.includes(entry.hero)) continue
    for (const counter of entry.counters) {
      if (!counter.roles.some((role) => roles.includes(role))) continue
      const hero = byName.get(counter.hero)
      if (!hero) continue
      const current = results.get(hero.id) ?? {
        hero,
        games: 0,
        score: 0,
        against: [],
      }
      current.expert = expertInsightFor(hero.name, enemyNames)
      results.set(hero.id, current)
    }
  }
  return [...results.values()]
}

export function recommendFromStratz(
  allHeroes: Hero[],
  enemyNames: string[],
  matchupSets: Matchup[][],
  heroCatalog: Hero[] = allHeroes,
): Recommendation[] {
  const excludedHeroIds = new Set([82, 32])

  const byId = new Map(
    allHeroes
      .filter((hero) => !excludedHeroIds.has(hero.id))
      .map((hero) => [hero.id, hero]),
  )

  const enemyIds = new Set(
    enemyNames
      .map((name) => heroCatalog.find((hero) => hero.name === name)?.id)
      .filter((id): id is number => Boolean(id)),
  )

  const scores = new Map<number, Recommendation>()

  for (const rows of matchupSets) {
    for (const row of rows) {
      if (
        !enemyIds.has(row.heroId1) ||
        !byId.has(row.heroId2) ||
        enemyIds.has(row.heroId2) ||
        row.matchCount < 30
      ) {
        continue
      }

      const hero = byId.get(row.heroId2)

      if (!hero) {
        continue
      }

      const current = scores.get(row.heroId2) ?? {
        hero,
        games: 0,
        score: 0,
        against: [],
      }

      current.games += row.matchCount
      current.score += (1 - row.winCount / row.matchCount) * row.matchCount

      current.against.push({
        name: heroCatalog.find((item) => item.id === row.heroId1)?.name,
        games: row.matchCount,
        winRate: 1 - row.winCount / row.matchCount,
      })

      scores.set(row.heroId2, current)
    }
  }

  return [...scores.values()]
    .filter((item) => item.games >= 30)
    .sort((a, b) => b.score / b.games - a.score / a.games || b.games - a.games)
}

export function recommend(): Recommendation[] {
  return []
}


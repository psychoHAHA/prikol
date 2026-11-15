import type { Hero, Matchup, Recommendation } from '../../shared/types/domains'

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
    .slice(0, 5)
}

export function recommend(): Recommendation[] {
  return []
}

import { query } from "./stratz-client.js"
import { cache, ttl } from "./cache.js"

export async function fetchMatchups(heroId: number) {
  const key = `matchups:${heroId}`
  const cached = cache.get(key)
  if (cached && Date.now() - cached.time < ttl) return cached.data
  const weekSeconds = 7 * 24 * 60 * 60
  const currentWeek = Math.floor(Date.now() / 1000 / weekSeconds) * weekSeconds
  for (let offset = 0; offset < 12; offset++) {
    const week = currentWeek - offset * weekSeconds
    const data = await query(
      "query Matchups($heroId: Short!, $week: Long!) { heroStats { matchUp(heroId: $heroId, week: $week, take: 150) { heroId vs { heroId1 heroId2 week matchCount winCount winRateHeroId1 winRateHeroId2 synergy } } } }",
      { heroId, week },
    )
    const rows = data.heroStats?.matchUp?.[0]?.vs || []
    if (!rows.length) continue
    const result = {
      matchups: rows,
      heroId,
      weekStart: new Date(week * 1000).toISOString(),
      fetchedAt: new Date().toISOString(),
      sourceUrl: "https://docs.stratz.com/",
    }
    cache.set(key, { data: result, time: Date.now() })
    return result
  }
  return {
    matchups: [],
    heroId,
    fetchedAt: new Date().toISOString(),
    sourceUrl: "https://docs.stratz.com/",
  }
}

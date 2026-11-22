import { query } from "./stratz-client.js"
import { cache, ttl } from "./cache.js"
import { AppError } from "./errors.js"

export async function fetchGuide(
  heroId: number,
  enemyIds: number[],
  position: string,
) {
  const ids = [
    ...new Set(enemyIds.filter((id) => Number.isInteger(id) && id > 0)),
  ].slice(0, 5)
  if (!ids.length) return { guides: [], build: [] }
  if (!/^POSITION_[1-5]$/.test(position))
    throw new AppError(400, "Неизвестная позиция", "client")
  const key = `guide:${heroId}:${position}:${ids
    .slice()
    .sort((a: number, b: number) => a - b)
    .join(",")}`
  const cached = cache.get(key)
  if (cached && Date.now() - cached.time < ttl) return cached.data
  const guides = await Promise.all(
    ids.map(async (againstHeroId) => {
      const data = await query(
        "query Guide($heroId: Short!, $against: Short!, $position: MatchPlayerPositionType!) { heroStats { guide(heroId: $heroId, againstHeroId: $against, positionId: $position, take: 10) { matchCount guides { matchId } } } }",
        { heroId, against: againstHeroId, position },
      )
      const row = data.heroStats?.guide?.[0]
      return {
        againstHeroId,
        matchCount: row?.matchCount || 0,
        matchIds: (row?.guides || [])
          .map((item) => item.matchId)
          .filter(Boolean),
      }
    }),
  )
  const matchIds = [
    ...new Set(guides.flatMap((g) => g.matchIds.slice(0, 6))),
  ].slice(0, 20)
  const [catalog, ...matches] = await Promise.all([
    query("{ constants { items { id displayName } } }"),
    ...matchIds.map((id) =>
      query(
        "query Match($id: Long!) { match(id: $id) { players { heroId isRadiant stats { itemPurchases { time itemId } } } } }",
        { id },
      ).catch(() => null),
    ),
  ])
  const names = new Map(
    (catalog.constants?.items || []).map((item) => [item.id, item.displayName]),
  )
  const totals = new Map<number, number[]>()
  let sampleSize = 0
  for (const match of matches) {
    const players = match?.match?.players || []
    const player = players.find((p) => p.heroId === heroId)
    if (
      !player?.stats?.itemPurchases?.length ||
      !players.some(
        (p) => ids.includes(p.heroId) && p.isRadiant !== player.isRadiant,
      )
    )
      continue
    sampleSize++
    const seen = new Set()
    for (const purchase of player.stats.itemPurchases) {
      if (
        purchase.time < 0 ||
        !names.get(purchase.itemId) ||
        seen.has(purchase.itemId)
      )
        continue
      seen.add(purchase.itemId)
      const times = totals.get(purchase.itemId) || []
      times.push(purchase.time)
      totals.set(purchase.itemId, times)
    }
  }
  const excluded =
    /recipe|tango|clarity|observer ward|sentry ward|smoke of deceit|town portal scroll|dust of appearance|enchanted mango|healing salve|blood grenade/i
  const build =
    sampleSize < 5
      ? []
      : [...totals]
          .filter(
            ([id, times]) =>
              !excluded.test(names.get(id) ?? "") &&
              times.length >= 3 &&
              times.length / sampleSize >= 0.3,
          )
          .map(([itemId, times]) => {
            times.sort((a, b) => a - b)
            return {
              itemId,
              name: names.get(itemId),
              matches: times.length,
              medianTime: times[Math.floor(times.length / 2)],
            }
          })
          .sort((a, b) => a.medianTime - b.medianTime)
  const result = {
    guides,
    build,
    sampleSize,
    requestedMatches: matchIds.length,
    heroId,
    position,
    sourceUrl: "https://stratz.com/",
  }
  cache.set(key, { data: result, time: Date.now() })
  return result
}

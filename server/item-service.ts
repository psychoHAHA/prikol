import { query } from "./stratz-client.js"
import { cache, ttl } from "./cache.js"
import { AppError } from "./errors.js"

export async function fetchItems(heroId: number, position: string) {
  const key = `items:${heroId}:${position}`
  const cached = cache.get(key)
  if (cached && Date.now() - cached.time < ttl) return cached.data
  if (!/^POSITION_[1-5]$/.test(position))
    throw new AppError(400, "Неизвестная позиция", "client")
  const data = await query(
    "query HeroItems($heroId: Short!, $position: MatchPlayerPositionType!) { heroStats { itemFullPurchase(heroId: $heroId, positionIds: [$position], matchLimit: 1000) { itemId instance matchCount winCount } } constants { items { id displayName } } }",
    { heroId, position },
  )
  const rows = data.heroStats?.itemFullPurchase || []
  const names = new Map(
    (data.constants?.items || []).map((item) => [item.id, item.displayName]),
  )
  const totals = new Map<
    number,
    { itemId: number; name: string; games: number; wins: number }
  >()
  for (const row of rows) {
    if (!row.itemId || !row.matchCount) continue
    const item = totals.get(row.itemId) || {
      itemId: row.itemId,
      name: names.get(row.itemId) || `Предмет ${row.itemId}`,
      games: 0,
      wins: 0,
    }
    item.games += row.matchCount
    item.wins += row.winCount || 0
    totals.set(row.itemId, item)
  }
  const items = [...totals.values()]
    .filter((item) => item.games >= 20)
    .map((item) => ({ ...item, winRate: item.wins / item.games }))
    .sort((a, b) => b.games - a.games)
    .slice(0, 12)
  const result = {
    items,
    heroId,
    position,
    fetchedAt: new Date().toISOString(),
    sourceUrl: "https://stratz.com/",
  }
  cache.set(key, { data: result, time: Date.now() })
  return result
}

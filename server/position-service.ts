import { query } from "./stratz-client.js"
import { cache, ttl } from "./cache.js"
import { AppError } from "./errors.js"

export async function fetchPositions() {
  const cached = cache.get("positions")
  if (cached && Date.now() - cached.time < ttl) return cached.data
  const weekSeconds = 7 * 24 * 60 * 60
  const currentWeek = Math.floor(Date.now() / 1000 / weekSeconds) * weekSeconds
  // STRATZ can lag behind the current week; search a bounded recent window.
  for (let offset = 0; offset < 12; offset++) {
    const week = currentWeek - offset * weekSeconds
    const data = await query(
      "query Positions($week: Long!) { heroStats { stats(week: $week, groupByPosition: true) { heroId position week matchCount } } }",
      { week },
    )
    const positions = data.heroStats?.stats
    if (!Array.isArray(positions))
      throw new AppError(502, "STRATZ вернул некорректную статистику позиций", "stratz")
    if (positions.length === 0) continue
    const result = {
      positions,
      weekStart: new Date(week * 1000).toISOString(),
      fetchedAt: new Date().toISOString(),
    }
    cache.set("positions", { data: result, time: Date.now() })
    return result
  }
  throw new AppError(502, "STRATZ не вернул статистику позиций за последние 12 недель. Подбор для выбранной роли сейчас недоступен.", "stratz")
}

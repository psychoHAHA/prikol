import { useEffect, useState } from "react"
import type {
  GuideResponse,
  ItemsResponse,
  Position,
} from "../../../shared/api/hero-stats"
import type { Hero } from "../../../shared/types/domains"
import { getHeroGuide, getHeroItems } from "../../../shared/api/hero-stats"
import { knowledge } from "../../../shared/data/knowledge-catalog"

interface ItemBuildProps {
  hero: Hero
  position: Position
  enemies: Hero[]
}
type ItemsState =
  | { loading: true }
  | { data: ItemsResponse }
  | { error: string }
type GuideState = { loading: true } | { error: string } | GuideResponse
type LocalBuildItem = readonly [string, number, number, string]
type LocalKnowledge = (typeof knowledge.heroes)[number] & {
  build?: LocalBuildItem[]
}
function itemImage(name: string) {
  const slug = name
    .toLowerCase()
    .replace(/['’]/g, "")
    .replace(/\s+/g, "_")
    .replace(/[^a-z0-9_]/g, "")
  return `https://cdn.cloudflare.steamstatic.com/apps/dota2/images/dota_react/items/${slug}.png`
}

export function ItemBuild({ hero, position, enemies }: ItemBuildProps) {
  const localHero = (knowledge.heroes as unknown as LocalKnowledge[]).find(
    (entry) => entry.hero === hero.name,
  )
  const localItems = localHero?.build ?? []
  const enemyIds = enemies.map((enemy) => enemy.id)
  const [state, setState] = useState<ItemsState | null>(null)
  const [guide, setGuide] = useState<GuideState | null>(null)
  useEffect(() => {
    const controller = new AbortController()
    setState({ loading: true })
    getHeroItems(hero.id, position, controller.signal)
      .then((data) => setState({ data }))
      .catch((error) => {
        if (error.name !== "AbortError") setState({ error: error.message })
      })
    return () => controller.abort()
  }, [hero.id, position])
  useEffect(() => {
    const controller = new AbortController()
    setGuide({ loading: true })
    getHeroGuide(hero.id, enemyIds, position, controller.signal)
      .then(setGuide)
      .catch((error) => {
        if (error.name !== "AbortError") setGuide({ error: error.message })
      })
    return () => controller.abort()
  }, [hero.id, position, enemyIds.join(",")])
  if (!state || "loading" in state)
    return (
      <div className="item-loading" aria-live="polite">
        <p className="loading-label">Загружаем предметы для этой позиции…</p>
        <span />
        <span />
        <span />
      </div>
    )
  if ("error" in state)
    return <p role="alert">Не удалось загрузить предметы: {state.error}</p>
  return (
    <div className="item-build">
      <p>
        <strong>Популярные предметы на этой позиции</strong>
      </p>
      {state.data.items.length ? (
        <ul>
          {state.data.items.map((item) => (
            <li key={item.itemId}>
              <img className="item-icon" src={itemImage(item.name)} alt="" />
              {item.name} — {item.games} покупок, победы в этих матчах:{" "}
              {(item.winRate * 100).toFixed(1)}%
            </li>
          ))}
        </ul>
      ) : (
        <p>Недостаточно данных о покупках.</p>
      )}
      {localItems.length > 0 && (
        <>
          <p>
            <strong>Локальная рекомендация сборки</strong>
          </p>
          <ol className="local-item-build">
            {localItems.map(([name, seconds, matches]) => (
              <li key={name}>
                <img className="item-icon" src={itemImage(name)} alt="" />
                {name} — примерно {Math.floor(seconds / 60)}:
                {String(seconds % 60).padStart(2, "0")}, в {matches} из 5 матчей
              </li>
            ))}
          </ol>
          <ul className="local-item-comments">
            {localItems.map(([name, , , reason]) => (
              <li key={name}>
                <strong>{name}:</strong> {reason}
              </li>
            ))}
          </ul>
        </>
      )}
      <p>
        Это частые покупки по статистике STRATZ, а не готовый порядок сборки.
        Учитывай способности врагов и ход игры; процент побед не доказывает
        эффективность предмета.
      </p>
      {guide && "loading" in guide && (
        <div className="guide-loading" aria-live="polite">
          <p className="loading-label">
            Анализируем покупки против выбранных соперников…
          </p>
          <span />
          <span />
        </div>
      )}
      {guide && "error" in guide && (
        <p role="alert">Не удалось проанализировать матчи: {guide.error}</p>
      )}
      {guide && "guides" in guide && guide.guides.length ? (
        <div>
          <p>
            <strong>Порядок покупок в примерах матчей</strong>
          </p>
          <p>
            Проанализировано {guide.sampleSize} из {guide.requestedMatches}{" "}
            матчей: в каждом был хотя бы один выбранный соперник. Это не
            обязательно матчи против всего пика.
          </p>
          {guide.build.length ? (
            <ol>
              {guide.build.map((item) => (
                <li key={item.itemId}>
                  <img
                    className="item-icon"
                    src={itemImage(item.name)}
                    alt=""
                  />
                  {item.name} — примерно {Math.floor(item.medianTime / 60)}:
                  {String(item.medianTime % 60).padStart(2, "0")}, в{" "}
                  {item.matches} из {guide.sampleSize} матчей
                </li>
              ))}
            </ol>
          ) : (
            <p>Для порядка покупок недостаточно повторяющихся данных.</p>
          )}
          <p>
            Порядок основан на медианном времени покупки предмета в небольшой
            выборке; компоненты тоже могут попасть в список. Это ориентир, а не
            обязательная сборка или доказательство эффективности против
            конкретного героя.
          </p>
          <p>
            <strong>Примеры матчей:</strong>
          </p>
          {guide.guides.map((item) => (
            <p key={item.againstHeroId}>
              {enemies.find((enemy) => enemy.id === item.againstHeroId)?.name}:{" "}
              {item.matchCount} матчей{" "}
              {item.matchIds.slice(0, 3).map((id) => (
                <a
                  key={id}
                  href={`https://stratz.com/matches/${id}`}
                  target="_blank"
                  rel="noreferrer"
                >
                  {" "}
                  #{id}
                </a>
              ))}
            </p>
          ))}
        </div>
      ) : null}
      <a
        href={`https://stratz.com/heroes/${hero.id}`}
        target="_blank"
        rel="noreferrer"
      >
        Подробнее на STRATZ ↗
      </a>
    </div>
  )
}

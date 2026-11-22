import { useEffect, useRef, useState } from "react"

import type {
  HeroesResponse,
  Position,
} from "../../shared/api/hero-stats"

import type { Hero } from "../../shared/types/domains"

import type { Recommendation } from "../../shared/types/domains"

import {
  getHeroes,
  getHeroMatchups,
  getPositions,
} from "../../shared/api/hero-stats"
import { expertInsightFor, recommendFromKnowledge, recommendFromStratz } from "../../features/draft/recommend"

import { Header } from "../../widgets/header/Header"
import { Intro } from "../../widgets/intro/Intro"
import { Footer } from "../../widgets/footer/Footer"
import { DraftSetup } from "../../widgets/draft-workspace/DraftSetup"
import { RecommendationPanel } from "../../widgets/recommendation-panel/RecommendationPanel"

import { RecommendationCard } from "../../features/draft/recommendation-card/RecommendationCard"
import { ItemBuild } from "../../features/draft/item-build/ItemBuild"

export function isAbortError(error: unknown): boolean {
  return error instanceof Error && error.name === "AbortError"
}

export function DraftPage() {
  const [data, setData] = useState<HeroesResponse | null>(
    null,
  )
  const [error, setError] = useState<string | null>(null)
  const [allies, setAllies] = useState<string[]>([])
  const [enemies, setEnemies] = useState<string[]>([])
  const [position, setPosition] = useState<Position>("POSITION_1")
  const [results, setResults] = useState<Recommendation[] | null>(null)
  const [visibleResults, setVisibleResults] = useState(5)
  const [loading, setLoading] = useState(false)
  const [positionWeek, setPositionWeek] = useState<string | undefined>()
  const [screen, setScreen] = useState<"draft" | "results">("draft")
  const [selectedHero, setSelectedHero] = useState<number | null>(null)
  const searchController = useRef<AbortController | null>(null)
  const resultsRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (screen === "results") resultsRef.current?.scrollIntoView({ block: "start" })
  }, [screen])

  function invalidateSearch() {
    searchController.current?.abort()
    searchController.current = null
    setLoading(false)
    setResults(null)
    setVisibleResults(5)
    setPositionWeek(undefined)
    setSelectedHero(null)
    setError(null)
  }

  useEffect(() => {
    return () => {
      searchController.current?.abort()
    }
  }, [])

  useEffect(() => {
    const controller = new AbortController()
    getHeroes(controller.signal)
      .then(setData)
      .catch((e) => {
        if (!isAbortError(e)) {
          setError(e instanceof Error ? e.message : "Неизвестная ошибка")
        }
      })
    return () => controller.abort()
  }, [])
  const names = data?.heroes.map((hero) => hero.name).sort() || []
  const find = async () => {
    if (!enemies.length || !data) return

    searchController.current?.abort()

    const controller = new AbortController()
    searchController.current = controller
    setLoading(true)
    setError(null)
    setResults(null)
    setScreen("results")
    try {
      const positionData = await getPositions(controller.signal)
      // STRATZ may serialize enum values differently between API versions.
      // Normalize them once before applying the selected-role filter.
      const positionRows = positionData.positions.map((row) => ({
        ...row,
        position: String(row.position).toUpperCase() as Position,
        matchCount: Number(row.matchCount) || 0,
      }))
      const responses = await Promise.all(
        enemies.map((name) => {
          const hero = data.heroes.find((item) => item.name === name)

          if (!hero) {
            throw new Error(`Герой ${name} не найден`)
          }

          return getHeroMatchups(hero.id, controller.signal)
        }),
      )
      if (controller.signal.aborted || searchController.current !== controller)
        return
      setPositionWeek(positionData.weekStart)
      const totals = new Map()
      for (const row of positionRows) {
        if (!/^POSITION_[1-5]$/.test(row.position)) continue
        const item = totals.get(row.heroId) || { total: 0, selected: 0 }
        item.total += row.matchCount || 0
        if (row.position === position) item.selected += row.matchCount || 0
        totals.set(row.heroId, item)
      }
      const eligible = data.heroes.filter((hero) => {
        const stats = totals.get(hero.id)
        return (
          !allies.includes(hero.name) &&
          (stats &&
          stats.selected >= 30 &&
          stats.selected / stats.total >= 0.15)
        )
      })
      if (!eligible.length) {
        throw new Error(`Для позиции «${position}» STRATZ не вернул подходящих героев. Попробуйте другую позицию или повторите запрос позже.`)
      }
      const stratzRecommendations = recommendFromStratz(
          eligible,
          enemies,
          responses.map((response) => response.matchups),
          data.heroes,
        )
      const localRecommendations = recommendFromKnowledge(data.heroes, enemies, position)
      const byHero = new Map<number, Recommendation>(
        stratzRecommendations.map((recommendation) => [
          recommendation.hero.id,
          { ...recommendation, expert: expertInsightFor(recommendation.hero.name, enemies) },
        ]),
      )
      for (const recommendation of localRecommendations) {
        if (!byHero.has(recommendation.hero.id)) byHero.set(recommendation.hero.id, {
          ...recommendation,
          expert: expertInsightFor(recommendation.hero.name, enemies),
        })
      }
      const recommendations = [...byHero.values()]
      setResults(recommendations)
      setVisibleResults(5)
      setScreen("results")
    } catch (error) {
      if (isAbortError(error) || controller.signal.aborted) return

      setError(error instanceof Error ? error.message : "Неизвестная ошибка")
    } finally {
      if (searchController.current === controller) {
        searchController.current = null
        setLoading(false)
      }
    }
  }
  return (
    <main>
      <Header gameVersion={data?.gameVersion?.name} />
      <Intro />
      {error && (
        <p className="hint" role="alert">
          Ошибка: {error}
        </p>
      )}
      {screen === "draft" ? (
        <DraftSetup
          position={position}
          allies={allies}
          enemies={enemies}
          names={names}
          heroes={data?.heroes ?? []}
          dataReady={Boolean(data)}
          loading={loading}
          error={error}
          onPositionChange={(nextPosition) => {
            invalidateSearch()
            setPosition(nextPosition)
          }}
          onAlliesChange={(nextAllies) => {
            invalidateSearch()
            setAllies(nextAllies)
          }}
          onEnemiesChange={(nextEnemies) => {
            invalidateSearch()
            setEnemies(nextEnemies)
          }}
          onReset={() => {
            invalidateSearch()
            setAllies([])
            setEnemies([])
            setPosition("POSITION_1")
          }}
          onFind={find}
        />
      ) : (
        <div className="results-screen" ref={resultsRef}>
        <button className="textbtn back-button" type="button" onClick={() => setScreen("draft")}>
          ← Изменить драфт
        </button>
        <p className="hint">Противники: {enemies.join(", ")} · Союзники: {allies.length ? allies.join(", ") : "не выбраны"}</p>
        {positionWeek && <p className="hint">Позиции героев: статистика за неделю с {new Date(positionWeek).toLocaleDateString("ru-RU", { timeZone: "UTC" })}.</p>}
        <RecommendationPanel>
          {loading ? (
            <div className="recommendation-skeleton" aria-live="polite" aria-label="Загружаем рекомендации">
              <p className="loading-label">Собираем матчапы и проверяем позицию…</p>
              {[1, 2, 3].map((item) => <div className="skeleton-card" key={item}><span /><span /><span /></div>)}
            </div>
          ) : results === null ? (
            <div className="empty">
              <div className="emptyicon">✳</div>
              <h3>Выбери соперников</h3>
              <p>Для расчёта нужен хотя бы один герой противника.</p>
            </div>
          ) : results.length ? (
            results.slice(0, visibleResults).map((recommendation, index) => (
              <RecommendationCard
                key={recommendation.hero.id}
                recommendation={recommendation}
                index={index}
                expanded={selectedHero === recommendation.hero.id}
                onToggle={() =>
                  setSelectedHero(
                    selectedHero === recommendation.hero.id
                      ? null
                      : recommendation.hero.id,
                  )
                }
              >
                {selectedHero === recommendation.hero.id && (
                  <ItemBuild
                    hero={recommendation.hero}
                    position={position}
                    enemies={enemies
                      .map((name) =>
                        data?.heroes.find((hero) => hero.name === name),
                      )
                      .filter((hero): hero is Hero => hero !== undefined)}
                  />
                )}
              </RecommendationCard>
            ))
          ) : (
            <div className="empty">
              <h3>Недостаточно данных</h3>
              <p>Для выбранной позиции и соперников нет подходящих матчапов.</p>
            </div>
          )}
          {results && results.length > visibleResults && (
            <button className="textbtn load-more" type="button" onClick={() => setVisibleResults((count) => count + 5)}>
              Показать ещё ({Math.min(5, results.length - visibleResults)}) ↗
            </button>
          )}
        </RecommendationPanel>
        </div>
      )}
      <Footer />
    </main>
  )
}

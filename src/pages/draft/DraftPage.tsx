import { useEffect, useRef, useState } from "react"

import type {
  HeroesResponse,
  Position,
  PositionsResponse,
} from "../../shared/api/hero-stats"

import type { Hero } from "../../shared/types/domains"

import type { Recommendation } from "../../shared/types/domains"

import {
  getHeroes,
  getHeroMatchups,
  getPositions,
} from "../../shared/api/hero-stats"
import { recommendFromStratz } from "../../features/draft/recommend"

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
  const [data, setData] = useState<(HeroesResponse & PositionsResponse) | null>(
    null,
  )
  const [error, setError] = useState<string | null>(null)
  const [allies, setAllies] = useState<string[]>([])
  const [enemies, setEnemies] = useState<string[]>([])
  const [position, setPosition] = useState<Position>("POSITION_1")
  const [results, setResults] = useState<Recommendation[] | null>(null)
  const [loading, setLoading] = useState(false)
  const [selectedHero, setSelectedHero] = useState<number | null>(null)
  const searchController = useRef<AbortController | null>(null)

  function invalidateSearch() {
    searchController.current?.abort()
    searchController.current = null
    setLoading(false)
    setResults(null)
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
    Promise.all([getHeroes(controller.signal), getPositions(controller.signal)])
      .then(([heroes, positions]) => setData({ ...heroes, ...positions }))
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
    try {
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
      const totals = new Map()
      for (const row of data.positions) {
        if (
          ![
            "POSITION_1",
            "POSITION_2",
            "POSITION_3",
            "POSITION_4",
            "POSITION_5",
          ].includes(row.position)
        )
          continue
        const item = totals.get(row.heroId) || { total: 0, selected: 0 }
        item.total += row.matchCount || 0
        if (row.position === position) item.selected += row.matchCount || 0
        totals.set(row.heroId, item)
      }
      const eligible = data.heroes.filter((hero) => {
        const stats = totals.get(hero.id)
        return (
          !allies.includes(hero.name) &&
          stats &&
          stats.selected >= 30 &&
          stats.selected / stats.total >= 0.15
        )
      })
      setResults(
        recommendFromStratz(
          eligible,
          enemies,
          responses.map((response) => response.matchups),
          data.heroes,
        ),
      )
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
      <div className="layout">
        <DraftSetup
          position={position}
          allies={allies}
          enemies={enemies}
          names={names}
          dataReady={Boolean(data)}
          loading={loading}
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
        <RecommendationPanel>
          {results === null ? (
            <div className="empty">
              <div className="emptyicon">✳</div>
              <h3>Выбери соперников</h3>
              <p>Для расчёта нужен хотя бы один герой противника.</p>
            </div>
          ) : results.length ? (
            results.map((recommendation, index) => (
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
        </RecommendationPanel>
      </div>
      <Footer />
    </main>
  )
}

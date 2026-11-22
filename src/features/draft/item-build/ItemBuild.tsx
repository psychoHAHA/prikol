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
type LocalKnowledge = (typeof knowledge.heroes)[number] & { build?: LocalBuildItem[] }

function itemImage(name: string) {
  const slug = name.toLowerCase().replace(/['вЂ™]/g, '').replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '')
  return `https://cdn.cloudflare.steamstatic.com/apps/dota2/images/dota_react/items/${slug}.png`
}

export function ItemBuild({ hero, position, enemies }: ItemBuildProps) {
  const localHero = (knowledge.heroes as unknown as LocalKnowledge[]).find((entry) => entry.hero === hero.name)
  const localItems: readonly LocalBuildItem[] = localHero?.build ?? []
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
  if (!state || "loading" in state) {
    return (
      <div className="item-loading" aria-live="polite" aria-label="Р—Р°РіСЂСѓР¶Р°РµРј РїСЂРµРґРјРµС‚С‹">
        <p className="loading-label">Р—Р°РіСЂСѓР¶Р°РµРј РїСЂРµРґРјРµС‚С‹ РґР»СЏ СЌС‚РѕР№ РїРѕР·РёС†РёРёвЂ¦</p>
        <span /><span /><span />
      </div>
    )
  }
  if ("error" in state) {
    return <p role="alert">РќРµ СѓРґР°Р»РѕСЃСЊ Р·Р°РіСЂСѓР·РёС‚СЊ РїСЂРµРґРјРµС‚С‹: {state.error}</p>
  }
  return (
    <div className="item-build">
      <p>
        <strong>РџРѕРїСѓР»СЏСЂРЅС‹Рµ РїСЂРµРґРјРµС‚С‹ РЅР° СЌС‚РѕР№ РїРѕР·РёС†РёРё</strong>
      </p>
      {state.data.items.length ? (
        <ul>
          {state.data.items.map((item) => (
            <li key={item.itemId}>
              <img className="item-icon" src={itemImage(item.name)} alt="" />
              {item.name} вЂ” {item.games} РїРѕРєСѓРїРѕРє, РїРѕР±РµРґС‹ РІ СЌС‚РёС… РјР°С‚С‡Р°С…:{" "}
              {(item.winRate * 100).toFixed(1)}%
            </li>
          ))}
        </ul>
      ) : (
        <p>РќРµРґРѕСЃС‚Р°С‚РѕС‡РЅРѕ РґР°РЅРЅС‹С… Рѕ РїРѕРєСѓРїРєР°С….</p>
      )}
      {localItems.length > 0 && <>
      <p><strong>Р›РѕРєР°Р»СЊРЅР°СЏ СЂРµРєРѕРјРµРЅРґР°С†РёСЏ СЃР±РѕСЂРєРё</strong></p>
      <ol className="local-item-build">
        {localItems.map((item: LocalBuildItem) => {
          const [name, seconds, matches, reason] = item
          return (
          <li key={name}><img className="item-icon" src={itemImage(name)} alt="" />{name} вЂ” РїСЂРёРјРµСЂРЅРѕ {Math.floor(seconds / 60)}:{String(seconds % 60).padStart(2, '0')}, РІ {matches} РёР· 5 РјР°С‚С‡РµР№</li>
          )
        })}
      </ol>
      <ul className="local-item-comments">
        {localItems.map((item: LocalBuildItem) => item[3] && <li key={item[0]}><strong>{item[0]}:</strong> {item[3]}</li>)}
      </ul>
      </>}
      <p>
        Р­С‚Рѕ С‡Р°СЃС‚С‹Рµ РїРѕРєСѓРїРєРё РїРѕ СЃС‚Р°С‚РёСЃС‚РёРєРµ STRATZ, Р° РЅРµ РіРѕС‚РѕРІС‹Р№ РїРѕСЂСЏРґРѕРє СЃР±РѕСЂРєРё.
        РЈС‡РёС‚С‹РІР°Р№ СЃРїРѕСЃРѕР±РЅРѕСЃС‚Рё РІСЂР°РіРѕРІ Рё С…РѕРґ РёРіСЂС‹; РїСЂРѕС†РµРЅС‚ РїРѕР±РµРґ РЅРµ РґРѕРєР°Р·С‹РІР°РµС‚
        СЌС„С„РµРєС‚РёРІРЅРѕСЃС‚СЊ РїСЂРµРґРјРµС‚Р°.
      </p>
      {guide && "loading" in guide && (
        <div className="guide-loading" aria-live="polite">
          <p className="loading-label">РђРЅР°Р»РёР·РёСЂСѓРµРј РїРѕРєСѓРїРєРё РїСЂРѕС‚РёРІ РІС‹Р±СЂР°РЅРЅС‹С… СЃРѕРїРµСЂРЅРёРєРѕРІвЂ¦</p>
          <span /><span />
        </div>
      )}

      {guide && "error" in guide && (
        <p role="alert">РќРµ СѓРґР°Р»РѕСЃСЊ РїСЂРѕР°РЅР°Р»РёР·РёСЂРѕРІР°С‚СЊ РјР°С‚С‡Рё: {guide.error}</p>
      )}

      {guide && "guides" in guide && guide.guides.length ? (
        <div>
          <p>
            <strong>РџРѕСЂСЏРґРѕРє РїРѕРєСѓРїРѕРє РІ РїСЂРёРјРµСЂР°С… РјР°С‚С‡РµР№</strong>
          </p>
          <p>
            РџСЂРѕР°РЅР°Р»РёР·РёСЂРѕРІР°РЅРѕ {guide.sampleSize} РёР· {guide.requestedMatches}{" "}
            РјР°С‚С‡РµР№: РІ РєР°Р¶РґРѕРј Р±С‹Р» С…РѕС‚СЏ Р±С‹ РѕРґРёРЅ РІС‹Р±СЂР°РЅРЅС‹Р№ СЃРѕРїРµСЂРЅРёРє. Р­С‚Рѕ РЅРµ
            РѕР±СЏР·Р°С‚РµР»СЊРЅРѕ РјР°С‚С‡Рё РїСЂРѕС‚РёРІ РІСЃРµРіРѕ РїРёРєР°.
          </p>
          {guide.build.length ? (
            <ol>
              {guide.build.map((item) => (
                <li key={item.itemId}>
                  <img className="item-icon" src={itemImage(item.name)} alt="" />
                  {item.name} вЂ” РїСЂРёРјРµСЂРЅРѕ {Math.floor(item.medianTime / 60)}:
                  {String(item.medianTime % 60).padStart(2, "0")}, РІ{" "}
                  {item.matches} РёР· {guide.sampleSize} РјР°С‚С‡РµР№
                </li>
              ))}
            </ol>
          ) : (
            <p>Р”Р»СЏ РїРѕСЂСЏРґРєР° РїРѕРєСѓРїРѕРє РЅРµРґРѕСЃС‚Р°С‚РѕС‡РЅРѕ РїРѕРІС‚РѕСЂСЏСЋС‰РёС…СЃСЏ РґР°РЅРЅС‹С….</p>
          )}
          <p>
            РџРѕСЂСЏРґРѕРє РѕСЃРЅРѕРІР°РЅ РЅР° РјРµРґРёР°РЅРЅРѕРј РІСЂРµРјРµРЅРё РїРѕРєСѓРїРєРё РїСЂРµРґРјРµС‚Р° РІ РЅРµР±РѕР»СЊС€РѕР№
            РІС‹Р±РѕСЂРєРµ; РєРѕРјРїРѕРЅРµРЅС‚С‹ С‚РѕР¶Рµ РјРѕРіСѓС‚ РїРѕРїР°СЃС‚СЊ РІ СЃРїРёСЃРѕРє. Р­С‚Рѕ РѕСЂРёРµРЅС‚РёСЂ, Р° РЅРµ
            РѕР±СЏР·Р°С‚РµР»СЊРЅР°СЏ СЃР±РѕСЂРєР° РёР»Рё РґРѕРєР°Р·Р°С‚РµР»СЊСЃС‚РІРѕ СЌС„С„РµРєС‚РёРІРЅРѕСЃС‚Рё РїСЂРѕС‚РёРІ
            РєРѕРЅРєСЂРµС‚РЅРѕРіРѕ РіРµСЂРѕСЏ.
          </p>
          <p>
            <strong>РџСЂРёРјРµСЂС‹ РјР°С‚С‡РµР№:</strong>
          </p>
          {guide.guides.map((item) => (
            <p key={item.againstHeroId}>
              {enemies.find((enemy) => enemy.id === item.againstHeroId)?.name}:{" "}
              {item.matchCount} РјР°С‚С‡РµР№{" "}
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
        РџРѕРґСЂРѕР±РЅРµРµ РЅР° STRATZ в†—
      </a>
    </div>
  )
}


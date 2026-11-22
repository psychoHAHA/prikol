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
  const slug = name.toLowerCase().replace(/['2"]/g, '').replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '')
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
      <div className="item-loading" aria-live="polite" aria-label="  � V!!S � � � X  W! � � X �!!9">
        <p className="loading-label">  � V!!S � � � X  W! � � X �!!9  � �! !! U   W U � Q!  Q Q2�</p>
        <span /><span /><span />
      </div>
    )
  }
  if ("error" in state) {
    return <p role="alert"> \ � !S � � � U!!
  � � V!!S � Q!!
  W! � � X �!!9: {state.error}</p>
  }
  return (
    <div className="item-build">
      <p>
        <strong> _ U W!S �!! !9 �  W! � � X �!!9   � !! U   W U � Q!  Q Q</strong>
      </p>
      {state.data.items.length ? (
        <ul>
          {state.data.items.map((item) => (
            <li key={item.itemId}>
              <img className="item-icon" src={itemImage(item.name)} alt="" />
              {item.name} 2 {item.games}  W U T!S W U T,  W U � � �!9   !! Q!&  X �!!! �!&:{" "}
              {(item.winRate * 100).toFixed(1)}%
            </li>
          ))}
        </ul>
      ) : (
        <p> \ � � U!! �! U!!  U  � �  !9!&  U  W U T!S W T �!&.</p>
      )}
      {localItems.length > 0 && <>
      <p><strong> : U T � �!
  �! ! � T U X �  � �!  Q! ! � U! T Q</strong></p>
      <ol className="local-item-build">
        {localItems.map((item: LocalBuildItem) => {
          const [name, seconds, matches, reason] = item
          return (
          <li key={name}><img className="item-icon" src={itemImage(name)} alt="" />{name} 2  W! Q X �!  U {Math.floor(seconds / 60)}:{String(seconds % 60).padStart(2, '0')},   {matches}  Q � 5  X �!!! � </li>
          )
        })}
      </ol>
      <ul className="local-item-comments">
        {localItems.map((item: LocalBuildItem) => item[3] && <li key={item[0]}><strong>{item[0]}:</strong> {item[3]}</li>)}
      </ul>
      </>}
      <p>
         �! U !! �!!!9 �  W U T!S W T Q  W U !! �! Q!! Q T � STRATZ,  �   �  V U! U !9   W U!! � U T ! � U! T Q.
         !! Q!!9  �  ! W U! U �  U!! Q  ! � V U   Q !& U �  Q V!!9;  W! U!  � !  W U � � �   �  � U T � �!9  � �!
        !!! � T! Q   U!!!
  W! � � X �! �.
      </p>
      {guide && "loading" in guide && (
        <div className="guide-loading" aria-live="polite">
          <p className="loading-label"> R  � � Q � Q!!S � X  W U T!S W T Q  W! U! Q   !9 �! �  !9!& ! U W �!  Q T U 2�</p>
          <span /><span />
        </div>
      )}

      {guide && "error" in guide && (
        <p role="alert"> \ � !S � � � U!!
  W! U �  � � Q � Q! U  �!!
  X �!!! Q: {guide.error}</p>
      )}

      {guide && "guides" in guide && guide.guides.length ? (
        <div>
          <p>
            <strong> _ U!! � U T  W U T!S W U T    W! Q X �! �!&  X �!!! � </strong>
          </p>
          <p>
             _! U �  � � Q � Q! U  �  U {guide.sampleSize}  Q � {guide.requestedMatches}{" "}
             X �!!! � :    T � � � U X  �!9 � !& U!!  �!9  U � Q   !9 �! �  !9  ! U W �!  Q T.  �! U   �
             U �! � �! � �!
  U  X �!!! Q  W! U! Q   ! � V U  W Q T �.
          </p>
          {guide.build.length ? (
            <ol>
              {guide.build.map((item) => (
                <li key={item.itemId}>
                  <img className="item-icon" src={itemImage(item.name)} alt="" />
                  {item.name} 2  W! Q X �!  U {Math.floor(item.medianTime / 60)}:
                  {String(item.medianTime % 60).padStart(2, "0")},  {" "}
                  {item.matches}  Q � {guide.sampleSize}  X �!!! � 
                </li>
              ))}
            </ol>
          ) : (
            <p>  �!  W U!! � T �  W U T!S W U T   � � U!! �! U!!  U  W U ! U!!!!0 Q!&!!  � �  !9!&.</p>
          )}
          <p>
             _ U!! � U T  U!  U  �    �  X � � Q �   U X  ! � X �  Q  W U T!S W T Q  W! � � X �! �     � � U �!
!� U 
             !9 � U! T �;  T U X W U  � !!9 ! U � �  X U V!S!  W U W �!!!
   ! W Q! U T.  �! U  U! Q � ! Q!,  �   �
             U �! � �! � �!
  �! ! � U! T �  Q � Q  � U T � � �! � �!
!!  U !!! � T! Q   U!! Q  W! U! Q 
             T U  T! �!  U V U  V �! U!.
          </p>
          <p>
            <strong> _! Q X �!!9  X �!!! � :</strong>
          </p>
          {guide.guides.map((item) => (
            <p key={item.againstHeroId}>
              {enemies.find((enemy) => enemy.id === item.againstHeroId)?.name}:{" "}
              {item.matchCount}  X �!!! � {" "}
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
         _ U �! U �  � �   � STRATZ в†—
      </a>
    </div>
  )
}


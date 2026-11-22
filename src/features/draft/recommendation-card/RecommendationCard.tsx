import type { ReactNode } from "react"

import "./recommendation-card.css"

import type { Recommendation } from "../../../shared/types/domains"

interface RecommendationCardProps {
  recommendation: Recommendation
  index: number
  expanded: boolean
  onToggle: () => void
  children?: ReactNode
}

export function RecommendationCard({
  recommendation,
  index,
  expanded,
  onToggle,
  children,
}: RecommendationCardProps) {
  const { hero, games, score, against, expert } = recommendation
  const winRate = games ? (100 * score) / games : 0

  return (
    <article className="card">
      <h3>
        <span>{String(index + 1).padStart(2, '0')}</span>
        {hero.name}
      </h3>

      <div className="card-stat" aria-label={`Рейтинг ${winRate.toFixed(1)} процентов`}>
        <strong>{winRate.toFixed(1)}%</strong>
        <span>побед в {games} матчах</span>
      </div>

      <p>
        <strong>Матчап:</strong> доля побед против выбранных соперников.
      </p>

      {expert && (
        <section className="expert-insight" aria-label="Экспертная подсказка">
          <strong>Почему этот герой</strong>
          <ul>
            {expert.reasons.map((reason) => <li key={reason}>{reason}</li>)}
          </ul>
          {expert.items.length > 0 && (
            <p><strong>Предметы:</strong> {expert.items.map((item) => `${item.item} — ${item.reason}`).join("; ")}</p>
          )}
          {expert.tips.length > 0 && <p><strong>Советы:</strong> {expert.tips.join(" ")}</p>}
          <small>Источник: {expert.source}</small>
        </section>
      )}

      <p>
        <strong>Против:</strong>{" "}
        {against
          .map((item) => `${item.name} — ${(100 * item.winRate).toFixed(1)}%`)
          .join("; ")}
        .
      </p>

      <button className="textbtn item-button" type="button" onClick={onToggle}>
        {expanded ? "Скрыть предметы" : "Посмотреть предметы"} ↗
      </button>

      {children}
    </article>
  )
}




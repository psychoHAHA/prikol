import type { ReactNode } from "react"

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
  const { hero, games, score, against } = recommendation
  const winRate = games ? (100 * score) / games : 0

  return (
    <article className="card">
      <h3>
        <span>{String(index + 1).padStart(2, '0')}</span>
        {hero.name}
      </h3>

      <p>
        <strong>Матчап:</strong> доля побед против выбранных соперников{" "}
        {winRate.toFixed(1)}% ({games} игр).
      </p>

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

import type { ReactNode } from "react"

interface RecommendationPanelProps {
  children: ReactNode
}

export function RecommendationPanel({
  children,
}: RecommendationPanelProps) {
  return (
    <section className="results">
      <div className="panelhead">
        <div>
          <span className="step">02 / STRATZ</span>
          <h2>Рекомендации</h2>
        </div>
      </div>

      {children}
    </section>
  )
}
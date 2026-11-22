import type { Position } from "../../shared/api/hero-stats"
import type { Hero } from "../../shared/types/domains"
import { TeamPicker } from "../../features/draft/team-picker/TeamPicker"
import "./draft-setup.css"

interface DraftSetupProps {
  position: Position
  allies: string[]
  enemies: string[]
  names: string[]
  heroes: Hero[]
  dataReady: boolean
  loading: boolean
  error: string | null
  onPositionChange: (position: Position) => void
  onAlliesChange: (names: string[]) => void
  onEnemiesChange: (names: string[]) => void
  onReset: () => void
  onFind: () => void
}

export function DraftSetup({
  position,
  allies,
  enemies,
  names,
  heroes,
  dataReady,
  loading,
  error,
  onPositionChange,
  onAlliesChange,
  onEnemiesChange,
  onReset,
  onFind,
}: DraftSetupProps) {
  return (
    <section className="panel draft-setup">
      <div className="panelhead">
        <div>
          <span className="step">01 / ДРАФТ</span>
          <h2>Расскажи о матче</h2>
        </div>

        <button className="textbtn" type="button" onClick={onReset}>
          Очистить ↗
        </button>
      </div>
      <label htmlFor="position">ТВОЯ ПОЗИЦИЯ</label>
      <select
        id="position"
        value={position}
        onChange={(event) => onPositionChange(event.target.value as Position)}
      >
        <option value="POSITION_1">1 · Керри</option>
        <option value="POSITION_2">2 · Мидер</option>
        <option value="POSITION_3">3 · Оффлейнер</option>
        <option value="POSITION_4">4 · Частичная поддержка</option>
        <option value="POSITION_5">5 · Полная поддержка</option>
      </select>
      <div className="teams">
        <TeamPicker
          title="ПРОТИВНИКИ"
          selected={allies}
          other={enemies}
          names={names}
          heroes={heroes}
          limit={4}
          onChange={onAlliesChange}
        />

        <TeamPicker
          title="ПРОТИВНИКИ"
          selected={enemies}
          other={allies}
          names={names}
          heroes={heroes}
          limit={5}
          onChange={onEnemiesChange}
          enemy
        />
      </div>
  
      {enemies.length > 0 && (
        <div className="draft-action">
          {error && <p className="draft-action__error" role="alert">{error}</p>}
          <button
            className="draft-action__button"
            type="button"
            onClick={onFind}
            disabled={!dataReady || loading}
          >
            {loading ? "Загружаем статистику…" : "Найти контрпики"}
            <span aria-hidden="true"> ↗</span>
          </button>
        </div>
      )}
    </section>
  )
}

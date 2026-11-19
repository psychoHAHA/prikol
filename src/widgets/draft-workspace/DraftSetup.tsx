import type { Position } from "../../shared/api/hero-stats"
import { TeamPicker } from "../../features/draft/team-picker/TeamPicker"

interface DraftSetupProps {
  position: Position
  allies: string[]
  enemies: string[]
  names: string[]
  dataReady: boolean
  loading: boolean
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
  dataReady,
  loading,
  onPositionChange,
  onAlliesChange,
  onEnemiesChange,
  onReset,
  onFind,
}: DraftSetupProps) {
  return (
    <section className="panel">
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
          title="СОЮЗНИКИ"
          selected={allies}
          other={enemies}
          names={names}
          limit={4}
          onChange={onAlliesChange}
        />

        <TeamPicker
          title="ПРОТИВНИКИ"
          selected={enemies}
          other={allies}
          names={names}
          limit={5}
          onChange={onEnemiesChange}
          enemy
        />
      </div>
  
      <button
        className="primary"
        type="button"
        onClick={onFind}
        disabled={!dataReady || !enemies.length || loading}
      >
        {loading ? "Загружаем статистику…" : "Найти контрпики"}
        <span>↗</span>
      </button>
      <p className="hint">После изменения драфта нажми кнопку снова.</p>
    </section>
  )
}

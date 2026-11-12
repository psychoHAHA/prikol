import { useEffect, useRef, useState } from 'react'
import {
  getHeroes,
  getHeroMatchups,
  getPositions,
  getHeroItems,
  getHeroGuide,
} from '../../shared/api/hero-stats.js'
import { recommendFromStratz } from '../../features/draft/recommend.js'

function ItemBuild({ hero, position, enemies }) {
  const enemyIds = enemies.map(enemy => enemy.id)
  const [state, setState] = useState(null)
  const [guide, setGuide] = useState(null)
  useEffect(() => {
    const controller = new AbortController()
    setState({ loading: true })
    getHeroItems(hero.id, position, controller.signal)
      .then(data => setState({ data }))
      .catch(error => { if (error.name !== 'AbortError') setState({ error: error.message }) })
    return () => controller.abort()
  }, [hero.id, position])
  useEffect(() => { const controller = new AbortController(); setGuide({ loading: true }); getHeroGuide(hero.id, enemyIds, position, controller.signal).then(setGuide).catch(error => { if (error.name !== 'AbortError') setGuide({ error: error.message }) }); return () => controller.abort() }, [hero.id, position, enemyIds.join(',')])
  if (state?.loading || !state) return <p>Загружаем предметы…</p>
  if (state.error) return <p role="alert">Не удалось загрузить предметы: {state.error}</p>
  return <div className="item-build">
    <p><strong>Популярные предметы на этой позиции</strong></p>
    {state.data.items.length ? <ul>{state.data.items.map(item => <li key={item.itemId}>{item.name} — {item.games} покупок, победы в этих матчах: {(item.winRate * 100).toFixed(1)}%</li>)}</ul> : <p>Недостаточно данных о покупках.</p>}
    <p>Это частые покупки по статистике STRATZ, а не готовый порядок сборки. Учитывай способности врагов и ход игры; процент побед не доказывает эффективность предмета.</p>
    {guide?.loading && <p>Анализируем покупки в матчах против соперников…</p>}
    {guide?.error && <p role="alert">Не удалось проанализировать матчи: {guide.error}</p>}
    {guide?.guides?.length ? <div><p><strong>Порядок покупок в примерах матчей</strong></p><p>Проанализировано {guide.sampleSize} из {guide.requestedMatches} матчей: в каждом был хотя бы один выбранный соперник. Это не обязательно матчи против всего пика.</p>{guide.build.length ? <ol>{guide.build.map(item => <li key={item.itemId}>{item.name} — примерно {Math.floor(item.medianTime / 60)}:{String(item.medianTime % 60).padStart(2, '0')}, в {item.matches} из {guide.sampleSize} матчей</li>)}</ol> : <p>Для порядка покупок недостаточно повторяющихся данных.</p>}<p>Порядок основан на медианном времени покупки предмета в небольшой выборке; компоненты тоже могут попасть в список. Это ориентир, а не обязательная сборка или доказательство эффективности против конкретного героя.</p><p><strong>Примеры матчей:</strong></p>{guide.guides.map(item => <p key={item.againstHeroId}>{enemies.find(enemy => enemy.id === item.againstHeroId)?.name}: {item.matchCount} матчей {item.matchIds.slice(0, 3).map(id => <a key={id} href={`https://stratz.com/matches/${id}`} target="_blank" rel="noreferrer"> #{id}</a>)}</p>)}</div> : null}
    <a href={`https://stratz.com/heroes/${hero.id}`} target="_blank" rel="noreferrer">Подробнее на STRATZ ↗</a>
  </div>
}

function Team({ title, selected, other, names, limit, onChange, enemy }) {
  const [search, setSearch] = useState('')
  const [open, setOpen] = useState(false)
  const root = useRef(null)
  useEffect(() => {
    function close(event) {
      if (!root.current?.contains(event.target)) setOpen(false)
    }
    document.addEventListener('pointerdown', close)
    return () => document.removeEventListener('pointerdown', close)
  }, [])
  const options = names.filter(
    (name) =>
      !selected.includes(name) &&
      !other.includes(name) &&
      name.toLowerCase().includes(search.trim().toLowerCase()),
  )
  return (
    <div>
      <label>
        {title}{' '}
        <span>
          {selected.length} / {limit}
        </span>
      </label>
      <div className="slots">
        {selected.length ? (
          selected.map((name) => (
            <button
              key={name}
              className={'chip ' + (enemy ? 'enemy' : '')}
              onClick={() => onChange(selected.filter((item) => item !== name))}
              aria-label={'Удалить ' + name}
            >
              {name} ×
            </button>
          ))
        ) : (
          <span className="placeholder">Пока никого</span>
        )}
      </div>
      <div className="hero-search" ref={root}>
        <input
          aria-label={'Поиск героя: ' + title}
          aria-expanded={open}
          aria-controls={enemy ? 'enemy-options' : 'ally-options'}
          role="combobox"
          autoComplete="off"
          placeholder="Поиск героя..."
          value={search}
          disabled={selected.length >= limit || !names.length}
          onFocus={() => setOpen(true)}
          onChange={(event) => {
            setSearch(event.target.value)
            setOpen(true)
          }}
          onKeyDown={(event) => {
            if (event.key === 'Escape') setOpen(false)
            if (event.key === 'Enter' && open && options.length) {
              event.preventDefault()
              onChange([...selected, options[0]])
              setSearch('')
              setOpen(false)
            }
          }}
        />
        {open && (
          <div
            className="hero-options"
            id={enemy ? 'enemy-options' : 'ally-options'}
          >
            {options.length ? (
              options.map((name) => (
                <button
                  key={name}
                  type="button"
                  onClick={() => {
                    onChange([...selected, name])
                    setSearch('')
                    setOpen(false)
                  }}
                >
                  {name}
                </button>
              ))
            ) : (
              <span>Герой не найден</span>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

export function DraftPage() {
  const [data, setData] = useState(null),
    [error, setError] = useState(null),
    [allies, setAllies] = useState([]),
    [enemies, setEnemies] = useState([]),
    [position, setPosition] = useState('POSITION_1'),
    [results, setResults] = useState(null),
    [loading, setLoading] = useState(false)
  const [selectedHero, setSelectedHero] = useState(null)
  useEffect(() => {
    const controller = new AbortController()
    Promise.all([getHeroes(controller.signal), getPositions(controller.signal)])
      .then(([heroes, positions]) => setData({ ...heroes, ...positions }))
      .catch((e) => {
        if (e.name !== 'AbortError') setError(e.message)
      })
    return () => controller.abort()
  }, [])
  const names = data?.heroes.map((hero) => hero.name).sort() || []
  const find = async () => {
    if (!enemies.length || !data) return
    setLoading(true)
    setError(null)
    setResults(null)
    try {
      const responses = await Promise.all(
        enemies.map((name) =>
          getHeroMatchups(data.heroes.find((hero) => hero.name === name).id),
        ),
      )
      const totals = new Map()
      for (const row of data.positions) {
        if (
          ![
            'POSITION_1',
            'POSITION_2',
            'POSITION_3',
            'POSITION_4',
            'POSITION_5',
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
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }
  return (
    <main>
      <header>
        <span className="brand">
          ◈ DRAFT LAB <small>/ DOTA 2</small>
        </span>
        <span className="badge">
          STRATZ · {data?.gameVersion?.name || 'ЗАГРУЗКА'}
        </span>
      </header>
      <section className="intro">
        <p className="eyebrow">ТВОЙ СЛЕДУЮЩИЙ ПИК</p>
        <h1>
          Собери драфт.
          <br />
          <em>Найди ответ.</em>
        </h1>
        <p>
          Выбери позицию и соперников — статистика STRATZ поможет найти героя.
        </p>
      </section>
      {error && (
        <p className="hint" role="alert">
          Ошибка: {error}
        </p>
      )}
      <div className="layout">
        <section className="panel">
          <div className="panelhead">
            <div>
              <span className="step">01 / ДРАФТ</span>
              <h2>Расскажи о матче</h2>
            </div>
            <button
              className="textbtn"
              onClick={() => {
                setAllies([])
                setEnemies([])
                setResults(null)
                setPosition('POSITION_1')
              }}
            >
              Очистить ↗
            </button>
          </div>
          <label htmlFor="position">ТВОЯ ПОЗИЦИЯ</label>
          <select
            id="position"
            value={position}
            onChange={(e) => {
              setPosition(e.target.value)
              setResults(null)
            }}
          >
            <option value="POSITION_1">1 · Керри</option>
            <option value="POSITION_2">2 · Мидер</option>
            <option value="POSITION_3">3 · Оффлейнер</option>
            <option value="POSITION_4">4 · Частичная поддержка</option>
            <option value="POSITION_5">5 · Полная поддержка</option>
          </select>
          <div className="teams">
            <Team
              title="СОЮЗНИКИ"
              selected={allies}
              other={enemies}
              names={names}
              limit={4}
              onChange={setAllies}
            />
            <Team
              title="ПРОТИВНИКИ"
              selected={enemies}
              other={allies}
              names={names}
              limit={5}
              onChange={setEnemies}
              enemy
            />
          </div>
          <button
            className="primary"
            onClick={find}
            disabled={!data || !enemies.length || loading}
          >
            {loading ? 'Загружаем статистику…' : 'Найти контрпики'}{' '}
            <span>↗</span>
          </button>
          <p className="hint">После изменения драфта нажми кнопку снова.</p>
        </section>
        <section className="results">
          <div className="panelhead">
            <div>
              <span className="step">02 / STRATZ</span>
              <h2>Рекомендации</h2>
            </div>
          </div>
          {results === null ? (
            <div className="empty">
              <div className="emptyicon">✳</div>
              <h3>Выбери соперников</h3>
              <p>Для расчёта нужен хотя бы один герой противника.</p>
            </div>
          ) : results.length ? (
            results.map((r, i) => (
              <article className="card" key={r.hero.id}>
                <h3>
                  <span>0{i + 1}</span>
                  {r.hero.name}
                </h3>
                <p>
                  <strong>Матчап:</strong> доля побед против выбранных
                  соперников {((100 * r.score) / r.games).toFixed(1)}% (
                  {r.games} игр).
                </p>
                <p>
                  <strong>Против:</strong>{' '}
                  {r.against
                    .map((x) => `${x.name} — ${(100 * x.winRate).toFixed(1)}%`)
                    .join('; ')}
                  .
                </p>
                <button className="textbtn item-button" onClick={() => setSelectedHero(selectedHero === r.hero.id ? null : r.hero.id)}>{selectedHero === r.hero.id ? 'Скрыть предметы' : 'Посмотреть предметы'} ↗</button>
                {selectedHero === r.hero.id && <ItemBuild hero={r.hero} position={position} enemies={enemies.map(name => data.heroes.find(hero => hero.name === name)).filter(Boolean)} />}
              </article>
            ))
          ) : (
            <div className="empty">
              <h3>Недостаточно данных</h3>
              <p>Для выбранной позиции и соперников нет подходящих матчапов.</p>
            </div>
          )}
        </section>
      </div>
      <footer>
        <div>
          <strong>Данные STRATZ, без предметов.</strong>
          <p>
            Для позиции учитываются герои с не менее 30 матчами и долей этой
            позиции от 15% игр героя. Матчапы охватывают все позиции; статистика
            не предсказывает исход отдельной игры.
          </p>
        </div>
        <div className="sources">
          ИСТОЧНИК
          <a href="https://stratz.com/" target="_blank" rel="noreferrer">
            STRATZ ↗
          </a>
        </div>
      </footer>
    </main>
  )
}

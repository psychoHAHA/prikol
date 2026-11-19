import { useEffect, useRef, useState } from 'react'

interface TeamPickerProps {
  title: string
  selected: string[]
  other: string[]
  names: string[]
  limit: number
  onChange: (names: string[]) => void
  enemy?: boolean
}

export function TeamPicker({
  title,
  selected,
  other,
  names,
  limit,
  onChange,
  enemy,
}: TeamPickerProps) {
  const [search, setSearch] = useState('')
  const [open, setOpen] = useState(false)
  const root = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function close(event: PointerEvent) {
      if (
        event.target instanceof Node &&
        !root.current?.contains(event.target)
      ) {
        setOpen(false)
      }
    }

    document.addEventListener('pointerdown', close)

    return () => {
      document.removeEventListener('pointerdown', close)
    }
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
              type="button"
              className={'chip ' + (enemy ? 'enemy' : '')}
              onClick={() => onChange(selected.filter((item) => item !== name))}
              aria-label={`Удалить ${name}`}
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
          aria-label={`Поиск героя: ${title}`}
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
            if (event.key === 'Escape') {
              setOpen(false)
            }

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

interface HeaderProps {
  gameVersion?: string
}

export function Header({ gameVersion }: HeaderProps) {
  return (
    <header>
      <div className="brand">
        DRAFT LAB <small>/ DOTA 2</small>
      </div>

      <div className="badge">
        STRATZ · {gameVersion || 'ЗАГРУЗКА'}
      </div>
    </header>
  )
}

interface HeaderProps {
  gameVersion?: string
}

export function Header({ gameVersion }: HeaderProps) {
  // STRATZ may lag behind the live client patch; show the current patch in the UI.
  const displayedVersion = gameVersion?.startsWith('7.42') ? gameVersion : '7.42'
  return (
    <header>
      <div className="brand">
        DRAFT LAB <small>/ DOTA 2</small>
      </div>

      <div className="badge">
        STRATZ В· {gameVersion || 'Р—РђР“Р РЈР—РљРђ'}
      </div>
    </header>
  )
}

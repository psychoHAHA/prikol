import { createRoot } from 'react-dom/client'
import { DraftPage } from '../pages/draft/DraftPage'
import './styles.css'

const rootElement = document.getElementById('root')

if (!rootElement) {
  throw new Error('Элемент #root не найден')
}

createRoot(rootElement).render(<DraftPage />)

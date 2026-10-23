import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { startSync } from './utils/syncClient'
import { unlockAudio } from './utils/sound'

startSync()

// Safari (and most browsers to some degree) won't let a timer-driven sound
// (a pomodoro/break finishing on its own) actually play unless the shared
// AudioContext was already resumed from inside a real user gesture — so
// unlock it on the very first interaction with the page, whatever it is.
window.addEventListener('pointerdown', unlockAudio, { once: true });

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)

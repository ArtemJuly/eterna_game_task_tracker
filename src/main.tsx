import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { startSync } from './utils/syncClient'
import { unlockAudio } from './utils/sound'

startSync()

// Safari (and most browsers to some degree) won't let a timer-driven sound (a
// pomodoro/break finishing on its own) actually play unless each <audio>
// element was already primed from inside a real user gesture. Once primed,
// an element stays unlocked for the rest of the page's lifetime, so this only
// needs to run once — re-arming on every click/tab switch just produced an
// audible blip each time with no benefit.
window.addEventListener('pointerdown', unlockAudio, { once: true });

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)

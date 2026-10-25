import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { startSync } from './utils/syncClient'
import { unlockAudio } from './utils/sound'

startSync()

// Safari (and most browsers to some degree) won't let a timer-driven sound (a
// pomodoro/break finishing on its own) actually play unless the shared
// AudioContext was already resumed from inside a real user gesture. It can
// also get re-suspended after the tab sits backgrounded for a while — exactly
// what happens during a 25-minute focus timer — so re-arm on every click
// (cheap: a no-op once already running) and whenever the tab regains focus,
// not just once on page load.
window.addEventListener('pointerdown', unlockAudio);
document.addEventListener('visibilitychange', () => {
  if (!document.hidden) unlockAudio();
});

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)

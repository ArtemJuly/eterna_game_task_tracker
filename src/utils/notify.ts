// Audio alone is fragile for a 25-minute timer: by the time it fires the Safari
// tab is very likely backgrounded (the whole point of a focus timer is to work
// on something else), and background-tab audio is exactly what browsers are
// strictest about. A system notification survives that — it shows (and on most
// OSes plays its own sound) even when the tab isn't focused.
export function requestNotificationPermission(): void {
  if (!('Notification' in window)) return;
  if (Notification.permission === 'default') {
    Notification.requestPermission().catch(() => {});
  }
}

export function notify(title: string, body: string): void {
  if (!('Notification' in window)) return;
  if (Notification.permission !== 'granted') return;
  try {
    new Notification(title, { body });
  } catch {
    // Notifications unsupported/unavailable in this environment — ignore.
  }
}

export function syncAppBadge(count) {
  if (!navigator.setAppBadge) return
  if (count > 0) {
    navigator.setAppBadge(count).catch(() => {})
  } else {
    navigator.clearAppBadge?.().catch(() => {})
  }
}

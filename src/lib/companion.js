import { getCompanionDeviceId } from './storage'
import { randomCompanionLine } from './games'

const TIMEOUT_MS = 6000
const DIG_DEEPER_TIMEOUT_MS = 18000

export async function sendCompanionMessage(lang, message, context) {
  const deviceId = getCompanionDeviceId()
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS)
  try {
    const res = await fetch('/api/companion-chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ deviceId, lang, message, context }),
      signal: controller.signal,
    })
    if (!res.ok) return null
    const data = await res.json()
    return data.reply ?? null
  } catch {
    return null
  } finally {
    clearTimeout(timeout)
  }
}

// Shows a scripted line immediately (felt right away), then upgrades to
// the real companion reply if it arrives before the caller moves on.
export function reactCompanion(setLine, lang, context, fallbackLines) {
  setLine(randomCompanionLine(fallbackLines))
  sendCompanionMessage(lang, null, context).then((reply) => {
    if (reply) setLine(reply)
  })
}

export async function getDigDeeperSuggestions(lang, nodeText, nodeType) {
  const deviceId = getCompanionDeviceId()
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), DIG_DEEPER_TIMEOUT_MS)
  try {
    const res = await fetch('/api/companion-chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        deviceId,
        lang,
        message: null,
        context: { type: 'explore_dig_deeper', node_text: nodeText, node_type: nodeType, lang },
      }),
      signal: controller.signal,
    })
    if (!res.ok) return []
    const data = await res.json()
    return Array.isArray(data.suggestions) ? data.suggestions : []
  } catch {
    return []
  } finally {
    clearTimeout(timeout)
  }
}

export async function deleteCompanionConversation(lang) {
  const deviceId = getCompanionDeviceId()
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS)
  try {
    const res = await fetch('/api/companion-chat', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ deviceId, lang }),
      signal: controller.signal,
    })
    return res.ok
  } catch {
    return false
  } finally {
    clearTimeout(timeout)
  }
}

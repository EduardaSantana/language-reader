import { useState } from 'react'
import { langMeta } from '../lib/langs'
import { sendCompanionMessage, deleteCompanionConversation } from '../lib/companion'

export default function CompanionOverlay({ langs }) {
  const [open, setOpen] = useState(false)
  const [lang, setLang] = useState(langs[0])
  const [messagesByLang, setMessagesByLang] = useState({})
  const [input, setInput] = useState('')
  const [sending, setSending] = useState(false)
  const [confirmingDelete, setConfirmingDelete] = useState(false)

  const messages = messagesByLang[lang] ?? []

  function appendMessage(forLang, message) {
    setMessagesByLang((prev) => ({ ...prev, [forLang]: [...(prev[forLang] ?? []), message] }))
  }

  async function handleSend() {
    const text = input.trim()
    if (!text || sending) return
    appendMessage(lang, { role: 'user', content: text })
    setInput('')
    setSending(true)
    const reply = await sendCompanionMessage(lang, text, { type: 'direct_message', text })
    appendMessage(lang, {
      role: 'companion',
      content: reply ?? "Can't reach the companion right now — try again in a bit.",
    })
    setSending(false)
  }

  function handleDeleteConversation() {
    setMessagesByLang((prev) => ({ ...prev, [lang]: [] }))
    setConfirmingDelete(false)
    deleteCompanionConversation(lang)
  }

  return (
    <>
      <button className="companion-fab" onClick={() => setOpen(true)} aria-label="Open companion chat">
        💬
      </button>

      {open && (
        <div className="modal-backdrop companion-overlay-backdrop" onClick={() => setOpen(false)}>
          <div className="modal companion-overlay" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Companion</h2>
              <div className="companion-overlay-header-actions">
                <button
                  className="icon-button"
                  onClick={() => setConfirmingDelete(true)}
                  aria-label="Delete conversation"
                  disabled={sending}
                >
                  🗑
                </button>
                <button className="icon-button" onClick={() => setOpen(false)} aria-label="Close">
                  ✕
                </button>
              </div>
            </div>

            <div className="game-lang-select">
              {langs.map((l) => (
                <button
                  key={l}
                  className={`level-pill-button ${lang === l ? 'active' : ''}`}
                  onClick={() => setLang(l)}
                >
                  {langMeta(l).avatar} {langMeta(l).label}
                </button>
              ))}
            </div>

            <div className="companion-chat-log">
              {messages.length === 0 && (
                <p className="favorites-empty">Say hi — your {langMeta(lang).label} study buddy is listening.</p>
              )}
              {messages.map((m, i) => (
                <div key={i} className={`companion-chat-bubble companion-chat-${m.role}`}>
                  {m.content}
                </div>
              ))}
              {sending && <div className="companion-chat-bubble companion-chat-companion companion-typing">…</div>}
            </div>

            <div className="companion-chat-input-row">
              <input
                className="search-input companion-chat-input"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                placeholder="Say something…"
              />
              <button className="save-word-button" onClick={handleSend} disabled={sending || !input.trim()}>
                Send
              </button>
            </div>
          </div>
        </div>
      )}

      {confirmingDelete && (
        <div className="modal-backdrop" onClick={() => setConfirmingDelete(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Delete this conversation?</h2>
            </div>
            <p>Clears your {langMeta(lang).label} companion history. This can't be undone.</p>
            <div className="modal-actions">
              <button className="icon-button" onClick={() => setConfirmingDelete(false)}>
                Cancel
              </button>
              <button className="delete-progress-confirm-button" onClick={handleDeleteConversation}>
                Delete conversation
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

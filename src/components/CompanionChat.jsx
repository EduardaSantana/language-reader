import { useState } from 'react'
import { langMeta } from '../lib/langs'
import { sendCompanionMessage } from '../lib/companion'

export default function CompanionChat({ langs }) {
  const [lang, setLang] = useState(langs[0])
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [sending, setSending] = useState(false)

  async function handleSend() {
    const text = input.trim()
    if (!text || sending) return
    setMessages((prev) => [...prev, { role: 'user', content: text }])
    setInput('')
    setSending(true)
    const reply = await sendCompanionMessage(lang, text, { type: 'direct_message', text })
    setMessages((prev) => [
      ...prev,
      { role: 'companion', content: reply ?? "Can't reach the companion right now — try again in a bit." },
    ])
    setSending(false)
  }

  return (
    <div className="companion-chat">
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
  )
}

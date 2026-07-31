import { neon } from '@neondatabase/serverless'

const GEMINI_MODEL = 'gemini-flash-latest'
const HISTORY_LIMIT = 20

const BASE_PROMPT = `You are {{name}}, a study buddy inside Language Reader — an app for
reading graded {{language}} stories, saving words, and playing small
vocab games. You are not a teacher and not a mascot. You react like a
friend who's genuinely into {{language}} alongside the person you're
talking to.

Ground rules:
- Keep reactions to games and story-completions SHORT — one sentence,
  sometimes two. This is a quick reaction, not an essay.
- In the dedicated chat space (Profile), you can be more conversational,
  but stay warm and brief by default — let the person set the pace.
- Never scold, correct harshly, or use guilt language. A wrong game
  answer gets the same warmth as a right one — react to the attempt,
  not the result. No "you should have known that," no sighing, no
  disappointment.
- Reference the SPECIFIC word, sentence, or story you were given in
  context — never a generic "good job!" Specificity is what makes a
  reaction feel real instead of scripted.
- No unsolicited quizzes, drills, or "let's practice X now" — you react
  to what's happening, you don't initiate lessons.
- Text only. No offers to read something aloud or describe audio/sound.
- Sentence case, plain and warm, contractions are fine. Not corporate,
  not overly cutesy.

You'll receive a message describing what just happened (a game answer,
a finished story, or a direct message). Use it, don't ignore it.`

const LANG_FLAVOR = {
  ja: { name: 'Mochi', language: 'Japanese' },
  de: { name: 'Anke', language: 'German' },
}

function systemPromptFor(lang) {
  const flavor = LANG_FLAVOR[lang] ?? { name: 'Sam', language: lang }
  return BASE_PROMPT.replaceAll('{{name}}', flavor.name).replaceAll('{{language}}', flavor.language)
}

function contextToUserTurn(message, context) {
  if (message) return message
  if (!context) return 'Just checking in.'
  switch (context.type) {
    case 'game_answer':
      return context.correct
        ? `I just answered a vocab game round correctly: "${context.word}" means "${context.english}".`
        : `I just answered a vocab game round wrong. The word was "${context.word}" ("${context.english}").`
    case 'story_finished':
      return `I just finished reading the story "${context.title_en}".`
    case 'direct_message':
      return context.text
    default:
      return 'Just checking in.'
  }
}

async function ensureSchema(sql) {
  await sql`create extension if not exists pgcrypto`
  await sql`
    create table if not exists companion_sessions (
      id uuid primary key default gen_random_uuid(),
      device_id text not null,
      lang text not null,
      created_at timestamptz default now()
    )
  `
  await sql`
    create table if not exists companion_messages (
      id uuid primary key default gen_random_uuid(),
      session_id uuid references companion_sessions(id),
      role text not null,
      content text not null,
      context jsonb,
      created_at timestamptz default now()
    )
  `
}

async function getOrCreateSession(sql, deviceId, lang) {
  const existing = await sql`
    select id from companion_sessions where device_id = ${deviceId} and lang = ${lang} limit 1
  `
  if (existing.length > 0) return existing[0].id
  const created = await sql`
    insert into companion_sessions (device_id, lang) values (${deviceId}, ${lang}) returning id
  `
  return created[0].id
}

async function callGemini(apiKey, systemPrompt, history, userTurn) {
  const contents = [
    ...history.map((m) => ({ role: m.role === 'companion' ? 'model' : 'user', parts: [{ text: m.content }] })),
    { role: 'user', parts: [{ text: userTurn }] },
  ]
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: systemPrompt }] },
        contents,
        generationConfig: { maxOutputTokens: 200, temperature: 0.9 },
      }),
    },
  )
  if (!res.ok) throw new Error(`Gemini error ${res.status}`)
  const data = await res.json()
  const text = data.candidates?.[0]?.content?.parts?.map((p) => p.text).join('') ?? null
  if (!text) throw new Error('Empty Gemini response')
  return text.trim()
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' })
    return
  }

  const { deviceId, lang, message, context } = req.body ?? {}
  if (!deviceId || !lang) {
    res.status(400).json({ error: 'deviceId and lang are required' })
    return
  }

  if (!process.env.DATABASE_URL || !process.env.GEMINI_API_KEY) {
    res.status(503).json({ error: 'Companion backend not configured' })
    return
  }

  try {
    const sql = neon(process.env.DATABASE_URL)
    await ensureSchema(sql)
    const sessionId = await getOrCreateSession(sql, deviceId, lang)

    const historyRows = await sql`
      select role, content from companion_messages
      where session_id = ${sessionId}
      order by created_at desc
      limit ${HISTORY_LIMIT}
    `
    const history = historyRows.reverse()

    const userTurn = contextToUserTurn(message, context)
    const reply = await callGemini(process.env.GEMINI_API_KEY, systemPromptFor(lang), history, userTurn)

    await sql`
      insert into companion_messages (session_id, role, content, context)
      values (${sessionId}, 'user', ${userTurn}, ${context ? JSON.stringify(context) : null})
    `
    await sql`
      insert into companion_messages (session_id, role, content, context)
      values (${sessionId}, 'companion', ${reply}, null)
    `

    res.status(200).json({ reply })
  } catch (err) {
    res.status(500).json({ error: err.message ?? 'Companion request failed' })
  }
}

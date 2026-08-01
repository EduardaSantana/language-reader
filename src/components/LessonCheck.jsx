import { useMemo, useState } from 'react'
import { tokenizeWords } from '../lib/tokenize'
import { shuffle } from '../lib/games'

/** Builds a quick fill-in-the-blank from a lesson's own example sentence —
 * only shown for lessons with no related_game_id (see CurriculumScreen),
 * so every lesson gets exactly one practice affordance, never zero or two. */
function buildRound(node, dictionary) {
  const native = node.examples?.[0]?.native
  if (!native) return null

  const tokens = tokenizeWords(native).filter((t) => t.isWord)
  if (tokens.length === 0) return null

  const blank = tokens.reduce((longest, t) => (t.text.length > longest.text.length ? t : longest), tokens[0])

  const distractorPool = dictionary
    .map((e) => e.word)
    .filter((word) => word.toLowerCase() !== blank.text.toLowerCase())
  const distractors = shuffle(distractorPool).slice(0, 3)
  if (distractors.length === 0) return null

  const sentence = native.replace(blank.text, '▁▁▁')
  const choices = shuffle([blank.text, ...distractors])
  return { sentence, answer: blank.text, choices }
}

export default function LessonCheck({ node, dictionary }) {
  const round = useMemo(() => buildRound(node, dictionary), [node, dictionary])
  const [picked, setPicked] = useState(null)

  if (!round) return null

  function handlePick(choice) {
    if (picked) return
    setPicked(choice)
  }

  return (
    <div className="lesson-check">
      <div className="lesson-check-label">Quick check</div>
      <p className="lesson-check-sentence" lang={node.lang}>
        {round.sentence}
      </p>
      <div className="game-choices">
        {round.choices.map((choice) => {
          const isPicked = picked === choice
          const isAnswer = choice === round.answer
          let cls = 'game-choice-button'
          if (picked && isAnswer) cls += ' game-choice-correct'
          else if (picked && isPicked) cls += ' game-choice-wrong'
          return (
            <button key={choice} className={cls} disabled={!!picked} onClick={() => handlePick(choice)} lang={node.lang}>
              {choice}
            </button>
          )
        })}
      </div>
    </div>
  )
}

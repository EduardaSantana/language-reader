function firstSentenceText(story) {
  return story.sentences[0]?.map((seg) => seg.text).join('') ?? ''
}

export function buildExploreGraph(stories, grammarPoints) {
  const jaStories = stories.filter((s) => s.lang === 'ja')

  const vocabFirstSeen = new Map()
  for (const story of jaStories) {
    for (const v of story.vocab) {
      if (!vocabFirstSeen.has(v.word)) vocabFirstSeen.set(v.word, { ...v, story })
    }
  }

  const grammarByPattern = new Map(grammarPoints.map((g) => [g.pattern, g]))

  function grammarPatternsForRawIndex(rawIndex) {
    return grammarPoints
      .filter((g) => g.examples.some((ex) => ex.story_index === rawIndex))
      .map((g) => g.pattern)
  }

  function vocabWordsMentionedIn(sentence) {
    const found = []
    for (const word of vocabFirstSeen.keys()) {
      if (sentence.includes(word)) found.push(word)
      if (found.length >= 10) break
    }
    return found
  }

  function getVocabNode(word) {
    const entry = vocabFirstSeen.get(word)
    if (!entry) return null
    const { story } = entry
    const related = []
    for (const v of story.vocab) {
      if (v.word !== word) related.push({ type: 'vocab', key: v.word, label: v.word })
      if (related.length >= 8) break
    }
    for (const pattern of grammarPatternsForRawIndex(story.index)) {
      related.push({ type: 'grammar', key: pattern, label: pattern })
    }
    return {
      type: 'vocab',
      key: word,
      title: word,
      subtitle: [entry.reading, entry.english].filter(Boolean).join(' — '),
      exampleSentence: firstSentenceText(story),
      exampleSource: story.titleEn,
      related,
    }
  }

  function getGrammarNode(pattern) {
    const g = grammarByPattern.get(pattern)
    if (!g) return null
    const example = g.examples[0]
    const related = []
    if (example) {
      for (const word of vocabWordsMentionedIn(example.sentence)) {
        related.push({ type: 'vocab', key: word, label: word })
      }
    }
    for (const other of grammarPoints) {
      if (other.pattern === pattern) continue
      const shares = other.examples.some((ex) =>
        g.examples.some((mine) => mine.story_index === ex.story_index),
      )
      if (shares) related.push({ type: 'grammar', key: other.pattern, label: other.pattern })
    }
    return {
      type: 'grammar',
      key: pattern,
      title: pattern,
      subtitle: g.explanation,
      exampleSentence: example?.sentence ?? '',
      exampleSource: example?.title_en ?? '',
      related,
    }
  }

  function getNode(type, key) {
    return type === 'grammar' ? getGrammarNode(key) : getVocabNode(key)
  }

  return {
    getNode,
    hasVocabWord: (word) => vocabFirstSeen.has(word),
    startingVocab: [...vocabFirstSeen.keys()].slice(0, 24),
    grammarPatterns: grammarPoints.map((g) => g.pattern),
  }
}

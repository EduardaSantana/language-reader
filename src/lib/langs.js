const LANG_META = {
  ja: { avatar: '日', label: 'Japanese' },
  de: { avatar: 'DE', label: 'German' },
  fr: { avatar: 'FR', label: 'French' },
  ru: { avatar: 'RU', label: 'Russian' },
}

const LANG_FLAGS = { ja: '🇯🇵', de: '🇩🇪', fr: '🇫🇷', ru: '🇷🇺' }

export function langMeta(lang) {
  return LANG_META[lang] ?? { avatar: lang.toUpperCase().slice(0, 2), label: lang }
}

// Flag emoji specifically for the Encyclopedia/Read screens, which the
// design spec artifact renders with real flags rather than the rest of the
// app's pre-existing text-avatar convention (langMeta().avatar — "日"/"DE"/
// "FR"/"RU", used throughout Bookmarks/Games/Profile/StoryCard's reader
// header). Kept as a separate helper rather than changing langMeta itself,
// so this doesn't ripple into screens the mockup never touched.
export function langFlag(lang) {
  return LANG_FLAGS[lang] ?? langMeta(lang).avatar
}

export function getAvailableLangs(stories) {
  return [...new Set(stories.map((s) => s.lang))].sort()
}

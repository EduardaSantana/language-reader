const LANG_META = {
  ja: { avatar: '日', label: 'Japanese' },
  de: { avatar: 'DE', label: 'German' },
  fr: { avatar: 'FR', label: 'French' },
  ru: { avatar: 'RU', label: 'Russian' },
}

export function langMeta(lang) {
  return LANG_META[lang] ?? { avatar: lang.toUpperCase().slice(0, 2), label: lang }
}

export function getAvailableLangs(stories) {
  return [...new Set(stories.map((s) => s.lang))].sort()
}

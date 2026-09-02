export function img(src) {
  if (!src || typeof src !== 'string') return ''
  const trimmed = src.trim()
  if (!trimmed) return ''
  if (trimmed.startsWith('http')) return trimmed
  if (trimmed.startsWith('/assets/')) return trimmed
  if (trimmed.startsWith('assets/')) return '/' + trimmed
  return trimmed
}

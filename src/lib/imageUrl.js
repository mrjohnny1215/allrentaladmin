export function img(src) {
  if (!src || typeof src !== 'string') return ''
  const trimmed = src.trim()
  if (!trimmed || trimmed === '/no_image.jpg') return '/assets/no_image.jpg'
  if (trimmed.startsWith('http')) return trimmed
  if (trimmed.startsWith('/assets/')) {
    const enc = encodeURIComponent(trimmed)
    return `/api/image?file=${enc}`
  }
  return trimmed
}

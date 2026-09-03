// Preparazione delle immagini lato client.
//
// Da ogni file caricato dal negozio si ricavano due derivate:
//   - "full"  max 1600px, qualità alta   -> pagina prodotto
//   - "cover" max 640px,  qualità media  -> card del catalogo (peso contenuto)
// In modalità cloud finiscono su S3 come due oggetti distinti; in demo restano
// come data URL in IndexedDB.

const FULL_MAX = 1600
const FULL_QUALITY = 0.85
const COVER_MAX = 640
const COVER_QUALITY = 0.55

export const MAX_UPLOAD_BYTES = 12 * 1024 * 1024
export const ACCEPTED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/avif']

function loadImage(file) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file)
    const img = new Image()
    img.onload = () => {
      URL.revokeObjectURL(url)
      resolve(img)
    }
    img.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error('Immagine non leggibile'))
    }
    img.src = url
  })
}

function scaleTo(img, max) {
  const ratio = Math.min(1, max / Math.max(img.naturalWidth, img.naturalHeight))
  const width = Math.round(img.naturalWidth * ratio)
  const height = Math.round(img.naturalHeight * ratio)
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')
  ctx.imageSmoothingQuality = 'high'
  ctx.drawImage(img, 0, 0, width, height)
  return { canvas, width, height }
}

function toBlob(canvas, quality) {
  return new Promise((resolve) => canvas.toBlob(resolve, 'image/webp', quality))
}

function toDataUrl(canvas, quality) {
  return canvas.toDataURL('image/webp', quality)
}

/**
 * @returns {Promise<{fullBlob:Blob, coverBlob:Blob, fullDataUrl:string,
 *   coverDataUrl:string, width:number, height:number, bytes:number}>}
 */
export async function prepareImage(file) {
  if (!ACCEPTED_TYPES.includes(file.type)) {
    throw new Error('Formato non supportato: usa JPG, PNG, WebP o AVIF')
  }
  if (file.size > MAX_UPLOAD_BYTES) {
    throw new Error('File troppo grande: massimo 12 MB')
  }
  const img = await loadImage(file)
  const full = scaleTo(img, FULL_MAX)
  const cover = scaleTo(img, COVER_MAX)
  const [fullBlob, coverBlob] = await Promise.all([
    toBlob(full.canvas, FULL_QUALITY),
    toBlob(cover.canvas, COVER_QUALITY),
  ])
  return {
    fullBlob,
    coverBlob,
    fullDataUrl: toDataUrl(full.canvas, FULL_QUALITY),
    coverDataUrl: toDataUrl(cover.canvas, COVER_QUALITY),
    width: full.width,
    height: full.height,
    bytes: fullBlob ? fullBlob.size : file.size,
  }
}

/**
 * Segnaposto vettoriale usato dal dataset demo: nessuna rete, pochi byte.
 * Il colore deriva dal nome così ogni prodotto ha una tinta stabile.
 */
export function placeholderImage(label, seed = label, tone = 0) {
  let hash = 0
  for (let i = 0; i < String(seed).length; i += 1) hash = (hash * 31 + seed.charCodeAt(i)) % 360
  const hue = (hash + tone * 24) % 360
  const initials = String(label)
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0])
    .join('')
    .toUpperCase()
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="800" height="600" viewBox="0 0 800 600">
<defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
<stop offset="0" stop-color="hsl(${hue},32%,88%)"/><stop offset="1" stop-color="hsl(${(hue + 40) % 360},28%,72%)"/>
</linearGradient></defs>
<rect width="800" height="600" fill="url(#g)"/>
<circle cx="640" cy="120" r="150" fill="hsl(${hue},35%,94%)" opacity="0.55"/>
<rect x="80" y="330" width="640" height="190" rx="18" fill="hsl(${hue},25%,97%)" opacity="0.7"/>
<text x="400" y="285" font-family="Inter,Helvetica,Arial,sans-serif" font-size="128" font-weight="700"
 fill="hsl(${hue},30%,38%)" text-anchor="middle">${initials}</text>
<text x="400" y="440" font-family="Inter,Helvetica,Arial,sans-serif" font-size="34"
 fill="hsl(${hue},22%,35%)" text-anchor="middle">${escapeXml(String(label).slice(0, 34))}</text>
</svg>`
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`
}

function escapeXml(s) {
  return s.replace(/[<>&"']/g, (c) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;', "'": '&apos;' }[c]))
}

/**
 * share.js
 *
 * Condivide una stazione usando la Web Share API nativa
 * (iOS/Android mostrano il foglio di condivisione: WhatsApp, iMessage, Mail, ecc.).
 * Fallback su URL WhatsApp Web per desktop e browser senza supporto.
 */

const FUEL_NAMES = {
  benzina: 'Benzina',
  diesel:  'Diesel',
  gpl:     'GPL',
}

function buildMapsUrl(station) {
  return `https://www.google.com/maps/dir/?api=1&destination=${station.lat},${station.lng}&travelmode=driving`
}

function buildShareText(station) {
  const fuelLabel = FUEL_NAMES[station.fuelType] ?? 'Carburante'
  const priceStr  = station.price != null ? `€ ${station.price.toFixed(3)}/L` : ''
  const modeStr   = station.selfService ? 'Self' : 'Servito'

  return [
    `⛽ ${station.brand} — ${station.name}`,
    `${fuelLabel} ${modeStr}: ${priceStr}`,
    station.address ? `📍 ${station.address}` : '',
  ].filter(Boolean).join('\n')
}

/**
 * Condivide una stazione.
 * @returns {Promise<'shared'|'cancelled'|'fallback'>}
 */
export async function shareStation(station) {
  if (!station) return 'cancelled'

  const mapsUrl = buildMapsUrl(station)
  const text    = buildShareText(station)
  const title   = `${station.brand} — ${station.name}`

  // Web Share API (iOS Safari, Android Chrome, Edge)
  if (typeof navigator !== 'undefined' && typeof navigator.share === 'function') {
    try {
      await navigator.share({ title, text, url: mapsUrl })
      return 'shared'
    } catch (err) {
      // AbortError = l'utente ha chiuso lo sheet, non è un errore
      if (err?.name === 'AbortError') return 'cancelled'
      // altri errori → fallback WhatsApp
    }
  }

  // Fallback: WhatsApp web (apre sheet share o WhatsApp desktop)
  const message = encodeURIComponent(`${text}\n\n${mapsUrl}`)
  const whatsappUrl = `https://wa.me/?text=${message}`

  if (typeof window !== 'undefined') {
    window.open(whatsappUrl, '_blank', 'noopener,noreferrer')
  }
  return 'fallback'
}

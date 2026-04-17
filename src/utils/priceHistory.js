/**
 * priceHistory.js
 *
 * Snapshot dei prezzi giornalieri salvati in localStorage, per
 * poter mostrare all'utente se oggi il prezzo è salito o sceso
 * rispetto all'ultimo dato MIMIT disponibile.
 *
 * Struttura:
 *   {
 *     "2026-04-17": { "12345": { "benzina_self": 1.789, "diesel_full": 1.729 } },
 *     "2026-04-16": { ... }
 *   }
 *
 * Conserviamo al massimo gli ultimi 4 giorni per evitare bloat.
 */

const HISTORY_KEY   = 'fuel-radar-price-history'
const MAX_SNAPSHOTS = 4

/** Soglia sotto la quale consideriamo un prezzo "stabile" (mezzo centesimo). */
const FLAT_EPSILON = 0.0015

function loadHistory() {
  if (typeof window === 'undefined') return {}
  try {
    const raw = window.localStorage.getItem(HISTORY_KEY)
    if (!raw) return {}
    const parsed = JSON.parse(raw)
    return typeof parsed === 'object' && parsed !== null ? parsed : {}
  } catch {
    return {}
  }
}

function writeHistory(history) {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(HISTORY_KEY, JSON.stringify(history))
  } catch {
    // localStorage pieno → ignora
  }
}

/**
 * Costruisce una mappa compatta { "benzina_self": 1.789, ... } per una stazione.
 */
function flattenPrices(pricesObj) {
  const flat = {}
  if (!pricesObj) return flat
  for (const [fuel, modes] of Object.entries(pricesObj)) {
    if (!modes) continue
    if (modes.self != null) flat[`${fuel}_self`] = modes.self
    if (modes.full != null) flat[`${fuel}_full`] = modes.full
  }
  return flat
}

/**
 * Salva lo snapshot dei prezzi di oggi. Non sovrascrive se già presente.
 * @param {string} publicationKey - "YYYY-MM-DD"
 * @param {Array}  stations - lista stazioni dal MIMIT con campo `prices`
 */
export function savePriceSnapshot(publicationKey, stations) {
  if (!publicationKey || !Array.isArray(stations) || !stations.length) return

  const history = loadHistory()

  // Se abbiamo già snapshot di oggi con dati sostanziosi, non sovrascrivere
  if (history[publicationKey] && Object.keys(history[publicationKey]).length > 0) {
    return
  }

  const todaySnapshot = {}
  for (const station of stations) {
    if (!station?.id) continue
    const flat = flattenPrices(station.prices)
    if (Object.keys(flat).length) {
      todaySnapshot[station.id] = flat
    }
  }

  history[publicationKey] = todaySnapshot

  // Manteniamo solo gli ultimi MAX_SNAPSHOTS per data (decrescente)
  const keys = Object.keys(history).sort().reverse().slice(0, MAX_SNAPSHOTS)
  const trimmed = {}
  for (const k of keys) trimmed[k] = history[k]

  writeHistory(trimmed)
}

/**
 * Ritorna lo snapshot del giorno precedente a quello indicato, o null se assente.
 */
export function getPreviousSnapshot(currentKey) {
  if (!currentKey) return null
  const history = loadHistory()
  const keys = Object.keys(history)
    .filter((k) => k < currentKey)
    .sort()
    .reverse()
  return keys.length ? history[keys[0]] : null
}

/**
 * Ritorna la data dello snapshot precedente (o null).
 */
export function getPreviousSnapshotDate(currentKey) {
  if (!currentKey) return null
  const history = loadHistory()
  const keys = Object.keys(history)
    .filter((k) => k < currentKey)
    .sort()
    .reverse()
  return keys.length ? keys[0] : null
}

/**
 * Crea un helper che confronta il prezzo di oggi con quello dello snapshot precedente.
 * @param {Object|null} previous - snapshot precedente già caricato
 * @returns {(station: Object) => { dir: 'up'|'down'|'flat', diff: number, previousPrice: number } | null}
 */
export function buildTrendLookup(previous) {
  if (!previous) return () => null

  return function getTrend(station) {
    if (!station?.id || station.price == null || !station.fuelType) return null

    const mode = station.selfService ? 'self' : 'full'
    const key  = `${station.fuelType}_${mode}`
    const prev = previous[station.id]?.[key]

    if (prev == null) return null

    const diff = station.price - prev
    if (Math.abs(diff) < FLAT_EPSILON) {
      return { dir: 'flat', diff: 0, previousPrice: prev }
    }
    return {
      dir: diff > 0 ? 'up' : 'down',
      diff,
      previousPrice: prev,
    }
  }
}

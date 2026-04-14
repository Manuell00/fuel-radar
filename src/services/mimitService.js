/**
 * mimitService.js
 *
 * Recupera i dati reali dei distributori dal portale Open Data del
 * Ministero delle Imprese e del Made in Italy (MIMIT).
 *
 * In sviluppo, le richieste passano per il proxy Vite (/mimit/*).
 * In produzione è necessario un backend che faccia da relay verso MIMIT.
 *
 * Fonte ufficiale dataset:
 * https://www.mimit.gov.it/it/open-data/elenco-dataset/carburanti-prezzi-praticati-e-anagrafica-degli-impianti
 *
 * Nota importante:
 * - i dataset sono aggiornati quotidianamente
 * - il file "Prezzo alle 8 di mattina" contiene i prezzi in vigore alle 8
 *   del giorno precedente a quello di pubblicazione
 * - dal 10 febbraio 2026 i file usano il separatore pipe `|`
 */

import { haversineDistance } from '../utils/distance.js'

const URL_ANAGRAFICA = '/mimit/anagrafica_impianti_attivi.csv'
const URL_PREZZI     = '/mimit/prezzo_alle_8.csv'
const PUBLISH_TZ     = 'Europe/Rome'
const PUBLISH_HOUR   = 8
const PUBLISH_MINUTE = 30

const FUEL_MAP = {
  benzina: 'benzina',
  'benzina super': 'benzina',
  'benzina speciale': 'benzina',
  'benzina wr 100': 'benzina',
  'benzina shell v power': 'benzina',
  'blue super': 'benzina',
  'hiq perform+': 'benzina',
  gasolio: 'diesel',
  'gasolio speciale': 'diesel',
  'gasolio special': 'diesel',
  'gasolio premium': 'diesel',
  'gasolio artico': 'diesel',
  'blue diesel': 'diesel',
  'hvo diesel': 'diesel',
  hvo: 'diesel',
  hvolution: 'diesel',
  hvo100: 'diesel',
  'hiq diesel': 'diesel',
  'supreme diesel': 'diesel',
  'diesel shell v power': 'diesel',
  dieselmax: 'diesel',
  's-diesel': 'diesel',
  'excellium diesel': 'diesel',
  gpl: 'gpl',
}

function normalizeFuelLabel(rawFuel) {
  return (rawFuel || '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ')
}

function normalizeBrand(raw) {
  const s = (raw || '').trim()
  const up = s.toUpperCase()
  const MAP = {
    'ENI': 'ENI', 'AGIP': 'ENI', 'IP': 'IP', 'Q8': 'Q8',
    'SHELL': 'Shell', 'TOTAL': 'TotalEnergies', 'TOTALENERGIES': 'TotalEnergies',
    'ESSO': 'Esso', 'TAMOIL': 'Tamoil', 'API': 'API', 'GULF': 'Gulf',
    'ERG': 'ERG', 'REPSOL': 'Repsol', 'CALPAM': 'Calpam',
    'SELF': 'Indipendente', 'NO LOGO': 'Indipendente',
  }
  return MAP[up] || s || 'Altro'
}

function parsePrice(str) {
  return parseFloat((str || '').trim().replace(',', '.'))
}

function formatRomeDateParts(date = new Date()) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: PUBLISH_TZ,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).formatToParts(date)

  const get = (type) => parts.find((part) => part.type === type)?.value
  return {
    year: Number(get('year')),
    month: Number(get('month')),
    day: Number(get('day')),
    hour: Number(get('hour')),
    minute: Number(get('minute')),
  }
}

function getPublicationKey(date = new Date()) {
  const parts = formatRomeDateParts(date)
  const publishReached =
    parts.hour > PUBLISH_HOUR ||
    (parts.hour === PUBLISH_HOUR && parts.minute >= PUBLISH_MINUTE)

  const baseDate = new Date(Date.UTC(parts.year, parts.month - 1, parts.day))
  if (!publishReached) {
    baseDate.setUTCDate(baseDate.getUTCDate() - 1)
  }

  return baseDate.toISOString().slice(0, 10)
}

function getMsUntilNextPublication(date = new Date()) {
  const parts = formatRomeDateParts(date)
  const nowUtc = date.getTime()
  const todayPublishUtc = Date.UTC(parts.year, parts.month - 1, parts.day, PUBLISH_HOUR - 2, PUBLISH_MINUTE)
  const nextUtc = nowUtc < todayPublishUtc ? todayPublishUtc : todayPublishUtc + 24 * 60 * 60 * 1000
  return Math.max(nextUtc - nowUtc, 60_000)
}

function detectDelimiter(csv) {
  // Il CSV MIMIT ha SEMPRE due righe di intestazione:
  //   Riga 0: "Estrazione del YYYY-MM-DD"  (nessun separatore → non usarla!)
  //   Riga 1: "idImpianto|Gestore|..."      (qui si trova il delimitatore reale)
  const lines = csv.split(/\r?\n/)
  const header = lines[1] || lines[0] || ''
  if (header.includes('|')) return '|'
  return ';'
}

function parseAnagraficaRow(parts) {
  if (parts.length < 10) return null

  if (parts.length === 10) {
    return {
      id: parts[0].trim(),
      brandRaw: parts[2],
      nameRaw: parts[4],
      addressRaw: parts[5],
      comuneRaw: parts[6],
      provinciaRaw: parts[7],
      latRaw: parts[8],
      lngRaw: parts[9],
    }
  }

  // Alcune righe MIMIT contengono pipe spurie dentro campi testuali
  // come bandiera o nome impianto. In questi casi le ultime 5 colonne
  // restano comunque stabili: indirizzo, comune, provincia, latitudine, longitudine.
  const tailIndex = parts.length - 5
  const middle = parts.slice(2, tailIndex)
  const typeIndex = middle.findIndex((value) => {
    const normalized = value.trim().toLowerCase()
    return normalized === 'stradale' || normalized === 'autostradale'
  })

  const brandRaw = typeIndex >= 0 ? middle.slice(0, typeIndex).join(' | ') : middle[0] || ''
  const nameRaw = typeIndex >= 0 ? middle.slice(typeIndex + 1).join(' | ') : middle.slice(1).join(' | ')

  return {
    id: parts[0].trim(),
    brandRaw,
    nameRaw,
    addressRaw: parts[tailIndex],
    comuneRaw: parts[tailIndex + 1],
    provinciaRaw: parts[tailIndex + 2],
    latRaw: parts[tailIndex + 3],
    lngRaw: parts[tailIndex + 4],
  }
}

function cacheGet(key) {
  try {
    const raw = sessionStorage.getItem(key)
    if (!raw) return null

    const parsed = JSON.parse(raw)
    if (!parsed?.publicationKey || !parsed?.data) return null
    if (parsed.publicationKey !== getPublicationKey()) return null
    return parsed.data
  } catch {
    return null
  }
}

function cacheSet(key, data) {
  try {
    sessionStorage.setItem(key, JSON.stringify({
      data,
      ts: Date.now(),
      publicationKey: getPublicationKey(),
      nextRefreshInMs: getMsUntilNextPublication(),
    }))
  } catch {
    // ignore quota exceeded
  }
}

export function clearStationsCache() {
  try {
    Object.keys(sessionStorage)
      .filter((key) => key.startsWith('mimit_'))
      .forEach((key) => sessionStorage.removeItem(key))
  } catch {
    // ignore
  }
}

function parseAnagrafica(csv) {
  const delimiter = detectDelimiter(csv)
  const lines = csv.split(/\r?\n/)
  const map = new Map()

  // i=0 → "Estrazione del YYYY-MM-DD"
  // i=1 → colonne header
  // i=2+ → dati reali
  for (let i = 2; i < lines.length; i++) {
    const line = lines[i].trim()
    if (!line) continue
    const p = line.split(delimiter)
    if (p.length < 10) continue

    const parsed = parseAnagraficaRow(p)
    if (!parsed?.id) continue

    const id  = parsed.id
    const lat = parseFloat((parsed.latRaw || '').trim().replace(',', '.'))
    const lng = parseFloat((parsed.lngRaw || '').trim().replace(',', '.'))
    if (isNaN(lat) || isNaN(lng)) continue

    const brand   = normalizeBrand(parsed.brandRaw)
    const comune  = (parsed.comuneRaw || '').trim()
    const prov    = (parsed.provinciaRaw || '').trim()
    const rawName = (parsed.nameRaw || '').trim()
    const addr    = (parsed.addressRaw || '').trim()
    const name    = rawName || `${brand} ${comune}`

    map.set(id, {
      id,
      name,
      brand,
      address: addr ? `${addr}, ${comune} (${prov})` : `${comune} (${prov})`,
      lat,
      lng,
      prices: {},
    })
  }

  return map
}

function applyPrezzi(csv, stationsMap) {
  const delimiter = detectDelimiter(csv)
  const lines = csv.split(/\r?\n/)

  // i=0 → "Estrazione del YYYY-MM-DD", i=1 → header colonne, i=2+ → dati
  for (let i = 2; i < lines.length; i++) {
    const line = lines[i].trim()
    if (!line) continue
    const p = line.split(delimiter)
    if (p.length < 4) continue

    const id      = p[0].trim()
    const rawFuel = p[1].trim()
    const price   = parsePrice(p[2])
    const isSelf  = p[3].trim() === '1'

    const fuelType = FUEL_MAP[normalizeFuelLabel(rawFuel)]
    if (!fuelType) continue
    if (isNaN(price) || price <= 0 || price > 5) continue

    const station = stationsMap.get(id)
    if (!station) continue

    if (!station.prices[fuelType]) station.prices[fuelType] = {}
    if (isSelf) station.prices[fuelType].self = price
    else station.prices[fuelType].full = price
  }
}

export async function fetchNearbyStations(userLat, userLng, maxRadiusKm = 50, options = {}) {
  const { forceRefresh = false } = options
  const cacheKey = `mimit_${userLat.toFixed(1)}_${userLng.toFixed(1)}_${getPublicationKey()}`

  if (!forceRefresh) {
    const cached = cacheGet(cacheKey)
    if (cached) return cached
  } else {
    clearStationsCache()
  }

  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 20_000)

  const [anagraficaRes, prezziRes] = await Promise.all([
    fetch(URL_ANAGRAFICA, { signal: controller.signal, cache: 'no-store' }),
    fetch(URL_PREZZI,     { signal: controller.signal, cache: 'no-store' }),
  ])
  clearTimeout(timeout)

  if (!anagraficaRes.ok || !prezziRes.ok) throw new Error('MIMIT HTTP error')

  const [anagraficaCSV, prezziCSV] = await Promise.all([
    anagraficaRes.text(),
    prezziRes.text(),
  ])

  const stationsMap = parseAnagrafica(anagraficaCSV)
  applyPrezzi(prezziCSV, stationsMap)

  const result = []
  for (const station of stationsMap.values()) {
    if (!Object.keys(station.prices).length) continue
    const dist = haversineDistance(userLat, userLng, station.lat, station.lng)
    if (dist > maxRadiusKm) continue
    result.push(station)
  }

  cacheSet(cacheKey, result)
  return result
}

export function getNextPublicationDelayMs() {
  return getMsUntilNextPublication()
}

<script setup>
import { nextTick, onMounted, onUnmounted, ref, watch } from 'vue'
import L from 'leaflet'

const props = defineProps({
  userPosition: { type: Object, default: null },
  stations: { type: Array, default: () => [] },
  selectedStation: { type: Object, default: null },
  favoriteIds: { type: Array, default: () => [] },
  cheapest: { type: Object, default: null },
  nearest: { type: Object, default: null },
  bestCompromise: { type: Object, default: null },
  filters: { type: Object, required: true },
  radius: { type: Number, default: 5 },
})

const emit = defineEmits(['select-station', 'toggle-favorite', 'update:filters'])

const mapEl = ref(null)
const mapStageEl = ref(null)
const filtersOpen = ref(false)
const mapExpanded = ref(false)
const mapAnimating = ref(false)

let mapExpandAnimationTimer = null

let map = null
let userLayer = null
let stationLayer = null
let radiusLayer = null
let routeLayer = null
let markerMap = new Map()

const fuelNames = {
  benzina: 'Benzina',
  diesel: 'Diesel',
  gpl: 'GPL',
}

const fuelOptions = [
  { value: 'tutti', label: 'Tutti' },
  { value: 'benzina', label: 'Benzina' },
  { value: 'diesel', label: 'Diesel' },
  { value: 'gpl', label: 'GPL' },
]

const modeOptions = [
  { value: 'tutti', label: 'Tutti' },
  { value: 'self', label: 'Self' },
  { value: 'servito', label: 'Servito' },
]

function updateFilter(key, value) {
  emit('update:filters', { ...props.filters, [key]: value })
}

function sliderPct(value) {
  return `${((value - 1) / 49) * 100}%`
}

function openFilters() {
  filtersOpen.value = true
}

function closeFilters() {
  filtersOpen.value = false
}

async function toggleMapExpanded() {
  if (mapAnimating.value) return
  mapAnimating.value = true
  mapExpanded.value = !mapExpanded.value
  await nextTick()
  map?.invalidateSize()

  window.clearTimeout(mapExpandAnimationTimer)
  mapExpandAnimationTimer = window.setTimeout(() => {
    mapAnimating.value = false
    map?.invalidateSize()
  }, 420)
}

function handleMapStageTransitionEnd(event) {
  if (event.target !== mapStageEl.value) return
  if (event.propertyName !== 'height' && event.propertyName !== 'min-height') return

  mapAnimating.value = false
  map?.invalidateSize()
}

const fuelSummary = {
  tutti: 'Tutti i carburanti',
  benzina: 'Benzina',
  diesel: 'Diesel',
  gpl: 'GPL',
}

const modeSummary = {
  tutti: 'Tutte le modalita',
  self: 'Self',
  servito: 'Servito',
}

function getMarkerType(station) {
  if (props.selectedStation?.id === station.id) return 'selected'
  if (props.cheapest?.id === station.id) return 'cheapest'
  if (props.nearest?.id === station.id) return 'nearest'
  if (props.bestCompromise?.id === station.id) return 'best'
  return 'default'
}

function markerIcon(type) {
  const styles = {
    selected: { fill: '#62b6ff', glow: 'rgba(98, 182, 255, 0.38)', size: 28 },
    cheapest: { fill: '#30d39d', glow: 'rgba(48, 211, 157, 0.3)', size: 24 },
    nearest: { fill: '#62b6ff', glow: 'rgba(98, 182, 255, 0.28)', size: 24 },
    best: { fill: '#ff7a1a', glow: 'rgba(255, 122, 26, 0.32)', size: 24 },
    default: { fill: '#ff7a1a', glow: 'rgba(255, 122, 26, 0.18)', size: 20 },
  }

  const current = styles[type]
  const half = current.size / 2

  return L.divIcon({
    className: '',
    iconSize: [current.size, current.size],
    iconAnchor: [half, current.size],
    popupAnchor: [0, -current.size + 8],
    html: `
      <div style="
        width:${current.size}px;
        height:${current.size}px;
        position:relative;
        filter:drop-shadow(0 14px 18px rgba(0,0,0,0.18));
      ">
        <span style="
          position:absolute;
          inset:4px;
          border-radius:999px;
          background:${current.glow};
          transform:scale(1.36);
        "></span>
        <span style="
          position:absolute;
          inset:0;
          display:block;
          background:${current.fill};
          border-radius:999px 999px 999px 0;
          transform:rotate(-45deg);
          border:3px solid rgba(255,255,255,0.92);
        "></span>
        <span style="
          position:absolute;
          width:${Math.round(current.size * 0.33)}px;
          height:${Math.round(current.size * 0.33)}px;
          border-radius:50%;
          background:white;
          top:50%;
          left:50%;
          transform:translate(-50%, -50%);
        "></span>
      </div>
    `,
  })
}

function userIcon() {
  return L.divIcon({
    className: '',
    iconSize: [16, 16],
    iconAnchor: [8, 8],
    popupAnchor: [0, -12],
    html: '<div class="m-user"></div>',
  })
}

function estimateMinutes(distanceKm) {
  if (distanceKm == null) return null
  return Math.max(2, Math.round((distanceKm / 42) * 60))
}

function mapsUrl(station) {
  return `https://www.google.com/maps/dir/?api=1&destination=${station.lat},${station.lng}&travelmode=driving`
}

function stationPricesHtml(station) {
  const rows = []

  Object.entries(station.prices || {}).forEach(([fuelKey, priceSet]) => {
    if (priceSet.self != null) {
      rows.push(`
        <div class="pp-price-row">
          <span class="pp-price-label">${fuelNames[fuelKey] || fuelKey} self</span>
          <strong>€ ${priceSet.self.toFixed(3)}</strong>
        </div>
      `)
    }

    if (priceSet.full != null) {
      rows.push(`
        <div class="pp-price-row">
          <span class="pp-price-label">${fuelNames[fuelKey] || fuelKey} servito</span>
          <strong>€ ${priceSet.full.toFixed(3)}</strong>
        </div>
      `)
    }
  })

  if (!rows.length && station.price != null) {
    rows.push(`
      <div class="pp-price-row">
        <span class="pp-price-label">${fuelNames[station.fuelType] || station.fuelType || 'Prezzo'}</span>
        <strong>€ ${station.price.toFixed(3)}</strong>
      </div>
    `)
  }

  return rows.join('')
}

function popupHtml(station, type) {
  const distance = station.distance != null ? `${station.distance.toFixed(1)} km` : 'Distanza non disponibile'
  const eta = estimateMinutes(station.distance)
  const isFavorite = props.favoriteIds.includes(station.id)
  const primaryPrice = station.price != null ? `€ ${station.price.toFixed(3)}` : null
  const fuelLabel = fuelNames[station.fuelType] || station.fuelType || 'Prezzo'

  return `
    <div class="pp">
      <div class="pp-topline">
        <button class="pp-favorite ${isFavorite ? 'pp-favorite--active' : ''}" type="button" data-station-id="${station.id}" aria-pressed="${isFavorite}">
          ★
        </button>
        <span class="pp-topline-spacer"></span>
      </div>
      <div class="pp-brand">${station.brand}</div>
      <div class="pp-name">${station.name}</div>
      ${primaryPrice ? `
        <div class="pp-price-hero">
          <span class="pp-price-hero-label">${fuelLabel}</span>
          <strong class="pp-price-hero-value">${primaryPrice}</strong>
        </div>
      ` : ''}
      <div class="pp-meta">
        <span>${distance}</span>
        ${eta ? `<span>${eta} min in auto circa</span>` : ''}
      </div>
      <a class="pp-btn" href="${mapsUrl(station)}" target="_blank" rel="noopener noreferrer">Apri in Mappe</a>
    </div>
  `
}

function renderUserPosition() {
  userLayer.clearLayers()
  radiusLayer.clearLayers()

  if (!props.userPosition) return

  const { lat, lng } = props.userPosition
  L.marker([lat, lng], { icon: userIcon(), zIndexOffset: 2000 })
    .bindPopup('<div class="pp"><div class="pp-brand">Posizione attuale</div><div class="pp-name">Sei qui</div></div>')
    .addTo(userLayer)

  L.circle([lat, lng], {
    radius: props.radius * 1000,
    color: 'rgba(255,122,26,0.55)',
    weight: 1.5,
    fillColor: 'rgba(255,122,26,0.10)',
    fillOpacity: 0.35,
  }).addTo(radiusLayer)
}

function renderStations() {
  stationLayer.clearLayers()
  markerMap = new Map()

  props.stations.forEach((station) => {
    const type = getMarkerType(station)
    const marker = L.marker([station.lat, station.lng], {
      icon: markerIcon(type),
      zIndexOffset: type === 'selected' ? 900 : type === 'default' ? 0 : 500,
    })

    marker.bindPopup(popupHtml(station, type), { maxWidth: 280 })
    marker.on('click', () => emit('select-station', station))
    marker.addTo(stationLayer)
    markerMap.set(station.id, marker)
  })
}

function buildRoutePoints(from, to) {
  const start = L.latLng(from.lat, from.lng)
  const end = L.latLng(to.lat, to.lng)
  const latDelta = end.lat - start.lat
  const lngDelta = end.lng - start.lng
  const steps = 24

  // Slight arc to make the motion feel intentional instead of purely geometric.
  const control = L.latLng(
    (start.lat + end.lat) / 2 + lngDelta * 0.12,
    (start.lng + end.lng) / 2 - latDelta * 0.12,
  )

  return Array.from({ length: steps + 1 }, (_, index) => {
    const t = index / steps
    const oneMinusT = 1 - t

    return L.latLng(
      oneMinusT * oneMinusT * start.lat + 2 * oneMinusT * t * control.lat + t * t * end.lat,
      oneMinusT * oneMinusT * start.lng + 2 * oneMinusT * t * control.lng + t * t * end.lng,
    )
  })
}

function renderSelectedRoute() {
  routeLayer.clearLayers()

  if (!props.userPosition || !props.selectedStation) return

  const routePoints = buildRoutePoints(props.userPosition, props.selectedStation)
  const destination = routePoints.at(-1)

  L.polyline(routePoints, {
    color: 'rgba(255, 255, 255, 0.22)',
    weight: 10,
    opacity: 0.65,
    lineCap: 'round',
    className: 'map-route map-route--glow',
    interactive: false,
  }).addTo(routeLayer)

  L.polyline(routePoints, {
    color: '#ff9a4d',
    weight: 4,
    opacity: 0.96,
    lineCap: 'round',
    dashArray: '12 12',
    className: 'map-route map-route--animated',
    interactive: false,
  }).addTo(routeLayer)

  if (destination) {
    L.circleMarker(destination, {
      radius: 10,
      color: 'rgba(255, 245, 238, 0.85)',
      weight: 2,
      fillColor: '#ff7a1a',
      fillOpacity: 0.95,
      className: 'map-route-target',
      interactive: false,
    }).addTo(routeLayer)

    L.circleMarker(destination, {
      radius: 18,
      color: 'rgba(255, 160, 92, 0.28)',
      weight: 1,
      fillColor: 'rgba(255, 122, 26, 0.08)',
      fillOpacity: 0.35,
      className: 'map-route-pulse',
      interactive: false,
    }).addTo(routeLayer)
  }
}

function fitMap() {
  if (!map || !props.userPosition) return

  const points = [[props.userPosition.lat, props.userPosition.lng]]
  props.stations.forEach((station) => points.push([station.lat, station.lng]))

  if (points.length > 1) {
    map.fitBounds(L.latLngBounds(points), { padding: [36, 36], maxZoom: 14 })
  } else {
    map.setView(points[0], 13)
  }
}

function focusSelectedStation() {
  if (!map || !props.selectedStation) return

  const marker = markerMap.get(props.selectedStation.id)
  if (!marker) return

  const latLng = marker.getLatLng()
  const targetZoom = Math.max(map.getZoom(), 14)

  const openStationPopup = () => {
    marker.openPopup()
    window.setTimeout(() => {
      map?.panInside(latLng, {
        paddingTopLeft: [28, 180],
        paddingBottomRight: [28, 28],
        animate: true,
      })
    }, 60)
  }

  map.once('moveend', openStationPopup)
  map.flyTo(latLng, targetZoom, {
    duration: 0.5,
  })
}

async function redraw() {
  if (!map) return
  await nextTick()
  map.invalidateSize()
  renderUserPosition()
  renderSelectedRoute()
  renderStations()
  if (props.selectedStation) {
    focusSelectedStation()
  } else {
    fitMap()
  }
}

onMounted(async () => {
  const center = props.userPosition
    ? [props.userPosition.lat, props.userPosition.lng]
    : [44.4056, 8.9463]

  map = L.map(mapEl.value, {
    center,
    zoom: 12,
    zoomControl: true,
    scrollWheelZoom: false,
  })

  map.zoomControl.setPosition(window.matchMedia('(max-width: 720px)').matches ? 'bottomleft' : 'topright')

  L.tileLayer('https://{s}.basemaps.cartocdn.com/light_nolabels/{z}/{x}/{y}{r}.png', {
    attribution: '&copy; OpenStreetMap &copy; CARTO',
    subdomains: 'abcd',
    maxZoom: 19,
  }).addTo(map)

  L.tileLayer('https://{s}.basemaps.cartocdn.com/light_only_labels/{z}/{x}/{y}{r}.png', {
    attribution: '&copy; OpenStreetMap &copy; CARTO',
    subdomains: 'abcd',
    maxZoom: 19,
  }).addTo(map)

  userLayer = L.layerGroup().addTo(map)
  stationLayer = L.layerGroup().addTo(map)
  radiusLayer = L.layerGroup().addTo(map)
  routeLayer = L.layerGroup().addTo(map)

  map.on('popupopen', (event) => {
    const popupEl = event.popup.getElement()
    const favoriteBtn = popupEl?.querySelector('[data-station-id]')
    if (!favoriteBtn) return

    favoriteBtn.addEventListener('click', (clickEvent) => {
      clickEvent.preventDefault()
      clickEvent.stopPropagation()
      const stationId = favoriteBtn.getAttribute('data-station-id')
      const station = props.stations.find((entry) => entry.id === stationId)
      if (station) {
        emit('toggle-favorite', station)
      }
    }, { once: true })
  })

  await redraw()
})

onUnmounted(() => {
  window.clearTimeout(mapExpandAnimationTimer)
  if (map) {
    map.remove()
    map = null
  }
})

watch(
  [
    () => props.userPosition,
    () => props.stations,
    () => props.selectedStation,
    () => props.favoriteIds,
    () => props.radius,
    () => props.cheapest,
    () => props.nearest,
    () => props.bestCompromise,
  ],
  redraw,
  { deep: true }
)

watch(filtersOpen, (isOpen) => {
  document.body.style.overflow = isOpen ? 'hidden' : ''
})

watch(mapExpanded, async () => {
  await nextTick()
  map?.invalidateSize()
})

onUnmounted(() => {
  document.body.style.overflow = ''
})
</script>

<template>
  <section class="map-view">
    <div class="map-copy">
      <p class="map-kicker">Radar</p>
      <p class="map-subtitle map-subtitle--desktop">
        Seleziona un marker o un risultato per confrontare distributore, distanza, tempo stimato e prezzi disponibili.
      </p>
      <p class="map-subtitle map-subtitle--mobile">
        Tocca un marker per vedere distanza, tempi e prezzi.
      </p>
    </div>

    <Teleport to="body">
      <Transition name="filter-modal-fade">
        <div v-if="filtersOpen" class="filter-modal" @click.self="closeFilters">
          <div class="filter-modal__panel" role="dialog" aria-modal="true" aria-label="Filtri radar">
            <div class="filter-modal__header">
              <div class="filter-modal__title-wrap">
                <h2 class="filter-modal__title">FILTRI</h2>
              </div>
              <button class="filter-modal__close" type="button" aria-label="Chiudi filtri" @click="closeFilters">
                <svg viewBox="0 0 24 24" focusable="false">
                  <path d="M6.28 5.22 12 10.94l5.72-5.72 1.06 1.06L13.06 12l5.72 5.72-1.06 1.06L12 13.06l-5.72 5.72-1.06-1.06L10.94 12 5.22 6.28Z" fill="currentColor" />
                </svg>
              </button>
            </div>

            <div class="filter-modal__body">
              <div class="map-filter-group">
                <span class="map-filter-label">Carburante</span>
                <div class="map-filter-chips">
                  <button
                    v-for="option in fuelOptions"
                    :key="option.value"
                    class="map-chip"
                    :class="{ 'map-chip--active': filters.fuelType === option.value }"
                    type="button"
                    @click="updateFilter('fuelType', option.value)"
                  >
                    {{ option.label }}
                  </button>
                </div>
              </div>

              <div class="map-filter-group">
                <span class="map-filter-label">Modalita</span>
                <div class="map-filter-chips">
                  <button
                    v-for="option in modeOptions"
                    :key="option.value"
                    class="map-chip"
                    :class="{ 'map-chip--active': filters.mode === option.value }"
                    type="button"
                    @click="updateFilter('mode', option.value)"
                  >
                    {{ option.label }}
                  </button>
                </div>
              </div>

              <div class="map-filter-group map-filter-group--range">
                <div class="map-range-head">
                  <span class="map-filter-label">Raggio</span>
                  <strong>{{ filters.radius }} km</strong>
                </div>
                <input
                  class="map-slider"
                  type="range"
                  min="1"
                  max="50"
                  step="1"
                  :value="filters.radius"
                  :style="{ '--pct': sliderPct(filters.radius) }"
                  @input="updateFilter('radius', Number($event.target.value))"
                />
              </div>
            </div>

            <button class="filter-modal__apply" type="button" @click="closeFilters">
              Applica filtri
            </button>
          </div>
        </div>
      </Transition>
    </Teleport>

    <div
      ref="mapStageEl"
      class="map-stage"
      :class="{
        'map-stage--expanded': mapExpanded,
        'map-stage--animating': mapAnimating,
      }"
      @transitionend="handleMapStageTransitionEnd"
    >
      <div class="map-orb map-orb--left" aria-hidden="true"></div>
      <div class="map-orb map-orb--right" aria-hidden="true"></div>
      <div class="map-noise" aria-hidden="true"></div>

      <button
        class="map-expand-btn"
        :class="{ 'map-expand-btn--active': mapExpanded }"
        type="button"
        :aria-label="mapExpanded ? 'Riduci mappa' : 'Espandi mappa'"
        @click="toggleMapExpanded"
      >
        <svg v-if="!mapExpanded" viewBox="0 0 24 24" focusable="false" aria-hidden="true">
          <path d="M8 4H4v4h1.5V6.56l4.47 4.47 1.06-1.06L6.56 5.5H8zm10 0h-4v1.5h1.44l-4.47 4.47 1.06 1.06 4.47-4.47V8H18zm-8.03 8.97-4.47 4.47V16H4v4h4v-1.5H6.56l4.47-4.47zm4.06 0-1.06 1.06 4.47 4.47H16V20h4v-4h-1.5v1.44z" fill="currentColor" />
        </svg>
        <svg v-else viewBox="0 0 24 24" focusable="false" aria-hidden="true">
          <path d="M9.03 9.97 4.56 5.5H6V4H2v4h1.5V6.56l4.47 4.47zm5.94 0 4.47-4.47V8H21V4h-4v1.5h1.44l-4.47 4.47zm-5.94 4.06-4.47 4.47V17H3v4h4v-1.5H5.56l4.47-4.47zm5.94 0-1.06 1.06 4.47 4.47H17V21h4v-4h-1.5v1.44z" fill="currentColor" />
        </svg>
      </button>

      <div ref="mapEl" class="map-canvas"></div>
    </div>

    <button class="map-filter-trigger" type="button" @click="openFilters">
      <span class="map-filter-trigger__icon" aria-hidden="true">
        <svg viewBox="0 0 24 24" focusable="false">
          <path d="M5 7h14v2H5zm2 5h10v2H7zm3 5h4v2h-4z" fill="currentColor" />
        </svg>
      </span>
      <span class="map-filter-trigger__copy">
        <span class="map-filter-trigger__pill">{{ fuelSummary[filters.fuelType] }}</span>
        <span class="map-filter-trigger__pill">{{ modeSummary[filters.mode] }}</span>
        <span class="map-filter-trigger__pill">{{ filters.radius }} km</span>
      </span>
    </button>
  </section>
</template>

<style scoped>
.map-view {
  padding: 28px 24px;
  display: grid;
  gap: 18px;
}

.map-copy {
  display: grid;
  gap: 14px;
  justify-items: center;
  text-align: center;
  animation: map-copy-in 720ms cubic-bezier(0.22, 1, 0.36, 1) both;
}

.map-kicker {
  position: relative;
  display: inline-grid;
  gap: 10px;
  color: #fff5ed;
  font-size: 1rem;
  font-weight: 800;
  letter-spacing: 0.12em;
  text-transform: uppercase;
}

.map-kicker::after {
  content: '';
  width: 84px;
  height: 2px;
  margin: 0 auto;
  border-radius: 999px;
  background: linear-gradient(90deg, rgba(255, 255, 255, 0.14), rgba(255, 160, 92, 0.95), rgba(255, 255, 255, 0.14));
}

.map-subtitle {
  max-width: 52ch;
  color: rgba(255, 255, 255, 0.66);
  line-height: 1.6;
}

.map-subtitle--mobile {
  display: none;
}

.map-filter-trigger {
  min-height: 64px;
  width: min(100%, 520px);
  margin: 0 auto;
  margin-top: 6px;
  padding: 0.95rem 1rem;
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 24px;
  background:
    radial-gradient(circle at top right, rgba(255, 160, 92, 0.1), transparent 28%),
    linear-gradient(180deg, rgba(255, 255, 255, 0.045), rgba(255, 255, 255, 0.018)),
    rgba(14, 17, 23, 0.76);
  color: #fff7ef;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.85rem;
  text-align: center;
  font: inherit;
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.04),
    0 20px 34px rgba(0, 0, 0, 0.14);
  cursor: pointer;
  transition: transform var(--transition), border-color var(--transition), box-shadow var(--transition);
}

.map-filter-trigger:hover {
  transform: translateY(-1px);
  border-color: rgba(255, 160, 92, 0.16);
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.05),
    0 24px 36px rgba(0, 0, 0, 0.18);
}

.map-filter-trigger__icon {
  width: 42px;
  height: 42px;
  border-radius: 16px;
  background:
    linear-gradient(180deg, rgba(228, 164, 111, 0.2), rgba(207, 127, 73, 0.12)),
    rgba(255, 255, 255, 0.03);
  color: #efc6a2;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex: 0 0 auto;
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.08),
    0 12px 20px rgba(0, 0, 0, 0.14);
}

.map-filter-trigger__icon svg {
  width: 18px;
  height: 18px;
}

.map-filter-trigger__copy {
  display: flex;
  flex-wrap: wrap;
  gap: 0.45rem;
  align-items: center;
  justify-content: center;
  flex: 1;
}

.map-filter-trigger__pill {
  min-height: 32px;
  padding: 0 0.78rem;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.055);
  border: 1px solid rgba(255, 255, 255, 0.06);
  color: rgba(255, 255, 255, 0.76);
  display: inline-flex;
  align-items: center;
  font-size: 0.82rem;
  font-weight: 700;
  letter-spacing: 0.01em;
}

@media (min-width: 1025px) {
  .map-copy {
    justify-items: start;
    text-align: left;
  }

  .map-kicker::after {
    margin: 0;
  }

  .map-filter-trigger {
    width: 100%;
    justify-content: flex-start;
    text-align: left;
  }

  .map-filter-trigger__copy {
    justify-content: flex-start;
  }
}

.map-filter-group {
  padding: 16px 16px 14px;
  border-radius: 22px;
  border: 1px solid rgba(255, 255, 255, 0.08);
  background:
    linear-gradient(180deg, rgba(255, 255, 255, 0.035), rgba(255, 255, 255, 0.018)),
    rgba(14, 17, 23, 0.74);
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.04),
    0 18px 30px rgba(0, 0, 0, 0.12);
  display: grid;
  gap: 12px;
}

.filter-modal {
  position: fixed;
  inset: 0;
  z-index: 1000;
  display: grid;
  place-items: center;
  padding: 24px;
  background: rgba(7, 9, 13, 0.58);
  backdrop-filter: blur(10px);
}

.filter-modal__panel {
  width: min(680px, 100%);
  max-height: min(86dvh, 820px);
  padding: 1.1rem;
  border-radius: 28px;
  background:
    radial-gradient(circle at top right, rgba(228, 164, 111, 0.14), transparent 24%),
    linear-gradient(180deg, #191d26 0%, #11151d 100%);
  border: 1px solid rgba(255, 255, 255, 0.08);
  box-shadow: 0 32px 70px rgba(0, 0, 0, 0.32);
  display: grid;
  gap: 1rem;
}

.filter-modal__header {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: flex-end;
  min-height: 42px;
}

.filter-modal__title-wrap {
  position: absolute;
  left: 50%;
  transform: translateX(-50%);
  text-align: center;
}

.filter-modal__title {
  color: #fff8f1;
  font-size: clamp(1.3rem, 3vw, 1.7rem);
  letter-spacing: 0.14em;
  text-transform: uppercase;
}

.filter-modal__close {
  width: 42px;
  height: 42px;
  border: 0;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.08);
  color: rgba(255, 255, 255, 0.76);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
}

.filter-modal__close svg {
  width: 18px;
  height: 18px;
}

.filter-modal__body {
  display: grid;
  grid-template-columns: 1.1fr 1.1fr 0.9fr;
  gap: 12px;
  overflow: auto;
  align-items: stretch;
  grid-auto-rows: 1fr;
}

.filter-modal__apply {
  min-height: 50px;
  border: 0;
  border-radius: 18px;
  background: linear-gradient(135deg, #e4a46f, #cf7f49 58%, #a55e33);
  color: white;
  font: inherit;
  font-weight: 800;
  cursor: pointer;
  box-shadow: 0 16px 28px rgba(207, 127, 73, 0.2);
}

.filter-modal-fade-enter-active,
.filter-modal-fade-leave-active {
  transition: opacity 180ms ease;
}

.filter-modal-fade-enter-from,
.filter-modal-fade-leave-to {
  opacity: 0;
}

.map-filter-group {
  height: 100%;
  align-content: start;
}

.map-filter-group--range {
  align-content: start;
}

.map-filter-label {
  color: rgba(255, 255, 255, 0.48);
  font-size: 0.68rem;
  font-weight: 700;
  letter-spacing: 0.14em;
  text-transform: uppercase;
}

.map-filter-chips {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.map-chip {
  min-height: 38px;
  padding: 0 14px;
  border-radius: 999px;
  border: 1px solid rgba(255, 255, 255, 0.08);
  background: rgba(255, 255, 255, 0.05);
  color: rgba(255, 255, 255, 0.75);
  font: inherit;
  font-weight: 700;
  cursor: pointer;
  transition:
    transform var(--transition),
    border-color var(--transition),
    background var(--transition),
    color var(--transition);
}

.map-chip:hover {
  transform: translateY(-1px);
  border-color: rgba(207, 127, 73, 0.28);
}

.map-chip--active {
  background: linear-gradient(135deg, #e4a46f, #cf7f49 58%, #a55e33);
  border-color: transparent;
  color: white;
  box-shadow: 0 12px 22px rgba(207, 127, 73, 0.16);
}

.map-range-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  color: #fff4eb;
  font-weight: 700;
}

.map-slider {
  width: 100%;
  appearance: none;
  height: 6px;
  border-radius: 999px;
  background:
    linear-gradient(
      90deg,
      #cf7f49 0,
      #cf7f49 var(--pct),
      rgba(255, 255, 255, 0.12) var(--pct),
      rgba(255, 255, 255, 0.12) 100%
    );
  outline: none;
  cursor: pointer;
}

.map-slider::-webkit-slider-thumb {
  appearance: none;
  width: 20px;
  height: 20px;
  border-radius: 50%;
  border: 3px solid white;
  background: #cf7f49;
  box-shadow: 0 10px 18px rgba(207, 127, 73, 0.24);
}

.map-slider::-moz-range-thumb {
  width: 20px;
  height: 20px;
  border-radius: 50%;
  border: 3px solid white;
  background: #cf7f49;
  box-shadow: 0 10px 18px rgba(207, 127, 73, 0.24);
}

@keyframes map-copy-in {
  from {
    opacity: 0;
    transform: translateY(14px) scale(0.99);
  }
  to {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}

.map-stage {
  position: relative;
  min-height: 500px;
  height: 500px;
  border-radius: 30px;
  overflow: hidden;
  background:
    linear-gradient(180deg, rgba(255, 255, 255, 0.08), rgba(255, 255, 255, 0.025)),
    linear-gradient(135deg, rgba(14, 16, 22, 0.94), rgba(23, 28, 36, 0.88));
  border: 1px solid rgba(255, 255, 255, 0.1);
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.06),
    inset 0 0 0 1px rgba(255, 184, 127, 0.08),
    0 30px 60px rgba(0, 0, 0, 0.24),
    0 0 0 1px rgba(255, 147, 74, 0.08);
  transition:
    height 360ms cubic-bezier(0.22, 1, 0.36, 1),
    min-height 360ms cubic-bezier(0.22, 1, 0.36, 1),
    border-radius 360ms cubic-bezier(0.22, 1, 0.36, 1),
    box-shadow 360ms cubic-bezier(0.22, 1, 0.36, 1),
    transform 360ms cubic-bezier(0.22, 1, 0.36, 1),
    filter 360ms cubic-bezier(0.22, 1, 0.36, 1);
  will-change: height, transform, filter;
}

.map-stage--expanded,
.map-stage--expanded .map-canvas {
  min-height: min(78dvh, 860px);
  height: min(78dvh, 860px);
}

.map-stage--animating {
  transform: translateY(-4px) scale(1.01);
  filter: saturate(1.04);
}

.map-expand-btn {
  position: absolute;
  top: 18px;
  left: 18px;
  z-index: 6;
  width: 40px;
  height: 40px;
  border: 1px solid rgba(255, 255, 255, 0.14);
  border-radius: 14px;
  background: rgba(11, 14, 19, 0.78);
  color: rgba(255, 244, 235, 0.88);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  backdrop-filter: blur(14px);
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.05),
    0 14px 24px rgba(0, 0, 0, 0.18);
  cursor: pointer;
  transition:
    transform 260ms cubic-bezier(0.22, 1, 0.36, 1),
    background 260ms ease,
    border-color 260ms ease,
    box-shadow 260ms ease;
}

.map-expand-btn svg {
  width: 17px;
  height: 17px;
  transition: transform 320ms cubic-bezier(0.22, 1, 0.36, 1);
}

.map-expand-btn--active {
  background: rgba(255, 122, 26, 0.2);
  color: #fff8f1;
  border-color: rgba(255, 160, 92, 0.22);
}

.map-stage--animating .map-expand-btn {
  transform: scale(0.96);
}

.map-stage--expanded .map-expand-btn svg {
  transform: rotate(180deg) scale(1.03);
}

.map-stage::before {
  content: '';
  position: absolute;
  inset: 0;
  background:
    radial-gradient(circle at 50% 0%, rgba(255, 122, 26, 0.16), transparent 24%),
    linear-gradient(180deg, rgba(255, 255, 255, 0.05), transparent 30%);
  pointer-events: none;
  z-index: 4;
  transition: opacity 360ms ease, transform 360ms cubic-bezier(0.22, 1, 0.36, 1);
}

.map-stage::after {
  content: '';
  position: absolute;
  inset: 1px;
  border-radius: 29px;
  border: 1px solid rgba(255, 191, 139, 0.16);
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.06),
    inset 0 0 22px rgba(255, 140, 57, 0.06);
  pointer-events: none;
  z-index: 4;
  transition:
    border-radius 360ms cubic-bezier(0.22, 1, 0.36, 1),
    opacity 360ms ease,
    box-shadow 360ms ease;
}

.map-stage--expanded::before {
  opacity: 0.92;
  transform: scale(1.03);
}

.map-stage--expanded::after {
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.08),
    inset 0 0 26px rgba(255, 140, 57, 0.1);
}

.map-orb {
  position: absolute;
  width: 240px;
  height: 240px;
  border-radius: 50%;
  filter: blur(20px);
  opacity: 0.38;
  pointer-events: none;
  z-index: 1;
  transition:
    transform 420ms cubic-bezier(0.22, 1, 0.36, 1),
    opacity 360ms ease,
    filter 360ms ease;
}

.map-orb--left {
  left: -70px;
  bottom: -90px;
  background: radial-gradient(circle, rgba(255, 122, 26, 0.34), transparent 70%);
  transform: translate3d(0, 0, 0);
}

.map-orb--right {
  right: -80px;
  top: -90px;
  background: radial-gradient(circle, rgba(98, 182, 255, 0.22), transparent 70%);
  transform: translate3d(0, 0, 0);
}

.map-stage--expanded .map-orb--left {
  opacity: 0.54;
  transform: translate3d(22px, -18px, 0) scale(1.08);
}

.map-stage--expanded .map-orb--right {
  opacity: 0.46;
  transform: translate3d(-18px, 22px, 0) scale(1.12);
}

.map-noise {
  position: absolute;
  inset: 0;
  background:
    linear-gradient(rgba(255,255,255,0.028) 1px, transparent 1px),
    linear-gradient(90deg, rgba(255,255,255,0.028) 1px, transparent 1px);
  background-size: 28px 28px;
  mask-image: linear-gradient(180deg, rgba(0, 0, 0, 0.22), transparent 85%);
  opacity: 0.22;
  pointer-events: none;
  z-index: 2;
  transition: opacity 360ms ease;
}

.map-stage--expanded .map-noise {
  opacity: 0.3;
}

.map-canvas {
  width: 100%;
  height: 500px;
  position: relative;
  z-index: 3;
  transform-origin: center center;
  transition:
    height 360ms cubic-bezier(0.22, 1, 0.36, 1),
    transform 360ms cubic-bezier(0.22, 1, 0.36, 1),
    filter 360ms cubic-bezier(0.22, 1, 0.36, 1);
}

.map-stage--animating .map-canvas {
  transform: scale(1.012);
  filter: brightness(1.02);
}

.map-canvas:deep(.leaflet-container) {
  background: #e9ecef;
}

.map-canvas:deep(.leaflet-pane.leaflet-tile-pane) {
  filter: grayscale(0.08) saturate(0.92) contrast(1.04) brightness(1.02);
}

.map-canvas:deep(.leaflet-control-zoom) {
  margin: 26px 26px 0 0;
}

.map-canvas:deep(.leaflet-control-attribution) {
  margin-bottom: 12px;
  margin-right: 12px;
  padding: 3px 8px;
  border-radius: 999px;
  background: rgba(11, 14, 19, 0.58);
  backdrop-filter: blur(10px);
  color: rgba(255, 255, 255, 0.42);
  font-size: 0.62rem;
  line-height: 1.2;
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.04);
}

.map-canvas:deep(.leaflet-control-attribution a) {
  color: rgba(255, 255, 255, 0.48);
  text-decoration: none;
}

.map-canvas:deep(.leaflet-control-attribution a:hover) {
  color: rgba(255, 255, 255, 0.68);
}

.map-canvas:deep(.leaflet-marker-pane),
.map-canvas:deep(.leaflet-overlay-pane) {
  animation: map-settle-in 860ms cubic-bezier(0.22, 1, 0.36, 1);
}

.map-canvas:deep(.map-route--glow) {
  filter: drop-shadow(0 0 16px rgba(255, 122, 26, 0.22));
}

.map-canvas:deep(.map-route--animated) {
  stroke-dashoffset: 0;
  animation: route-flow 1.35s linear infinite;
}

.map-canvas:deep(.map-route-target) {
  filter: drop-shadow(0 0 10px rgba(255, 122, 26, 0.32));
}

.map-canvas:deep(.map-route-pulse) {
  transform-origin: center;
  animation: route-pulse 1.9s ease-out infinite;
}

@keyframes map-settle-in {
  from {
    opacity: 0;
    transform: scale(0.985);
  }
  to {
    opacity: 1;
    transform: scale(1);
  }
}

@keyframes route-flow {
  to {
    stroke-dashoffset: -24;
  }
}

@keyframes route-pulse {
  0% {
    opacity: 0.8;
    transform: scale(0.72);
  }
  100% {
    opacity: 0;
    transform: scale(1.3);
  }
}

@media (max-width: 1024px) {
  .map-view {
    padding: 22px 18px;
  }

  .map-copy {
    order: 1;
    gap: 8px;
  }

  .map-kicker {
    font-size: 0.92rem;
    letter-spacing: 0.14em;
  }

  .map-kicker::after {
    width: 72px;
  }

  .map-title {
    font-size: clamp(1.8rem, 8vw, 2.35rem);
  }

  .map-subtitle {
    font-size: 0.9rem;
    line-height: 1.55;
  }

  .map-subtitle--desktop {
    display: none;
  }

  .map-subtitle--mobile {
    display: block;
    max-width: 28ch;
  }

  .filter-modal {
    align-items: end;
    padding: 12px;
  }

  .filter-modal__panel {
    width: 100%;
    max-height: min(88dvh, 920px);
    border-radius: 28px 28px 20px 20px;
  }

  .filter-modal__body {
    grid-template-columns: 1fr;
  }

  .map-stage,
  .map-canvas {
    min-height: 360px;
    height: 360px;
  }

  .map-stage {
    order: 2;
    border-radius: 24px;
  }

  .map-stage--expanded,
  .map-stage--expanded .map-canvas {
    min-height: 64dvh;
    height: 64dvh;
  }

  .map-filter-trigger {
    order: 3;
    align-items: center;
  }

  .map-expand-btn {
    top: 12px;
    left: 12px;
  }
}

@media (max-width: 560px) {
  .map-view {
    padding: 20px 16px;
    gap: 18px;
  }

  .map-filter-trigger {
    margin-top: 10px;
    padding: 0.82rem 0.9rem;
    gap: 0.7rem;
  }

  .map-filter-trigger__copy {
    gap: 0.38rem;
  }

  .map-filter-trigger__pill {
    min-height: 30px;
    padding: 0 0.68rem;
    font-size: 0.78rem;
  }

  .map-filter-group {
    padding: 14px;
    border-radius: 18px;
  }

  .map-filter-chips {
    width: 100%;
  }

  .map-chip {
    flex: 1 1 78px;
    min-width: 0;
    padding: 0 10px;
  }

  .map-stage,
  .map-canvas {
    min-height: 320px;
    height: 320px;
  }

  .map-stage {
    border-radius: 22px;
  }

  .map-stage--expanded,
  .map-stage--expanded .map-canvas {
    min-height: 68dvh;
    height: 68dvh;
  }
}
</style>

<script setup>
import { nextTick, onMounted, onUnmounted, ref, watch } from 'vue'
import L from 'leaflet'

const props = defineProps({
  userPosition: { type: Object, default: null },
  stations: { type: Array, default: () => [] },
  selectedStation: { type: Object, default: null },
  cheapest: { type: Object, default: null },
  nearest: { type: Object, default: null },
  bestCompromise: { type: Object, default: null },
  radius: { type: Number, default: 12 },
})

const emit = defineEmits(['select-station'])

const mapEl = ref(null)

let map = null
let userLayer = null
let stationLayer = null
let radiusLayer = null
let markerMap = new Map()

const fuelNames = {
  benzina: 'Benzina',
  diesel: 'Diesel',
  gpl: 'GPL',
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
  const badges = {
    selected: 'Selezionata',
    cheapest: 'Più economico',
    nearest: 'Più vicino',
    best: 'Miglior compromesso',
  }

  const distance = station.distance != null ? `${station.distance.toFixed(1)} km` : 'Distanza non disponibile'
  const eta = estimateMinutes(station.distance)

  return `
    <div class="pp">
      ${badges[type] ? `<span class="pp-badge pp-badge--${type === 'selected' ? 'nearest' : type}">${badges[type]}</span>` : ''}
      <div class="pp-brand">${station.brand}</div>
      <div class="pp-name">${station.name}</div>
      <div class="pp-meta">
        <span>${distance}</span>
        ${eta ? `<span>${eta} min in auto circa</span>` : ''}
        <span>${station.selfService ? 'Self' : 'Servito'}</span>
      </div>
      <div class="pp-prices">
        ${stationPricesHtml(station)}
      </div>
      <div class="pp-addr">${station.address}</div>
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

  map.flyTo([props.selectedStation.lat, props.selectedStation.lng], Math.max(map.getZoom(), 14), {
    duration: 0.5,
  })
  marker.openPopup()
}

async function redraw() {
  if (!map) return
  await nextTick()
  map.invalidateSize()
  renderUserPosition()
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

  await redraw()
})

onUnmounted(() => {
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
    () => props.radius,
    () => props.cheapest,
    () => props.nearest,
    () => props.bestCompromise,
  ],
  redraw,
  { deep: true }
)
</script>

<template>
  <section class="map-view">
    <div class="map-copy">
      <h2 class="map-title">Radar</h2>
      <p class="map-subtitle">
        Tocca un marker o una riga della lista per vedere il distributore, la distanza, il tempo stimato e i prezzi disponibili.
      </p>
    </div>

    <div class="map-stage">
      <div class="map-orb map-orb--left" aria-hidden="true"></div>
      <div class="map-orb map-orb--right" aria-hidden="true"></div>
      <div class="map-noise" aria-hidden="true"></div>

      <div class="map-hud map-hud--top" aria-hidden="true">
        <span class="hud-pill">Live area</span>
        <span class="hud-pill hud-pill--accent">Premium map</span>
      </div>

      <div class="map-hud map-hud--bottom" aria-hidden="true">
        <span class="hud-caption">Scena mappa ottimizzata per selezione rapida e lettura prezzi</span>
      </div>

      <div ref="mapEl" class="map-canvas"></div>
    </div>
  </section>
</template>

<style scoped>
.map-view {
  padding: 28px 24px;
  display: grid;
  gap: 24px;
}

.map-copy {
  display: grid;
  gap: 14px;
  justify-items: center;
  text-align: center;
  animation: map-copy-in 720ms cubic-bezier(0.22, 1, 0.36, 1) both;
}

.map-title {
  font-size: clamp(2rem, 5vw, 3.1rem);
  font-weight: 800;
  letter-spacing: -0.06em;
  color: #fff6ef;
  text-shadow:
    0 10px 24px rgba(0, 0, 0, 0.28),
    0 0 26px rgba(255, 122, 26, 0.12);
}

.map-subtitle {
  max-width: 52ch;
  color: rgba(255, 255, 255, 0.66);
  line-height: 1.6;
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
  border-radius: 30px;
  overflow: hidden;
  background:
    linear-gradient(180deg, rgba(255, 255, 255, 0.08), rgba(255, 255, 255, 0.025)),
    linear-gradient(135deg, rgba(14, 16, 22, 0.94), rgba(23, 28, 36, 0.88));
  border: 1px solid rgba(255, 255, 255, 0.1);
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.06),
    0 30px 60px rgba(0, 0, 0, 0.24);
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
}

.map-stage::after {
  content: '';
  position: absolute;
  inset: auto 0 0;
  height: 120px;
  background: linear-gradient(180deg, transparent, rgba(7, 8, 11, 0.22));
  pointer-events: none;
  z-index: 4;
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
}

.map-orb--left {
  left: -70px;
  bottom: -90px;
  background: radial-gradient(circle, rgba(255, 122, 26, 0.34), transparent 70%);
}

.map-orb--right {
  right: -80px;
  top: -90px;
  background: radial-gradient(circle, rgba(98, 182, 255, 0.22), transparent 70%);
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
}

.map-hud {
  position: absolute;
  left: 18px;
  right: 18px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  z-index: 5;
  pointer-events: none;
}

.map-hud--top {
  top: 18px;
}

.map-hud--bottom {
  bottom: 18px;
  justify-content: center;
}

.hud-pill,
.hud-caption {
  display: inline-flex;
  align-items: center;
  min-height: 34px;
  padding: 0 14px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.7);
  backdrop-filter: blur(18px);
  border: 1px solid rgba(255, 255, 255, 0.65);
  color: #11151c;
  box-shadow: 0 16px 30px rgba(0, 0, 0, 0.12);
}

.hud-pill {
  font-size: 0.72rem;
  font-weight: 800;
  letter-spacing: 0.06em;
  text-transform: uppercase;
}

.hud-pill--accent {
  background: rgba(255, 141, 57, 0.88);
  color: white;
  border-color: rgba(255, 141, 57, 0.8);
}

.hud-caption {
  text-align: center;
  font-size: 0.78rem;
  font-weight: 700;
  color: rgba(17, 21, 28, 0.86);
}

.map-canvas {
  width: 100%;
  height: 500px;
  position: relative;
  z-index: 3;
}

.map-canvas:deep(.leaflet-container) {
  background: #e9ecef;
}

.map-canvas:deep(.leaflet-pane.leaflet-tile-pane) {
  filter: grayscale(0.08) saturate(0.92) contrast(1.04) brightness(1.02);
}

.map-canvas:deep(.leaflet-control-zoom) {
  margin: 18px 18px 0 0;
}

.map-canvas:deep(.leaflet-control-attribution) {
  margin-bottom: 12px;
  margin-right: 12px;
}

.map-canvas:deep(.leaflet-marker-pane),
.map-canvas:deep(.leaflet-overlay-pane) {
  animation: map-settle-in 860ms cubic-bezier(0.22, 1, 0.36, 1);
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

@media (max-width: 720px) {
  .map-view {
    padding: 22px 18px;
  }

  .map-stage,
  .map-canvas {
    min-height: 360px;
    height: 360px;
  }

  .map-stage {
    border-radius: 24px;
  }

  .map-hud {
    left: 12px;
    right: 12px;
  }

  .map-hud--top {
    top: 12px;
  }

  .map-hud--bottom {
    bottom: 12px;
  }

  .hud-pill,
  .hud-caption {
    min-height: 30px;
    padding: 0 11px;
    font-size: 0.7rem;
  }
}
</style>

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
  })

  L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
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
      <div>
        <span class="map-kicker">Mappa radar</span>
        <h2 class="map-title">Stazioni ben visibili, popup completi e apertura immediata nelle mappe.</h2>
      </div>
      <p class="map-subtitle">
        Tocca un marker o una riga della lista per vedere il distributore, la distanza, il tempo stimato e i prezzi disponibili.
      </p>
    </div>

    <div class="map-stage">
      <div ref="mapEl" class="map-canvas"></div>
    </div>
  </section>
</template>

<style scoped>
.map-view {
  padding: 20px;
  display: grid;
  gap: 16px;
}

.map-copy {
  display: flex;
  align-items: end;
  justify-content: space-between;
  gap: 20px;
  flex-wrap: wrap;
}

.map-kicker {
  color: rgba(255, 189, 147, 0.86);
  font-size: 0.68rem;
  font-weight: 800;
  letter-spacing: 0.16em;
  text-transform: uppercase;
}

.map-title {
  margin-top: 6px;
  font-size: 1.22rem;
  font-weight: 800;
  letter-spacing: -0.04em;
  color: #fff6ef;
}

.map-subtitle {
  max-width: 46ch;
  color: rgba(255, 255, 255, 0.66);
  line-height: 1.6;
}

.map-stage {
  min-height: 460px;
  border-radius: 24px;
  overflow: hidden;
  background:
    linear-gradient(180deg, rgba(255, 255, 255, 0.04), rgba(255, 255, 255, 0.02)),
    rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.08);
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.04);
}

.map-canvas {
  width: 100%;
  height: 460px;
}

@media (max-width: 720px) {
  .map-view {
    padding: 16px;
  }

  .map-stage,
  .map-canvas {
    min-height: 360px;
    height: 360px;
  }
}
</style>

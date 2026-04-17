<script setup>
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import { formatDistance } from '../utils/distance.js'
import { hapticLight, hapticMedium } from '../utils/haptic.js'
import { shareStation } from '../utils/share.js'

const props = defineProps({
  stations: { type: Array, required: true },
  selectedStationId: { type: String, default: null },
  favoriteIds: { type: Array, default: () => [] },
  getTrend: { type: Function, default: () => null },
})

const emit = defineEmits(['select-station', 'toggle-favorite'])

function handleSelect(station) {
  hapticLight()
  emit('select-station', station)
}

function handleToggleFavorite(station) {
  hapticMedium()
  emit('toggle-favorite', station)
}

async function handleShare(station) {
  hapticMedium()
  await shareStation(station)
}

function trendDeltaStr(trend) {
  if (!trend) return ''
  const abs = Math.abs(trend.diff)
  if (abs < 0.001) return ''
  return (trend.diff > 0 ? '+' : '−') + abs.toFixed(3).replace(/0+$/, '').replace(/\.$/, '')
}

const fuelNames = {
  benzina: 'Benzina',
  diesel: 'Diesel',
  gpl: 'GPL',
}

const desktopResultsLimit = 9
const showAllDesktopResults = ref(false)
const isDesktopLayout = ref(false)

let desktopMediaQuery = null

const visibleStations = computed(() => {
  if (!isDesktopLayout.value || showAllDesktopResults.value) return props.stations
  return props.stations.slice(0, desktopResultsLimit)
})
const resultsCountLabel = computed(() => `${props.stations.length} estratti`)
const hasDesktopOverflow = computed(() => isDesktopLayout.value && props.stations.length > desktopResultsLimit)
const hiddenResultsCount = computed(() => Math.max(0, props.stations.length - desktopResultsLimit))

function stationDisplayName(station) {
  const brand = (station.brand || '').trim()
  const name = (station.name || '').trim()
  if (!brand || !name) return name || brand

  const escapedBrand = brand.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const withoutLeadingBrand = name.replace(new RegExp(`^${escapedBrand}\\s+`, 'i'), '').trim()

  return withoutLeadingBrand || name
}

function mapsUrl(station) {
  return `https://www.google.com/maps/dir/?api=1&destination=${station.lat},${station.lng}&travelmode=driving`
}

function estimateMinutes(distanceKm) {
  return Math.max(2, Math.round((distanceKm / 42) * 60))
}

function handleDesktopLayoutChange(event) {
  isDesktopLayout.value = event.matches
  if (!event.matches) {
    showAllDesktopResults.value = true
  } else {
    showAllDesktopResults.value = false
  }
}

function showAllResults() {
  showAllDesktopResults.value = true
}

watch(
  () => props.stations.length,
  () => {
    if (isDesktopLayout.value) {
      showAllDesktopResults.value = false
    }
  }
)

onMounted(() => {
  desktopMediaQuery = window.matchMedia('(min-width: 1025px)')
  isDesktopLayout.value = desktopMediaQuery.matches
  showAllDesktopResults.value = !desktopMediaQuery.matches
  desktopMediaQuery.addEventListener('change', handleDesktopLayoutChange)
})

onUnmounted(() => {
  desktopMediaQuery?.removeEventListener('change', handleDesktopLayoutChange)
})
</script>

<template>
  <section class="station-list">
    <div class="section-head">
      <div class="section-heading-wrap">
        <h2 class="section-heading">Risultati</h2>
        <span class="section-heading-divider" aria-hidden="true"></span>
        <span class="section-count">{{ resultsCountLabel }}</span>
      </div>
    </div>

    <ul class="list">
      <li v-for="station in visibleStations" :key="station.id" class="list-item-wrap">
        <article class="list-item" :class="{ 'list-item--active': selectedStationId === station.id }">
          <button class="item-main" type="button" @click="handleSelect(station)">
            <div class="item-copy">
              <div class="item-top">
                <div class="item-heading">
                  <span class="item-brand">{{ station.brand }}</span>
                  <span class="item-heading-divider" aria-hidden="true"></span>
                  <h3 class="item-title">{{ stationDisplayName(station) }}</h3>
                </div>
              </div>

              <div class="item-stats">
                <strong class="item-price">€ {{ station.price.toFixed(3) }}</strong>
                <template v-if="getTrend(station)">
                  <span
                    v-if="getTrend(station).dir !== 'flat'"
                    class="item-trend"
                    :class="`item-trend--${getTrend(station).dir}`"
                    :title="`Ieri: € ${getTrend(station).previousPrice.toFixed(3)}`"
                  >
                    <span aria-hidden="true">{{ getTrend(station).dir === 'up' ? '▲' : '▼' }}</span>
                    <span>{{ trendDeltaStr(getTrend(station)) }}</span>
                  </span>
                  <span v-else class="item-trend item-trend--flat" title="Prezzo stabile">=</span>
                </template>
                <div class="item-meta">
                  <span>{{ formatDistance(station.distance) }}</span>
                  <span>{{ estimateMinutes(station.distance) }} min</span>
                  <span>{{ fuelNames[station.fuelType] ?? station.fuelType }}</span>
                  <span>{{ station.selfService ? 'Self' : 'Servito' }}</span>
                </div>
              </div>

              <p class="item-address">{{ station.address }}</p>
            </div>
          </button>

          <div class="item-actions">
            <a class="map-link" :href="mapsUrl(station)" target="_blank" rel="noopener noreferrer">
              Apri in Mappe
            </a>
            <button
              class="action-chip"
              type="button"
              aria-label="Condividi stazione"
              @click.stop="handleShare(station)"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                <path d="M4 12v7a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-7"/>
                <polyline points="16 6 12 2 8 6"/>
                <line x1="12" y1="2" x2="12" y2="15"/>
              </svg>
            </button>
            <button
              class="favorite-btn"
              :class="{ 'favorite-btn--active': favoriteIds.includes(station.id) }"
              type="button"
              :aria-pressed="favoriteIds.includes(station.id)"
              @click.stop="handleToggleFavorite(station)"
            >
              ★
            </button>
          </div>
        </article>
      </li>
    </ul>

    <div v-if="hasDesktopOverflow && !showAllDesktopResults" class="results-actions">
      <button class="results-expand-btn" type="button" @click="showAllResults">
        Visualizza tutto
        <span class="results-expand-btn__count">+{{ hiddenResultsCount }}</span>
      </button>
    </div>
  </section>
</template>

<style scoped>
.station-list {
  display: grid;
  gap: 26px;
}

.section-head {
  display: grid;
  gap: 8px;
  margin-bottom: 8px;
  justify-items: start;
  text-align: left;
}

.section-heading-wrap {
  display: inline-flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
  justify-content: center;
}

.section-heading {
  position: relative;
  display: inline-grid;
  gap: 10px;
  color: var(--text);
  font-size: var(--fs-sm);
  font-weight: 700;
  letter-spacing: var(--tracking-label);
  text-transform: uppercase;
}

.section-heading::after {
  content: '';
  width: 84px;
  height: 2px;
  margin: 0 auto;
  border-radius: 999px;
  background: linear-gradient(90deg, rgba(255, 255, 255, 0.14), rgba(244, 177, 131, 0.82), rgba(255, 255, 255, 0.14));
}

.section-heading-divider {
  width: 1px;
  height: 0.95rem;
  background: rgba(255, 255, 255, 0.22);
}

.section-count {
  color: rgba(255, 255, 255, 0.58);
  font-size: 0.82rem;
  font-weight: 700;
  letter-spacing: 0.04em;
  text-transform: uppercase;
}

.list {
  list-style: none;
  display: grid;
  gap: 16px;
}

.results-actions {
  display: flex;
  justify-content: center;
  margin-top: 4px;
}

.results-expand-btn {
  min-height: 46px;
  padding: 0 18px;
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 999px;
  background:
    linear-gradient(180deg, rgba(255, 255, 255, 0.05), rgba(255, 255, 255, 0.02)),
    rgba(14, 17, 23, 0.76);
  color: #fff6ef;
  font: inherit;
  font-weight: 800;
  display: inline-flex;
  align-items: center;
  gap: 10px;
  cursor: pointer;
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.04),
    0 18px 32px rgba(0, 0, 0, 0.16);
  transition: transform var(--transition), border-color var(--transition), box-shadow var(--transition);
}

.results-expand-btn:hover {
  transform: translateY(-1px);
  border-color: rgba(255, 178, 117, 0.26);
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.05),
    0 22px 36px rgba(0, 0, 0, 0.18);
}

.results-expand-btn__count {
  min-width: 34px;
  min-height: 28px;
  padding: 0 10px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.07);
  color: rgba(255, 214, 181, 0.92);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 0.82rem;
}

.list-item-wrap {
  height: 100%;
}

.list-item {
  position: relative;
  overflow: hidden;
  padding: 18px 16px 16px;
  border-radius: 22px;
  border: 1px solid rgba(255, 255, 255, 0.08);
  background:
    linear-gradient(180deg, rgba(255, 255, 255, 0.05), rgba(255, 255, 255, 0.02)),
    rgba(15, 18, 24, 0.82);
  box-shadow: 0 18px 36px rgba(0, 0, 0, 0.18);
  display: flex;
  align-items: stretch;
  gap: 14px;
  transition: transform var(--transition), border-color var(--transition), box-shadow var(--transition);
}

.list-item::after {
  content: '';
  position: absolute;
  left: 0;
  top: 14px;
  bottom: 14px;
  width: 3px;
  border-radius: 999px;
  background: transparent;
  transition: background var(--transition), box-shadow var(--transition);
}

.favorite-btn,
.action-chip {
  width: 42px;
  height: 42px;
  border-radius: 14px;
  border: 1px solid rgba(255, 255, 255, 0.12);
  background: rgba(14, 18, 25, 0.8);
  color: rgba(255, 219, 190, 0.72);
  font-size: 0.92rem;
  line-height: 1;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  transition:
    transform var(--transition),
    border-color var(--transition),
    background var(--transition),
    color var(--transition),
    box-shadow var(--transition);
}

.action-chip svg {
  width: 15px;
  height: 15px;
}

.favorite-btn:hover,
.action-chip:hover {
  transform: translateY(-1px);
  border-color: rgba(255, 178, 117, 0.34);
  color: #ffd8af;
}

.favorite-btn--active {
  background: linear-gradient(135deg, #e4a46f, #cf7f49 58%, #a55e33);
  border-color: transparent;
  color: white;
  box-shadow: 0 10px 18px rgba(207, 127, 73, 0.18);
}

.item-trend {
  display: inline-flex;
  align-items: center;
  gap: 2px;
  padding: 2px 7px;
  border-radius: 999px;
  font-size: 0.7rem;
  font-weight: 800;
  line-height: 1;
  font-variant-numeric: tabular-nums;
}

.item-trend--up   { background: rgba(255, 99, 99, 0.14); color: #ff8f8f; }
.item-trend--down { background: rgba(48, 211, 157, 0.14); color: #6fe3b9; }
.item-trend--flat { background: rgba(255, 255, 255, 0.06); color: rgba(255, 255, 255, 0.6); padding: 2px 9px; }

.list-item::before {
  content: '';
  position: absolute;
  inset: 0;
  background: linear-gradient(120deg, transparent 8%, rgba(255, 255, 255, 0.05) 48%, transparent 82%);
  transform: translateX(-120%);
  transition: transform 720ms ease;
  pointer-events: none;
}

.list-item:hover,
.list-item--active {
  transform: translateY(-1px);
  border-color: rgba(225, 170, 131, 0.2);
  box-shadow: 0 22px 42px rgba(0, 0, 0, 0.22);
}

.list-item:hover::after,
.list-item--active::after {
  background: linear-gradient(180deg, rgba(255, 196, 148, 0.16), rgba(255, 122, 26, 0.95), rgba(255, 196, 148, 0.16));
  box-shadow: 0 0 18px rgba(255, 122, 26, 0.18);
}

.list-item:hover::before,
.list-item--active::before {
  transform: translateX(120%);
}

.item-main {
  flex: 1;
  min-width: 0;
  display: block;
  border: 0;
  background: transparent;
  color: inherit;
  cursor: pointer;
  text-align: left;
}

.item-copy {
  display: grid;
  gap: 10px;
  align-content: start;
}

.item-top {
  display: block;
}

.item-heading {
  display: flex;
  align-items: baseline;
  gap: 8px;
  flex-wrap: wrap;
}

.item-brand {
  color: #ffb27f;
  font-size: 0.88rem;
  font-weight: 800;
  letter-spacing: 0.04em;
  text-transform: uppercase;
}

.item-heading-divider {
  width: 1px;
  height: 0.95em;
  align-self: center;
  background: rgba(255, 255, 255, 0.28);
}

.item-title {
  color: #fff6ef;
  font-size: 0.88rem;
  font-weight: 700;
  letter-spacing: 0.01em;
  line-height: 1.3;
  text-transform: capitalize;
}

.item-stats {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
}

.item-price {
  min-width: 84px;
  color: #fff6ef;
  font-size: 1.5rem;
  letter-spacing: -0.05em;
  white-space: nowrap;
}

.item-meta {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0;
  color: rgba(255, 255, 255, 0.68);
  font-size: 0.8rem;
  font-weight: 700;
}

.item-meta span {
  display: inline-flex;
  align-items: center;
}

.item-meta span + span::before {
  content: '';
  width: 3px;
  height: 3px;
  margin: 0 8px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.28);
}

.item-address {
  color: rgba(255, 255, 255, 0.5);
  font-size: 0.78rem;
  font-style: italic;
  line-height: 1.55;
}

.item-actions {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 8px;
  align-self: flex-end;
}

.map-link {
  min-width: 124px;
  min-height: 42px;
  padding: 0 12px;
  border-radius: 14px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  text-decoration: none;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.08);
  color: rgba(255, 255, 255, 0.82);
  font-weight: 800;
  transition: transform var(--transition), background var(--transition);
}

@media (min-width: 1025px) {
  .list {
    grid-auto-rows: 1fr;
  }

  .list-item {
    height: 100%;
    min-height: 178px;
    align-items: center;
  }

  .item-main {
    display: flex;
    align-items: stretch;
  }

  .item-copy {
    width: 100%;
    min-height: 100%;
    align-content: center;
    justify-content: center;
  }

  .item-top,
  .item-heading,
  .item-stats {
    align-self: center;
  }
}

.map-link:hover {
  transform: translateY(-1px);
  background: rgba(226, 171, 131, 0.1);
}

@media (max-width: 720px) {
  .section-heading {
    font-size: 0.92rem;
    letter-spacing: 0.14em;
  }

  .section-heading-wrap {
    gap: 10px;
  }

  .section-count {
    font-size: 0.74rem;
  }

  .section-heading::after {
    width: 72px;
  }

  .list {
    grid-auto-flow: column;
    grid-auto-columns: minmax(240px, 74vw);
    overflow-x: auto;
    padding-bottom: 8px;
    padding-inline: 2px 28px;
    scroll-snap-type: x proximity;
    scrollbar-width: none;
  }

  .list::-webkit-scrollbar {
    display: none;
  }

  .list-item-wrap {
    scroll-snap-align: start;
  }

  .results-actions {
    display: none;
  }

  .list-item {
    height: 100%;
    flex-direction: column;
    padding: 18px 16px 16px;
    gap: 14px;
  }

  .item-main {
    width: 100%;
  }

  .item-copy {
    width: 100%;
    justify-items: center;
    padding-right: 0;
  }

  .item-top {
    width: min(100%, 24ch);
    margin: 0 auto;
    display: grid;
    justify-items: center;
    padding-inline: 0;
  }

  .item-heading,
  .item-stats,
  .item-meta {
    justify-content: center;
  }

  .item-heading {
    width: 100%;
    text-align: center;
  }

  .item-address {
    text-align: center;
  }

  .item-stats {
    gap: 10px;
  }

  .map-link {
    flex: 1;
    min-width: 0;
  }

  .item-actions {
    width: 100%;
  }
}

@media (max-width: 560px) {
  .item-main {
    gap: 12px;
  }

  .item-top {
    width: min(100%, 22ch);
  }

  .item-copy {
    padding-right: 0;
  }

  .item-price {
    font-size: 1.34rem;
  }

  .item-brand,
  .item-title {
    font-size: 0.82rem;
  }

  .item-stats {
    gap: 8px;
  }
}
</style>

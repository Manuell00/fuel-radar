<script setup>
import { computed } from 'vue'
import { formatDistance } from '../utils/distance.js'

const props = defineProps({
  stations: { type: Array, required: true },
  selectedStationId: { type: String, default: null },
  favoriteIds: { type: Array, default: () => [] },
})

const emit = defineEmits(['select-station', 'toggle-favorite'])

const fuelNames = {
  benzina: 'Benzina',
  diesel: 'Diesel',
  gpl: 'GPL',
}

const visibleStations = computed(() => props.stations)
const resultsCountLabel = computed(() => `${props.stations.length} estratti`)

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
          <button
            class="favorite-btn"
            :class="{ 'favorite-btn--active': favoriteIds.includes(station.id) }"
            type="button"
            :aria-pressed="favoriteIds.includes(station.id)"
            @click.stop="emit('toggle-favorite', station)"
          >
            ★
          </button>

          <button class="item-main" type="button" @click="emit('select-station', station)">
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

          <a class="map-link" :href="mapsUrl(station)" target="_blank" rel="noopener noreferrer">
            Apri in Mappe
          </a>
        </article>
      </li>
    </ul>
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
  justify-items: center;
  text-align: center;
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
  color: #fff5ed;
  font-size: 1rem;
  font-weight: 800;
  letter-spacing: 0.12em;
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

.favorite-btn {
  position: absolute;
  top: 10px;
  right: 10px;
  z-index: 2;
  width: 30px;
  height: 30px;
  border-radius: 50%;
  border: 1px solid rgba(255, 255, 255, 0.12);
  background: rgba(14, 18, 25, 0.8);
  color: rgba(255, 219, 190, 0.72);
  font-size: 0.92rem;
  line-height: 1;
  cursor: pointer;
  transition:
    transform var(--transition),
    border-color var(--transition),
    background var(--transition),
    color var(--transition),
    box-shadow var(--transition);
}

.favorite-btn:hover {
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
  gap: 8px;
  padding-right: 34px;
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

.map-link {
  min-width: 82px;
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
    grid-auto-columns: minmax(280px, 84vw);
    overflow-x: auto;
    padding-bottom: 8px;
    padding-inline: 2px 10px;
    scroll-snap-type: x proximity;
    scrollbar-width: none;
  }

  .list::-webkit-scrollbar {
    display: none;
  }

  .list-item-wrap {
    scroll-snap-align: start;
  }

  .list-item {
    height: 100%;
    flex-direction: column;
    padding: 18px 16px 16px;
    gap: 14px;
  }

  .favorite-btn {
    top: 10px;
    right: 10px;
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
    min-height: 42px;
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

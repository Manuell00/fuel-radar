<script setup>
import { formatDistance } from '../utils/distance.js'

defineProps({
  stations: { type: Array, required: true },
  selectedStationId: { type: String, default: null },
})

const emit = defineEmits(['select-station'])

const fuelNames = {
  benzina: 'Benzina',
  diesel: 'Diesel',
  gpl: 'GPL',
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
      <span class="section-kicker">Risultati</span>
      <h2 class="section-title">Tutti i distributori trovati attorno alla tua posizione.</h2>
    </div>

    <ul class="list">
      <li v-for="(station, index) in stations" :key="station.id" class="list-item-wrap">
        <article class="list-item" :class="{ 'list-item--active': selectedStationId === station.id }">
          <button class="item-main" type="button" @click="emit('select-station', station)">
            <span class="rank">{{ index + 1 }}</span>

            <div class="item-copy">
              <div class="item-top">
                <div>
                  <span class="item-brand">{{ station.brand }}</span>
                  <h3 class="item-title">{{ station.name }}</h3>
                </div>
                <strong class="item-price">€ {{ station.price.toFixed(3) }}</strong>
              </div>

              <div class="item-meta">
                <span>{{ formatDistance(station.distance) }}</span>
                <span>{{ estimateMinutes(station.distance) }} min</span>
                <span>{{ fuelNames[station.fuelType] ?? station.fuelType }}</span>
                <span>{{ station.selfService ? 'Self' : 'Servito' }}</span>
              </div>

              <p class="item-address">{{ station.address }}</p>
            </div>
          </button>

          <a class="map-link" :href="mapsUrl(station)" target="_blank" rel="noopener noreferrer">
            Apri
          </a>
        </article>
      </li>
    </ul>
  </section>
</template>

<style scoped>
.station-list {
  display: grid;
  gap: 16px;
}

.section-head {
  display: grid;
  gap: 6px;
}

.section-kicker {
  color: rgba(255, 189, 147, 0.86);
  font-size: 0.68rem;
  font-weight: 800;
  letter-spacing: 0.16em;
  text-transform: uppercase;
}

.section-title {
  font-size: 1.18rem;
  font-weight: 800;
  letter-spacing: -0.04em;
  color: #fff6ef;
}

.list {
  list-style: none;
  display: grid;
  gap: 12px;
  counter-reset: station-rank;
}

.list-item {
  position: relative;
  overflow: hidden;
  padding: 14px;
  border-radius: 22px;
  border: 1px solid rgba(255, 255, 255, 0.08);
  background:
    linear-gradient(180deg, rgba(255, 255, 255, 0.05), rgba(255, 255, 255, 0.02)),
    rgba(15, 18, 24, 0.82);
  box-shadow: 0 18px 36px rgba(0, 0, 0, 0.18);
  display: flex;
  align-items: stretch;
  gap: 12px;
  transition: transform var(--transition), border-color var(--transition), box-shadow var(--transition);
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
  border-color: rgba(255, 122, 26, 0.22);
  box-shadow: 0 22px 42px rgba(0, 0, 0, 0.22);
}

.list-item:hover::before,
.list-item--active::before {
  transform: translateX(120%);
}

.item-main {
  flex: 1;
  min-width: 0;
  display: flex;
  align-items: flex-start;
  gap: 14px;
  border: 0;
  background: transparent;
  color: inherit;
  cursor: pointer;
  text-align: left;
}

.rank {
  width: 34px;
  height: 34px;
  flex-shrink: 0;
  display: grid;
  place-items: center;
  border-radius: 50%;
  background: linear-gradient(135deg, #ff9c52, #ff7a1a 55%, #d95504);
  color: white;
  font-weight: 800;
  box-shadow: 0 12px 22px rgba(255, 122, 26, 0.22);
}

.item-copy {
  flex: 1;
  min-width: 0;
  display: grid;
  gap: 8px;
}

.item-top {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
}

.item-brand {
  color: #ffae78;
  font-size: 0.68rem;
  font-weight: 800;
  letter-spacing: 0.1em;
  text-transform: uppercase;
}

.item-title {
  margin-top: 4px;
  color: #fff6ef;
  font-size: 1rem;
  letter-spacing: -0.03em;
}

.item-price {
  color: #fff6ef;
  font-size: 1.28rem;
  letter-spacing: -0.04em;
  white-space: nowrap;
}

.item-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  color: rgba(255, 255, 255, 0.68);
  font-size: 0.82rem;
}

.item-address {
  color: rgba(255, 255, 255, 0.5);
  font-size: 0.8rem;
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
  background: rgba(255, 122, 26, 0.12);
}

@media (max-width: 720px) {
  .list-item {
    flex-direction: column;
  }

  .item-main {
    width: 100%;
  }

  .map-link {
    min-height: 42px;
    width: 100%;
  }
}
</style>

<script setup>
import { computed } from 'vue'
import { formatDistance } from '../utils/distance.js'

const props = defineProps({
  station: { type: Object, required: true },
  type: { type: String, default: 'default' },
  label: { type: String, default: '' },
  isFavorite: { type: Boolean, default: false },
})

const emit = defineEmits(['select', 'toggle-favorite'])

const fuelNames = {
  benzina: 'Benzina',
  diesel: 'Diesel',
  gpl: 'GPL',
}

const mapsUrl = computed(() =>
  `https://www.google.com/maps/dir/?api=1&destination=${props.station.lat},${props.station.lng}&travelmode=driving`
)

const typeClass = computed(() => `card--${props.type}`)

function selectCard() {
  emit('select', props.station)
}

function toggleFavorite() {
  emit('toggle-favorite', props.station)
}
</script>

<template>
  <article class="card" :class="typeClass">
    <div class="card-top">
      <span class="card-label">{{ label }}</span>
      <div class="card-top-actions">
        <span class="card-brand">{{ station.brand }}</span>
        <button
          class="favorite-btn"
          :class="{ 'favorite-btn--active': isFavorite }"
          type="button"
          :aria-pressed="isFavorite"
          @click.stop="toggleFavorite"
        >
          ★
        </button>
      </div>
    </div>

    <div class="card-body">
      <h3 class="card-title">{{ station.name }}</h3>

      <div class="price-row">
        <strong class="price">€ {{ station.price.toFixed(3) }}</strong>
        <span class="price-meta">{{ fuelNames[station.fuelType] ?? station.fuelType }}</span>
      </div>

      <div class="meta-row">
        <span>{{ formatDistance(station.distance) }}</span>
        <span>{{ station.selfService ? 'Self service' : 'Servito' }}</span>
      </div>

      <p class="card-address">{{ station.address }}</p>
    </div>

    <div class="card-actions">
      <button class="action-btn action-btn--primary" type="button" @click="selectCard">
        Vedi sulla mappa
      </button>
      <a class="action-btn action-btn--ghost" :href="mapsUrl" target="_blank" rel="noopener noreferrer">
        Apri in Mappe
      </a>
    </div>
  </article>
</template>

<style scoped>
.card {
  position: relative;
  overflow: hidden;
  padding: 18px;
  border-radius: 24px;
  border: 1px solid rgba(255, 255, 255, 0.08);
  background:
    linear-gradient(180deg, rgba(255, 255, 255, 0.06), rgba(255, 255, 255, 0.02)),
    rgba(15, 18, 24, 0.84);
  box-shadow: 0 20px 42px rgba(0, 0, 0, 0.2);
  display: grid;
  gap: 16px;
  transition: transform var(--transition), box-shadow var(--transition), border-color var(--transition);
}

.card::before {
  content: '';
  position: absolute;
  inset: 0;
  background: linear-gradient(120deg, transparent 14%, rgba(255, 255, 255, 0.06) 48%, transparent 82%);
  transform: translateX(-120%);
  transition: transform 720ms ease;
  pointer-events: none;
}

.card:hover {
  transform: translateY(-3px);
  box-shadow: 0 28px 54px rgba(0, 0, 0, 0.26);
}

.card:hover::before {
  transform: translateX(120%);
}

.card--cheapest { border-color: rgba(48, 211, 157, 0.26); }
.card--nearest { border-color: rgba(98, 182, 255, 0.24); }
.card--best { border-color: rgba(255, 122, 26, 0.26); }

.card-top,
.meta-row,
.card-actions {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  flex-wrap: wrap;
}

.card-top-actions {
  display: inline-flex;
  align-items: center;
  gap: 10px;
}

.card-label,
.card-brand {
  font-size: 0.72rem;
  font-weight: 800;
  letter-spacing: 0.09em;
  text-transform: uppercase;
}

.card-label { color: rgba(255, 255, 255, 0.62); }
.card-brand { color: #ffae78; }

.favorite-btn {
  width: 34px;
  height: 34px;
  border-radius: 50%;
  border: 1px solid rgba(255, 255, 255, 0.12);
  background: rgba(255, 255, 255, 0.04);
  color: rgba(255, 219, 190, 0.72);
  font-size: 1rem;
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
  background: linear-gradient(135deg, #ffb977, #ff7a1a 60%, #d95504);
  border-color: transparent;
  color: white;
  box-shadow: 0 10px 18px rgba(255, 122, 26, 0.2);
}

.card-body {
  display: grid;
  gap: 10px;
}

.card-title {
  color: #fff6ef;
  font-size: 1.04rem;
  letter-spacing: -0.03em;
}

.price-row {
  display: flex;
  align-items: baseline;
  gap: 8px;
  flex-wrap: wrap;
}

.price {
  color: #fff6ef;
  font-size: 2rem;
  line-height: 1;
  letter-spacing: -0.05em;
}

.price-meta {
  color: #ffb37b;
  font-weight: 700;
}

.meta-row {
  color: rgba(255, 255, 255, 0.68);
  font-size: 0.84rem;
}

.card-address {
  color: rgba(255, 255, 255, 0.5);
  line-height: 1.58;
  font-size: 0.82rem;
}

.action-btn {
  min-height: 42px;
  padding: 0 14px;
  border-radius: 12px;
  text-decoration: none;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  transition: transform var(--transition), border-color var(--transition), background var(--transition);
}

.action-btn--primary {
  border: 0;
  background: linear-gradient(135deg, #ff9c52, #ff7a1a 55%, #d95504);
  color: white;
  font-weight: 800;
  cursor: pointer;
}

.action-btn--ghost {
  border: 1px solid rgba(255, 255, 255, 0.08);
  background: rgba(255, 255, 255, 0.04);
  color: rgba(255, 255, 255, 0.78);
  font-weight: 700;
}

.action-btn:hover {
  transform: translateY(-1px);
}

@media (max-width: 720px) {
  .card {
    gap: 14px;
  }

  .card-actions {
    display: grid;
    grid-template-columns: 1fr;
  }

  .action-btn {
    width: 100%;
  }
}

@media (max-width: 560px) {
  .card {
    padding: 16px;
    border-radius: 20px;
  }

  .card-title {
    font-size: 0.96rem;
    line-height: 1.35;
  }

  .price {
    font-size: 1.7rem;
  }
}
</style>

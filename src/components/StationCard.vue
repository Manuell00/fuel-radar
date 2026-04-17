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
const stationDisplayName = computed(() => {
  const brand = (props.station.brand || '').trim()
  const name = (props.station.name || '').trim()
  if (!brand || !name) return name || brand

  const escapedBrand = brand.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const withoutLeadingBrand = name.replace(new RegExp(`^${escapedBrand}\\s+`, 'i'), '').trim()

  return withoutLeadingBrand || name
})

function selectCard() {
  emit('select', props.station)
}

function toggleFavorite() {
  emit('toggle-favorite', props.station)
}
</script>

<template>
  <article class="card" :class="[typeClass, { 'card--featured': label }]">
    <div class="card-top">
      <div class="card-label-wrap" v-if="label">
        <span class="card-label">{{ label }}</span>
      </div>
      <div class="card-top-actions">
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
      <div class="card-heading">
        <span class="card-brand-inline">{{ station.brand }}</span>
        <span class="card-heading-divider" aria-hidden="true"></span>
        <h3 class="card-title">{{ stationDisplayName }}</h3>
      </div>

      <div class="card-stats">
        <div class="price-row">
          <strong class="price">€ {{ station.price.toFixed(3) }}</strong>
          <span class="price-meta">{{ fuelNames[station.fuelType] ?? station.fuelType }}</span>
        </div>
        <span class="stats-divider" aria-hidden="true"></span>
        <span class="distance-pill">{{ formatDistance(station.distance) }}</span>
      </div>

      <p class="card-address">{{ station.address }}</p>
    </div>

    <div class="card-actions">
      <button class="action-btn action-btn--primary" type="button" @click="selectCard">
        Visualizza
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
.card--best { border-color: rgba(225, 170, 131, 0.22); }

.card--featured {
  box-shadow:
    0 26px 52px rgba(0, 0, 0, 0.24),
    inset 0 1px 0 rgba(255, 255, 255, 0.04);
}

.card--featured .card-top {
  min-height: 34px;
  align-items: start;
}

.card--featured .card-body {
  width: 100%;
  justify-items: center;
}

.card--featured .card-heading {
  max-width: 18ch;
  justify-content: center;
}

.card--featured.card--cheapest {
  background:
    radial-gradient(circle at top left, rgba(48, 211, 157, 0.12), transparent 30%),
    linear-gradient(180deg, rgba(255, 255, 255, 0.06), rgba(255, 255, 255, 0.02)),
    rgba(15, 18, 24, 0.84);
}

.card--featured.card--nearest {
  background:
    radial-gradient(circle at top left, rgba(98, 182, 255, 0.12), transparent 30%),
    linear-gradient(180deg, rgba(255, 255, 255, 0.06), rgba(255, 255, 255, 0.02)),
    rgba(15, 18, 24, 0.84);
}

.card--featured.card--best {
  background:
    radial-gradient(circle at top left, rgba(224, 170, 129, 0.12), transparent 30%),
    linear-gradient(180deg, rgba(255, 255, 255, 0.06), rgba(255, 255, 255, 0.02)),
    rgba(15, 18, 24, 0.84);
}

.card-top,
.card-actions {
  display: grid;
  grid-template-columns: 1fr;
  gap: 10px;
}

.card-top-actions {
  display: inline-flex;
  align-items: center;
  gap: 10px;
  justify-content: flex-end;
}

.card-label-wrap {
  display: inline-grid;
  gap: 0;
  justify-items: start;
  width: max-content;
  max-width: 100%;
}

.card-label-wrap::after {
  content: none;
}

.card-label {
  font-size: 0.8rem;
  font-weight: 800;
  letter-spacing: 0.05em;
  text-transform: uppercase;
  line-height: 1.15;
  color: #fff8f2;
  opacity: 0.96;
}

.card--featured .card-label {
  text-shadow: 0 1px 12px rgba(0, 0, 0, 0.18);
}

.card--cheapest .card-label-wrap {
  color: #7ff0c7;
}

.card--nearest .card-label-wrap {
  color: #9ed5ff;
}

.card--best .card-label-wrap {
  color: #efc6a2;
}

.favorite-btn {
  align-self: start;
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
  background: linear-gradient(135deg, #e4a46f, #cf7f49 58%, #a55e33);
  border-color: transparent;
  color: white;
  box-shadow: 0 10px 18px rgba(207, 127, 73, 0.18);
}

.card-body {
  display: grid;
  gap: 10px;
}

.card-heading {
  display: flex;
  align-items: baseline;
  gap: 8px;
  flex-wrap: wrap;
}

.card-brand-inline,
.card-title {
  color: #fff6ef;
  font-size: 1.04rem;
  font-weight: 700;
  letter-spacing: 0.01em;
  line-height: 1.3;
  text-transform: capitalize;
}

.card-brand-inline {
  color: #ffb27f;
  white-space: nowrap;
  text-transform: uppercase;
}

.card-heading-divider {
  width: 1px;
  height: 0.95em;
  align-self: center;
  background: rgba(255, 255, 255, 0.3);
}

.price-row {
  display: flex;
  align-items: baseline;
  gap: 8px;
  flex-wrap: wrap;
}

.card-stats {
  display: flex;
  align-items: center;
  gap: 14px;
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

.stats-divider {
  width: 1px;
  align-self: stretch;
  min-height: 32px;
  background: linear-gradient(180deg, rgba(255, 255, 255, 0.04), rgba(232, 184, 149, 0.34), rgba(255, 255, 255, 0.04));
}

.distance-pill {
  display: inline-flex;
  align-items: center;
  min-height: 34px;
  padding: 0 12px;
  border-radius: 999px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  background: rgba(255, 255, 255, 0.06);
  color: #fff3e6;
  font-size: 0.92rem;
  font-weight: 800;
  letter-spacing: 0.01em;
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.04);
}

.card-address {
  color: rgba(255, 255, 255, 0.5);
  line-height: 1.58;
  font-size: 0.78rem;
  font-style: italic;
}

.action-btn {
  min-height: 46px;
  width: 100%;
  padding: 0 14px;
  border-radius: 14px;
  text-decoration: none;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  transition:
    transform var(--transition),
    border-color var(--transition),
    background var(--transition),
    box-shadow var(--transition),
    color var(--transition);
}

.action-btn--primary {
  border: 1px solid rgba(255, 190, 146, 0.24);
  background:
    linear-gradient(180deg, rgba(255, 183, 130, 0.18), rgba(255, 154, 83, 0.1)),
    rgba(255, 255, 255, 0.05);
  color: #fff3e7;
  font-weight: 800;
  cursor: pointer;
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.06),
    0 10px 22px rgba(255, 154, 83, 0.1);
}

.action-btn--ghost {
  border: 1px solid rgba(255, 255, 255, 0.08);
  background: rgba(255, 255, 255, 0.035);
  color: rgba(255, 255, 255, 0.8);
  font-weight: 700;
}

.action-btn:hover {
  transform: translateY(-1px);
}

.action-btn--primary:hover {
  border-color: rgba(255, 195, 156, 0.32);
  background:
    linear-gradient(180deg, rgba(255, 188, 142, 0.22), rgba(255, 160, 92, 0.14)),
    rgba(255, 255, 255, 0.06);
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.07),
    0 14px 28px rgba(255, 160, 92, 0.14);
}

.action-btn--ghost:hover {
  background: rgba(255, 255, 255, 0.06);
}

@media (max-width: 720px) {
  .card {
    gap: 14px;
  }

  .card--featured .card-top {
    position: relative;
    grid-template-columns: minmax(0, 1fr) auto;
    align-items: start;
  }

  .card-top {
    grid-template-columns: minmax(0, 1fr) auto;
    align-items: start;
  }

  .card-label-wrap {
    justify-self: start;
    justify-items: start;
    text-align: left;
  }

  .card--featured .card-label-wrap {
    width: auto;
    max-width: calc(100% - 52px);
  }

  .card--featured .card-top-actions {
    position: static;
    width: auto;
  }

  .card-label {
    font-size: 0.86rem;
  }

  .card-body {
    justify-items: center;
    text-align: center;
  }

  .card-heading,
  .card-stats {
    justify-content: center;
  }

  .card-address {
    text-align: center;
  }

  .card-actions {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .card-stats {
    gap: 14px;
  }
}

@media (max-width: 560px) {
  .card {
    padding: 16px;
    border-radius: 20px;
  }

  .card--featured .card-top {
    grid-template-columns: minmax(0, 1fr) auto;
  }

  .card-body {
    justify-items: center;
    text-align: center;
  }

  .card-top {
    grid-template-columns: minmax(0, 1fr) auto;
    gap: 10px;
  }

  .card-top-actions {
    width: auto;
  }

  .card-label {
    font-size: 0.82rem;
  }

  .card-actions {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .card-heading {
    gap: 6px;
  }

  .card-stats {
    gap: 10px;
  }

  .stats-divider {
    min-height: 28px;
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

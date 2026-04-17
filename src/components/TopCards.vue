<script setup>
import StationCard from './StationCard.vue'

defineProps({
  cheapest: { type: Object, default: null },
  nearest: { type: Object, default: null },
  bestCompromise: { type: Object, default: null },
  favoriteIds: { type: Array, default: () => [] },
  getTrend: { type: Function, default: null },
})

const emit = defineEmits(['select-station', 'toggle-favorite'])
</script>

<template>
  <section class="top-cards">
    <div class="section-head">
      <p class="section-heading">In evidenza</p>
    </div>

    <div class="cards-grid">
      <StationCard
        v-if="cheapest"
        :station="cheapest"
        type="cheapest"
        label="Più economico"
        :is-favorite="favoriteIds.includes(cheapest.id)"
        :trend="getTrend ? getTrend(cheapest) : null"
        @select="emit('select-station', cheapest)"
        @toggle-favorite="emit('toggle-favorite', $event)"
      />
      <StationCard
        v-if="nearest"
        :station="nearest"
        type="nearest"
        label="Più vicino"
        :is-favorite="favoriteIds.includes(nearest.id)"
        :trend="getTrend ? getTrend(nearest) : null"
        @select="emit('select-station', nearest)"
        @toggle-favorite="emit('toggle-favorite', $event)"
      />
      <StationCard
        v-if="bestCompromise"
        :station="bestCompromise"
        type="best"
        label="Miglior compromesso"
        :is-favorite="favoriteIds.includes(bestCompromise.id)"
        :trend="getTrend ? getTrend(bestCompromise) : null"
        @select="emit('select-station', bestCompromise)"
        @toggle-favorite="emit('toggle-favorite', $event)"
      />
    </div>
  </section>
</template>

<style scoped>
.top-cards {
  display: grid;
  gap: 28px;
}

.section-head {
  margin-bottom: 8px;
  display: flex;
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
  background: linear-gradient(90deg, rgba(255, 255, 255, 0.14), rgba(255, 160, 92, 0.95), rgba(255, 255, 255, 0.14));
}

.cards-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 18px;
}

@media (max-width: 860px) {
  .cards-grid {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 560px) {
  .top-cards {
    gap: 22px;
  }

  .section-heading {
    font-size: 0.92rem;
    letter-spacing: 0.14em;
  }

  .section-heading::after {
    width: 72px;
  }
}
</style>

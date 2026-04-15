<script setup>
import StationCard from './StationCard.vue'

defineProps({
  cheapest: { type: Object, default: null },
  nearest: { type: Object, default: null },
  bestCompromise: { type: Object, default: null },
  favoriteIds: { type: Array, default: () => [] },
})

const emit = defineEmits(['select-station', 'toggle-favorite'])
</script>

<template>
  <section class="top-cards">
    <div class="section-head">
      <h2 class="section-title">In evidenza</h2>
    </div>

    <div class="cards-grid">
      <StationCard
        v-if="cheapest"
        :station="cheapest"
        type="cheapest"
        label="Più economico"
        :is-favorite="favoriteIds.includes(cheapest.id)"
        @select="emit('select-station', cheapest)"
        @toggle-favorite="emit('toggle-favorite', $event)"
      />
      <StationCard
        v-if="nearest"
        :station="nearest"
        type="nearest"
        label="Più vicino"
        :is-favorite="favoriteIds.includes(nearest.id)"
        @select="emit('select-station', nearest)"
        @toggle-favorite="emit('toggle-favorite', $event)"
      />
      <StationCard
        v-if="bestCompromise"
        :station="bestCompromise"
        type="best"
        label="Miglior compromesso"
        :is-favorite="favoriteIds.includes(bestCompromise.id)"
        @select="emit('select-station', bestCompromise)"
        @toggle-favorite="emit('toggle-favorite', $event)"
      />
    </div>
  </section>
</template>

<style scoped>
.top-cards {
  display: grid;
  gap: 22px;
}

.section-head {
  display: grid;
  gap: 8px;
  margin-bottom: 4px;
  justify-items: center;
  text-align: center;
}

.section-title {
  font-size: 1.28rem;
  font-weight: 800;
  letter-spacing: -0.04em;
  color: #fff6ef;
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
    gap: 18px;
  }

  .section-head {
    gap: 8px;
  }

  .section-title {
    font-size: 1.02rem;
    line-height: 1.35;
  }
}
</style>

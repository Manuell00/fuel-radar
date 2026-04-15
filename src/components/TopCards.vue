<script setup>
import StationCard from './StationCard.vue'

defineProps({
  cheapest: { type: Object, default: null },
  nearest: { type: Object, default: null },
  bestCompromise: { type: Object, default: null },
})

const emit = defineEmits(['select-station'])
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
        @select="emit('select-station', cheapest)"
      />
      <StationCard
        v-if="nearest"
        :station="nearest"
        type="nearest"
        label="Più vicino"
        @select="emit('select-station', nearest)"
      />
      <StationCard
        v-if="bestCompromise"
        :station="bestCompromise"
        type="best"
        label="Miglior compromesso"
        @select="emit('select-station', bestCompromise)"
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

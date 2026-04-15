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
      <span class="section-kicker">In evidenza</span>
      <h2 class="section-title">Le tre scorciatoie più utili per scegliere il distributore giusto.</h2>
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
  gap: 10px;
  margin-bottom: 4px;
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
</style>

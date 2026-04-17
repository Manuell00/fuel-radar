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
    <div class="featured-intro">
      <span class="featured-intro__eyebrow">Scelte rapide</span>
      <h2 class="featured-intro__title">I tre distributori da guardare per primi.</h2>
      <p class="featured-intro__text">
        Prezzo, distanza e compromesso migliore, gia ordinati per aiutarti a decidere in pochi secondi.
      </p>
    </div>

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
  gap: 22px;
}

.featured-intro {
  display: grid;
  gap: 8px;
  padding: 22px 22px 0;
}

.featured-intro__eyebrow {
  color: rgba(255, 184, 141, 0.76);
  font-size: 0.72rem;
  font-weight: 800;
  letter-spacing: 0.18em;
  text-transform: uppercase;
}

.featured-intro__title {
  color: #fff7f0;
  font-size: clamp(1.3rem, 2.1vw, 1.7rem);
  line-height: 1.05;
  letter-spacing: -0.05em;
}

.featured-intro__text {
  color: rgba(255, 255, 255, 0.62);
  line-height: 1.55;
  font-size: 0.92rem;
}

.section-head {
  margin-bottom: 4px;
  display: flex;
  justify-content: flex-start;
  padding: 0 22px;
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
  margin: 0;
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

  .featured-intro {
    padding: 0;
  }

  .featured-intro__title {
    font-size: 1.2rem;
  }

  .section-heading {
    font-size: 0.92rem;
    letter-spacing: 0.14em;
  }

  .section-heading::after {
    width: 72px;
  }

  .section-head {
    padding: 0;
  }
}
</style>

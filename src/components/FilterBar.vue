<script setup>
const props = defineProps({
  filters: { type: Object, required: true },
})

const emit = defineEmits(['update:filters'])

const fuelOptions = [
  { value: 'tutti', label: 'Tutti' },
  { value: 'benzina', label: 'Benzina' },
  { value: 'diesel', label: 'Diesel' },
  { value: 'gpl', label: 'GPL' },
]

const modeOptions = [
  { value: 'tutti', label: 'Tutti' },
  { value: 'self', label: 'Self' },
  { value: 'servito', label: 'Servito' },
]

function update(key, value) {
  emit('update:filters', { ...props.filters, [key]: value })
}

function sliderPct(value) {
  return `${((value - 1) / 49) * 100}%`
}
</script>

<template>
  <section class="filter-bar">
    <div class="filter-copy">
      <span class="filter-kicker">Filtri radar</span>
      <h2 class="filter-title">Affina carburante, modalità e raggio senza spezzare il flusso della ricerca.</h2>
    </div>

    <div class="filter-grid">
      <div class="filter-group">
        <span class="group-label">Carburante</span>
        <div class="chips">
          <button
            v-for="option in fuelOptions"
            :key="option.value"
            class="chip"
            :class="{ 'chip--active': filters.fuelType === option.value }"
            type="button"
            @click="update('fuelType', option.value)"
          >
            {{ option.label }}
          </button>
        </div>
      </div>

      <div class="filter-group">
        <span class="group-label">Modalità</span>
        <div class="chips">
          <button
            v-for="option in modeOptions"
            :key="option.value"
            class="chip"
            :class="{ 'chip--active': filters.mode === option.value }"
            type="button"
            @click="update('mode', option.value)"
          >
            {{ option.label }}
          </button>
        </div>
      </div>

      <div class="filter-group filter-group--slider">
        <div class="slider-head">
          <span class="group-label">Raggio</span>
          <span class="slider-value">{{ filters.radius }} km</span>
        </div>

        <input
          class="slider"
          type="range"
          min="1"
          max="50"
          step="1"
          :value="filters.radius"
          :style="{ '--pct': sliderPct(filters.radius) }"
          @input="update('radius', Number($event.target.value))"
        />
      </div>
    </div>
  </section>
</template>

<style scoped>
.filter-bar {
  padding: 20px;
  display: grid;
  gap: 18px;
}

.filter-copy {
  display: grid;
  gap: 6px;
}

.filter-kicker {
  color: rgba(255, 189, 147, 0.86);
  font-size: 0.68rem;
  font-weight: 800;
  letter-spacing: 0.16em;
  text-transform: uppercase;
}

.filter-title {
  max-width: 30ch;
  font-size: 1.2rem;
  font-weight: 800;
  letter-spacing: -0.04em;
  color: #fff6ef;
}

.filter-grid {
  display: grid;
  grid-template-columns: 1.1fr 1.1fr 0.9fr;
  gap: 14px;
}

.filter-group {
  padding: 16px;
  border-radius: 20px;
  border: 1px solid rgba(255, 255, 255, 0.06);
  background: rgba(255, 255, 255, 0.03);
  display: grid;
  gap: 12px;
}

.group-label {
  color: rgba(255, 255, 255, 0.48);
  font-size: 0.7rem;
  font-weight: 800;
  letter-spacing: 0.1em;
  text-transform: uppercase;
}

.chips {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.chip {
  min-height: 40px;
  padding: 0 14px;
  border-radius: 999px;
  border: 1px solid rgba(255, 255, 255, 0.08);
  background: rgba(255, 255, 255, 0.05);
  color: rgba(255, 255, 255, 0.74);
  cursor: pointer;
  font-weight: 700;
  transition:
    transform var(--transition),
    border-color var(--transition),
    background var(--transition),
    color var(--transition),
    box-shadow var(--transition);
}

.chip:hover {
  transform: translateY(-1px);
  border-color: rgba(255, 122, 26, 0.36);
  color: #fff4ec;
}

.chip--active {
  background: linear-gradient(135deg, #ff9c52, #ff7a1a 55%, #d95504);
  border-color: transparent;
  color: white;
  box-shadow: 0 12px 24px rgba(255, 122, 26, 0.2);
}

.filter-group--slider {
  align-content: start;
}

.slider-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
}

.slider-value {
  color: #ffb37b;
  font-weight: 800;
}

.slider {
  width: 100%;
  appearance: none;
  height: 6px;
  border-radius: 999px;
  background:
    linear-gradient(
      90deg,
      #ff7a1a 0,
      #ff7a1a var(--pct),
      rgba(255, 255, 255, 0.12) var(--pct),
      rgba(255, 255, 255, 0.12) 100%
    );
  outline: none;
  cursor: pointer;
}

.slider::-webkit-slider-thumb {
  appearance: none;
  width: 20px;
  height: 20px;
  border-radius: 50%;
  border: 3px solid white;
  background: #ff7a1a;
  box-shadow: 0 10px 18px rgba(255, 122, 26, 0.26);
}

.slider::-moz-range-thumb {
  width: 20px;
  height: 20px;
  border-radius: 50%;
  border: 3px solid white;
  background: #ff7a1a;
  box-shadow: 0 10px 18px rgba(255, 122, 26, 0.26);
}

@media (max-width: 860px) {
  .filter-grid {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 560px) {
  .filter-bar {
    padding: 16px;
  }
}
</style>

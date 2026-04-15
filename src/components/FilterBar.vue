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
      <h2 class="filter-title">Filtri Radar</h2>
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
  position: relative;
  overflow: hidden;
}

.filter-bar::before {
  content: '';
  position: absolute;
  inset: 0;
  background:
    radial-gradient(circle at 10% 0%, rgba(255, 122, 26, 0.08), transparent 24%),
    linear-gradient(180deg, rgba(255, 255, 255, 0.018), transparent 42%);
  pointer-events: none;
}

.filter-copy {
  display: grid;
  justify-items: center;
  text-align: center;
  animation: filter-title-in 720ms cubic-bezier(0.22, 1, 0.36, 1) both;
}

.filter-title {
  max-width: 30ch;
  font-size: clamp(2rem, 5vw, 3.2rem);
  font-weight: 800;
  letter-spacing: -0.06em;
  color: #fff6ef;
  text-shadow:
    0 10px 24px rgba(0, 0, 0, 0.28),
    0 0 26px rgba(255, 122, 26, 0.12);
}

.filter-grid {
  display: grid;
  grid-template-columns: 1.1fr 1.1fr 0.9fr;
  gap: 14px;
  position: relative;
  z-index: 1;
}

.filter-group {
  position: relative;
  overflow: hidden;
  padding: 16px;
  border-radius: 20px;
  border: 1px solid rgba(255, 255, 255, 0.06);
  background: rgba(255, 255, 255, 0.03);
  display: grid;
  gap: 12px;
  justify-items: center;
  text-align: center;
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.03);
  transition:
    transform var(--transition),
    border-color var(--transition),
    box-shadow var(--transition),
    background var(--transition);
}

.filter-group::after {
  content: '';
  position: absolute;
  inset: 0;
  background: linear-gradient(120deg, transparent 8%, rgba(255, 255, 255, 0.04) 48%, transparent 86%);
  transform: translateX(-120%);
  transition: transform 700ms ease;
  pointer-events: none;
}

.filter-group:hover::after {
  transform: translateX(120%);
}

.filter-group:hover {
  transform: translateY(-2px);
  border-color: rgba(255, 122, 26, 0.18);
  background: rgba(255, 255, 255, 0.04);
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.05),
    0 22px 36px rgba(0, 0, 0, 0.18);
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
  justify-content: center;
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
  justify-items: stretch;
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
  box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.04);
}

@keyframes filter-title-in {
  from {
    opacity: 0;
    transform: translateY(14px) scale(0.99);
  }
  to {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
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

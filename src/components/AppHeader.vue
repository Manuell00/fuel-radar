<script setup>
import FuelRadarLogo from './FuelRadarLogo.vue'

defineProps({
  stationCount: { type: Number, default: 0 },
  searchMode: { type: String, default: 'In attesa' },
})

const emit = defineEmits(['primary-action', 'secondary-action'])
</script>

<template>
  <header class="app-header">
    <div class="header-shell">
      <div class="hero-visual" aria-hidden="true">
        <div class="hero-radar">
          <span class="hero-radar__ring hero-radar__ring--outer"></span>
          <span class="hero-radar__ring hero-radar__ring--mid"></span>
          <span class="hero-radar__ring hero-radar__ring--inner"></span>
          <span class="hero-radar__node hero-radar__node--main"></span>
          <span class="hero-radar__node hero-radar__node--top"></span>
          <span class="hero-radar__node hero-radar__node--right"></span>
          <span class="hero-radar__beam"></span>
        </div>
      </div>

      <div class="hero-copy">
        <div class="brand-row">
          <FuelRadarLogo :size="28" />
          <span class="brand-label">Fuel Radar</span>
        </div>

        <div class="headline-wrap">
          <h1 class="headline">Il pieno migliore e piu vicino di quanto pensi.</h1>
          <p class="hero-subtitle">
            Confronta prezzo, distanza e convenienza in pochi secondi.
          </p>
        </div>

        <div class="hero-actions">
          <button class="hero-btn hero-btn--primary" type="button" @click="emit('primary-action')">
            Trova distributori
          </button>
          <button class="hero-btn hero-btn--secondary" type="button" @click="emit('secondary-action')">
            Apri radar
          </button>
        </div>
      </div>

      <div class="hero-metrics">
        <article class="metric-card">
          <span class="metric-label">Stazioni visibili</span>
          <strong class="metric-value">{{ stationCount }}</strong>
        </article>

        <article class="metric-card">
          <span class="metric-label">Ricerca attiva</span>
          <strong class="metric-value metric-value--search">{{ searchMode }}</strong>
        </article>
      </div>
    </div>
  </header>
</template>

<style scoped>
.app-header {
  padding: 18px 0 26px;
}

.header-shell {
  width: min(980px, calc(100% - 32px));
  margin: 0 auto;
  display: grid;
  justify-items: center;
  gap: 24px;
  text-align: center;
}

.hero-visual {
  width: min(100%, 520px);
  display: grid;
  place-items: center;
  padding-top: 8px;
}

.hero-radar {
  position: relative;
  width: min(62vw, 320px);
  aspect-ratio: 1;
  display: grid;
  place-items: center;
  animation: hero-settle 900ms cubic-bezier(0.22, 1, 0.36, 1) both;
}

.hero-radar__ring,
.hero-radar__node,
.hero-radar__beam {
  position: absolute;
}

.hero-radar__ring {
  border-radius: 50%;
  border: 1px solid rgba(255, 122, 26, 0.12);
  box-shadow: inset 0 0 24px rgba(255, 122, 26, 0.03);
}

.hero-radar__ring--outer {
  inset: 0;
}

.hero-radar__ring--mid {
  inset: 18%;
}

.hero-radar__ring--inner {
  inset: 36%;
}

.hero-radar__node {
  border-radius: 50%;
  border: 1px solid rgba(255, 150, 78, 0.4);
  box-shadow:
    0 0 0 4px rgba(255, 122, 26, 0.04),
    0 0 22px rgba(255, 122, 26, 0.16);
}

.hero-radar__node::before {
  content: '';
  position: absolute;
  inset: 50%;
  width: 8px;
  height: 8px;
  border-radius: 50%;
  transform: translate(-50%, -50%);
  background: #ff7a1a;
  box-shadow: 0 0 18px rgba(255, 122, 26, 0.45);
}

.hero-radar__node--main {
  width: 34px;
  height: 34px;
  left: calc(50% - 17px);
  top: calc(50% - 17px);
  background: radial-gradient(circle, rgba(255, 122, 26, 0.18), rgba(255, 122, 26, 0.05));
}

.hero-radar__node--top {
  width: 26px;
  height: 26px;
  left: 42%;
  top: 20%;
}

.hero-radar__node--right {
  width: 18px;
  height: 18px;
  right: 22%;
  top: 38%;
}

.hero-radar__beam {
  left: calc(50% - 1px);
  top: 50%;
  width: 2px;
  height: 34%;
  background: linear-gradient(180deg, rgba(255, 122, 26, 0.8), rgba(255, 122, 26, 0));
  transform-origin: top center;
  transform: rotate(4deg);
  box-shadow: 0 0 22px rgba(255, 122, 26, 0.22);
}

.hero-copy {
  display: grid;
  gap: 18px;
  justify-items: center;
}

.brand-row {
  display: inline-flex;
  align-items: center;
  gap: 10px;
  padding: 8px 14px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.08);
}

.brand-label {
  color: rgba(255, 232, 214, 0.82);
  font-size: 0.86rem;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.headline-wrap {
  display: grid;
  gap: 14px;
  max-width: 760px;
}

.headline {
  font-size: clamp(2.7rem, 7vw, 4.8rem);
  line-height: 0.98;
  letter-spacing: -0.07em;
  color: #fff8f1;
  text-wrap: balance;
  text-transform: none;
}

.hero-subtitle {
  color: rgba(255, 255, 255, 0.62);
  font-size: 1rem;
  line-height: 1.6;
}

.hero-actions {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 12px;
}

.hero-btn {
  min-height: 48px;
  padding: 0 20px;
  border-radius: 14px;
  border: 1px solid transparent;
  font: inherit;
  font-weight: 700;
  cursor: pointer;
  transition:
    transform var(--transition),
    border-color var(--transition),
    background var(--transition),
    box-shadow var(--transition),
    color var(--transition);
}

.hero-btn:hover {
  transform: translateY(-1px);
}

.hero-btn--primary {
  background: linear-gradient(135deg, #ff9c52, #ff7a1a 55%, #d95504);
  color: white;
  box-shadow: 0 16px 28px rgba(255, 122, 26, 0.22);
}

.hero-btn--secondary {
  background: rgba(255, 255, 255, 0.04);
  border-color: rgba(255, 122, 26, 0.16);
  color: rgba(255, 234, 220, 0.92);
}

.hero-metrics {
  width: min(100%, 460px);
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 14px;
}

.metric-card {
  padding: 18px 16px;
  border-radius: 18px;
  border: 1px solid rgba(255, 255, 255, 0.07);
  background:
    linear-gradient(180deg, rgba(255, 255, 255, 0.035), rgba(255, 255, 255, 0.018)),
    rgba(11, 13, 18, 0.72);
  display: grid;
  gap: 6px;
  text-align: center;
}

.metric-label {
  color: rgba(255, 255, 255, 0.48);
  font-size: 0.68rem;
  font-weight: 700;
  letter-spacing: 0.14em;
  text-transform: uppercase;
}

.metric-value {
  color: #fff7f0;
  font-size: clamp(1.3rem, 3vw, 2rem);
  font-weight: 800;
  letter-spacing: -0.06em;
}

.metric-value--search {
  font-size: clamp(1rem, 2.3vw, 1.45rem);
}

@keyframes hero-settle {
  from {
    opacity: 0;
    transform: translateY(22px) scale(0.98);
  }
  to {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}

@media (max-width: 720px) {
  .app-header {
    padding: 10px 0 20px;
  }

  .header-shell {
    width: min(100%, calc(100% - 20px));
    gap: 20px;
  }

  .hero-radar {
    width: min(76vw, 280px);
  }

  .headline {
    font-size: clamp(2.2rem, 10vw, 3.2rem);
  }

  .hero-subtitle {
    font-size: 0.94rem;
  }

  .hero-actions {
    width: 100%;
    grid-template-columns: 1fr;
  }

  .hero-btn {
    width: 100%;
  }
}

@media (max-width: 560px) {
  .hero-radar {
    width: min(78vw, 248px);
  }

  .hero-metrics {
    grid-template-columns: 1fr;
  }

  .brand-row {
    padding: 7px 12px;
  }
}
</style>

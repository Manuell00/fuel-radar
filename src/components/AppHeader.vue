<script setup>
import FuelRadarLogo from './FuelRadarLogo.vue'

defineProps({
  liveReady: { type: Boolean, default: false },
  usingFallback: { type: Boolean, default: false },
  stationCount: { type: Number, default: 0 },
})
</script>

<template>
  <header class="app-header">
    <div class="header-shell">
      <div class="hero-copy">
        <div class="hero-title-wrap">
          <div class="brand-row">
            <FuelRadarLogo :size="78" />

            <div class="brand-copy">
              <h1 class="title">Fuel Radar</h1>
            </div>
          </div>
        </div>
      </div>

      <div class="hero-metrics">
        <article class="metric-card">
          <span class="metric-label">Stazioni visibili</span>
          <strong class="metric-value">{{ stationCount }}</strong>
          <span class="metric-note">ordinate e filtrate attorno alla tua posizione</span>
        </article>

        <article class="metric-card">
          <span class="metric-label">Ricerca</span>
          <strong class="metric-value">Smart</strong>
          <span class="metric-note">autocomplete per indirizzi e uso rapido della posizione attuale</span>
        </article>

        <article class="metric-card">
          <span class="metric-label">Sorgente dati</span>
          <strong class="metric-value">{{ usingFallback ? 'Fallback' : 'Live' }}</strong>
          <span class="metric-note">popup mappa con distanza, tempi stimati e prezzi carburante</span>
        </article>
      </div>
    </div>
  </header>
</template>

<style scoped>
.app-header {
  padding: 42px 0 28px;
}

.header-shell {
  width: min(1120px, calc(100% - 32px));
  margin: 0 auto;
  display: grid;
  gap: 28px;
  position: relative;
  isolation: isolate;
}

.header-shell::before {
  content: '';
  position: absolute;
  inset: -24px 0 auto;
  height: 180px;
  background:
    radial-gradient(circle at 12% 24%, rgba(255, 145, 72, 0.18), transparent 32%),
    radial-gradient(circle at 82% 12%, rgba(255, 122, 26, 0.16), transparent 28%);
  filter: blur(12px);
  z-index: -1;
  pointer-events: none;
}

.hero-copy {
  display: grid;
  gap: 18px;
  padding: 16px 2px 0;
}

.hero-title-wrap {
  display: grid;
  place-items: center;
}

.brand-row {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 18px;
  text-align: center;
  animation: hero-float-in 760ms cubic-bezier(0.22, 1, 0.36, 1) both;
}

.brand-copy {
  display: grid;
  gap: 8px;
  justify-items: start;
  max-width: 760px;
}

.title {
  font-size: clamp(3.3rem, 9vw, 7rem);
  line-height: 0.9;
  letter-spacing: -0.08em;
  color: #fff6ef;
  max-width: none;
  text-wrap: balance;
  text-shadow:
    0 10px 28px rgba(0, 0, 0, 0.3),
    0 0 30px rgba(255, 122, 26, 0.14);
  position: relative;
}

.title::after {
  content: '';
  position: absolute;
  left: 50%;
  bottom: -10px;
  width: min(220px, 48%);
  height: 10px;
  border-radius: 999px;
  transform: translateX(-50%);
  background: linear-gradient(90deg, transparent, rgba(255, 122, 26, 0.58), transparent);
  filter: blur(6px);
}

.hero-metrics {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 18px;
}

.metric-card {
  position: relative;
  overflow: hidden;
  padding: 22px 20px 20px;
  border-radius: 22px;
  border: 1px solid rgba(255, 255, 255, 0.08);
  background:
    linear-gradient(180deg, rgba(255, 255, 255, 0.05), rgba(255, 255, 255, 0.025)),
    rgba(11, 13, 18, 0.76);
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.04),
    0 20px 40px rgba(0, 0, 0, 0.16);
  display: grid;
  gap: 6px;
  transition: transform var(--transition), border-color var(--transition), box-shadow var(--transition);
}

.metric-card::before {
  content: '';
  position: absolute;
  inset: 0;
  background: linear-gradient(120deg, transparent 10%, rgba(255, 255, 255, 0.06) 44%, transparent 80%);
  transform: translateX(-120%);
  transition: transform 780ms ease;
  pointer-events: none;
}

.metric-card:hover {
  transform: translateY(-2px);
  border-color: rgba(255, 122, 26, 0.14);
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.05),
    0 26px 44px rgba(0, 0, 0, 0.2);
}

.metric-card:hover::before {
  transform: translateX(120%);
}

@keyframes hero-float-in {
  from {
    opacity: 0;
    transform: translateY(18px) scale(0.985);
  }
  to {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}

.metric-label {
  color: rgba(255, 255, 255, 0.46);
  font-size: 0.72rem;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 0.1em;
}

.metric-value {
  color: #fff6ef;
  font-size: clamp(1.2rem, 2vw, 1.8rem);
  font-weight: 800;
  letter-spacing: -0.04em;
}

.metric-note {
  color: rgba(255, 255, 255, 0.62);
  line-height: 1.55;
  font-size: 0.86rem;
}

@media (max-width: 820px) {
  .header-shell {
    width: min(100%, calc(100% - 20px));
  }

  .title {
    font-size: clamp(2.8rem, 10vw, 5.4rem);
  }

  .hero-metrics {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 560px) {
  .app-header {
    padding-top: 28px;
  }

  .brand-row {
    gap: 14px;
    align-items: center;
  }

  .title {
    font-size: 3rem;
  }
}
</style>

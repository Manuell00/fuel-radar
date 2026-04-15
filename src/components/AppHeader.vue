<script setup>
import FuelRadarLogo from './FuelRadarLogo.vue'

defineProps({
  stationCount: { type: Number, default: 0 },
  searchMode: { type: String, default: 'In attesa' },
})
</script>

<template>
  <header class="app-header">
    <div class="header-shell">
      <div class="hero-copy">
        <div class="brand-row">
          <div class="brand-copy">
            <p class="brand-kicker">Live fuel search</p>
            <h1 class="title">FUEL RADAR</h1>
          </div>

          <div class="brand-logo-wrap" aria-hidden="true">
            <FuelRadarLogo :size="84" />
          </div>
        </div>
      </div>

      <div class="hero-metrics">
        <article class="metric-card">
          <span class="metric-label">Stazioni visibili</span>
          <strong class="metric-value">{{ stationCount }}</strong>
        </article>

        <article class="metric-card">
          <span class="metric-label">Ricerca</span>
          <strong class="metric-value metric-value--search">{{ searchMode }}</strong>
        </article>
      </div>
    </div>
  </header>
</template>

<style scoped>
.app-header {
  padding: 42px 0 30px;
}

.header-shell {
  width: min(1120px, calc(100% - 32px));
  margin: 0 auto;
  display: grid;
  gap: 30px;
  position: relative;
  isolation: isolate;
}

.header-shell::before {
  content: '';
  position: absolute;
  inset: -18px 0 auto;
  height: 150px;
  background:
    radial-gradient(circle at 18% 26%, rgba(255, 145, 72, 0.1), transparent 30%),
    radial-gradient(circle at 76% 18%, rgba(255, 122, 26, 0.1), transparent 28%);
  filter: blur(12px);
  z-index: -1;
  pointer-events: none;
}

.hero-copy {
  display: grid;
  gap: 22px;
  padding: 16px 2px 2px;
}

.brand-row {
  display: flex;
  align-items: flex-end;
  justify-content: center;
  gap: 22px;
  text-align: center;
  animation: hero-float-in 820ms cubic-bezier(0.22, 1, 0.36, 1) both;
}

.brand-copy {
  display: grid;
  gap: 10px;
  justify-items: center;
}

.brand-kicker {
  color: rgba(255, 221, 194, 0.7);
  font-size: 0.78rem;
  font-weight: 700;
  letter-spacing: 0.18em;
  text-transform: uppercase;
}

.brand-logo-wrap {
  position: relative;
  transform: translateY(-3px);
  animation: logo-drift 2.8s ease-in-out infinite;
}

.brand-logo-wrap::before {
  content: '';
  position: absolute;
  inset: -12px;
  border-radius: 50%;
  background: radial-gradient(circle, rgba(255, 122, 26, 0.18), transparent 64%);
  filter: blur(10px);
  z-index: -1;
}

.title {
  font-size: clamp(3.2rem, 9vw, 6.6rem);
  line-height: 0.92;
  letter-spacing: -0.075em;
  text-transform: uppercase;
  color: #fff8f1;
  -webkit-text-stroke: 1.05px rgba(255, 165, 97, 0.44);
  text-shadow:
    0 14px 30px rgba(0, 0, 0, 0.28),
    0 0 24px rgba(255, 122, 26, 0.08);
  position: relative;
  animation: title-pulse 4.2s ease-in-out infinite;
}

.title::after {
  content: '';
  position: absolute;
  left: 50%;
  bottom: -22px;
  width: min(280px, 68%);
  height: 6px;
  border-radius: 999px;
  transform: translateX(-50%);
  background:
    linear-gradient(90deg, rgba(255, 122, 26, 0) 0%, rgba(255, 172, 109, 0.7) 18%, rgba(255, 240, 226, 0.98) 50%, rgba(255, 172, 109, 0.7) 82%, rgba(255, 122, 26, 0) 100%);
  box-shadow:
    0 0 0 1px rgba(255, 176, 113, 0.14),
    0 8px 20px rgba(255, 122, 26, 0.14),
    0 0 18px rgba(255, 170, 106, 0.12);
}

.hero-metrics {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 18px;
}

.metric-card {
  position: relative;
  overflow: hidden;
  padding: 22px 20px 20px;
  border-radius: 22px;
  border: 1px solid rgba(255, 255, 255, 0.08);
  background:
    linear-gradient(180deg, rgba(255, 255, 255, 0.045), rgba(255, 255, 255, 0.02)),
    rgba(11, 13, 18, 0.76);
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.04),
    0 20px 40px rgba(0, 0, 0, 0.16);
  display: grid;
  place-items: center;
  text-align: center;
  gap: 10px;
  transition: transform var(--transition), border-color var(--transition), box-shadow var(--transition);
}

.metric-card:hover {
  transform: translateY(-2px);
  border-color: rgba(255, 122, 26, 0.16);
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.05),
    0 24px 42px rgba(0, 0, 0, 0.2);
}

.metric-label {
  color: rgba(255, 255, 255, 0.56);
  font-size: 0.74rem;
  font-weight: 700;
  letter-spacing: 0.12em;
  text-transform: uppercase;
}

.metric-value {
  font-size: clamp(1.55rem, 4.8vw, 2.8rem);
  font-weight: 800;
  letter-spacing: -0.06em;
  color: #fff7f0;
}

.metric-value--search {
  font-size: clamp(1.2rem, 3vw, 2rem);
}

@keyframes hero-float-in {
  from {
    opacity: 0;
    transform: translateY(22px) scale(0.976);
  }
  to {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}

@keyframes title-pulse {
  0%, 100% {
    text-shadow:
      0 14px 30px rgba(0, 0, 0, 0.28),
      0 0 24px rgba(255, 122, 26, 0.08);
  }
  50% {
    text-shadow:
      0 16px 34px rgba(0, 0, 0, 0.3),
      0 0 34px rgba(255, 122, 26, 0.13);
  }
}

@keyframes logo-drift {
  0%, 100% {
    transform: translateY(-3px);
  }
  50% {
    transform: translateY(-7px);
  }
}

@media (max-width: 720px) {
  .app-header {
    padding: 34px 0 24px;
  }

  .header-shell {
    width: min(100%, calc(100% - 20px));
    gap: 24px;
  }

  .brand-row {
    gap: 14px;
    align-items: center;
  }

  .brand-logo-wrap {
    transform: none;
  }

  .hero-metrics {
    gap: 14px;
  }

  .metric-card {
    padding: 18px 16px;
  }
}

@media (max-width: 560px) {
  .brand-row {
    align-items: center;
    gap: 12px;
  }

  .brand-kicker {
    font-size: 0.68rem;
    letter-spacing: 0.16em;
  }

  .title::after {
    bottom: -18px;
    height: 5px;
  }

  .hero-metrics {
    grid-template-columns: 1fr;
  }
}
</style>

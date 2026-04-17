<script setup>
const props = defineProps({
  stationCount: { type: Number, default: 0 },
  searchMode: { type: String, default: 'In attesa' },
})
</script>

<template>
  <header class="app-header">
    <div class="header-shell">
      <div class="hero-copy">
        <div class="brand-row">
          <span class="brand-dot" aria-hidden="true"></span>
          <span class="brand-label">Fuel Radar</span>
        </div>
        <div class="hero-metrics">
          <article class="metric-card">
            <span class="metric-label">Stazioni visibili</span>
            <strong class="metric-value">{{ stationCount }}</strong>
          </article>

          <article class="metric-card">
            <span class="metric-label">Ricerca attiva</span>
            <strong class="metric-value metric-value--search">{{ props.searchMode.toUpperCase() }}</strong>
          </article>
        </div>
      </div>

    </div>
  </header>
</template>

<style scoped>
.app-header {
  padding: 24px 0 30px;
}

.header-shell {
  width: min(980px, calc(100% - 32px));
  margin: 0 auto;
  display: grid;
  justify-items: center;
  gap: 24px;
}

.hero-copy {
  display: grid;
  gap: 14px;
  justify-items: center;
  text-align: center;
}

.brand-row {
  display: inline-flex;
  align-items: center;
  gap: 10px;
}

.brand-dot {
  width: 10px;
  height: 10px;
  border-radius: 999px;
  background: linear-gradient(135deg, #ffb26a, #ff7a1a);
  box-shadow: 0 0 0 6px rgba(255, 122, 26, 0.12);
}

.brand-label {
  display: inline-flex;
  align-items: center;
  min-height: 34px;
  width: fit-content;
  padding: 0 2px;
  border-radius: 999px;
  font-family: var(--font-display);
  letter-spacing: -0.07em;
  color: #fff8f1;
  font-size: clamp(1.18rem, 2.35vw, 1.4rem);
  font-weight: 800;
  text-transform: none;
}

.hero-metrics {
  width: min(100%, 460px);
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 14px;
}

.metric-card {
  padding: 16px 18px;
  border-radius: 999px;
  border: 1px solid rgba(255, 255, 255, 0.07);
  background:
    linear-gradient(180deg, rgba(255, 255, 255, 0.035), rgba(255, 255, 255, 0.018)),
    rgba(11, 13, 18, 0.72);
  display: grid;
  gap: 4px;
  text-align: center;
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.04),
    0 16px 28px rgba(0, 0, 0, 0.16);
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

@media (max-width: 720px) {
  .app-header {
    padding: 10px 0 6px;
  }

  .header-shell {
    width: min(100%, calc(100% - 20px));
    grid-template-columns: 1fr;
    gap: 6px;
  }

  .hero-copy {
    justify-items: center;
    text-align: center;
    gap: 6px;
  }

  .brand-row {
    gap: 12px;
  }

  .brand-dot {
    width: 11px;
    height: 11px;
  }

  .brand-label {
    font-size: clamp(1.46rem, 5.8vw, 1.82rem);
  }

  .hero-metrics {
    display: none;
  }
}
</style>

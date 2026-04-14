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
        <div class="brand-row">
          <FuelRadarLogo :size="58" />

          <div class="brand-copy">
            <div class="brand-topline">
              <span class="eyebrow">Fuel Radar</span>
              <span class="status-pill" :class="liveReady ? 'status-pill--live' : 'status-pill--fallback'">
                {{ liveReady ? 'MIMIT Live' : 'Fallback' }}
              </span>
            </div>

            <h1 class="title">Il radar carburante pensato per trovare il pieno giusto più in fretta.</h1>
          </div>
        </div>

        <p class="subtitle">
          Cerca per indirizzo o posizione attuale, visualizza i distributori sulla mappa e apri subito la stazione scelta nelle mappe.
        </p>
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
  padding: 34px 0 18px;
}

.header-shell {
  width: min(1120px, calc(100% - 32px));
  margin: 0 auto;
  display: grid;
  gap: 18px;
}

.hero-copy {
  display: grid;
  gap: 14px;
}

.brand-row {
  display: flex;
  align-items: flex-start;
  gap: 16px;
}

.brand-copy {
  display: grid;
  gap: 10px;
  max-width: 760px;
}

.brand-topline {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
}

.eyebrow {
  color: rgba(255, 190, 148, 0.92);
  font-size: 0.78rem;
  font-weight: 800;
  letter-spacing: 0.18em;
  text-transform: uppercase;
}

.status-pill {
  padding: 6px 10px;
  border-radius: 999px;
  font-size: 0.7rem;
  font-weight: 800;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  border: 1px solid rgba(255, 255, 255, 0.08);
}

.status-pill--live {
  background: rgba(48, 211, 157, 0.12);
  color: #8ae8c5;
}

.status-pill--fallback {
  background: rgba(255, 122, 26, 0.12);
  color: #ffc193;
}

.title {
  font-size: clamp(2rem, 4vw, 4rem);
  line-height: 0.98;
  letter-spacing: -0.06em;
  color: #fff6ef;
  max-width: 12ch;
}

.subtitle {
  max-width: 62ch;
  color: rgba(255, 255, 255, 0.72);
  font-size: 1.02rem;
  line-height: 1.72;
}

.hero-metrics {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 14px;
}

.metric-card {
  padding: 18px 18px 16px;
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
    max-width: 14ch;
  }

  .hero-metrics {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 560px) {
  .app-header {
    padding-top: 24px;
  }

  .brand-row {
    gap: 14px;
  }

  .title {
    font-size: 2.1rem;
  }

  .subtitle {
    font-size: 0.96rem;
  }
}
</style>

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
        <div class="hero-title-wrap">
          <div class="hero-showcase">
            <div class="brand-row">
              <div class="brand-copy">
                <h1 class="title">Fuel Radar</h1>
              </div>

              <div class="brand-logo-wrap" aria-hidden="true">
                <FuelRadarLogo :size="86" />
              </div>
            </div>

            <div class="hero-graphic" aria-hidden="true">
              <div class="hero-graphic__beam"></div>
              <div class="hero-graphic__ring hero-graphic__ring--outer"></div>
              <div class="hero-graphic__ring hero-graphic__ring--inner"></div>
              <div class="hero-graphic__grid"></div>
              <div class="hero-graphic__route hero-graphic__route--left"></div>
              <div class="hero-graphic__route hero-graphic__route--right"></div>
              <span class="hero-graphic__node hero-graphic__node--left"></span>
              <span class="hero-graphic__node hero-graphic__node--center"></span>
              <span class="hero-graphic__node hero-graphic__node--right"></span>
              <span class="hero-graphic__pulse hero-graphic__pulse--one"></span>
              <span class="hero-graphic__pulse hero-graphic__pulse--two"></span>
            </div>
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
  padding: 42px 0 34px;
}

.header-shell {
  width: min(1120px, calc(100% - 32px));
  margin: 0 auto;
  display: grid;
  gap: 36px;
  position: relative;
  isolation: isolate;
}

.header-shell::before {
  content: '';
  position: absolute;
  inset: -24px 0 auto;
  height: 150px;
  background:
    radial-gradient(circle at 12% 24%, rgba(255, 145, 72, 0.12), transparent 30%),
    radial-gradient(circle at 82% 12%, rgba(255, 122, 26, 0.11), transparent 26%);
  filter: blur(10px);
  z-index: -1;
  pointer-events: none;
}

.hero-copy {
  display: grid;
  gap: 24px;
  padding: 18px 2px 8px;
}

.hero-title-wrap {
  display: grid;
  place-items: center;
}

.hero-showcase {
  width: min(100%, 860px);
  display: grid;
  justify-items: center;
  gap: 24px;
}

.brand-row {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 22px;
  text-align: center;
  animation: hero-float-in 900ms cubic-bezier(0.22, 1, 0.36, 1) both;
}

.brand-copy {
  display: grid;
  gap: 14px;
  justify-items: start;
  max-width: 760px;
}

.brand-logo-wrap {
  position: relative;
  animation: logo-drift 2.8s ease-in-out infinite;
}

.brand-logo-wrap::before {
  content: '';
  position: absolute;
  inset: -16px;
  border-radius: 50%;
  background: radial-gradient(circle, rgba(255, 122, 26, 0.18), transparent 65%);
  filter: blur(10px);
  z-index: -1;
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
  animation: title-pulse 3.8s ease-in-out infinite;
}

.title::after {
  content: '';
  position: absolute;
  left: 50%;
  bottom: -26px;
  width: min(320px, 72%);
  height: 16px;
  border-radius: 999px;
  transform: translateX(-50%);
  background:
    radial-gradient(circle at 14% 50%, rgba(255, 221, 189, 0.95) 0 7%, transparent 8%),
    radial-gradient(circle at 34% 52%, rgba(255, 191, 134, 0.92) 0 7%, transparent 8%),
    radial-gradient(circle at 58% 49%, rgba(255, 150, 81, 0.94) 0 8%, transparent 9%),
    radial-gradient(circle at 82% 52%, rgba(255, 122, 26, 0.95) 0 7%, transparent 8%),
    linear-gradient(90deg, rgba(255, 122, 26, 0) 0%, rgba(255, 146, 73, 0.78) 14%, rgba(255, 181, 120, 0.98) 50%, rgba(255, 146, 73, 0.78) 86%, rgba(255, 122, 26, 0) 100%);
  box-shadow:
    0 2px 0 rgba(255, 231, 210, 0.16) inset,
    0 10px 18px rgba(255, 122, 26, 0.18);
  opacity: 0.98;
  animation: fuel-flow 3.2s ease-in-out infinite;
}

.hero-graphic {
  width: min(100%, 700px);
  min-height: 152px;
  position: relative;
  border-radius: 36px;
  overflow: hidden;
  background:
    linear-gradient(180deg, rgba(255, 255, 255, 0.05), rgba(255, 255, 255, 0.015)),
    radial-gradient(circle at 50% 10%, rgba(255, 155, 84, 0.16), transparent 42%),
    rgba(12, 14, 19, 0.56);
  border: 1px solid rgba(255, 255, 255, 0.07);
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.05),
    0 28px 44px rgba(0, 0, 0, 0.16);
}

.hero-graphic__beam,
.hero-graphic__ring,
.hero-graphic__grid,
.hero-graphic__route,
.hero-graphic__node,
.hero-graphic__pulse {
  position: absolute;
}

.hero-graphic__beam {
  inset: auto 9% 16px;
  height: 58px;
  border-radius: 999px;
  background:
    radial-gradient(circle at 50% 50%, rgba(255, 208, 171, 0.22), transparent 48%),
    linear-gradient(90deg, rgba(255, 122, 26, 0), rgba(255, 146, 73, 0.18) 20%, rgba(255, 196, 148, 0.22) 50%, rgba(255, 146, 73, 0.18) 80%, rgba(255, 122, 26, 0));
  filter: blur(18px);
  opacity: 0.8;
}

.hero-graphic__ring {
  left: 50%;
  top: 50%;
  border-radius: 50%;
  transform: translate(-50%, -50%);
  border: 1px solid rgba(255, 255, 255, 0.08);
}

.hero-graphic__ring--outer {
  width: 220px;
  height: 220px;
  box-shadow: 0 0 0 1px rgba(255, 122, 26, 0.08) inset;
  animation: radar-breathe 5.4s ease-in-out infinite;
}

.hero-graphic__ring--inner {
  width: 122px;
  height: 122px;
  border-color: rgba(255, 180, 124, 0.22);
  animation: radar-breathe 4.2s ease-in-out infinite reverse;
}

.hero-graphic__grid {
  inset: 14px;
  border-radius: 28px;
  background-image:
    linear-gradient(rgba(255, 255, 255, 0.03) 1px, transparent 1px),
    linear-gradient(90deg, rgba(255, 255, 255, 0.03) 1px, transparent 1px);
  background-size: 32px 32px;
  mask-image: radial-gradient(circle at center, black 28%, transparent 88%);
  opacity: 0.55;
}

.hero-graphic__route {
  height: 2px;
  border-radius: 999px;
  background: linear-gradient(90deg, rgba(255, 122, 26, 0), rgba(255, 183, 126, 0.94), rgba(255, 122, 26, 0));
  box-shadow: 0 0 14px rgba(255, 151, 79, 0.3);
}

.hero-graphic__route--left {
  left: 13%;
  right: 49%;
  top: 58%;
  transform: rotate(-8deg);
}

.hero-graphic__route--right {
  left: 51%;
  right: 14%;
  top: 50%;
  transform: rotate(11deg);
}

.hero-graphic__node,
.hero-graphic__pulse {
  border-radius: 50%;
}

.hero-graphic__node {
  width: 18px;
  height: 18px;
  background: linear-gradient(135deg, #ffc392, #ff7a1a 60%, #d95504);
  border: 2px solid rgba(255, 255, 255, 0.9);
  box-shadow: 0 0 0 8px rgba(255, 122, 26, 0.08);
}

.hero-graphic__node--left {
  left: 19%;
  top: 53%;
}

.hero-graphic__node--center {
  left: calc(50% - 9px);
  top: calc(50% - 9px);
}

.hero-graphic__node--right {
  right: 18%;
  top: 44%;
}

.hero-graphic__pulse {
  width: 72px;
  height: 72px;
  border: 1px solid rgba(255, 173, 112, 0.16);
  background: radial-gradient(circle, rgba(255, 173, 112, 0.08), transparent 68%);
}

.hero-graphic__pulse--one {
  left: calc(50% - 36px);
  top: calc(50% - 36px);
  animation: pulse-ring 2.8s ease-out infinite;
}

.hero-graphic__pulse--two {
  left: calc(50% - 36px);
  top: calc(50% - 36px);
  animation: pulse-ring 2.8s ease-out infinite 1.1s;
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
    linear-gradient(180deg, rgba(255, 255, 255, 0.05), rgba(255, 255, 255, 0.025)),
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
    transform: translateY(24px) scale(0.972);
  }
  to {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}

@keyframes title-pulse {
  0%, 100% {
    text-shadow:
      0 10px 28px rgba(0, 0, 0, 0.3),
      0 0 30px rgba(255, 122, 26, 0.14);
  }
  50% {
    text-shadow:
      0 12px 32px rgba(0, 0, 0, 0.32),
      0 0 42px rgba(255, 122, 26, 0.22);
  }
}

@keyframes fuel-flow {
  0%, 100% {
    transform: translateX(-50%) scaleX(0.985) translateY(0);
    opacity: 0.9;
  }
  50% {
    transform: translateX(-50%) scaleX(1.02) translateY(1px);
    opacity: 1;
  }
}

@keyframes logo-drift {
  0%, 100% {
    transform: translateY(0) rotate(0deg);
  }
  50% {
    transform: translateY(-4px) rotate(1.5deg);
  }
}

@keyframes radar-breathe {
  0%, 100% {
    transform: translate(-50%, -50%) scale(0.985);
    opacity: 0.82;
  }
  50% {
    transform: translate(-50%, -50%) scale(1.02);
    opacity: 1;
  }
}

@keyframes pulse-ring {
  0% {
    transform: scale(0.42);
    opacity: 0;
  }
  28% {
    opacity: 0.92;
  }
  100% {
    transform: scale(1.85);
    opacity: 0;
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
  font-size: clamp(2.1rem, 5vw, 3.6rem);
  font-weight: 800;
  letter-spacing: -0.04em;
  line-height: 0.95;
}

.metric-value--search {
  font-size: clamp(1.3rem, 3vw, 2rem);
  line-height: 1.1;
}

@media (max-width: 820px) {
  .header-shell {
    width: min(100%, calc(100% - 20px));
    gap: 28px;
  }

  .hero-copy {
    padding: 10px 2px 6px;
  }

  .title {
    font-size: clamp(2.8rem, 10vw, 5.4rem);
  }

  .hero-metrics {
    grid-template-columns: 1fr;
  }

  .hero-graphic {
    min-height: 138px;
  }
}

@media (max-width: 560px) {
  .app-header {
    padding: 28px 0 26px;
  }

  .header-shell {
    gap: 22px;
  }

  .brand-row {
    gap: 12px;
    align-items: center;
  }

  .brand-copy {
    justify-items: center;
  }

  .brand-logo-wrap {
    transform: scale(0.82);
    transform-origin: center;
  }

  .hero-showcase {
    gap: 18px;
  }

  .title {
    font-size: clamp(2.4rem, 11vw, 3rem);
  }

  .title::after {
    bottom: -22px;
    width: min(240px, 84%);
  }

  .metric-card {
    padding: 18px 16px 17px;
    border-radius: 20px;
  }

  .metric-value {
    font-size: clamp(1.9rem, 8vw, 2.6rem);
  }

  .metric-value--search {
    font-size: 1.1rem;
  }

  .hero-graphic {
    min-height: 118px;
    border-radius: 28px;
  }

  .hero-graphic__ring--outer {
    width: 170px;
    height: 170px;
  }

  .hero-graphic__ring--inner {
    width: 96px;
    height: 96px;
  }

  .hero-graphic__grid {
    inset: 10px;
    border-radius: 22px;
    background-size: 24px 24px;
  }

  .hero-graphic__node {
    width: 14px;
    height: 14px;
  }

  .hero-graphic__node--center {
    left: calc(50% - 7px);
    top: calc(50% - 7px);
  }

  .hero-graphic__pulse {
    width: 54px;
    height: 54px;
  }

  .hero-graphic__pulse--one,
  .hero-graphic__pulse--two {
    left: calc(50% - 27px);
    top: calc(50% - 27px);
  }
}
</style>

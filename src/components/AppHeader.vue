<script setup>
// Props removed — metrics are no longer displayed in the header
</script>

<template>
  <header class="app-header">
    <div class="header-shell">
      <div class="brand-wrap">
        <div class="brand-icon" aria-hidden="true">
          <span class="brand-core"></span>
          <span class="brand-ring brand-ring--1"></span>
          <span class="brand-ring brand-ring--2"></span>
        </div>
        <span class="brand-name">Fuel Radar</span>
      </div>
    </div>
  </header>
</template>

<style scoped>
.app-header {
  padding: 28px 0 22px;
}

.header-shell {
  width: min(1340px, calc(100% - 48px));
  margin: 0 auto;
  display: flex;
  justify-content: center;
}

.brand-wrap {
  display: inline-flex;
  align-items: center;
  gap: 14px;
}

/* Radar icon */
.brand-icon {
  position: relative;
  width: 26px;
  height: 26px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex: 0 0 auto;
}

.brand-core {
  position: relative;
  z-index: 2;
  width: 12px;
  height: 12px;
  border-radius: 999px;
  background: linear-gradient(135deg, #ffb26a, #ff7a1a);
  box-shadow:
    0 0 0 3px rgba(255, 122, 26, 0.18),
    0 4px 14px rgba(255, 122, 26, 0.38);
}

.brand-ring {
  position: absolute;
  inset: 0;
  border-radius: 999px;
  border: 1.5px solid rgba(255, 122, 26, 0.55);
  animation: radar-pulse 2.8s ease-out infinite;
}

.brand-ring--2 {
  animation-delay: 1.4s;
}

/* Brand name */
.brand-name {
  font-family: var(--font-display);
  font-size: clamp(1.65rem, 2.6vw, 2.1rem);
  font-weight: 800;
  letter-spacing: -0.07em;
  color: #fff8f1;
  line-height: 1;
}

@keyframes radar-pulse {
  0%   { transform: scale(1);   opacity: 0.75; }
  70%  { opacity: 0.08; }
  100% { transform: scale(2.5); opacity: 0; }
}

@media (max-width: 720px) {
  .app-header {
    padding: 14px 0 10px;
  }

  .header-shell {
    width: min(100%, calc(100% - 20px));
  }

  .brand-name {
    font-size: clamp(1.48rem, 5.5vw, 1.9rem);
  }
}
</style>

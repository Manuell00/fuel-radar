<script setup>
const props = defineProps({
  size: { type: Number, default: 40 },
  compact: { type: Boolean, default: false },
})
</script>

<template>
  <div
    class="fuel-logo"
    :class="{ 'fuel-logo--compact': compact }"
    :style="{ width: `${size}px`, height: `${size}px` }"
    aria-hidden="true"
  >
    <svg viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="fuelRadarLogoBg" x1="6" y1="4" x2="26" y2="28" gradientUnits="userSpaceOnUse">
          <stop stop-color="#FFBE8A" />
          <stop offset="0.52" stop-color="#FF7A1A" />
          <stop offset="1" stop-color="#D95504" />
        </linearGradient>
      </defs>
      <rect x="1.5" y="1.5" width="29" height="29" rx="10" fill="url(#fuelRadarLogoBg)" />
      <path d="M16 7C16 7 10.4 13 10.4 17.4C10.4 20.4928 12.9072 23 16 23C19.0928 23 21.6 20.4928 21.6 17.4C21.6 13 16 7 16 7Z" fill="white" fill-opacity="0.96"/>
      <circle cx="16" cy="17.8" r="3.05" fill="#FF7A1A"/>
    </svg>
  </div>
</template>

<style scoped>
.fuel-logo {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 28%;
  box-shadow:
    inset 0 1px 0 rgba(255,255,255,0.28),
    0 18px 40px rgba(255, 122, 26, 0.3);
}

.fuel-logo svg {
  width: 100%;
  height: 100%;
  display: block;
}

.fuel-logo--compact {
  box-shadow:
    inset 0 1px 0 rgba(255,255,255,0.22),
    0 12px 24px rgba(255, 122, 26, 0.24);
}
</style>

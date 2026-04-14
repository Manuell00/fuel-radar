<script setup>
const props = defineProps({
  message: { type: String, default: '' },
})

const emit = defineEmits(['retry', 'close'])
</script>

<template>
  <div class="banner-wrap">
    <div class="banner">
      <div class="banner-copy">
        <span class="banner-kicker">Avviso</span>
        <p class="banner-message">{{ props.message }}</p>
      </div>

      <div class="banner-actions">
        <button class="banner-btn banner-btn--primary" type="button" @click="emit('retry')">
          Riprova posizione
        </button>
        <button class="banner-btn banner-btn--ghost" type="button" @click="emit('close')">
          Chiudi
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.banner-wrap {
  width: min(1120px, calc(100% - 32px));
  margin: 0 auto 14px;
}

.banner {
  padding: 16px 18px;
  border-radius: 22px;
  border: 1px solid rgba(255, 173, 84, 0.18);
  background:
    radial-gradient(circle at left top, rgba(255, 136, 41, 0.14), transparent 32%),
    linear-gradient(180deg, rgba(255, 255, 255, 0.05), rgba(255, 255, 255, 0.03)),
    rgba(20, 16, 12, 0.82);
  box-shadow: 0 18px 38px rgba(0, 0, 0, 0.18);
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 18px;
}

.banner-copy {
  display: grid;
  gap: 4px;
}

.banner-kicker {
  color: #ffb37b;
  font-size: 0.68rem;
  font-weight: 800;
  letter-spacing: 0.15em;
  text-transform: uppercase;
}

.banner-message {
  color: rgba(255, 244, 236, 0.92);
  line-height: 1.55;
}

.banner-actions {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
}

.banner-btn {
  min-height: 40px;
  padding: 0 14px;
  border-radius: 999px;
  border: 0;
  cursor: pointer;
  transition: transform var(--transition), background var(--transition), border-color var(--transition);
}

.banner-btn--primary {
  background: linear-gradient(135deg, #ff9c52, #ff7a1a 55%, #d95504);
  color: white;
  font-weight: 800;
}

.banner-btn--ghost {
  background: rgba(255, 255, 255, 0.05);
  color: rgba(255, 255, 255, 0.82);
  border: 1px solid rgba(255, 255, 255, 0.08);
}

.banner-btn:hover {
  transform: translateY(-1px);
}

@media (max-width: 720px) {
  .banner-wrap {
    width: min(100%, calc(100% - 20px));
  }

  .banner {
    align-items: flex-start;
    flex-direction: column;
  }
}
</style>

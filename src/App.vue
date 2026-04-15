<script setup>
import { computed, onMounted, ref, watch } from 'vue'
import AppHeader from './components/AppHeader.vue'
import FilterBar from './components/FilterBar.vue'
import FuelRadarLogo from './components/FuelRadarLogo.vue'
import LocationBanner from './components/LocationBanner.vue'
import LocationSearch from './components/LocationSearch.vue'
import MapView from './components/MapView.vue'
import StationList from './components/StationList.vue'
import TopCards from './components/TopCards.vue'
import { useGeolocation } from './composables/useGeolocation.js'
import { useStations } from './composables/useStations.js'

const manualLocation = ref(null)
const selectedStation = ref(null)
const dismissedBanner = ref('')

const {
  position,
  loading: geoLoading,
  error: geoError,
  isFallback,
  requestLocation,
} = useGeolocation()

const effectivePosition = computed(() => {
  if (manualLocation.value) {
    return { lat: manualLocation.value.lat, lng: manualLocation.value.lng }
  }
  return position.value
})

const {
  filters,
  sorted,
  cheapest,
  nearest,
  bestCompromise,
  stationsLoading,
  stationsError,
  liveReady,
  usingFallback,
  refreshStations,
} = useStations(effectivePosition)

const loading = computed(() => geoLoading.value || stationsLoading.value)
const loadingLabel = computed(() => (
  geoLoading.value
    ? 'Caricamento posizione...'
    : 'Caricamento...'
))

const stationCount = computed(() => sorted.value.length)

const bannerMessage = computed(() => {
  if (stationsError.value && !sorted.value.length) return stationsError.value
  if (geoError.value) return geoError.value
  if (isFallback.value) {
    return 'Posizione approssimata dalla rete. Puoi riprovare per usare il GPS del dispositivo.'
  }
  if (usingFallback.value) {
    return 'Feed MIMIT non disponibile: stiamo usando dati locali di fallback.'
  }
  if (effectivePosition.value && !stationsLoading.value && !sorted.value.length) {
    return 'Nessun distributore trovato vicino alla posizione con i dati disponibili.'
  }
  return ''
})

const showBanner = computed(() => bannerMessage.value && dismissedBanner.value !== bannerMessage.value)

watch(bannerMessage, (nextMessage, previousMessage) => {
  if (nextMessage !== previousMessage) {
    dismissedBanner.value = ''
  }
})

onMounted(async () => {
  await requestLocation()
})

function handleSelectLocation(location) {
  manualLocation.value = location
  selectedStation.value = null
}

function clearManualLocation() {
  manualLocation.value = null
  selectedStation.value = null
}

async function useCurrentLocation() {
  clearManualLocation()
  await requestLocation()
}

function dismissCurrentBanner() {
  dismissedBanner.value = bannerMessage.value
}

async function handleBannerRetry() {
  if (geoError.value || isFallback.value) {
    await useCurrentLocation()
    return
  }

  await refreshStations()
}

function selectStation(station) {
  selectedStation.value = station
}
</script>

<template>
  <div class="app-shell">
    <div class="page-aurora" aria-hidden="true"></div>
    <div class="page-grid" aria-hidden="true"></div>

    <div class="page-content">
      <AppHeader
        :live-ready="liveReady"
        :using-fallback="usingFallback"
        :station-count="stationCount"
      />

      <Transition name="banner-fade">
        <LocationBanner
          v-if="showBanner"
          :message="bannerMessage"
          @retry="handleBannerRetry"
          @close="dismissCurrentBanner"
        />
      </Transition>

      <main class="main-shell">
        <section class="hero-stack surface-enter">
          <LocationSearch
            :manual-location="manualLocation"
            :current-position="position"
            @select-location="handleSelectLocation"
            @clear-manual="clearManualLocation"
            @retry-geo="useCurrentLocation"
          />

          <div class="filters-wrap surface-enter surface-enter--delay-1">
            <FilterBar v-model:filters="filters" />
          </div>
        </section>

        <Transition name="content-fade" mode="out-in">
          <section v-if="loading" key="loading" class="loading-panel">
            <div class="loading-orb" aria-hidden="true"></div>
            <p class="loading-label">{{ loadingLabel }}</p>
          </section>

          <section v-else key="content" class="dashboard">
            <div class="map-wrap surface-enter surface-enter--delay-2">
              <MapView
                :user-position="effectivePosition"
                :stations="sorted"
                :selected-station="selectedStation"
                :cheapest="cheapest"
                :nearest="nearest"
                :best-compromise="bestCompromise"
                :radius="filters.radius"
                @select-station="selectStation"
              />
            </div>

            <div class="results-wrap">
              <TopCards
                v-if="cheapest || nearest || bestCompromise"
                class="surface-enter surface-enter--delay-3"
                :cheapest="cheapest"
                :nearest="nearest"
                :best-compromise="bestCompromise"
                @select-station="selectStation"
              />

              <StationList
                v-if="sorted.length"
                class="surface-enter surface-enter--delay-4"
                :stations="sorted"
                :selected-station-id="selectedStation?.id ?? null"
                @select-station="selectStation"
              />

              <div v-else class="empty-state surface-enter surface-enter--delay-3">
                <FuelRadarLogo :size="56" />
                <h2>Nessun distributore trovato</h2>
                <p>
                  Prova a cambiare raggio, usa un indirizzo diverso oppure riprova la posizione attuale.
                </p>
              </div>
            </div>
          </section>
        </Transition>
      </main>
    </div>
  </div>
</template>

<style scoped>
.app-shell {
  position: relative;
  min-height: 100dvh;
  overflow: hidden;
}

.page-aurora {
  position: fixed;
  inset: 0;
  background:
    radial-gradient(circle at top center, rgba(255, 126, 33, 0.22), transparent 30%),
    radial-gradient(circle at 15% 10%, rgba(255, 160, 66, 0.11), transparent 22%),
    radial-gradient(circle at 85% 20%, rgba(255, 122, 26, 0.14), transparent 24%),
    linear-gradient(180deg, #050608 0%, #090b10 28%, #0d1016 60%, #11141c 100%);
  pointer-events: none;
}

.page-grid {
  position: fixed;
  inset: 0;
  background-image:
    linear-gradient(rgba(255, 255, 255, 0.025) 1px, transparent 1px),
    linear-gradient(90deg, rgba(255, 255, 255, 0.025) 1px, transparent 1px);
  background-size: 72px 72px;
  mask-image: linear-gradient(180deg, rgba(0, 0, 0, 0.38), transparent 80%);
  pointer-events: none;
  opacity: 0.35;
}

.page-content {
  position: relative;
  z-index: 1;
}

.main-shell {
  width: min(1120px, calc(100% - 32px));
  margin: 0 auto;
  padding: 0 0 48px;
}

.hero-stack {
  display: grid;
  gap: 16px;
}

.filters-wrap,
.map-wrap,
.empty-state {
  border-radius: 30px;
  border: 1px solid rgba(255, 255, 255, 0.08);
  background:
    linear-gradient(180deg, rgba(255, 255, 255, 0.05), rgba(255, 255, 255, 0.025)),
    rgba(12, 14, 19, 0.85);
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.04),
    0 28px 60px rgba(0, 0, 0, 0.24);
  backdrop-filter: blur(16px);
}

.dashboard {
  display: grid;
  gap: 24px;
}

.results-wrap {
  display: grid;
  gap: 22px;
}

.loading-panel {
  display: grid;
  place-items: center;
  gap: 16px;
  min-height: 420px;
  border-radius: 30px;
  border: 1px solid rgba(255, 255, 255, 0.08);
  background:
    radial-gradient(circle at center, rgba(255, 122, 26, 0.12), transparent 32%),
    linear-gradient(180deg, rgba(255, 255, 255, 0.045), rgba(255, 255, 255, 0.02));
}

.loading-orb {
  width: 62px;
  height: 62px;
  border-radius: 50%;
  border: 3px solid rgba(255, 255, 255, 0.08);
  border-top-color: #ff8e39;
  border-right-color: rgba(255, 142, 57, 0.56);
  box-shadow:
    0 0 0 10px rgba(255, 122, 26, 0.08),
    0 18px 34px rgba(255, 122, 26, 0.18);
  animation: spin 0.9s linear infinite;
}

.loading-label {
  color: rgba(255, 255, 255, 0.76);
  font-size: 0.98rem;
  font-weight: 700;
}

.empty-state {
  min-height: 240px;
  padding: 36px 24px;
  display: grid;
  place-items: center;
  text-align: center;
  gap: 12px;
}

.empty-state h2 {
  color: #fff4ed;
  font-size: 1.4rem;
  letter-spacing: -0.04em;
}

.empty-state p {
  max-width: 44ch;
  color: rgba(255, 255, 255, 0.68);
  line-height: 1.65;
}

.surface-enter {
  animation: surface-rise 620ms cubic-bezier(0.22, 1, 0.36, 1) both;
}

.surface-enter--delay-1 { animation-delay: 70ms; }
.surface-enter--delay-2 { animation-delay: 120ms; }
.surface-enter--delay-3 { animation-delay: 170ms; }
.surface-enter--delay-4 { animation-delay: 220ms; }

.banner-fade-enter-active,
.banner-fade-leave-active,
.content-fade-enter-active,
.content-fade-leave-active {
  transition: opacity 240ms ease, transform 240ms ease;
}

.banner-fade-enter-from,
.banner-fade-leave-to {
  opacity: 0;
  transform: translateY(-8px);
}

.content-fade-enter-from,
.content-fade-leave-to {
  opacity: 0;
  transform: translateY(10px);
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

@keyframes surface-rise {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@media (max-width: 720px) {
  .main-shell {
    width: min(100%, calc(100% - 20px));
    padding-bottom: 30px;
  }

  .filters-wrap,
  .map-wrap,
  .empty-state {
    border-radius: 24px;
  }

  .dashboard {
    gap: 18px;
  }
}
</style>

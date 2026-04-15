<script setup>
import { computed, nextTick, onMounted, onUnmounted, ref, watch } from 'vue'
import AppHeader from './components/AppHeader.vue'
import FuelRadarLogo from './components/FuelRadarLogo.vue'
import LocationBanner from './components/LocationBanner.vue'
import LocationSearch from './components/LocationSearch.vue'
import MapView from './components/MapView.vue'
import StationCard from './components/StationCard.vue'
import StationList from './components/StationList.vue'
import TopCards from './components/TopCards.vue'
import { useGeolocation } from './composables/useGeolocation.js'
import { useStations } from './composables/useStations.js'

const manualLocation = ref(null)
const selectedStation = ref(null)
const dismissedBanner = ref('')
const mapWrapRef = ref(null)
const showSplash = ref(true)
const splashLeaving = ref(false)
const favoriteIds = ref([])
const currentPage = ref('home')
const favoriteStorageKey = 'fuel-radar-favorites'
const savingsAmount = ref(20)

let splashFadeTimer = null
let splashHideTimer = null

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
  filtered,
  sorted,
  cheapest,
  nearest,
  bestCompromise,
  stationsLoading,
  stationsError,
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
const searchMode = computed(() => {
  if (manualLocation.value) return 'Per indirizzo'
  if (effectivePosition.value) return 'Posizione attuale'
  return 'In attesa'
})

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
const favoriteStations = computed(() => sorted.value.filter((station) => favoriteIds.value.includes(station.id)))
const pages = computed(() => ([
  { id: 'home', label: 'Home' },
  { id: 'risparmi', label: 'Risparmi' },
  { id: 'preferiti', label: 'Preferiti' },
]))
const savingsAmountOptions = [5, 10, 20, 50, 100]
const averagePrice = computed(() => {
  if (!filtered.value.length) return null
  return filtered.value.reduce((total, station) => total + station.price, 0) / filtered.value.length
})
const savingsStation = computed(() => selectedStation.value ?? cheapest.value ?? null)
const savingsPerLiter = computed(() => {
  if (averagePrice.value == null || !savingsStation.value) return 0
  return Math.max(0, averagePrice.value - savingsStation.value.price)
})
const estimatedLiters = computed(() => (
  savingsStation.value?.price ? savingsAmount.value / savingsStation.value.price : 0
))
const estimatedSavings = computed(() => savingsPerLiter.value * estimatedLiters.value)
const savingsMessage = computed(() => {
  if (!savingsStation.value || averagePrice.value == null) {
    return 'Attiva la posizione o cerca un indirizzo per confrontare il distributore migliore con il prezzo medio vicino a te.'
  }

  if (estimatedSavings.value <= 0) {
    return 'Il distributore selezionato e la media di zona sono praticamente allineati.'
  }

  return `Con ${savingsAmount.value} euro di rifornimento risparmi circa € ${estimatedSavings.value.toFixed(2)} rispetto alla media locale.`
})

watch(bannerMessage, (nextMessage, previousMessage) => {
  if (nextMessage !== previousMessage) {
    dismissedBanner.value = ''
  }
})

onMounted(async () => {
  try {
    const storedFavorites = window.localStorage.getItem(favoriteStorageKey)
    favoriteIds.value = storedFavorites ? JSON.parse(storedFavorites) : []
  } catch {
    favoriteIds.value = []
  }

  splashFadeTimer = window.setTimeout(() => {
    splashLeaving.value = true
  }, 1050)

  splashHideTimer = window.setTimeout(() => {
    showSplash.value = false
  }, 1550)

  await requestLocation()
})

onUnmounted(() => {
  if (splashFadeTimer) window.clearTimeout(splashFadeTimer)
  if (splashHideTimer) window.clearTimeout(splashHideTimer)
})

watch(favoriteIds, (nextIds) => {
  window.localStorage.setItem(favoriteStorageKey, JSON.stringify(nextIds))
}, { deep: true })

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

async function selectStation(station, options = {}) {
  selectedStation.value = station

  if (!options.scrollToMap) return

  currentPage.value = 'home'
  await nextTick()
  mapWrapRef.value?.scrollIntoView({
    behavior: 'smooth',
    block: 'start',
  })
}

function setCurrentPage(pageId) {
  currentPage.value = pageId
  selectedStation.value = null
  window.scrollTo({
    top: 0,
    behavior: 'smooth',
  })
}

async function scrollToMobileSection(sectionId) {
  currentPage.value = sectionId
  await nextTick()
  window.scrollTo({
    top: 0,
    behavior: 'smooth',
  })
}

function toggleFavorite(station) {
  if (favoriteIds.value.includes(station.id)) {
    favoriteIds.value = favoriteIds.value.filter((id) => id !== station.id)
    return
  }

  favoriteIds.value = [...favoriteIds.value, station.id]
}

function updateFilters(nextFilters) {
  filters.value = nextFilters
}
</script>

<template>
  <div class="app-shell">
    <Transition name="splash-fade">
      <div v-if="showSplash" class="splash-screen" :class="{ 'splash-screen--leaving': splashLeaving }">
        <div class="splash-mark">
          <h1 class="splash-title">FUEL RADAR</h1>
          <FuelRadarLogo :size="72" />
        </div>
      </div>
    </Transition>

    <div class="page-aurora" aria-hidden="true"></div>
    <div class="page-grid" aria-hidden="true"></div>

    <div class="page-content">
      <AppHeader
        :station-count="stationCount"
        :search-mode="searchMode"
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
        </section>

        <div class="page-switcher surface-enter surface-enter--delay-1" aria-label="Sezioni principali">
          <button
            v-for="page in pages"
            :key="page.id"
            class="page-switcher__item"
            :class="{ 'page-switcher__item--active': currentPage === page.id }"
            type="button"
            @click="setCurrentPage(page.id)"
          >
            {{ page.label }}
          </button>
        </div>

        <Transition name="content-fade" mode="out-in">
          <section v-if="loading" key="loading" class="loading-panel">
            <div class="loading-orb" aria-hidden="true"></div>
            <p class="loading-label">{{ loadingLabel }}</p>
          </section>

          <section v-else-if="currentPage === 'home'" key="home" class="dashboard">
            <div ref="mapWrapRef" class="map-wrap surface-enter surface-enter--delay-2">
              <MapView
                :user-position="effectivePosition"
                :stations="sorted"
                :selected-station="selectedStation"
                :favorite-ids="favoriteIds"
                :cheapest="cheapest"
                :nearest="nearest"
                :best-compromise="bestCompromise"
                :filters="filters"
                :radius="filters.radius"
                @select-station="selectStation"
                @toggle-favorite="toggleFavorite"
                @update:filters="updateFilters"
              />
            </div>

            <div class="results-wrap">
              <section
                v-if="cheapest || nearest || bestCompromise"
                class="surface-enter surface-enter--delay-3"
              >
                <TopCards
                  :cheapest="cheapest"
                  :nearest="nearest"
                  :best-compromise="bestCompromise"
                  :favorite-ids="favoriteIds"
                  @select-station="(station) => selectStation(station, { scrollToMap: true })"
                  @toggle-favorite="toggleFavorite"
                />
              </section>

              <section v-if="sorted.length" class="surface-enter surface-enter--delay-4">
                <StationList
                  :stations="sorted"
                  :selected-station-id="selectedStation?.id ?? null"
                  :favorite-ids="favoriteIds"
                  @select-station="(station) => selectStation(station, { scrollToMap: true })"
                  @toggle-favorite="toggleFavorite"
                />
              </section>

              <div v-else class="empty-state surface-enter surface-enter--delay-3">
                <FuelRadarLogo :size="56" />
                <h2>Nessun distributore trovato</h2>
                <p>
                  Prova a cambiare raggio, usa un indirizzo diverso oppure riprova la posizione attuale.
                </p>
              </div>
            </div>
          </section>

          <section v-else-if="currentPage === 'risparmi'" key="risparmi" class="dashboard dashboard--single">
            <section class="savings-section surface-enter surface-enter--delay-2">
              <div class="savings-head">
                <div>
                  <p class="section-kicker">Risparmi</p>
                  <h2 class="section-title">Quanto ti conviene davvero</h2>
                </div>
                <p class="section-text">{{ savingsMessage }}</p>
              </div>

              <div class="savings-amounts" role="tablist" aria-label="Importo rifornimento">
                <button
                  v-for="amount in savingsAmountOptions"
                  :key="amount"
                  class="savings-pill"
                  :class="{ 'savings-pill--active': savingsAmount === amount }"
                  type="button"
                  @click="savingsAmount = amount"
                >
                  € {{ amount }}
                </button>
              </div>

              <div class="savings-grid">
                <article class="savings-card">
                  <span class="savings-label">Stazione di riferimento</span>
                  <strong class="savings-value savings-value--name">
                    {{ savingsStation?.brand || 'In attesa' }}
                  </strong>
                  <span class="savings-note">
                    {{ savingsStation?.name || 'Seleziona una zona per iniziare.' }}
                  </span>
                </article>

                <article class="savings-card">
                  <span class="savings-label">Prezzo medio in zona</span>
                  <strong class="savings-value">
                    {{ averagePrice != null ? `€ ${averagePrice.toFixed(3)}` : '—' }}
                  </strong>
                  <span class="savings-note">Calcolato sui distributori filtrati attorno a te.</span>
                </article>

                <article class="savings-card savings-card--accent">
                  <span class="savings-label">Risparmio stimato</span>
                  <strong class="savings-value">
                    {{ estimatedSavings > 0 ? `€ ${estimatedSavings.toFixed(2)}` : '€ 0.00' }}
                  </strong>
                  <span class="savings-note">
                    {{ estimatedLiters ? `${estimatedLiters.toFixed(1)} litri circa` : 'Attiva una ricerca per stimarlo.' }}
                  </span>
                </article>
              </div>
            </section>
          </section>

          <section v-else key="preferiti" class="dashboard dashboard--single">
            <section class="favorites-section surface-enter surface-enter--delay-2">
              <div class="favorites-head">
                <p class="section-kicker">Preferiti</p>
                <h2 class="section-title">Le tue soste salvate</h2>
                <p class="section-text">Aggiungi la stellina ai distributori che vuoi ritrovare subito.</p>
              </div>

              <div v-if="favoriteStations.length" class="favorites-grid">
                <StationCard
                  v-for="station in favoriteStations"
                  :key="`favorite-${station.id}`"
                  :station="station"
                  label="Preferito"
                  type="best"
                  :is-favorite="true"
                  @select="(picked) => selectStation(picked, { scrollToMap: true })"
                  @toggle-favorite="toggleFavorite"
                />
              </div>

              <div v-else class="favorites-empty">
                Non hai ancora salvato distributori. Aggiungi la stellina dai risultati o dalla mappa.
              </div>
            </section>
          </section>
        </Transition>
      </main>
    </div>

    <nav class="mobile-dock" aria-label="Navigazione mobile">
      <button
        v-for="page in pages"
        :key="page.id"
        class="mobile-dock__item"
        :class="{ 'mobile-dock__item--active': currentPage === page.id }"
        type="button"
        @click="scrollToMobileSection(page.id)"
      >
        {{ page.label }}
      </button>
    </nav>
  </div>
</template>

<style scoped>
.app-shell {
  position: relative;
  min-height: 100dvh;
  overflow: hidden;
}

.splash-screen {
  position: fixed;
  inset: 0;
  z-index: 30;
  display: grid;
  place-items: center;
  background:
    radial-gradient(circle at center, rgba(255, 132, 41, 0.16), transparent 24%),
    linear-gradient(180deg, #040507 0%, #090b10 100%);
}

.splash-screen--leaving .splash-mark {
  transform: translateY(-6px) scale(1.02);
  opacity: 0;
}

.splash-mark {
  display: flex;
  align-items: center;
  gap: 16px;
  transition: transform 420ms ease, opacity 420ms ease;
}

.splash-title {
  font-size: clamp(2.4rem, 8vw, 4.8rem);
  font-weight: 800;
  letter-spacing: -0.05em;
  text-transform: uppercase;
  color: #fff8f1;
  -webkit-text-stroke: 1px rgba(255, 166, 99, 0.34);
  text-shadow:
    0 16px 34px rgba(0, 0, 0, 0.28),
    0 0 26px rgba(255, 122, 26, 0.14);
  animation: splash-rise 900ms cubic-bezier(0.22, 1, 0.36, 1) both;
}

.page-aurora {
  position: fixed;
  inset: 0;
  background:
    radial-gradient(circle at top center, rgba(255, 126, 33, 0.12), transparent 22%),
    radial-gradient(circle at 14% 12%, rgba(255, 160, 66, 0.08), transparent 18%),
    radial-gradient(circle at 86% 18%, rgba(255, 122, 26, 0.09), transparent 20%),
    radial-gradient(circle at 50% 42%, rgba(255, 132, 41, 0.14), transparent 32%),
    radial-gradient(circle at 18% 72%, rgba(255, 153, 77, 0.09), transparent 24%),
    radial-gradient(circle at 82% 88%, rgba(255, 122, 26, 0.1), transparent 26%),
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
  padding: 0 0 72px;
}

.hero-stack {
  display: grid;
  gap: 18px;
  margin-bottom: 20px;
}

.page-switcher {
  width: fit-content;
  margin: 0 auto 30px;
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px;
  border-radius: 999px;
  background: rgba(11, 14, 19, 0.8);
  border: 1px solid rgba(255, 255, 255, 0.08);
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.04),
    0 18px 34px rgba(0, 0, 0, 0.2);
  backdrop-filter: blur(16px);
}

.page-switcher__item {
  min-height: 44px;
  padding: 0 18px;
  border: 0;
  border-radius: 999px;
  background: transparent;
  color: rgba(255, 255, 255, 0.72);
  font: inherit;
  font-weight: 700;
  cursor: pointer;
  transition:
    background var(--transition),
    color var(--transition),
    transform var(--transition),
    box-shadow var(--transition);
}

.page-switcher__item:hover {
  transform: translateY(-1px);
  color: #fff6ef;
}

.page-switcher__item--active {
  background: linear-gradient(135deg, #ff9c52, #ff7a1a 55%, #d95504);
  color: white;
  box-shadow: 0 12px 22px rgba(255, 122, 26, 0.18);
}

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
  gap: 34px;
}

.dashboard--single {
  gap: 0;
}

.results-wrap {
  display: grid;
  gap: 30px;
}

.favorites-section,
.savings-section {
  display: grid;
  gap: 20px;
}

.favorites-head,
.savings-head {
  display: grid;
  gap: 10px;
  justify-items: center;
  text-align: center;
}

.section-kicker {
  color: rgba(255, 183, 133, 0.8);
  font-size: 0.72rem;
  font-weight: 700;
  letter-spacing: 0.18em;
  text-transform: uppercase;
}

.section-title {
  font-size: 1.28rem;
  font-weight: 800;
  letter-spacing: -0.05em;
  text-transform: uppercase;
  color: #fff8f1;
  -webkit-text-stroke: 0.7px rgba(255, 166, 99, 0.18);
}

.section-text,
.favorites-empty {
  color: rgba(255, 255, 255, 0.64);
  line-height: 1.6;
}

.savings-amounts {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  justify-content: center;
}

.savings-pill {
  min-height: 42px;
  padding: 0 16px;
  border-radius: 999px;
  border: 1px solid rgba(255, 255, 255, 0.08);
  background: rgba(255, 255, 255, 0.04);
  color: rgba(255, 255, 255, 0.76);
  font: inherit;
  font-weight: 700;
  cursor: pointer;
  transition:
    transform var(--transition),
    border-color var(--transition),
    background var(--transition),
    color var(--transition),
    box-shadow var(--transition);
}

.savings-pill:hover {
  transform: translateY(-1px);
  border-color: rgba(255, 122, 26, 0.24);
}

.savings-pill--active {
  background: linear-gradient(135deg, #ff9c52, #ff7a1a 55%, #d95504);
  border-color: transparent;
  color: white;
  box-shadow: 0 12px 24px rgba(255, 122, 26, 0.18);
}

.savings-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 18px;
}

.savings-card {
  padding: 20px 18px;
  border-radius: 24px;
  border: 1px solid rgba(255, 255, 255, 0.08);
  background:
    linear-gradient(180deg, rgba(255, 255, 255, 0.045), rgba(255, 255, 255, 0.02)),
    rgba(14, 17, 24, 0.78);
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.04),
    0 18px 34px rgba(0, 0, 0, 0.16);
  display: grid;
  gap: 10px;
  text-align: center;
}

.savings-card--accent {
  border-color: rgba(255, 147, 74, 0.18);
  background:
    linear-gradient(180deg, rgba(255, 150, 78, 0.12), rgba(255, 255, 255, 0.03)),
    rgba(17, 19, 25, 0.84);
}

.savings-label {
  color: rgba(255, 255, 255, 0.52);
  font-size: 0.72rem;
  font-weight: 700;
  letter-spacing: 0.12em;
  text-transform: uppercase;
}

.savings-value {
  color: #fff7f0;
  font-size: clamp(1.5rem, 3vw, 2.3rem);
  font-weight: 800;
  letter-spacing: -0.06em;
}

.savings-value--name {
  font-size: clamp(1.15rem, 2.4vw, 1.65rem);
}

.savings-note {
  color: rgba(255, 255, 255, 0.62);
  line-height: 1.55;
}

.favorites-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 18px;
}

.favorites-empty {
  text-align: center;
  padding: 20px 18px;
  border-radius: 22px;
  border: 1px dashed rgba(255, 255, 255, 0.1);
  background: rgba(255, 255, 255, 0.03);
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

.splash-fade-enter-active,
.splash-fade-leave-active {
  transition: opacity 320ms ease;
}

.splash-fade-enter-from,
.splash-fade-leave-to {
  opacity: 0;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

@keyframes splash-rise {
  from {
    opacity: 0;
    transform: translateY(18px) scale(0.98);
  }
  to {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
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

.mobile-dock {
  position: fixed;
  left: 50%;
  bottom: 18px;
  transform: translateX(-50%);
  z-index: 12;
  display: none;
  align-items: center;
  gap: 8px;
  width: min(calc(100% - 24px), 440px);
  padding: 8px;
  border-radius: 999px;
  background: rgba(12, 15, 20, 0.82);
  border: 1px solid rgba(255, 255, 255, 0.08);
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.04),
    0 18px 34px rgba(0, 0, 0, 0.28);
  backdrop-filter: blur(16px);
}

.mobile-dock__item {
  flex: 1 1 0;
  min-height: 46px;
  padding: 0 10px;
  border: 0;
  border-radius: 999px;
  background: transparent;
  color: rgba(255, 255, 255, 0.72);
  font: inherit;
  font-weight: 800;
  cursor: pointer;
  transition:
    background var(--transition),
    color var(--transition),
    transform var(--transition),
    box-shadow var(--transition);
}

.mobile-dock__item--active {
  background: linear-gradient(135deg, #ff9c52, #ff7a1a 55%, #d95504);
  color: white;
  box-shadow: 0 12px 22px rgba(255, 122, 26, 0.2);
}

@media (max-width: 720px) {
  .main-shell {
    width: min(100%, calc(100% - 20px));
    padding-bottom: 108px;
  }

  .hero-stack {
    gap: 16px;
    margin-bottom: 18px;
  }

  .page-switcher {
    width: 100%;
    margin-bottom: 24px;
    justify-content: space-between;
  }

  .page-switcher__item {
    flex: 1 1 0;
    min-width: 0;
    padding: 0 12px;
  }

  .map-wrap,
  .empty-state {
    border-radius: 24px;
  }

  .dashboard {
    gap: 24px;
  }

  .results-wrap {
    gap: 22px;
  }

  .favorites-grid {
    grid-template-columns: 1fr;
  }

  .savings-grid {
    grid-template-columns: 1fr;
  }

  .mobile-dock {
    display: flex;
  }
}

@media (max-width: 560px) {
  .splash-mark {
    gap: 12px;
  }

  .splash-title {
    font-size: clamp(2rem, 11vw, 3rem);
  }

  .loading-panel {
    min-height: 300px;
    border-radius: 24px;
  }

  .empty-state {
    min-height: 210px;
    padding: 28px 20px;
  }

  .mobile-dock {
    bottom: 12px;
    width: calc(100% - 18px);
    padding: 7px;
  }

  .mobile-dock__item {
    min-height: 42px;
    font-size: 0.82rem;
  }
}
</style>

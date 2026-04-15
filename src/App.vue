<script setup>
import { computed, nextTick, onMounted, onUnmounted, ref, watch } from 'vue'
import AppHeader from './components/AppHeader.vue'
import FilterBar from './components/FilterBar.vue'
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
const heroStackRef = ref(null)
const filtersWrapRef = ref(null)
const mapWrapRef = ref(null)
const favoritesWrapRef = ref(null)
const resultsWrapRef = ref(null)
const showSplash = ref(true)
const splashLeaving = ref(false)
const favoriteIds = ref([])
const activeMobileSection = ref('home')
const favoriteStorageKey = 'fuel-radar-favorites'

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
const mobileSections = computed(() => {
  const sections = [
    { id: 'home', label: 'Home' },
    { id: 'filtri', label: 'Filtri' },
    { id: 'radar', label: 'Radar' },
  ]

  if (favoriteIds.value.length) {
    sections.push({ id: 'preferiti', label: 'Preferiti' })
  }

  sections.push({ id: 'risultati', label: 'Risultati' })
  return sections
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

  window.addEventListener('scroll', syncActiveMobileSection, { passive: true })
  window.addEventListener('resize', syncActiveMobileSection, { passive: true })
  await requestLocation()
  syncActiveMobileSection()
})

onUnmounted(() => {
  if (splashFadeTimer) window.clearTimeout(splashFadeTimer)
  if (splashHideTimer) window.clearTimeout(splashHideTimer)
  window.removeEventListener('scroll', syncActiveMobileSection)
  window.removeEventListener('resize', syncActiveMobileSection)
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

  await nextTick()
  mapWrapRef.value?.scrollIntoView({
    behavior: 'smooth',
    block: 'start',
  })
}

function resolveSectionElement(sectionId) {
  if (sectionId === 'home') return heroStackRef.value
  if (sectionId === 'filtri') return filtersWrapRef.value
  if (sectionId === 'radar') return mapWrapRef.value
  if (sectionId === 'preferiti') return favoritesWrapRef.value
  if (sectionId === 'risultati') return resultsWrapRef.value
  return null
}

function syncActiveMobileSection() {
  const viewportAnchor = window.innerHeight * 0.32

  let current = 'home'
  mobileSections.value.forEach((section) => {
    const el = resolveSectionElement(section.id)
    if (!el) return
    const rect = el.getBoundingClientRect()
    if (rect.top <= viewportAnchor) {
      current = section.id
    }
  })

  activeMobileSection.value = current
}

async function scrollToMobileSection(sectionId) {
  const target = resolveSectionElement(sectionId)
  if (!target) return

  activeMobileSection.value = sectionId
  await nextTick()
  target.scrollIntoView({
    behavior: 'smooth',
    block: 'start',
  })
}

function toggleFavorite(station) {
  if (favoriteIds.value.includes(station.id)) {
    favoriteIds.value = favoriteIds.value.filter((id) => id !== station.id)
    return
  }

  favoriteIds.value = [...favoriteIds.value, station.id]
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
        <section ref="heroStackRef" class="hero-stack surface-enter">
          <LocationSearch
            :manual-location="manualLocation"
            :current-position="position"
            @select-location="handleSelectLocation"
            @clear-manual="clearManualLocation"
            @retry-geo="useCurrentLocation"
          />

          <div ref="filtersWrapRef" class="filters-wrap surface-enter surface-enter--delay-1">
            <FilterBar v-model:filters="filters" />
          </div>
        </section>

        <Transition name="content-fade" mode="out-in">
          <section v-if="loading" key="loading" class="loading-panel">
            <div class="loading-orb" aria-hidden="true"></div>
            <p class="loading-label">{{ loadingLabel }}</p>
          </section>

          <section v-else key="content" class="dashboard">
            <div ref="mapWrapRef" class="map-wrap surface-enter surface-enter--delay-2">
              <MapView
                :user-position="effectivePosition"
                :stations="sorted"
                :selected-station="selectedStation"
                :favorite-ids="favoriteIds"
                :cheapest="cheapest"
                :nearest="nearest"
                :best-compromise="bestCompromise"
                :radius="filters.radius"
                @select-station="selectStation"
                @toggle-favorite="toggleFavorite"
              />
            </div>

            <div ref="resultsWrapRef" class="results-wrap">
              <section
                v-if="favoriteIds.length"
                ref="favoritesWrapRef"
                class="favorites-section surface-enter surface-enter--delay-3"
              >
                <div class="favorites-head">
                  <h2 class="favorites-title">Preferiti</h2>
                  <p class="favorites-subtitle">I distributori che hai salvato con la stellina.</p>
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
                  I tuoi preferiti non rientrano nei filtri attuali o nella zona selezionata.
                </div>
              </section>

              <TopCards
                v-if="cheapest || nearest || bestCompromise"
                class="surface-enter surface-enter--delay-3"
                :cheapest="cheapest"
                :nearest="nearest"
                :best-compromise="bestCompromise"
                :favorite-ids="favoriteIds"
                @select-station="(station) => selectStation(station, { scrollToMap: true })"
                @toggle-favorite="toggleFavorite"
              />

              <StationList
                v-if="sorted.length"
                class="surface-enter surface-enter--delay-4"
                :stations="sorted"
                :selected-station-id="selectedStation?.id ?? null"
                :favorite-ids="favoriteIds"
                @select-station="(station) => selectStation(station, { scrollToMap: true })"
                @toggle-favorite="toggleFavorite"
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

    <nav class="mobile-dock" aria-label="Navigazione mobile">
      <button
        v-for="section in mobileSections"
        :key="section.id"
        class="mobile-dock__item"
        :class="{ 'mobile-dock__item--active': activeMobileSection === section.id }"
        type="button"
        @click="scrollToMobileSection(section.id)"
      >
        {{ section.label }}
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
  gap: 26px;
  margin-bottom: 34px;
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
  gap: 34px;
}

.results-wrap {
  display: grid;
  gap: 30px;
}

.favorites-section {
  display: grid;
  gap: 20px;
}

.favorites-head {
  display: grid;
  gap: 8px;
  justify-items: center;
  text-align: center;
}

.favorites-title {
  font-size: 1.28rem;
  font-weight: 800;
  letter-spacing: -0.04em;
  text-transform: uppercase;
  color: #fff8f1;
  -webkit-text-stroke: 0.9px rgba(255, 166, 99, 0.3);
  text-shadow:
    0 12px 28px rgba(0, 0, 0, 0.24),
    0 0 22px rgba(255, 122, 26, 0.1),
    0 0 2px rgba(255, 214, 181, 0.2);
}

.favorites-subtitle,
.favorites-empty {
  color: rgba(255, 255, 255, 0.64);
  line-height: 1.6;
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
    gap: 20px;
    margin-bottom: 26px;
  }

  .filters-wrap,
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

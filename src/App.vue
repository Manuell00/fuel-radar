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
const geoDisabled = ref(false)
const selectedStation = ref(null)
const dismissedBanner = ref('')
const mapWrapRef = ref(null)
const locationSearchRef = ref(null)
const showSplash = ref(true)
const splashLeaving = ref(false)
const favoriteIds = ref([])
const currentPage = ref('home')
const favoriteStorageKey = 'fuel-radar-favorites'
const notificationStorageKey = 'fuel-radar-notifications'
const savingsAmount = ref(20)
const savingsFiltersOpen = ref(false)
const isCompactLayout = ref(false)
const notificationsEnabled = ref(false)
const notificationPermission = ref('default')
const hasNotificationBaseline = ref(false)
const favoritePriceSnapshot = ref({})
const lastFavoriteWinnerNotice = ref('')

const isDrivingMode = ref(false)
const isNightMode = ref(false)
const hasScrolled = ref(false)

let splashFadeTimer = null
let splashHideTimer = null
let compactLayoutMedia = null
let notificationRefreshTimer = null
let nightModeTimer = null

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
  if (geoDisabled.value) return null
  return position.value
})

const isUsingGps = computed(() => !manualLocation.value && !geoDisabled.value && !!position.value)

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
  publicationKey,
  getTrend,
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
const notificationsSupported = computed(() => typeof window !== 'undefined' && 'Notification' in window)
const pages = computed(() => ([
  { id: 'home', label: 'Home' },
  { id: 'risparmi', label: 'Risparmi' },
  { id: 'preferiti', label: 'Preferiti' },
]))
const showHomeChrome = computed(() => !isCompactLayout.value || currentPage.value === 'home')
const savingsAmountOptions = [5, 10, 20, 50, 100]
const savingsFuelOptions = [
  { value: 'tutti', label: 'Tutti' },
  { value: 'benzina', label: 'Benzina' },
  { value: 'diesel', label: 'Diesel' },
  { value: 'gpl', label: 'GPL' },
]
const savingsModeOptions = [
  { value: 'tutti', label: 'Tutti' },
  { value: 'self', label: 'Self' },
  { value: 'servito', label: 'Servito' },
]
const savingsFuelSummary = {
  tutti: 'Tutti i carburanti',
  benzina: 'Benzina',
  diesel: 'Diesel',
  gpl: 'GPL',
}
const savingsModeSummary = {
  tutti: 'Tutte le modalita',
  self: 'Self',
  servito: 'Servito',
}
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
const savingsHighlight = computed(() => {
  if (!savingsStation.value || averagePrice.value == null || estimatedSavings.value <= 0) return null

  return {
    amount: savingsAmount.value,
    saved: estimatedSavings.value.toFixed(2),
  }
})
const savingsMessage = computed(() => {
  if (!savingsStation.value || averagePrice.value == null) {
    return 'Attiva la posizione o cerca un indirizzo per confrontare il distributore migliore con il prezzo medio vicino a te.'
  }

  if (estimatedSavings.value <= 0) {
    return 'Il distributore selezionato e la media di zona sono praticamente allineati.'
  }

  return `Con ${savingsAmount.value} euro di rifornimento risparmi circa € ${estimatedSavings.value.toFixed(2)} rispetto alla media locale.`
})
// "Vai subito" CTA — URL di navigazione verso il distributore più economico
const goNowUrl = computed(() => {
  if (!cheapest.value) return null
  const { lat, lng } = cheapest.value
  return `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}&travelmode=driving`
})

const showGoNowCta = computed(() => !!goNowUrl.value && currentPage.value === 'home' && !isDrivingMode.value && !hasScrolled.value)

// Label "Ultimo aggiornamento"
const lastUpdateLabel = computed(() => {
  if (!publicationKey.value) return ''
  const today = new Date().toISOString().slice(0, 10)
  const yesterday = new Date(Date.now() - 86_400_000).toISOString().slice(0, 10)
  if (publicationKey.value === today) return 'Prezzi aggiornati oggi alle 08:30'
  if (publicationKey.value === yesterday) return 'Prezzi di ieri'
  return `Prezzi del ${publicationKey.value}`
})

const forecastBasePrice = computed(() => savingsStation.value?.price ?? cheapest.value?.price ?? averagePrice.value ?? null)
const forecastSpread = computed(() => {
  if (averagePrice.value == null || cheapest.value == null) return 0
  return Math.max(0, averagePrice.value - cheapest.value.price)
})
const forecastDirection = computed(() => {
  if (forecastBasePrice.value == null) return 0

  if (forecastSpread.value >= 0.05) return -1
  if (forecastSpread.value <= 0.015) return 1
  return 0
})
const forecastScenarios = computed(() => {
  if (forecastBasePrice.value == null) return []

  const now = new Date()
  const dayFormatter = new Intl.DateTimeFormat('it-IT', { weekday: 'short' })
  const deltas = forecastDirection.value === -1
    ? [-0.012, -0.018, -0.009]
    : forecastDirection.value === 1
      ? [0.008, 0.015, 0.021]
      : [0.002, -0.004, 0.003]

  return deltas.map((delta, index) => {
    const date = new Date(now)
    date.setDate(now.getDate() + index + 1)
    const projectedPrice = Math.max(1, forecastBasePrice.value + delta)

    return {
      id: `forecast-${index}`,
      label: index === 0 ? 'Domani' : dayFormatter.format(date),
      delta,
      price: projectedPrice,
    }
  })
})
const forecastRecommendation = computed(() => {
  if (!forecastScenarios.value.length || forecastBasePrice.value == null) {
    return 'Attiva la posizione per vedere una simulazione dei prossimi giorni.'
  }

  const lowestForecast = [...forecastScenarios.value].sort((a, b) => a.price - b.price)[0]
  const deltaToday = lowestForecast.price - forecastBasePrice.value

  if (deltaToday >= 0.01) {
    return 'Scenario ipotetico: oggi sembra ancora il momento piu conveniente per fare rifornimento.'
  }

  if (lowestForecast.label === 'Domani') {
    return 'Scenario ipotetico: domani potresti trovare un piccolo margine di risparmio.'
  }

  return `Scenario ipotetico: potresti trovare il prezzo migliore verso ${lowestForecast.label.toLowerCase()}.`
})
const bestForecastScenario = computed(() => {
  if (!forecastScenarios.value.length) return null
  return [...forecastScenarios.value].sort((a, b) => a.price - b.price)[0]
})
const notificationStatusLabel = computed(() => {
  if (!notificationsSupported.value) return 'Notifiche non supportate su questo browser.'
  if (notificationPermission.value === 'denied') return 'Permesso notifiche negato nel browser.'
  if (notificationsEnabled.value && notificationPermission.value === 'granted') {
    return 'Avvisi attivi sui preferiti e sui cali di prezzo.'
  }
  return 'Ricevi avvisi quando un preferito scende di prezzo.'
})

function handleScroll() {
  hasScrolled.value = window.scrollY > 40
}

function checkDrivingMode() {
  const isTouch = navigator.maxTouchPoints > 0 || 'ontouchstart' in window
  const isLandscape = window.innerWidth > window.innerHeight
  isDrivingMode.value = isTouch && isLandscape && currentPage.value === 'home'
}

function checkNightMode() {
  const hour = new Date().getHours()
  isNightMode.value = hour >= 21 || hour < 6
}

function exitDrivingMode() {
  isDrivingMode.value = false
}

function sliderPct(value) {
  return `${((value - 1) / 49) * 100}%`
}

function openSavingsFilters() {
  savingsFiltersOpen.value = true
}

function closeSavingsFilters() {
  savingsFiltersOpen.value = false
}

watch(bannerMessage, (nextMessage, previousMessage) => {
  if (nextMessage !== previousMessage) {
    dismissedBanner.value = ''
  }
})

watch(currentPage, checkDrivingMode)

watch(savingsFiltersOpen, (isOpen) => {
  document.body.style.overflow = isOpen ? 'hidden' : ''
})

onMounted(async () => {
  compactLayoutMedia = window.matchMedia('(max-width: 1024px)')
  isCompactLayout.value = compactLayoutMedia.matches
  compactLayoutMedia.addEventListener('change', handleCompactLayoutChange)

  try {
    const storedFavorites = window.localStorage.getItem(favoriteStorageKey)
    favoriteIds.value = storedFavorites ? JSON.parse(storedFavorites) : []
  } catch {
    favoriteIds.value = []
  }

  try {
    const storedNotifications = window.localStorage.getItem(notificationStorageKey)
    notificationsEnabled.value = storedNotifications ? JSON.parse(storedNotifications).enabled === true : false
  } catch {
    notificationsEnabled.value = false
  }

  if (notificationsSupported.value) {
    notificationPermission.value = window.Notification.permission
  }

  checkNightMode()
  nightModeTimer = window.setInterval(checkNightMode, 60_000)

  window.addEventListener('scroll', handleScroll, { passive: true })
  window.addEventListener('resize', checkDrivingMode)
  window.addEventListener('orientationchange', checkDrivingMode)

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
  if (nightModeTimer) window.clearInterval(nightModeTimer)
  compactLayoutMedia?.removeEventListener('change', handleCompactLayoutChange)
  window.removeEventListener('scroll', handleScroll)
  window.removeEventListener('resize', checkDrivingMode)
  window.removeEventListener('orientationchange', checkDrivingMode)
  clearNotificationRefreshTimer()
  document.body.style.overflow = ''
})

watch(favoriteIds, (nextIds) => {
  window.localStorage.setItem(favoriteStorageKey, JSON.stringify(nextIds))
}, { deep: true })

watch(notificationsEnabled, (enabled) => {
  window.localStorage.setItem(notificationStorageKey, JSON.stringify({ enabled }))
  syncNotificationRefreshTimer()
})

watch([effectivePosition, notificationPermission], () => {
  syncNotificationRefreshTimer()
}, { deep: true })

watch([sorted, favoriteIds], ([nextStations]) => {
  if (!nextStations.length) {
    favoritePriceSnapshot.value = {}
    hasNotificationBaseline.value = false
    lastFavoriteWinnerNotice.value = ''
    return
  }

  const nextSnapshot = Object.fromEntries(
    nextStations
      .filter((station) => favoriteIds.value.includes(station.id))
      .map((station) => [station.id, station.price])
  )

  if (!hasNotificationBaseline.value) {
    favoritePriceSnapshot.value = nextSnapshot
    hasNotificationBaseline.value = true
    return
  }

  if (notificationsEnabled.value && notificationPermission.value === 'granted') {
    notifyFavoritePriceDrops(nextStations)
    notifyFavoriteWinner()
  }

  favoritePriceSnapshot.value = nextSnapshot
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
  geoDisabled.value = false
  clearManualLocation()
  await requestLocation()
}

function handleDisableGeo() {
  geoDisabled.value = true
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

  // Desktop keeps the map visible, so forced scrolling is only useful in compact layouts.
  if (!options.scrollToMap || !isCompactLayout.value) return

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
  hasScrolled.value = false
  window.scrollTo({
    top: 0,
    behavior: 'smooth',
  })
}

async function scrollToMobileSection(sectionId) {
  currentPage.value = sectionId
  hasScrolled.value = false
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

function handleCompactLayoutChange(event) {
  isCompactLayout.value = event.matches
}

function clearNotificationRefreshTimer() {
  if (notificationRefreshTimer) {
    window.clearInterval(notificationRefreshTimer)
    notificationRefreshTimer = null
  }
}

function syncNotificationRefreshTimer() {
  clearNotificationRefreshTimer()

  if (
    !notificationsEnabled.value ||
    notificationPermission.value !== 'granted' ||
    !effectivePosition.value
  ) {
    return
  }

  notificationRefreshTimer = window.setInterval(() => {
    void refreshStations()
  }, 5 * 60 * 1000)
}

async function enableNotifications() {
  if (!notificationsSupported.value) return

  if (window.Notification.permission === 'default') {
    notificationPermission.value = await window.Notification.requestPermission()
  } else {
    notificationPermission.value = window.Notification.permission
  }

  notificationsEnabled.value = notificationPermission.value === 'granted'
}

function disableNotifications() {
  notificationsEnabled.value = false
}

function showBrowserNotification(title, body, tag) {
  if (!notificationsSupported.value || notificationPermission.value !== 'granted') return

  new window.Notification(title, {
    body,
    tag,
    icon: '/favicon.svg',
    badge: '/favicon.svg',
  })
}

function notifyFavoritePriceDrops(currentStations) {
  currentStations
    .filter((station) => favoriteIds.value.includes(station.id))
    .forEach((station) => {
      const previousPrice = favoritePriceSnapshot.value[station.id]
      if (previousPrice == null) return

      const droppedEnough = previousPrice - station.price >= 0.02
      if (!droppedEnough) return

      showBrowserNotification(
        'Prezzo in calo su un preferito',
        `${station.brand} ora e a € ${station.price.toFixed(3)} (${(previousPrice - station.price).toFixed(3)} in meno).`,
        `favorite-drop-${station.id}`
      )
    })
}

function notifyFavoriteWinner() {
  if (!favoriteStations.value.length || !cheapest.value) return

  const favoriteWinner = favoriteStations.value[0]
  if (favoriteWinner.id !== cheapest.value.id) return

  const noticeKey = `${favoriteWinner.id}-${favoriteWinner.price.toFixed(3)}`
  if (lastFavoriteWinnerNotice.value === noticeKey) return

  lastFavoriteWinnerNotice.value = noticeKey
  showBrowserNotification(
    'Un tuo preferito e il migliore in zona',
    `${favoriteWinner.brand} e il distributore piu conveniente vicino a te a € ${favoriteWinner.price.toFixed(3)}.`,
    `favorite-best-${favoriteWinner.id}`
  )
}
</script>

<template>
  <div class="app-shell" :class="{ 'app-shell--night': isNightMode }">
    <Transition name="splash-fade">
      <div v-if="showSplash" class="splash-screen" :class="{ 'splash-screen--leaving': splashLeaving }">
        <div class="splash-mark">
          <h1 class="splash-title">Fuel Radar</h1>
        </div>
      </div>
    </Transition>

    <div class="page-aurora" aria-hidden="true"></div>
    <div class="page-grid" aria-hidden="true"></div>

    <div class="page-content">
      <AppHeader v-if="showHomeChrome" />

      <Transition name="banner-fade">
        <LocationBanner
          v-if="showBanner"
          :message="bannerMessage"
          @retry="handleBannerRetry"
          @close="dismissCurrentBanner"
        />
      </Transition>

      <main class="main-shell">
        <section v-if="showHomeChrome && currentPage === 'home'" class="hero-intro surface-enter" aria-label="Introduzione">
          <span class="hero-intro__eyebrow">Prezzi · aggiornati ogni giorno</span>
          <h1 class="hero-intro__title">Il pieno più conveniente,<br/>qui accanto a te.</h1>
          <p class="hero-intro__lede">
            Fuel Radar confronta i distributori intorno a te e ti suggerisce
            dove risparmiare davvero — prezzo, distanza e trend in un colpo d'occhio.
          </p>
        </section>

        <section v-if="showHomeChrome" ref="locationSearchRef" class="hero-stack surface-enter">
          <LocationSearch
            :manual-location="manualLocation"
            :current-position="position"
            :is-using-gps="isUsingGps"
            @select-location="handleSelectLocation"
            @clear-manual="clearManualLocation"
            @retry-geo="useCurrentLocation"
            @disable-geo="handleDisableGeo"
          />
        </section>

        <div v-if="!isCompactLayout" class="page-switcher surface-enter surface-enter--delay-1" aria-label="Sezioni principali">
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

          <section v-else-if="currentPage === 'home'" key="home" class="home-page">
            <!-- 2-col: mappa (sinistra) | in evidenza (destra) -->
            <div class="dashboard surface-enter surface-enter--delay-2">
              <!-- Colonna sinistra: Radar -->
              <div class="map-col">
                <div class="col-head">
                  <span class="col-label">Radar</span>
                </div>
                <div ref="mapWrapRef" class="map-wrap">
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
              </div>

              <!-- Colonna destra: In evidenza -->
              <div class="cards-col">
                <div class="col-head">
                  <span class="col-label">In evidenza</span>
                </div>
                <section
                  v-if="cheapest || nearest || bestCompromise"
                  class="surface-enter surface-enter--delay-3"
                >
                  <TopCards
                    :cheapest="cheapest"
                    :nearest="nearest"
                    :best-compromise="bestCompromise"
                    :favorite-ids="favoriteIds"
                    :get-trend="getTrend"
                    @select-station="(station) => selectStation(station, { scrollToMap: true })"
                    @toggle-favorite="toggleFavorite"
                  />
                </section>
              </div>
            </div>

            <!-- Risultati full-width sotto la 2-col -->
            <section v-if="sorted.length" class="results-row surface-enter surface-enter--delay-4">
              <p v-if="lastUpdateLabel && !usingFallback" class="update-label">
                <svg class="update-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                  <circle cx="12" cy="12" r="9"/>
                  <polyline points="12 7 12 12 15 14"/>
                </svg>
                {{ lastUpdateLabel }}
              </p>
              <StationList
                :stations="sorted"
                :selected-station-id="selectedStation?.id ?? null"
                :favorite-ids="favoriteIds"
                :get-trend="getTrend"
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
          </section>

          <section v-else-if="currentPage === 'risparmi'" key="risparmi" class="dashboard dashboard--single">
            <section class="savings-section surface-enter surface-enter--delay-2">
              <Teleport to="body">
                <Transition name="filter-modal-fade">
                  <div v-if="savingsFiltersOpen" class="filter-modal" @click.self="closeSavingsFilters">
                    <div class="filter-modal__panel" role="dialog" aria-modal="true" aria-label="Filtri risparmio">
                      <div class="filter-modal__header">
                        <div class="filter-modal__title-wrap">
                          <h2 class="filter-modal__title">FILTRI</h2>
                        </div>
                        <button class="filter-modal__close" type="button" aria-label="Chiudi filtri" @click="closeSavingsFilters">
                          <svg viewBox="0 0 24 24" focusable="false">
                            <path d="M6.28 5.22 12 10.94l5.72-5.72 1.06 1.06L13.06 12l5.72 5.72-1.06 1.06L12 13.06l-5.72 5.72-1.06-1.06L10.94 12 5.22 6.28Z" fill="currentColor" />
                          </svg>
                        </button>
                      </div>

                      <div class="filter-modal__body">
                        <div class="map-filter-group">
                          <span class="map-filter-label">Carburante</span>
                          <div class="map-filter-chips">
                            <button
                              v-for="option in savingsFuelOptions"
                              :key="option.value"
                              class="map-chip"
                              :class="{ 'map-chip--active': filters.fuelType === option.value }"
                              type="button"
                              @click="updateFilters({ ...filters, fuelType: option.value })"
                            >
                              {{ option.label }}
                            </button>
                          </div>
                        </div>

                        <div class="map-filter-group">
                          <span class="map-filter-label">Modalita</span>
                          <div class="map-filter-chips">
                            <button
                              v-for="option in savingsModeOptions"
                              :key="option.value"
                              class="map-chip"
                              :class="{ 'map-chip--active': filters.mode === option.value }"
                              type="button"
                              @click="updateFilters({ ...filters, mode: option.value })"
                            >
                              {{ option.label }}
                            </button>
                          </div>
                        </div>

                        <div class="map-filter-group map-filter-group--range">
                          <div class="map-range-head">
                            <span class="map-filter-label">Raggio</span>
                            <strong>{{ filters.radius }} km</strong>
                          </div>
                          <input
                            class="map-slider"
                            type="range"
                            min="1"
                            max="50"
                            step="1"
                            :value="filters.radius"
                            :style="{ '--pct': sliderPct(filters.radius) }"
                            @input="updateFilters({ ...filters, radius: Number($event.target.value) })"
                          />
                        </div>

                        <div class="map-filter-group">
                          <span class="map-filter-label">Spesa</span>
                          <div class="map-filter-chips map-filter-chips--amount">
                            <button
                              v-for="amount in savingsAmountOptions"
                              :key="amount"
                              class="map-chip map-chip--amount"
                              :class="{ 'map-chip--active': savingsAmount === amount }"
                              type="button"
                              @click="savingsAmount = amount"
                            >
                              € {{ amount }}
                            </button>
                          </div>
                        </div>
                      </div>

                      <button class="filter-modal__apply" type="button" @click="closeSavingsFilters">
                        Applica filtri
                      </button>
                    </div>
                  </div>
                </Transition>
              </Teleport>

	              <div class="page-titlebar page-titlebar--mobile">
	                <div class="brand-row">
	                  <span class="brand-dot" aria-hidden="true"></span>
	                  <span class="brand-label">Fuel Radar</span>
	                </div>
	              </div>

	              <section class="savings-overview">
	                <div class="savings-intro">
	                  <h2 class="savings-intro__title">Quanto conviene fare rifornimento nella tua zona.</h2>
	                  <p class="savings-intro__text">
	                    Confrontiamo il distributore di riferimento con il prezzo medio vicino a te, usando i filtri attivi per carburante,
	                    modalita, raggio e importo del pieno.
	                  </p>
	                </div>

	                <div class="savings-overview__panel">
	                  <button class="map-filter-trigger savings-filter-trigger" type="button" @click="openSavingsFilters">
	                    <span class="map-filter-trigger__icon" aria-hidden="true">
	                      <svg viewBox="0 0 24 24" focusable="false">
	                        <path d="M5 7h14v2H5zm2 5h10v2H7zm3 5h4v2h-4z" fill="currentColor" />
	                      </svg>
	                    </span>
	                    <span class="map-filter-trigger__copy">
	                      <span class="map-filter-trigger__pill">{{ savingsFuelSummary[filters.fuelType] }}</span>
	                      <span class="map-filter-trigger__pill">{{ savingsModeSummary[filters.mode] }}</span>
	                      <span class="map-filter-trigger__pill">{{ filters.radius }} km</span>
	                      <span class="map-filter-trigger__pill">€ {{ savingsAmount }}</span>
	                    </span>
	                  </button>

	                  <div class="savings-grid">
	                    <article class="savings-card">
	                      <span class="savings-label">Stazione di riferimento</span>
	                      <strong class="savings-value savings-value--name savings-value--brand">
	                        {{ savingsStation?.brand?.toUpperCase() || 'IN ATTESA' }}
	                      </strong>
	                    </article>

	                    <article class="savings-card">
	                      <span class="savings-label">Prezzo medio in zona</span>
	                      <strong class="savings-value">
	                        {{ averagePrice != null ? `€ ${averagePrice.toFixed(3)}` : '—' }}
	                      </strong>
	                    </article>

	                    <article class="savings-card savings-card--accent">
	                      <span class="savings-label">Risparmio stimato</span>
	                      <strong class="savings-value">
	                        {{ estimatedSavings > 0 ? `€ ${estimatedSavings.toFixed(2)}` : '€ 0.00' }}
	                      </strong>
	                    </article>
	                  </div>

	                  <p v-if="savingsHighlight" class="savings-note savings-note--overview savings-note--highlight-inline">
	                    Risparmio stimato: <strong>€ {{ savingsHighlight.saved }}</strong> con
	                    <strong>€ {{ savingsHighlight.amount }}</strong> di rifornimento.
	                  </p>
	                  <p v-else class="savings-note savings-note--overview">{{ savingsMessage }}</p>
	                </div>
	              </section>

	              <section class="forecast-panel">
	                <div class="forecast-head">
	                  <span class="forecast-label">Previsioni</span>
	                </div>

                <div class="forecast-grid">
                  <article
                    v-for="scenario in forecastScenarios"
                    :key="scenario.id"
                    class="forecast-card"
                    :class="{
                      'forecast-card--up': scenario.delta > 0.004,
                      'forecast-card--down': scenario.delta < -0.004,
                      'forecast-card--best': bestForecastScenario?.id === scenario.id,
                    }"
                  >
                    <span class="forecast-day">{{ scenario.label }}</span>
                    <strong class="forecast-price">€ {{ scenario.price.toFixed(3) }}</strong>
                    <span class="forecast-delta">
                      {{ scenario.delta > 0 ? '+' : '' }}€ {{ scenario.delta.toFixed(3) }}
                    </span>
                  </article>
                </div>

                <p v-if="bestForecastScenario" class="forecast-highlight">
                  Momento migliore: <strong>{{ bestForecastScenario.label.toUpperCase() }}</strong> a
                  <strong>€ {{ bestForecastScenario.price.toFixed(3) }}</strong>
                </p>
              </section>
            </section>
          </section>

          <section v-else key="preferiti" class="dashboard dashboard--single">
            <section class="favorites-section surface-enter surface-enter--delay-2">
              <div class="page-titlebar page-titlebar--mobile">
                <div class="brand-row">
                  <span class="brand-dot" aria-hidden="true"></span>
                  <span class="brand-label">Fuel Radar</span>
                </div>
              </div>

              <section class="notification-panel">
                <div class="notification-copy">
                  <span class="notification-label">Notifiche</span>
                  <p class="notification-text">{{ notificationStatusLabel }}</p>
                </div>

                <div class="notification-actions">
                  <button
                    v-if="!notificationsEnabled"
                    class="notification-btn"
                    type="button"
                    :disabled="!notificationsSupported || notificationPermission === 'denied'"
                    @click="enableNotifications"
                  >
                    Attiva notifiche
                  </button>

                  <button
                    v-else
                    class="notification-btn notification-btn--secondary"
                    type="button"
                    @click="disableNotifications"
                  >
                    Disattiva notifiche
                  </button>
                </div>
              </section>

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

    <!-- Pulsante "Vai subito" — CTA fisso verso il distributore più economico -->
    <Transition name="gonow-fade">
      <a
        v-if="showGoNowCta"
        class="gonow-cta"
        :href="goNowUrl"
        target="_blank"
        rel="noopener noreferrer"
        :aria-label="`Naviga verso ${cheapest?.brand} a € ${cheapest?.price?.toFixed(3)}`"
      >
        <span class="gonow-icon" aria-hidden="true">
          <svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/></svg>
        </span>
        <span class="gonow-copy">
          <span class="gonow-label">Vai subito</span>
          <span class="gonow-detail">{{ cheapest?.brand }} · € {{ cheapest?.price?.toFixed(3) }}</span>
        </span>
        <svg class="gonow-arrow" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M8.59 16.59L13.17 12 8.59 7.41 10 6l6 6-6 6z"/></svg>
      </a>
    </Transition>

    <!-- Schermata "Guida" — overlay semplificato per uso in auto (landscape + touch) -->
    <Transition name="driving-fade">
      <div v-if="isDrivingMode && cheapest" class="driving-overlay" role="dialog" aria-label="Modalità guida">
        <button class="driving-close" type="button" aria-label="Chiudi modalità guida" @click="exitDrivingMode">
          <svg viewBox="0 0 24 24" fill="currentColor"><path d="M6.28 5.22 12 10.94l5.72-5.72 1.06 1.06L13.06 12l5.72 5.72-1.06 1.06L12 13.06l-5.72 5.72-1.06-1.06L10.94 12 5.22 6.28Z"/></svg>
        </button>

        <div class="driving-body">
          <p class="driving-brand">{{ cheapest.brand }}</p>
          <p class="driving-price">€ {{ cheapest.price.toFixed(3) }}</p>
          <p class="driving-dist">{{ cheapest.distance < 1 ? `${Math.round(cheapest.distance * 1000)} m` : `${cheapest.distance.toFixed(1)} km` }}</p>
          <p class="driving-name">{{ cheapest.name }}</p>
        </div>

        <a class="driving-nav" :href="goNowUrl" target="_blank" rel="noopener noreferrer">
          <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/></svg>
          Naviga
        </a>
      </div>
    </Transition>

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
  font-family: var(--font-display);
  font-size: clamp(2.8rem, 8.2vw, 5.4rem);
  font-weight: 800;
  letter-spacing: -0.085em;
  line-height: 0.92;
  text-transform: none;
  color: #fff8f1;
  text-shadow: 0 18px 34px rgba(0, 0, 0, 0.22);
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

.mobile-metrics {
  display: none;
}

.mobile-metric-card {
  padding: 14px 12px;
  border-radius: 18px;
  border: 1px solid rgba(255, 255, 255, 0.07);
  background:
    linear-gradient(180deg, rgba(255, 255, 255, 0.035), rgba(255, 255, 255, 0.018)),
    rgba(11, 13, 18, 0.72);
  display: grid;
  gap: 4px;
  text-align: center;
}

.mobile-metric-label {
  color: rgba(255, 255, 255, 0.48);
  font-size: 0.64rem;
  font-weight: 700;
  letter-spacing: 0.12em;
  text-transform: uppercase;
}

.mobile-metric-value {
  color: #fff7f0;
  font-size: clamp(1.1rem, 3vw, 1.5rem);
  font-weight: 800;
  letter-spacing: -0.05em;
}

.mobile-metric-value--search {
  font-size: clamp(0.9rem, 2.4vw, 1.12rem);
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

/* Home-page: contenitore verticale (2-col + results-row) */
.home-page {
  display: grid;
  gap: 34px;
}

/* Dashboard: griglia 2-col su desktop, colonne impilate su mobile */
.dashboard {
  display: grid;
  gap: 24px;
}

.dashboard--single {
  gap: 0;
}

/* Colonne del dashboard */
.map-col,
.cards-col {
  display: grid;
  gap: 0;
  align-content: start;
}

/* Header di colonna: "Radar" e "In evidenza" — allineati */
.col-head {
  display: none; /* visibile solo da 900px */
  align-items: center;
  height: 36px;
  margin-bottom: 14px;
}

.col-label {
  color: rgba(255, 255, 255, 0.48);
  font-size: 0.7rem;
  font-weight: 700;
  letter-spacing: 0.16em;
  text-transform: uppercase;
}

/* Risultati full-width sotto la 2-col */
.results-row {
  display: grid;
  gap: 0;
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

.page-titlebar {
  display: none;
  align-items: center;
  justify-content: center;
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
  color: #fff6ef;
  font-family: var(--font-display);
  font-size: clamp(1.18rem, 2.35vw, 1.4rem);
  font-weight: 800;
  letter-spacing: -0.07em;
}

.section-kicker {
  position: relative;
  display: inline-grid;
  gap: 10px;
  justify-self: center;
  color: #fff5ed;
  font-size: 1rem;
  font-weight: 800;
  letter-spacing: 0.12em;
  text-transform: uppercase;
}

.section-kicker::after,
.forecast-label::after {
  content: '';
  width: 84px;
  height: 2px;
  margin: 0 auto;
  border-radius: 999px;
  background: linear-gradient(90deg, rgba(255, 255, 255, 0.14), rgba(244, 177, 131, 0.82), rgba(255, 255, 255, 0.14));
}

.section-text,
.favorites-empty {
  color: rgba(255, 255, 255, 0.64);
  line-height: 1.6;
}

.map-filter-trigger {
  min-height: 64px;
  width: min(100%, 520px);
  margin: 0 auto;
  padding: 0.95rem 1rem;
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 24px;
  background:
    radial-gradient(circle at top right, rgba(228, 164, 111, 0.1), transparent 28%),
    linear-gradient(180deg, rgba(255, 255, 255, 0.045), rgba(255, 255, 255, 0.018)),
    rgba(14, 17, 23, 0.76);
  color: #fff7ef;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.85rem;
  text-align: center;
  font: inherit;
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.04),
    0 20px 34px rgba(0, 0, 0, 0.14);
  cursor: pointer;
  transition: transform var(--transition), border-color var(--transition), box-shadow var(--transition);
}

.map-filter-trigger:hover {
  transform: translateY(-1px);
  border-color: rgba(207, 127, 73, 0.18);
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.05),
    0 24px 36px rgba(0, 0, 0, 0.18);
}

.map-filter-trigger__icon {
  width: 42px;
  height: 42px;
  border-radius: 16px;
  background:
    linear-gradient(180deg, rgba(228, 164, 111, 0.2), rgba(207, 127, 73, 0.12)),
    rgba(255, 255, 255, 0.03);
  color: #efc6a2;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex: 0 0 auto;
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.08),
    0 12px 20px rgba(0, 0, 0, 0.14);
}

.map-filter-trigger__icon svg {
  width: 18px;
  height: 18px;
}

.map-filter-trigger__copy {
  display: flex;
  flex-wrap: wrap;
  gap: 0.45rem;
  align-items: center;
  justify-content: center;
  flex: 1;
}

.map-filter-trigger__pill {
  min-height: 32px;
  padding: 0 0.78rem;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.055);
  border: 1px solid rgba(255, 255, 255, 0.06);
  color: rgba(255, 255, 255, 0.76);
  display: inline-flex;
  align-items: center;
  font-size: 0.82rem;
  font-weight: 700;
  letter-spacing: 0.01em;
}

.filter-modal {
  position: fixed;
  inset: 0;
  z-index: 1000;
  display: grid;
  place-items: center;
  padding: 24px;
  background: rgba(7, 9, 13, 0.58);
  backdrop-filter: blur(10px);
}

.filter-modal__panel {
  width: min(680px, 100%);
  max-height: min(86dvh, 820px);
  padding: 1.1rem;
  border-radius: 28px;
  background:
    radial-gradient(circle at top right, rgba(228, 164, 111, 0.14), transparent 24%),
    linear-gradient(180deg, #191d26 0%, #11151d 100%);
  border: 1px solid rgba(255, 255, 255, 0.08);
  box-shadow: 0 32px 70px rgba(0, 0, 0, 0.32);
  display: grid;
  gap: 1rem;
}

.filter-modal__header {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: flex-end;
  min-height: 42px;
}

.filter-modal__title-wrap {
  position: absolute;
  left: 50%;
  transform: translateX(-50%);
  text-align: center;
}

.filter-modal__title {
  color: #fff8f1;
  font-size: clamp(1.3rem, 3vw, 1.7rem);
  letter-spacing: 0.14em;
  text-transform: uppercase;
}

.filter-modal__close {
  width: 42px;
  height: 42px;
  border: 0;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.08);
  color: rgba(255, 255, 255, 0.76);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
}

.filter-modal__close svg {
  width: 18px;
  height: 18px;
}

.filter-modal__body {
  display: grid;
  grid-template-columns: 1.1fr 1.1fr 0.9fr 1.1fr;
  gap: 12px;
  overflow: auto;
  align-items: stretch;
  grid-auto-rows: 1fr;
}

.filter-modal__apply {
  min-height: 50px;
  border: 0;
  border-radius: 18px;
  background: linear-gradient(135deg, #e4a46f, #cf7f49 58%, #a55e33);
  color: white;
  font: inherit;
  font-weight: 800;
  cursor: pointer;
  box-shadow: 0 16px 28px rgba(207, 127, 73, 0.2);
}

.filter-modal-fade-enter-active,
.filter-modal-fade-leave-active {
  transition: opacity 180ms ease;
}

.filter-modal-fade-enter-from,
.filter-modal-fade-leave-to {
  opacity: 0;
}

.map-filter-group {
  padding: 16px 16px 14px;
  border-radius: 22px;
  border: 1px solid rgba(255, 255, 255, 0.08);
  background:
    linear-gradient(180deg, rgba(255, 255, 255, 0.035), rgba(255, 255, 255, 0.018)),
    rgba(14, 17, 23, 0.74);
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.04),
    0 18px 30px rgba(0, 0, 0, 0.12);
  display: grid;
  gap: 12px;
  height: 100%;
  align-content: start;
}

.map-filter-group--range {
  align-content: start;
}

.map-filter-label {
  color: rgba(255, 255, 255, 0.48);
  font-size: 0.68rem;
  font-weight: 700;
  letter-spacing: 0.14em;
  text-transform: uppercase;
}

.map-filter-chips {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.map-filter-chips--amount {
  flex-wrap: nowrap;
}

.map-chip {
  min-height: 38px;
  padding: 0 14px;
  border-radius: 999px;
  border: 1px solid rgba(255, 255, 255, 0.08);
  background: rgba(255, 255, 255, 0.05);
  color: rgba(255, 255, 255, 0.75);
  font: inherit;
  font-weight: 700;
  cursor: pointer;
  transition:
    transform var(--transition),
    border-color var(--transition),
    background var(--transition),
    color var(--transition);
}

.map-chip--amount {
  flex: 1 1 0;
  min-width: 0;
  padding: 0 10px;
  font-size: 0.8rem;
}

.map-chip:hover {
  transform: translateY(-1px);
  border-color: rgba(207, 127, 73, 0.28);
}

.map-chip--active {
  background: linear-gradient(135deg, #e4a46f, #cf7f49 58%, #a55e33);
  border-color: transparent;
  color: white;
  box-shadow: 0 12px 22px rgba(207, 127, 73, 0.16);
}

.map-range-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  color: #fff4eb;
  font-weight: 700;
}

.map-slider {
  width: 100%;
  appearance: none;
  height: 6px;
  border-radius: 999px;
  background:
    linear-gradient(
      90deg,
      #cf7f49 0,
      #cf7f49 var(--pct),
      rgba(255, 255, 255, 0.12) var(--pct),
      rgba(255, 255, 255, 0.12) 100%
    );
  outline: none;
  cursor: pointer;
}

.map-slider::-webkit-slider-thumb {
  appearance: none;
  width: 20px;
  height: 20px;
  border-radius: 50%;
  border: 3px solid white;
  background: #cf7f49;
  box-shadow: 0 10px 18px rgba(207, 127, 73, 0.24);
}

.map-slider::-moz-range-thumb {
  width: 20px;
  height: 20px;
  border-radius: 50%;
  border: 3px solid white;
  background: #cf7f49;
  box-shadow: 0 10px 18px rgba(207, 127, 73, 0.24);
}

.savings-filter-trigger {
  margin-top: 0;
  padding: 0;
  border: 0;
  border-radius: 0;
  background: transparent;
  box-shadow: none;
  min-height: auto;
  justify-content: flex-start;
}

.savings-overview {
  display: grid;
  gap: 20px;
}

.savings-intro {
  display: grid;
  gap: 8px;
}

.savings-intro__title {
  color: #fff7f0;
  font-size: clamp(1.4rem, 2.3vw, 2rem);
  line-height: 1.02;
  letter-spacing: -0.05em;
}

.savings-intro__text {
  max-width: 62ch;
  color: rgba(255, 255, 255, 0.64);
  line-height: 1.6;
}

.savings-overview__panel {
  display: grid;
  gap: 18px;
  padding: 22px;
  border-radius: 28px;
  border: 1px solid rgba(255, 255, 255, 0.08);
  background:
    radial-gradient(circle at top right, rgba(228, 164, 111, 0.12), transparent 22%),
    linear-gradient(180deg, rgba(255, 255, 255, 0.045), rgba(255, 255, 255, 0.02)),
    rgba(12, 15, 21, 0.8);
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.04),
    0 24px 48px rgba(0, 0, 0, 0.18);
}

.savings-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 18px;
}

.savings-card {
  padding: 20px 18px;
  border-radius: 24px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  background:
    radial-gradient(circle at top center, rgba(255, 255, 255, 0.06), transparent 52%),
    linear-gradient(180deg, rgba(255, 255, 255, 0.05), rgba(255, 255, 255, 0.02)),
    rgba(14, 17, 24, 0.82);
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.05),
    0 20px 40px rgba(0, 0, 0, 0.18);
  display: grid;
  gap: 12px;
  text-align: center;
}

.savings-card--accent {
  border-color: rgba(207, 127, 73, 0.22);
  background:
    radial-gradient(circle at top center, rgba(228, 164, 111, 0.14), transparent 52%),
    linear-gradient(180deg, rgba(255, 255, 255, 0.05), rgba(255, 255, 255, 0.02)),
    rgba(17, 19, 25, 0.86);
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.06),
    0 22px 42px rgba(0, 0, 0, 0.2);
}

.savings-label {
  color: var(--text-soft);
  font-size: var(--fs-xs);
  font-weight: 600;
  letter-spacing: var(--tracking-label);
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

.savings-value--brand {
  color: #fff8f1;
}

.savings-note {
  color: rgba(255, 255, 255, 0.62);
  line-height: 1.55;
}

.savings-note--overview {
  max-width: 70ch;
}

.savings-note--highlight-inline {
  margin-top: 8px;
  text-align: center;
  color: rgba(255, 255, 255, 0.78);
  font-size: 0.96rem;
  font-weight: 700;
  letter-spacing: 0.01em;
  line-height: 1.5;
}

.savings-note--highlight-inline strong {
  color: #fff8f1;
  font-size: 1.02em;
  letter-spacing: -0.02em;
}

.forecast-panel {
  display: grid;
  gap: 16px;
  padding: 18px;
  border-radius: 24px;
  border: 1px solid rgba(255, 255, 255, 0.08);
  background:
    linear-gradient(180deg, rgba(255, 255, 255, 0.045), rgba(255, 255, 255, 0.02)),
    rgba(14, 17, 24, 0.76);
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.04),
    0 18px 34px rgba(0, 0, 0, 0.12);
}

.forecast-head {
  display: grid;
  gap: 4px;
  justify-items: center;
  text-align: center;
}

.forecast-label {
  position: relative;
  display: inline-grid;
  gap: 10px;
  color: #fff5ed;
  font-size: 1rem;
  font-weight: 800;
  letter-spacing: 0.12em;
  text-transform: uppercase;
}

.forecast-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 14px;
}

.forecast-card {
  display: grid;
  gap: 6px;
  padding: 16px 14px;
  border-radius: 18px;
  border: 1px solid rgba(255, 255, 255, 0.08);
  background:
    linear-gradient(180deg, rgba(255, 255, 255, 0.035), rgba(255, 255, 255, 0.02)),
    rgba(255, 255, 255, 0.025);
  text-align: center;
}

.forecast-card--up {
  border-color: rgba(207, 127, 73, 0.16);
}

.forecast-card--down {
  border-color: rgba(48, 211, 157, 0.16);
}

.forecast-card--best {
  border-color: rgba(207, 127, 73, 0.26);
  background:
    radial-gradient(circle at top center, rgba(228, 164, 111, 0.12), transparent 58%),
    linear-gradient(180deg, rgba(255, 255, 255, 0.04), rgba(255, 255, 255, 0.02)),
    rgba(255, 255, 255, 0.03);
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.05),
    0 14px 28px rgba(0, 0, 0, 0.14);
}

.forecast-day {
  color: rgba(255, 255, 255, 0.52);
  font-size: 0.72rem;
  font-weight: 700;
  letter-spacing: 0.12em;
  text-transform: uppercase;
}

.forecast-price {
  color: #fff7f0;
  font-size: clamp(1.05rem, 2.2vw, 1.4rem);
  font-weight: 800;
  letter-spacing: -0.05em;
}

.forecast-delta {
  color: rgba(255, 255, 255, 0.62);
  font-size: 0.82rem;
  font-weight: 700;
}

.forecast-highlight {
  margin-top: 10px;
  text-align: center;
  color: rgba(255, 255, 255, 0.78);
  font-size: 0.96rem;
  font-weight: 700;
  letter-spacing: 0.01em;
  line-height: 1.5;
}

.forecast-highlight strong {
  color: #fff8f1;
  font-size: 1.02em;
  letter-spacing: -0.02em;
}

.favorites-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 18px;
}

.notification-panel {
  display: grid;
  grid-template-columns: minmax(0, 1.35fr) auto;
  gap: 16px;
  align-items: center;
  padding: 18px;
  border-radius: 22px;
  border: 1px solid rgba(255, 255, 255, 0.08);
  background:
    linear-gradient(180deg, rgba(255, 255, 255, 0.045), rgba(255, 255, 255, 0.02)),
    rgba(13, 16, 22, 0.78);
}

.notification-copy {
  display: grid;
  gap: 6px;
}

.notification-label {
  color: var(--text-muted);
  font-size: var(--fs-xs);
  font-weight: 600;
  letter-spacing: var(--tracking-label);
  text-transform: uppercase;
}

.notification-text {
  color: rgba(255, 255, 255, 0.68);
  line-height: 1.6;
}

.notification-actions {
  display: flex;
  justify-content: flex-end;
}

.notification-btn {
  min-height: 44px;
  padding: 0 18px;
  border: 0;
  border-radius: 999px;
  background: linear-gradient(135deg, #e4a46f, #cf7f49 58%, #a55e33);
  color: white;
  font: inherit;
  font-weight: 700;
  cursor: pointer;
  box-shadow: 0 14px 24px rgba(207, 127, 73, 0.18);
  transition: transform var(--transition), box-shadow var(--transition), opacity var(--transition);
}

.notification-btn:hover {
  transform: translateY(-1px);
  box-shadow: 0 18px 28px rgba(207, 127, 73, 0.24);
}

.notification-btn:disabled {
  cursor: not-allowed;
  opacity: 0.5;
}

.notification-btn--secondary {
  background:
    linear-gradient(180deg, rgba(228, 164, 111, 0.14), rgba(207, 127, 73, 0.08)),
    rgba(255, 255, 255, 0.04);
  border: 1px solid rgba(207, 127, 73, 0.22);
  box-shadow: 0 10px 20px rgba(207, 127, 73, 0.12);
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

/* ── Layout desktop 2-colonne (map sticky + results) ── */
/* Hero-intro: visibile solo su desktop larga, stile editoriale Uber-like */
.hero-intro {
  display: none;
}

@media (min-width: 1200px) {
  .main-shell {
    width: min(1340px, calc(100% - 48px));
  }

  .hero-intro {
    display: grid;
    gap: 10px;
    max-width: 720px;
    margin-bottom: 18px;
    padding: 4px 0 2px;
  }

  .hero-intro__eyebrow {
    color: var(--text-soft);
    font-size: var(--fs-xs);
    font-weight: 600;
    letter-spacing: var(--tracking-label);
    text-transform: uppercase;
  }

  .hero-intro__title {
    font-family: var(--font-display);
    font-size: clamp(1.8rem, 2.1vw + 0.6rem, 2.5rem);
    line-height: 1.08;
    font-weight: 800;
    letter-spacing: -0.035em;
    color: var(--text);
    margin: 0;
  }

  .hero-intro__title br {
    display: block;
  }

  .hero-intro__lede {
    color: var(--text-muted);
    font-size: 0.98rem;
    line-height: 1.55;
    max-width: 58ch;
    font-weight: 400;
  }

  /* ── 2-col desktop ── */
  .dashboard:not(.dashboard--single) {
    grid-template-columns: minmax(0, 1.15fr) minmax(0, 0.85fr);
    gap: 28px;
    align-items: start;
  }

  .dashboard:not(.dashboard--single):has(.map-stage--expanded) {
    align-items: stretch;
  }

  /* Centra dashboard singolo (risparmi / preferiti) */
  .dashboard--single {
    grid-template-columns: 1fr;
    max-width: 900px;
    margin: 0 auto;
    width: 100%;
  }

  .col-head {
    display: flex;
  }

  .map-wrap {
    position: sticky;
    top: 24px;
    height: calc(100dvh - 48px);
    max-height: 860px;
    overflow: hidden;
  }

  .map-wrap :deep(.map-stage) {
    height: 100%;
    min-height: 100%;
    max-height: none;
  }

  .map-wrap:has(.map-stage--expanded) {
    height: calc(100% - 24px);
    max-height: none;
  }

  .map-wrap:has(.map-stage--expanded) :deep(.map-stage--expanded) {
    height: 100%;
    min-height: 100%;
    max-height: none;
  }

  /* Nasconde heading interno di TopCards (rimpiazzato dal col-head) */
  .cards-col :deep(.section-head) {
    display: none;
  }

  /* Cards: 1 colonna nella colonna stretta */
  .cards-col :deep(.cards-grid) {
    grid-template-columns: 1fr;
  }

  /* Risultati full-width: 2-col grid per i risultati */
  .results-row :deep(.list) {
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 16px;
  }
}

@media (min-width: 1440px) {
  .dashboard:not(.dashboard--single) {
    grid-template-columns: minmax(0, 1.2fr) minmax(320px, 0.8fr);
    gap: 32px;
  }

  .results-row :deep(.list) {
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 18px;
  }
}

/* iPad landscape / laptop piccoli: 2-col ridotta */
@media (min-width: 900px) and (max-width: 1199px) {
  .main-shell {
    width: min(1024px, calc(100% - 32px));
  }

  .dashboard:not(.dashboard--single) {
    grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
    gap: 22px;
    align-items: start;
  }

  .dashboard:not(.dashboard--single):has(.map-stage--expanded) {
    align-items: stretch;
  }

  .dashboard--single {
    grid-template-columns: 1fr;
    max-width: 820px;
    margin: 0 auto;
    width: 100%;
  }

  .col-head {
    display: flex;
  }

  .map-wrap {
    position: sticky;
    top: 20px;
    height: calc(100dvh - 40px);
    max-height: 720px;
    overflow: hidden;
  }

  .map-wrap :deep(.map-stage) {
    height: 100%;
    min-height: 100%;
    max-height: none;
  }

  .map-wrap:has(.map-stage--expanded) {
    height: calc(100% - 20px);
    max-height: none;
  }

  .map-wrap:has(.map-stage--expanded) :deep(.map-stage--expanded) {
    height: 100%;
    min-height: 100%;
    max-height: none;
  }

  .cards-col :deep(.section-head) {
    display: none;
  }

  .cards-col :deep(.cards-grid) {
    grid-template-columns: 1fr;
  }
}

/* CarPlay / landscape corto: header/hero ridotti, tipografia più densa */
@media (orientation: landscape) and (max-height: 520px) {
  .main-shell {
    padding-top: 0;
  }

  .hero-intro {
    display: none !important;
  }

  .page-content .app-header,
  :deep(.app-header) {
    padding: 6px 0 8px !important;
  }

  .hero-stack {
    gap: 8px;
    margin-bottom: 6px;
  }

  .dashboard,
  .home-page {
    gap: 12px;
  }

  .update-label {
    font-size: 0.7rem;
  }
}

@media (max-width: 1024px) {
  .main-shell {
    width: min(100%, calc(100% - 20px));
    padding-bottom: calc(112px + env(safe-area-inset-bottom, 0px));
  }

  .hero-stack {
    gap: 16px;
    margin-bottom: 12px;
  }

  .mobile-metrics {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 12px;
    margin-bottom: 18px;
  }

  .page-switcher {
    display: none;
  }

  .map-wrap,
  .empty-state {
    border-radius: 24px;
  }

  .dashboard {
    gap: 24px;
  }

  .dashboard--single {
    min-height: calc(100dvh - 220px);
    align-content: start;
  }

  .col-head {
    display: none;
  }

  .home-page {
    gap: 24px;
  }

  .page-titlebar--mobile {
    display: inline-flex;
    margin: 10px auto 4px;
  }

  .filter-modal {
    align-items: end;
    padding: 12px;
  }

  .filter-modal__panel {
    width: 100%;
    max-height: min(88dvh, 920px);
    border-radius: 28px 28px 20px 20px;
  }

  .filter-modal__body {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .favorites-grid {
    grid-template-columns: 1fr;
  }

  .notification-panel {
    grid-template-columns: 1fr;
  }

  .notification-actions {
    justify-content: stretch;
  }

  .notification-btn {
    width: 100%;
  }

  .savings-grid {
    grid-template-columns: 1fr;
  }

  .savings-overview__panel {
    padding: 18px;
    border-radius: 24px;
  }

  .mobile-dock {
    display: flex;
  }
}

@media (max-width: 560px) {
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

  .section-kicker,
  .forecast-label {
    font-size: 0.92rem;
    letter-spacing: 0.14em;
  }

  .section-kicker::after,
  .forecast-label::after {
    width: 72px;
  }

  .filter-modal__body {
    grid-template-columns: 1fr;
  }


  .forecast-grid {
    gap: 10px;
  }

  .forecast-card {
    padding: 14px 10px;
    border-radius: 16px;
  }

  .forecast-day {
    font-size: 0.66rem;
  }

  .forecast-price {
    font-size: 1rem;
  }

  .forecast-delta {
    font-size: 0.74rem;
  }
  .splash-mark {
    gap: 12px;
  }

  .splash-title {
    font-size: clamp(2.25rem, 12vw, 3.4rem);
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
    bottom: max(12px, env(safe-area-inset-bottom, 0px));
    width: calc(100% - 18px);
    padding: 7px;
  }

  .mobile-dock__item {
    min-height: 42px;
    font-size: 0.82rem;
  }
}

/* ── Night mode ───────────────────────────────────── */
.app-shell--night {
  filter: brightness(0.84) saturate(0.88);
}

/* ── Label ultimo aggiornamento ──────────────────── */
.update-label {
  margin-bottom: 18px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  width: 100%;
  color: var(--text-faint);
  font-size: var(--fs-xs);
  font-weight: 600;
  letter-spacing: var(--tracking-label);
  text-transform: uppercase;
}

.update-icon {
  width: 13px;
  height: 13px;
  opacity: 0.8;
}

/* ── Pulsante "Vai subito" ───────────────────────── */
.gonow-cta {
  position: fixed;
  left: 50%;
  transform: translateX(-50%);
  bottom: calc(18px + 62px + 14px);
  z-index: 13;
  display: none;
  align-items: center;
  gap: 12px;
  padding: 0 20px 0 14px;
  height: 58px;
  border-radius: 999px;
  background: linear-gradient(135deg, #ff9c52, #ff7a1a 55%, #d95504);
  color: white;
  text-decoration: none;
  box-shadow:
    0 16px 32px rgba(255, 122, 26, 0.38),
    0 4px 8px rgba(0, 0, 0, 0.22),
    inset 0 1px 0 rgba(255, 255, 255, 0.18);
  transition: transform var(--transition), box-shadow var(--transition), opacity var(--transition);
  white-space: nowrap;
  min-width: 240px;
  max-width: calc(100vw - 32px);
  justify-content: center;
}

.gonow-cta:hover,
.gonow-cta:active {
  transform: translateX(-50%) translateY(-2px);
  box-shadow:
    0 22px 40px rgba(255, 122, 26, 0.46),
    0 6px 12px rgba(0, 0, 0, 0.26),
    inset 0 1px 0 rgba(255, 255, 255, 0.2);
}

.gonow-icon {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.18);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex: 0 0 auto;
}

.gonow-icon svg {
  width: 18px;
  height: 18px;
}

.gonow-copy {
  display: grid;
  gap: 1px;
  flex: 1;
}

.gonow-label {
  font-size: 0.72rem;
  font-weight: 800;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  opacity: 0.88;
  line-height: 1;
}

.gonow-detail {
  font-size: 1rem;
  font-weight: 800;
  letter-spacing: -0.02em;
  line-height: 1;
}

.gonow-arrow {
  width: 22px;
  height: 22px;
  opacity: 0.82;
  flex: 0 0 auto;
}

.gonow-fade-enter-active,
.gonow-fade-leave-active {
  transition: opacity 220ms ease, transform 220ms ease;
}

.gonow-fade-enter-from,
.gonow-fade-leave-to {
  opacity: 0;
  transform: translateX(-50%) translateY(12px);
}

/* ── Schermata "Guida" ───────────────────────────── */
.driving-overlay {
  position: fixed;
  inset: 0;
  z-index: 40;
  background:
    radial-gradient(circle at center, rgba(255, 122, 26, 0.14), transparent 55%),
    linear-gradient(180deg, #040507 0%, #080b11 100%);
  display: grid;
  grid-template-rows: auto 1fr auto;
  align-items: center;
  justify-items: center;
  padding: max(20px, env(safe-area-inset-top, 0px)) 24px max(24px, env(safe-area-inset-bottom, 0px));
  gap: 24px;
}

.driving-close {
  justify-self: end;
  align-self: start;
  width: 44px;
  height: 44px;
  border-radius: 50%;
  border: 1px solid rgba(255, 255, 255, 0.14);
  background: rgba(255, 255, 255, 0.06);
  color: rgba(255, 255, 255, 0.8);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
}

.driving-close svg {
  width: 20px;
  height: 20px;
}

.driving-body {
  display: grid;
  gap: 8px;
  text-align: center;
  justify-items: center;
}

.driving-brand {
  color: #ffb37b;
  font-size: clamp(0.9rem, 2.2vw, 1.1rem);
  font-weight: 800;
  letter-spacing: 0.1em;
  text-transform: uppercase;
}

.driving-price {
  color: #fff6ef;
  font-family: var(--font-display);
  font-size: clamp(4rem, 14vw, 7rem);
  font-weight: 800;
  letter-spacing: -0.06em;
  line-height: 1;
}

.driving-dist {
  color: rgba(255, 255, 255, 0.72);
  font-size: clamp(1.4rem, 4vw, 2rem);
  font-weight: 800;
  letter-spacing: -0.04em;
}

.driving-name {
  color: rgba(255, 255, 255, 0.5);
  font-size: clamp(0.82rem, 2vw, 1rem);
  line-height: 1.4;
  max-width: 32ch;
}

.driving-nav {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
  width: min(480px, 100%);
  min-height: 72px;
  border-radius: 22px;
  background: linear-gradient(135deg, #ff9c52, #ff7a1a 55%, #d95504);
  color: white;
  text-decoration: none;
  font-family: var(--font-display);
  font-size: clamp(1.3rem, 3.5vw, 1.7rem);
  font-weight: 800;
  letter-spacing: -0.03em;
  box-shadow:
    0 20px 44px rgba(255, 122, 26, 0.38),
    inset 0 1px 0 rgba(255, 255, 255, 0.18);
  transition: transform var(--transition), box-shadow var(--transition);
}

.driving-nav svg {
  width: 28px;
  height: 28px;
}

.driving-nav:hover {
  transform: translateY(-2px);
  box-shadow:
    0 28px 54px rgba(255, 122, 26, 0.46),
    inset 0 1px 0 rgba(255, 255, 255, 0.2);
}

.driving-fade-enter-active,
.driving-fade-leave-active {
  transition: opacity 240ms ease, transform 240ms ease;
}

.driving-fade-enter-from,
.driving-fade-leave-to {
  opacity: 0;
  transform: scale(0.97);
}

/* ── Mostra "Vai subito" solo su mobile ──────────── */
@media (max-width: 1024px) {
  .gonow-cta {
    display: inline-flex;
  }
}

@media (max-width: 560px) {
  .gonow-cta {
    bottom: calc(max(12px, env(safe-area-inset-bottom, 0px)) + 56px + 14px);
    height: 52px;
    min-width: 200px;
    padding: 0 16px 0 12px;
    gap: 10px;
  }

  .gonow-detail {
    font-size: 0.92rem;
  }
}
</style>

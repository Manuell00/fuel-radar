<script setup>
import { computed, nextTick, onMounted, onUnmounted, ref, watch } from 'vue'

const props = defineProps({
  manualLocation: { type: Object, default: null },
  currentPosition: { type: Object, default: null },
  isUsingGps: { type: Boolean, default: false },
})

const emit = defineEmits(['select-location', 'clear-manual', 'retry-geo', 'disable-geo'])

const query = ref('')
const loading = ref(false)
const error = ref('')
const helperText = ref('Tocca "Mia posizione" per attivare il GPS oppure cerca un indirizzo.')
const results = ref([])
const highlightedIndex = ref(-1)
const suppressSuggestions = ref(false)
const isMobileLayout = ref(false)
const plannerOpen = ref(false)
const plannerInputRef = ref(null)
const plannerContentRef = ref(null)
const plannerTranslateY = ref(0)
const plannerDragging = ref(false)

let debounceTimer = null
let activeController = null
let reverseController = null
let mobileMediaQuery = null
let dragStartY = 0
let dragLastY = 0
let dragAllowPull = false

const hasResults = computed(() => results.value.length > 0)
const showDropdown = computed(() => !suppressSuggestions.value && (hasResults.value || loading.value))
const showInlineDropdown = computed(() => showDropdown.value && !isMobileLayout.value)
const showPlannerDropdown = computed(() => showDropdown.value && isMobileLayout.value && plannerOpen.value)
const showSuccessNotice = computed(() =>
  helperText.value === 'Posizione attuale rilevata e applicata alla mappa.' ||
  helperText.value === 'Posizione attuale rilevata. Indirizzo preciso non disponibile.'
)
const visibleHelperText = computed(() => (showSuccessNotice.value ? '' : helperText.value))
const plannerTitle = computed(() => (props.manualLocation ? 'Modifica la ricerca' : 'Pianifica la ricerca'))
function handleMobileLayoutChange(event) {
  isMobileLayout.value = event.matches

  if (!event.matches) {
    plannerOpen.value = false
  }
}

async function openPlanner() {
  if (!isMobileLayout.value) return

  plannerTranslateY.value = 0
  plannerDragging.value = false
  plannerOpen.value = true
  await nextTick()
  plannerInputRef.value?.focus()
}

function closePlanner() {
  plannerTranslateY.value = 0
  plannerDragging.value = false
  plannerOpen.value = false
}

function onPlannerTouchStart(event) {
  if (!isMobileLayout.value || !plannerOpen.value) return

  const touch = event.touches[0]
  if (!touch) return

  dragStartY = touch.clientY
  dragLastY = touch.clientY
  plannerDragging.value = false
  dragAllowPull = (plannerContentRef.value?.scrollTop ?? 0) <= 0
}

function onPlannerTouchMove(event) {
  if (!isMobileLayout.value || !plannerOpen.value) return

  const touch = event.touches[0]
  if (!touch) return

  const deltaY = touch.clientY - dragStartY
  dragLastY = touch.clientY

  if (!dragAllowPull) {
    dragAllowPull = deltaY > 0 && (plannerContentRef.value?.scrollTop ?? 0) <= 0
  }

  if (!dragAllowPull || deltaY <= 0) {
    plannerTranslateY.value = 0
    return
  }

  plannerDragging.value = true
  plannerTranslateY.value = Math.min(deltaY, 240)
  event.preventDefault()
}

function onPlannerTouchEnd() {
  if (!isMobileLayout.value || !plannerOpen.value) return

  const travelled = dragLastY - dragStartY
  const shouldClose = travelled > 110

  dragAllowPull = false

  if (shouldClose) {
    closePlanner()
    return
  }

  plannerDragging.value = false
  plannerTranslateY.value = 0
}

function normalizeResult(item) {
  const primaryParts = []
  const secondaryParts = []

  if (item.address?.road) primaryParts.push(item.address.road)
  if (item.address?.house_number) primaryParts.push(item.address.house_number)
  if (item.address?.city || item.address?.town || item.address?.village) {
    secondaryParts.push(item.address.city || item.address.town || item.address.village)
  }
  if (item.address?.postcode) secondaryParts.push(item.address.postcode)
  if (item.address?.state) secondaryParts.push(item.address.state)

  return {
    label: item.display_name,
    title: primaryParts.join(', ') || item.display_name.split(',').slice(0, 2).join(', '),
    subtitle: secondaryParts.join(' · ') || item.display_name,
    lat: Number(item.lat),
    lng: Number(item.lon),
  }
}

async function fetchSuggestions(rawQuery) {
  const trimmed = rawQuery.trim()

  if (trimmed.length < 3) {
    results.value = []
    highlightedIndex.value = -1
    error.value = ''
    helperText.value = 'Inserisci almeno 3 caratteri per vedere i suggerimenti.'
    return
  }

  if (activeController) {
    activeController.abort()
  }

  activeController = new AbortController()
  loading.value = true
  error.value = ''
  helperText.value = 'Cerco indirizzi e localita vicine...'

  try {
    const params = new URLSearchParams({
      q: trimmed,
      format: 'jsonv2',
      addressdetails: '1',
      limit: '6',
      countrycodes: 'it',
      dedupe: '1',
    })

    const response = await fetch(`https://nominatim.openstreetmap.org/search?${params.toString()}`, {
      signal: activeController.signal,
      headers: {
        'Accept-Language': 'it',
      },
    })

    if (!response.ok) {
      throw new Error('Geocoding HTTP error')
    }

    const data = await response.json()
    results.value = data.map(normalizeResult)
    highlightedIndex.value = results.value.length ? 0 : -1

    if (results.value.length) {
      helperText.value = `${results.value.length} suggerimenti trovati.`
    } else {
      helperText.value = 'Nessun risultato trovato. Prova con comune, via o CAP.'
    }
  } catch (err) {
    if (err.name === 'AbortError') {
      return
    }

    results.value = []
    highlightedIndex.value = -1
    error.value = 'Impossibile recuperare i suggerimenti in questo momento.'
    helperText.value = 'La ricerca indirizzi non risponde: riprova tra poco.'
  } finally {
    loading.value = false
  }
}

async function reverseGeocodePosition(position) {
  if (!position?.lat || !position?.lng) return

  if (reverseController) {
    reverseController.abort()
  }

  reverseController = new AbortController()

  try {
    const params = new URLSearchParams({
      lat: String(position.lat),
      lon: String(position.lng),
      format: 'jsonv2',
      zoom: '17',
      addressdetails: '1',
    })

    const response = await fetch(`https://nominatim.openstreetmap.org/reverse?${params.toString()}`, {
      signal: reverseController.signal,
      headers: {
        'Accept-Language': 'it',
      },
    })

    if (!response.ok) {
      throw new Error('Reverse geocoding HTTP error')
    }

    const data = await response.json()
    suppressSuggestions.value = true
    results.value = []
    highlightedIndex.value = -1
    query.value = ''
    helperText.value = 'Posizione attuale rilevata e applicata alla mappa.'
  } catch (err) {
    if (err.name === 'AbortError') {
      return
    }

    suppressSuggestions.value = true
    results.value = []
    highlightedIndex.value = -1
    query.value = ''
    helperText.value = 'Posizione attuale rilevata. Indirizzo preciso non disponibile.'
  }
}

function scheduleSuggestions(nextValue) {
  clearTimeout(debounceTimer)
  debounceTimer = setTimeout(() => {
    fetchSuggestions(nextValue)
  }, 220)
}

watch(query, (nextValue) => {
  error.value = ''

  if (suppressSuggestions.value) {
    suppressSuggestions.value = false
    return
  }

  if (!nextValue.trim()) {
    results.value = []
    highlightedIndex.value = -1
    helperText.value = 'Tocca "Mia posizione" per attivare il GPS oppure cerca un indirizzo.'
    clearTimeout(debounceTimer)
    if (activeController) {
      activeController.abort()
      activeController = null
    }
    loading.value = false
    return
  }

  scheduleSuggestions(nextValue)
})

watch(
  () => props.manualLocation,
  (nextLocation) => {
    if (nextLocation?.label) {
      query.value = nextLocation.label
      helperText.value = 'Posizione manuale selezionata.'
      return
    }

    if (!nextLocation && props.currentPosition) {
      reverseGeocodePosition(props.currentPosition)
    }
  },
  { immediate: true, deep: true }
)

watch(
  () => props.currentPosition,
  (nextPosition, previousPosition) => {
    if (props.manualLocation || !nextPosition) return

    const hasChanged =
      !previousPosition ||
      previousPosition.lat !== nextPosition.lat ||
      previousPosition.lng !== nextPosition.lng

    if (hasChanged) {
      reverseGeocodePosition(nextPosition)
    }
  },
  { deep: true }
)

async function searchAddress() {
  await fetchSuggestions(query.value)

  if (results.value.length === 1) {
    selectResult(results.value[0])
  }
}

function selectResult(result) {
  suppressSuggestions.value = true
  query.value = result.label
  results.value = []
  highlightedIndex.value = -1
  error.value = ''
  helperText.value = 'Posizione manuale selezionata.'
  emit('select-location', result)

  if (isMobileLayout.value) {
    closePlanner()
  }
}

function onKeydown(event) {
  if (!showDropdown.value || !results.value.length) {
    if (event.key === 'Enter') {
      event.preventDefault()
      searchAddress()
    }
    return
  }

  if (event.key === 'ArrowDown') {
    event.preventDefault()
    highlightedIndex.value = (highlightedIndex.value + 1) % results.value.length
    return
  }

  if (event.key === 'ArrowUp') {
    event.preventDefault()
    highlightedIndex.value = highlightedIndex.value <= 0 ? results.value.length - 1 : highlightedIndex.value - 1
    return
  }

  if (event.key === 'Enter') {
    event.preventDefault()
    const target = results.value[highlightedIndex.value] ?? results.value[0]
    if (target) {
      selectResult(target)
    }
    return
  }

  if (event.key === 'Escape') {
    results.value = []
    highlightedIndex.value = -1
  }
}

function clearManualLocation() {
  suppressSuggestions.value = true
  query.value = ''
  results.value = []
  highlightedIndex.value = -1
  error.value = ''
  helperText.value = 'Posizione automatica riattivata.'
  emit('clear-manual')
}

function handleInlineFocus(event) {
  if (!isMobileLayout.value) return

  event.target.blur()
  void openPlanner()
}

function handleInlineClick() {
  if (!isMobileLayout.value) return

  void openPlanner()
}

watch(plannerOpen, (isOpen) => {
  document.body.style.overflow = isOpen ? 'hidden' : ''
  if (!isOpen) {
    plannerTranslateY.value = 0
    plannerDragging.value = false
  }
})

onMounted(() => {
  mobileMediaQuery = window.matchMedia('(max-width: 1024px)')
  isMobileLayout.value = mobileMediaQuery.matches
  mobileMediaQuery.addEventListener('change', handleMobileLayoutChange)
})

onUnmounted(() => {
  clearTimeout(debounceTimer)
  if (activeController) {
    activeController.abort()
  }
  if (reverseController) {
    reverseController.abort()
  }
  mobileMediaQuery?.removeEventListener('change', handleMobileLayoutChange)
  document.body.style.overflow = ''
})
</script>

<template>
  <section class="location-search">
    <div class="search-shell">
      <div class="search-form">
        <div class="search-top-row">
          <div class="search-input-wrap">
            <div class="search-input-shell">
              <span class="search-input-icon" aria-hidden="true">
                <svg viewBox="0 0 24 24" focusable="false">
                  <path
                    d="M10.5 4a6.5 6.5 0 1 0 4.03 11.6l4.44 4.44 1.06-1.06-4.44-4.44A6.5 6.5 0 0 0 10.5 4Zm0 1.5a5 5 0 1 1 0 10 5 5 0 0 1 0-10Z"
                    fill="currentColor"
                  />
                </svg>
              </span>
              <input
                id="address-search"
                v-model="query"
                class="search-input"
                type="text"
                autocomplete="street-address"
                :placeholder="isMobileLayout ? 'Indirizzo o zona' : 'Cerca per indirizzo'"
                :readonly="isMobileLayout"
                @focus="handleInlineFocus"
                @click="handleInlineClick"
                @keydown="onKeydown"
              />
            </div>

            <div v-if="showInlineDropdown" class="results-panel">
              <div v-if="loading" class="results-state">
                <span class="mini-spinner" aria-hidden="true"></span>
                Cerco suggerimenti...
              </div>

              <ul v-else-if="results.length" class="results-list">
                <li v-for="(result, index) in results" :key="`${result.lat}-${result.lng}-${result.label}`">
                  <button
                    class="result-item"
                    :class="{ 'result-item--active': highlightedIndex === index }"
                    type="button"
                    @mouseenter="highlightedIndex = index"
                    @click="selectResult(result)"
                  >
                    <span class="result-title">{{ result.title }}</span>
                    <span class="result-label">{{ result.subtitle }}</span>
                  </button>
                </li>
              </ul>

              <div v-else class="results-state">
                Nessun suggerimento disponibile.
              </div>
            </div>
          </div>

          <button
            class="geo-inline-btn"
            :class="{ 'geo-inline-btn--active': isUsingGps }"
            type="button"
            :aria-label="isUsingGps ? 'Posizione attuale in uso — clicca per disattivarla' : 'Usa la mia posizione attuale'"
            :title="isUsingGps ? 'GPS attivo — clicca per disattivare' : 'Usa la mia posizione'"
            @click="isUsingGps ? emit('disable-geo') : emit('retry-geo')"
          >
            <span class="geo-inline-btn__icon" aria-hidden="true">{{ isUsingGps ? '●' : '◎' }}</span>
            <span class="geo-inline-btn__label">Mia posizione</span>
          </button>
        </div>

        <div class="search-toolbar">
          <div class="search-actions">
            <button
              v-if="manualLocation"
              class="ghost-btn ghost-btn--active ghost-btn--full"
              type="button"
              @click="clearManualLocation"
            >
              Torna alla posizione attuale
            </button>
          </div>
        </div>
      </div>

      <div v-if="visibleHelperText || manualLocation" class="search-meta">
        <p v-if="visibleHelperText" class="search-helper">{{ visibleHelperText }}</p>
        <p v-if="manualLocation" class="active-location">
          Posizione manuale attiva: <strong>{{ manualLocation.label }}</strong>
        </p>
      </div>
      <p v-if="error" class="search-error">{{ error }}</p>
    </div>

  </section>

  <Teleport to="body">
    <Transition name="planner-fade">
      <div
        v-if="plannerOpen"
        class="planner-overlay"
        role="dialog"
        aria-modal="true"
        :aria-label="plannerTitle"
        @click.self="closePlanner"
      >
        <div
          class="planner-sheet"
          :class="{ 'planner-sheet--dragging': plannerDragging }"
          :style="{ transform: `translateY(${plannerTranslateY}px)` }"
          @touchstart.passive="onPlannerTouchStart"
          @touchmove="onPlannerTouchMove"
          @touchend="onPlannerTouchEnd"
          @touchcancel="onPlannerTouchEnd"
        >
          <div class="planner-handle" aria-hidden="true"></div>

          <div class="planner-header">
            <button class="planner-back" type="button" aria-label="Torna alla home" @click="closePlanner">
              <svg viewBox="0 0 24 24" focusable="false">
                <path d="m14.78 5.22 1.06 1.06L10.12 12l5.72 5.72-1.06 1.06L8 12z" fill="currentColor" />
              </svg>
              <span>Home</span>
            </button>

            <button class="planner-close" type="button" aria-label="Chiudi ricerca" @click="closePlanner">
              <svg viewBox="0 0 24 24" focusable="false">
                <path d="M6.28 5.22 12 10.94l5.72-5.72 1.06 1.06L13.06 12l5.72 5.72-1.06 1.06L12 13.06l-5.72 5.72-1.06-1.06L10.94 12 5.22 6.28Z" fill="currentColor" />
              </svg>
            </button>
          </div>

          <div class="planner-content">
            <div ref="plannerContentRef" class="planner-content-scroll">
              <div class="planner-copy">
              <h2 class="planner-title">{{ plannerTitle }}</h2>
              <p class="planner-subtitle">Inserisci la zona di interesse e scegli il punto da cui partire.</p>
              </div>

              <div class="planner-field">
                <div class="planner-input-shell">
                  <span class="planner-input-icon" aria-hidden="true">
                    <svg viewBox="0 0 24 24" focusable="false">
                      <path
                        d="M10.5 4a6.5 6.5 0 1 0 4.03 11.6l4.44 4.44 1.06-1.06-4.44-4.44A6.5 6.5 0 0 0 10.5 4Zm0 1.5a5 5 0 1 1 0 10 5 5 0 0 1 0-10Z"
                        fill="currentColor"
                      />
                    </svg>
                  </span>
                  <input
                    ref="plannerInputRef"
                    v-model="query"
                    class="planner-input"
                    type="text"
                    autocomplete="street-address"
                    placeholder="Comune, via o CAP"
                    @keydown="onKeydown"
                  />
                </div>
              </div>

              <button class="planner-search-btn" type="button" :disabled="loading" @click="searchAddress">
                {{ loading ? 'Cerco...' : 'Cerca questa zona' }}
              </button>

              <div v-if="showPlannerDropdown" class="planner-results">
                <div v-if="loading" class="planner-results-state">
                  <span class="mini-spinner" aria-hidden="true"></span>
                  Cerco suggerimenti...
                </div>

                <ul v-else-if="results.length" class="planner-results-list">
                  <li v-for="(result, index) in results" :key="`planner-${result.lat}-${result.lng}-${result.label}`">
                    <button
                      class="planner-result-item"
                      :class="{ 'planner-result-item--active': highlightedIndex === index }"
                      type="button"
                      @mouseenter="highlightedIndex = index"
                      @click="selectResult(result)"
                    >
                      <span class="planner-result-title">{{ result.title }}</span>
                      <span class="planner-result-label">{{ result.subtitle }}</span>
                    </button>
                  </li>
                </ul>

                <div v-else class="planner-results-state">
                  Nessun suggerimento disponibile.
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.location-search {
  width: 100%;
  padding: 0.9rem 1rem 0;
}

.search-shell {
  width: 100%;
  margin: 0 auto;
  padding: 1.05rem;
  border-radius: 28px;
  background:
    radial-gradient(circle at top right, rgba(255, 122, 26, 0.12), transparent 28%),
    linear-gradient(180deg, rgba(255,255,255,0.05), rgba(255,255,255,0.025));
  border: 1px solid rgba(255, 255, 255, 0.08);
  box-shadow:
    inset 0 1px 0 rgba(255,255,255,0.04),
    0 24px 54px rgba(0, 0, 0, 0.16);
  position: relative;
  overflow: hidden;
}

.search-shell::before {
  content: '';
  position: absolute;
  inset: 0;
  background: linear-gradient(120deg, transparent 10%, rgba(255,255,255,0.05) 48%, transparent 88%);
  transform: translateX(-120%);
  animation: shell-sheen 6.8s ease-in-out infinite;
  pointer-events: none;
}

.search-form {
  display: flex;
  flex-direction: column;
  gap: 0.82rem;
}

.search-input-wrap {
  position: relative;
  min-width: 0;
  flex: 1;
}

.search-top-row {
  display: flex;
  align-items: stretch;
  gap: 0.65rem;
}

.search-input-shell {
  position: relative;
}

.search-input-icon {
  position: absolute;
  top: 50%;
  left: 16px;
  z-index: 1;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 18px;
  height: 18px;
  color: rgba(255, 255, 255, 0.48);
  transform: translateY(-50%);
  pointer-events: none;
}

.search-input-icon svg {
  width: 100%;
  height: 100%;
}

.search-input {
  width: 100%;
  min-height: 58px;
  padding: 0.95rem 1rem 0.95rem 2.9rem;
  border-radius: 22px;
  border: 1px solid rgba(255, 255, 255, 0.12);
  background: rgba(255,255,255,0.07);
  color: #ffffff;
  outline: none;
  transition:
    border-color var(--transition),
    box-shadow var(--transition),
    background var(--transition),
    transform var(--transition);
}

.search-input::placeholder {
  color: rgba(255,255,255,0.38);
}

.search-input:focus {
  border-color: rgba(255, 122, 26, 0.55);
  box-shadow: 0 0 0 4px rgba(255, 122, 26, 0.16);
  background: rgba(255,255,255,0.08);
  transform: translateY(-1px);
}

.search-input[readonly] {
  cursor: pointer;
}

.ghost-btn,
.result-item {
  font: inherit;
}

.search-toolbar {
  display: grid;
  grid-template-columns: 1fr;
}

.geo-inline-btn {
  min-width: 126px;
  min-height: 58px;
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: 20px;
  background: rgba(255,255,255,0.07);
  color: rgba(255,255,255,0.88);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.45rem;
  padding: 0 0.9rem;
  font: inherit;
  font-size: 0.9rem;
  font-weight: 700;
  cursor: pointer;
  transition: border-color var(--transition), color var(--transition), background var(--transition);
}

.geo-inline-btn__icon {
  font-size: 0.95rem;
}

.geo-inline-btn__label {
  white-space: nowrap;
}

.geo-inline-btn:hover {
  border-color: rgba(255, 122, 26, 0.25);
  color: #ffffff;
  background: rgba(255,255,255,0.1);
}

/* Stato attivo: GPS in uso */
.geo-inline-btn--active {
  border-color: rgba(255, 122, 26, 0.5);
  background: rgba(255, 122, 26, 0.14);
  color: #ffb370;
}

.geo-inline-btn--active .geo-inline-btn__icon {
  color: #ff8e39;
}

.geo-inline-btn--active:hover {
  border-color: rgba(255, 122, 26, 0.65);
  background: rgba(255, 122, 26, 0.2);
  color: #ffc08a;
}

.search-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 0.65rem;
  align-items: stretch;
  justify-content: flex-start;
}

.ghost-btn {
  min-height: 40px;
  width: auto;
  min-width: 182px;
  padding: 0.72rem 0.9rem;
  border-radius: 999px;
  border: 1px solid rgba(255, 255, 255, 0.12);
  background: rgba(255,255,255,0.05);
  color: rgba(255,255,255,0.82);
  font-weight: 700;
  cursor: pointer;
  transition: border-color var(--transition), color var(--transition), background var(--transition);
}

.ghost-btn--active {
  color: #ffffff;
  border-color: rgba(255, 122, 26, 0.3);
  background: rgba(255, 122, 26, 0.16);
}

.ghost-btn--full {
  grid-column: 1 / -1;
}

.ghost-btn:hover {
  border-color: rgba(255, 122, 26, 0.25);
  color: #ffffff;
}

.search-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  margin-top: 0.78rem;
}

.search-helper,
.active-location,
.search-error {
  font-size: 0.84rem;
}

.search-helper {
  display: inline-flex;
  align-items: center;
  min-height: 34px;
  padding: 0 0.8rem;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.05);
  color: rgba(255,255,255,0.68);
}

.active-location {
  display: inline-flex;
  align-items: center;
  min-height: 34px;
  padding: 0 0.8rem;
  border-radius: 999px;
  background: rgba(255, 122, 26, 0.12);
  color: rgba(255,255,255,0.78);
}

.search-error {
  margin-top: 0.7rem;
  color: #b45309;
  font-weight: 600;
}

.results-panel {
  position: absolute;
  top: calc(100% + 0.45rem);
  left: 0;
  right: 0;
  z-index: 15;
  padding: 0.45rem;
  border-radius: 20px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  background: rgba(10, 12, 18, 0.98);
  box-shadow: 0 24px 44px rgba(0, 0, 0, 0.28);
}

.planner-overlay {
  position: fixed;
  inset: 0;
  z-index: 999;
  display: grid;
  align-items: end;
  padding-top: max(16px, env(safe-area-inset-top));
  background: rgba(6, 8, 12, 0.56);
  backdrop-filter: blur(10px);
  isolation: isolate;
}

.planner-sheet {
  width: 100%;
  height: min(82dvh, 760px);
  max-height: calc(100dvh - max(16px, env(safe-area-inset-top)));
  padding: 0.9rem 1rem calc(1.2rem + env(safe-area-inset-bottom));
  border-radius: 28px 28px 0 0;
  background:
    radial-gradient(circle at top right, rgba(255, 160, 92, 0.16), transparent 24%),
    linear-gradient(180deg, #efe7db 0%, #e9dfd1 100%);
  color: #1a1611;
  box-shadow: 0 -24px 54px rgba(0, 0, 0, 0.2);
  display: grid;
  align-content: start;
  gap: 0.9rem;
  overflow: hidden;
  transition: transform 220ms ease;
  touch-action: none;
}

.planner-sheet--dragging {
  transition: none;
}

.planner-handle {
  width: 42px;
  height: 5px;
  border-radius: 999px;
  background: rgba(20, 20, 20, 0.12);
  justify-self: center;
}

.planner-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
}

.planner-back {
  min-height: 42px;
  padding: 0 0.85rem 0 0.7rem;
  border: 0;
  border-radius: 999px;
  background: #ebe5dd;
  color: #1b1b1b;
  display: inline-flex;
  align-items: center;
  gap: 0.28rem;
  font: inherit;
  font-weight: 700;
}

.planner-back svg {
  width: 18px;
  height: 18px;
}

.planner-content {
  display: grid;
  grid-template-rows: auto auto auto auto minmax(0, 1fr);
  align-content: start;
  gap: 0.95rem;
  min-height: 0;
  padding-bottom: 0.2rem;
}

.planner-content-scroll {
  display: grid;
  grid-template-rows: auto auto auto minmax(0, 1fr);
  gap: 0.95rem;
  min-height: 0;
  overflow: auto;
  padding-bottom: 0.2rem;
}

.planner-copy {
  display: grid;
  gap: 0.1rem;
}

.planner-title {
  font-size: 1.85rem;
  line-height: 1;
  letter-spacing: -0.06em;
  color: #121212;
}

.planner-subtitle {
  margin-top: 0.45rem;
  color: #5d5d5d;
  font-size: 0.96rem;
  line-height: 1.5;
}

.planner-close {
  width: 42px;
  height: 42px;
  border: 0;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.42);
  color: #1b1b1b;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  box-shadow: inset 0 0 0 1px rgba(104, 76, 48, 0.08);
}

.planner-close svg,
.planner-input-icon svg {
  width: 18px;
  height: 18px;
}

.planner-field {
  display: grid;
  gap: 0.45rem;
}

.planner-input-shell {
  position: relative;
}

.planner-input-icon {
  position: absolute;
  top: 50%;
  left: 16px;
  color: #6a6a6a;
  transform: translateY(-50%);
}

.planner-input {
  width: 100%;
  min-height: 58px;
  padding: 0.95rem 1rem 0.95rem 2.9rem;
  border-radius: 20px;
  border: 1px solid rgba(120, 90, 58, 0.16);
  background: rgba(255, 252, 247, 0.88);
  color: #151515;
  outline: none;
  box-shadow: 0 12px 28px rgba(30, 24, 18, 0.06);
}

.planner-input::placeholder {
  color: #949494;
}

.planner-search-btn,
.planner-geo-btn {
  min-height: 52px;
  border: 0;
  border-radius: 18px;
  font: inherit;
  font-weight: 700;
}

.planner-search-btn {
  background: linear-gradient(135deg, #2f2720, #171310);
  color: #f5f1eb;
}

.planner-results {
  display: grid;
  gap: 0.45rem;
  min-height: 0;
  overflow: auto;
  padding-top: 0.2rem;
  padding-right: 0.1rem;
}

.planner-results-list {
  list-style: none;
  display: grid;
  gap: 0.45rem;
}

.planner-result-item {
  width: 100%;
  padding: 0.9rem 0.95rem;
  border: 1px solid rgba(129, 99, 67, 0.12);
  border-radius: 18px;
  background: rgba(255, 252, 247, 0.86);
  text-align: left;
}

.planner-result-item--active {
  border-color: rgba(203, 132, 66, 0.28);
  background: rgba(255, 243, 230, 0.92);
}

.planner-result-title {
  display: block;
  color: #161616;
  font-weight: 700;
  line-height: 1.35;
}

.planner-result-label {
  display: block;
  margin-top: 0.18rem;
  color: #676767;
  font-size: 0.82rem;
  line-height: 1.45;
}

.planner-results-state {
  display: flex;
  align-items: center;
  gap: 0.55rem;
  color: #666;
  font-size: 0.9rem;
  padding: 0.6rem 0.1rem;
}

.planner-fade-enter-active,
.planner-fade-leave-active {
  transition: opacity 180ms ease;
}

.planner-fade-enter-active .planner-sheet,
.planner-fade-leave-active .planner-sheet {
  transition: transform 220ms ease;
}

.planner-fade-enter-from,
.planner-fade-leave-to {
  opacity: 0;
}

.planner-fade-enter-from .planner-sheet,
.planner-fade-leave-to .planner-sheet {
  transform: translateY(24px);
}

.results-list {
  list-style: none;
  display: flex;
  flex-direction: column;
  gap: 0.3rem;
}

.result-item {
  width: 100%;
  text-align: left;
  padding: 0.85rem 0.9rem;
  border: 0;
  border-radius: 16px;
  background: transparent;
  cursor: pointer;
  transition: background var(--transition), transform var(--transition), box-shadow var(--transition);
}

.result-item:hover,
.result-item--active {
  background: rgba(255, 122, 26, 0.12);
  transform: translateY(-1px);
  box-shadow: inset 0 0 0 1px rgba(255, 122, 26, 0.12);
}

.result-title {
  display: block;
  font-size: 0.92rem;
  font-weight: 700;
  color: #ffffff;
  line-height: 1.35;
}

.result-label {
  display: block;
  margin-top: 0.14rem;
  font-size: 0.78rem;
  color: rgba(255,255,255,0.62);
  line-height: 1.4;
}

.results-state {
  display: flex;
  align-items: center;
  gap: 0.55rem;
  padding: 0.8rem 0.9rem;
  color: rgba(255,255,255,0.7);
  font-size: 0.84rem;
}

.mini-spinner {
  width: 15px;
  height: 15px;
  border-radius: 50%;
  border: 2px solid rgba(148, 163, 184, 0.25);
  border-top-color: var(--primary);
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

@keyframes shell-sheen {
  0%, 74%, 100% { transform: translateX(-120%); opacity: 0; }
  10%, 34% { opacity: 1; }
  42% { transform: translateX(120%); opacity: 0; }
}

@media (min-width: 1025px) {
  .location-search {
    padding-left: 0;
    padding-right: 0;
  }

  .search-form {
    gap: 0.95rem;
  }

  .search-toolbar {
    justify-items: start;
  }

  .search-meta {
    justify-content: flex-start;
  }
}

@media (max-width: 1024px) {
  .location-search {
    padding-left: 0.75rem;
    padding-right: 0.75rem;
  }

  .search-shell {
    padding: 0.2rem 0;
    border-radius: 0;
    border: 0;
    background: transparent;
    box-shadow: none;
    overflow: visible;
  }

  .search-actions {
    flex-direction: column;
  }

  .search-top-row {
    gap: 0.55rem;
  }

  .geo-inline-btn {
    min-width: 108px;
    padding: 0 0.65rem;
    gap: 0.35rem;
    font-size: 0.82rem;
  }

  .ghost-btn {
    width: 100%;
    justify-content: center;
    font-size: 0.92rem;
  }

  .results-panel {
    border-radius: 18px;
  }

  .planner-sheet {
    height: min(84dvh, 860px);
    max-height: calc(100dvh - max(12px, env(safe-area-inset-top)));
    padding-left: 1rem;
    padding-right: 1rem;
  }
}
</style>

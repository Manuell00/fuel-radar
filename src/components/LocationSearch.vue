<script setup>
import { computed, onUnmounted, ref, watch } from 'vue'

const props = defineProps({
  manualLocation: { type: Object, default: null },
  currentPosition: { type: Object, default: null },
})

const emit = defineEmits(['select-location', 'clear-manual', 'retry-geo'])

const query = ref('')
const loading = ref(false)
const error = ref('')
const helperText = ref('Inizia a scrivere: ti proponiamo gli indirizzi in tempo reale.')
const results = ref([])
const highlightedIndex = ref(-1)
const suppressSuggestions = ref(false)

let debounceTimer = null
let activeController = null
let reverseController = null

const hasResults = computed(() => results.value.length > 0)
const showDropdown = computed(() => !suppressSuggestions.value && (hasResults.value || loading.value))
const showSuccessNotice = computed(() =>
  helperText.value === 'Posizione attuale rilevata e applicata alla mappa.' ||
  helperText.value === 'Posizione attuale rilevata. Indirizzo preciso non disponibile.'
)

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
    const label = data.display_name || 'Posizione corrente'
    suppressSuggestions.value = true
    results.value = []
    highlightedIndex.value = -1
    query.value = label
    helperText.value = 'Posizione attuale rilevata e applicata alla mappa.'
  } catch (err) {
    if (err.name === 'AbortError') {
      return
    }

    suppressSuggestions.value = true
    results.value = []
    highlightedIndex.value = -1
    query.value = `${position.lat.toFixed(5)}, ${position.lng.toFixed(5)}`
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
    helperText.value = 'Inizia a scrivere: ti proponiamo gli indirizzi in tempo reale.'
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

onUnmounted(() => {
  clearTimeout(debounceTimer)
  if (activeController) {
    activeController.abort()
  }
  if (reverseController) {
    reverseController.abort()
  }
})
</script>

<template>
  <section class="location-search">
    <div class="search-shell">
      <div class="search-copy">
        <h2 class="search-title">Ricerca Posizione</h2>
        <p class="search-subtitle">
          Scegli un indirizzo oppure usa direttamente la tua posizione attuale.
        </p>
      </div>

      <div class="search-form">
        <div class="search-row">
          <div class="search-input-wrap">
            <input
              v-model="query"
              class="search-input"
              type="text"
              autocomplete="street-address"
              placeholder="Es. Via Roma 12, Rapallo"
              @keydown="onKeydown"
            />

            <div v-if="showDropdown" class="results-panel">
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

          <button class="search-btn" type="button" :disabled="loading" @click="searchAddress">
            {{ loading ? 'Cerco...' : 'Cerca indirizzo' }}
          </button>
        </div>

        <div class="search-actions">
          <button class="ghost-btn" type="button" @click="emit('retry-geo')">
            Usa la mia posizione
          </button>
          <button
            v-if="manualLocation"
            class="ghost-btn ghost-btn--active"
            type="button"
            @click="clearManualLocation"
          >
            Torna alla posizione attuale
          </button>
        </div>
      </div>

      <div v-if="showSuccessNotice" class="search-notice search-notice--success" role="status" aria-live="polite">
        <span class="notice-icon" aria-hidden="true">✓</span>
        <span>{{ helperText }}</span>
      </div>
      <p v-else class="search-helper">{{ helperText }}</p>
      <p v-if="manualLocation" class="active-location">
        Posizione manuale attiva: <strong>{{ manualLocation.label }}</strong>
      </p>
      <p v-if="error" class="search-error">{{ error }}</p>
    </div>
  </section>
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

.search-copy {
  text-align: center;
  display: grid;
  gap: 0.65rem;
}

.search-title {
  font-size: clamp(2rem, 5vw, 3rem);
  font-weight: 800;
  color: #fff8f1;
  letter-spacing: -0.04em;
  text-transform: uppercase;
  -webkit-text-stroke: 0.9px rgba(255, 166, 99, 0.3);
  text-shadow:
    0 12px 28px rgba(0, 0, 0, 0.24),
    0 0 22px rgba(255, 122, 26, 0.1),
    0 0 2px rgba(255, 214, 181, 0.2);
}

.search-subtitle {
  color: rgba(255,255,255,0.7);
  line-height: 1.7;
}

.search-form {
  margin-top: 0.9rem;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.search-row {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 0.7rem;
  align-items: start;
}

.search-input-wrap {
  position: relative;
}

.search-input {
  width: 100%;
  min-height: 50px;
  padding: 0.95rem 1rem;
  border-radius: 16px;
  border: 1px solid rgba(255, 255, 255, 0.12);
  background: rgba(255,255,255,0.06);
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

.search-btn,
.ghost-btn,
.result-item {
  font: inherit;
}

.search-btn {
  min-height: 50px;
  padding: 0.9rem 1.1rem;
  border: 0;
  border-radius: 16px;
  background: linear-gradient(135deg, #ff9c52, #ff7a1a 55%, #d95504);
  color: white;
  font-weight: 700;
  cursor: pointer;
  box-shadow: 0 16px 28px rgba(255, 122, 26, 0.24);
  transition: transform var(--transition), box-shadow var(--transition), filter var(--transition);
}

.search-btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 20px 34px rgba(255, 122, 26, 0.3);
  filter: saturate(1.06);
}

.search-btn:disabled {
  cursor: wait;
  opacity: 0.88;
}

.search-actions {
  display: flex;
  justify-content: flex-start;
  gap: 0.6rem;
  flex-wrap: wrap;
}

.ghost-btn {
  min-height: 40px;
  padding: 0.65rem 0.9rem;
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

.ghost-btn:hover {
  border-color: rgba(255, 122, 26, 0.25);
  color: #ffffff;
}

.search-helper,
.active-location,
.search-error {
  margin-top: 0.8rem;
  font-size: 0.84rem;
}

.search-helper {
  color: rgba(255,255,255,0.64);
}

.search-notice {
  margin-top: 0.95rem;
  min-height: 46px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.7rem;
  width: fit-content;
  max-width: 100%;
  padding: 0.78rem 1rem;
  border-radius: 999px;
  font-size: 0.84rem;
  font-weight: 700;
}

.search-notice--success {
  background: rgba(255, 122, 26, 0.16);
  border: 1px solid rgba(255, 167, 100, 0.28);
  color: #fff2e8;
  box-shadow:
    inset 0 1px 0 rgba(255,255,255,0.04),
    0 12px 24px rgba(255, 122, 26, 0.14);
}

.notice-icon {
  width: 24px;
  height: 24px;
  border-radius: 50%;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #ff9c52, #ff7a1a 55%, #d95504);
  color: white;
  font-size: 0.8rem;
  font-weight: 900;
  box-shadow: 0 8px 16px rgba(255, 122, 26, 0.22);
}

.active-location {
  color: rgba(255,255,255,0.72);
}

.search-error {
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

@media (max-width: 640px) {
  .location-search {
    padding-left: 0.75rem;
    padding-right: 0.75rem;
  }

  .search-shell {
    padding: 0.9rem;
    border-radius: 24px;
  }

  .search-row {
    grid-template-columns: 1fr;
  }

  .search-copy {
    text-align: center;
  }

  .search-title {
    max-width: none;
    font-size: clamp(1.8rem, 9vw, 2.35rem);
  }

  .search-subtitle {
    font-size: 0.92rem;
    line-height: 1.55;
  }

  .search-btn {
    width: 100%;
  }

  .search-actions {
    display: grid;
    grid-template-columns: 1fr;
  }

  .ghost-btn {
    width: 100%;
    justify-content: center;
  }

  .search-notice {
    width: 100%;
    justify-content: flex-start;
    border-radius: 18px;
  }

  .results-panel {
    border-radius: 18px;
  }
}
</style>

import { computed, ref, watch } from 'vue'
import fallbackStations from '../data/stations.json'
import { fetchNearbyStations } from '../services/mimitService.js'
import { haversineDistance } from '../utils/distance.js'

const PREFETCH_RADIUS_KM = 60

export function useStations(userPosition) {
  const filters = ref({
    fuelType: 'tutti',
    mode: 'tutti',
    radius: 12,
  })

  const rawStations = ref([])
  const stationsLoading = ref(false)
  const stationsError = ref('')
  const usingFallback = ref(false)
  const liveReady = ref(false)

  function getApplicablePrice(station) {
    const shouldPreferDefaultBenzina =
      filters.value.fuelType === 'tutti' &&
      filters.value.mode === 'tutti'

    const fuelTypes = shouldPreferDefaultBenzina
      ? ['benzina']
      : filters.value.fuelType === 'tutti'
        ? ['benzina', 'diesel', 'gpl']
        : [filters.value.fuelType]

    let best = null

    fuelTypes.forEach((fuelType) => {
      const prices = station.prices?.[fuelType]
      if (!prices) return

      const candidates = []

      if ((filters.value.mode === 'tutti' || filters.value.mode === 'self') && prices.self != null) {
        candidates.push({ fuelType, price: prices.self, selfService: true })
      }

      if ((filters.value.mode === 'tutti' || filters.value.mode === 'servito') && prices.full != null) {
        candidates.push({ fuelType, price: prices.full, selfService: false })
      }

      candidates.forEach((candidate) => {
        if (!best || candidate.price < best.price) {
          best = candidate
        }
      })
    })

    return best
  }

  const enriched = computed(() => {
    if (!userPosition.value) return []

    return rawStations.value.map((station) => ({
      ...station,
      distance: haversineDistance(
        userPosition.value.lat,
        userPosition.value.lng,
        station.lat,
        station.lng
      ),
    }))
  })

  const filtered = computed(() => enriched.value
    .filter((station) => station.distance <= filters.value.radius)
    .map((station) => {
      const applicable = getApplicablePrice(station)
      if (!applicable) return null

      return {
        ...station,
        price: applicable.price,
        fuelType: applicable.fuelType,
        selfService: applicable.selfService,
      }
    })
    .filter(Boolean))

  const sorted = computed(() => [...filtered.value].sort((a, b) => {
    if (a.price !== b.price) return a.price - b.price
    return a.distance - b.distance
  }))

  const cheapest = computed(() => sorted.value[0] ?? null)

  const nearest = computed(() => {
    if (!filtered.value.length) return null
    return [...filtered.value].sort((a, b) => a.distance - b.distance)[0]
  })

  const bestCompromise = computed(() => {
    if (!filtered.value.length) return null
    if (filtered.value.length === 1) return filtered.value[0]

    const prices = filtered.value.map((station) => station.price)
    const distances = filtered.value.map((station) => station.distance)
    const minPrice = Math.min(...prices)
    const maxPrice = Math.max(...prices)
    const minDistance = Math.min(...distances)
    const maxDistance = Math.max(...distances)
    const priceRange = maxPrice - minPrice || 1
    const distanceRange = maxDistance - minDistance || 1

    return [...filtered.value]
      .map((station) => ({
        station,
        score:
          ((station.price - minPrice) / priceRange) * 0.68 +
          ((station.distance - minDistance) / distanceRange) * 0.32,
      }))
      .sort((a, b) => a.score - b.score)[0]?.station ?? null
  })

  async function loadStations(options = {}) {
    if (!userPosition.value) {
      rawStations.value = []
      return
    }

    stationsLoading.value = true
    stationsError.value = ''

    try {
      const stations = await fetchNearbyStations(
        userPosition.value.lat,
        userPosition.value.lng,
        PREFETCH_RADIUS_KM,
        options
      )

      if (!stations.length) {
        throw new Error('No stations returned')
      }

      rawStations.value = stations
      usingFallback.value = false
      liveReady.value = true
    } catch {
      rawStations.value = fallbackStations
      usingFallback.value = true
      liveReady.value = false
      stationsError.value = 'I dati live dei distributori non sono disponibili in questo momento.'
    } finally {
      stationsLoading.value = false
    }
  }

  async function refreshStations() {
    await loadStations({ forceRefresh: true })
  }

  watch(userPosition, async (nextPosition, previousPosition) => {
    if (!nextPosition) return

    const hasChanged =
      !previousPosition ||
      previousPosition.lat !== nextPosition.lat ||
      previousPosition.lng !== nextPosition.lng

    if (hasChanged) {
      await loadStations()
    }
  }, { immediate: true, deep: true })

  return {
    filters,
    filtered,
    sorted,
    cheapest,
    nearest,
    bestCompromise,
    stationsLoading,
    stationsError,
    usingFallback,
    liveReady,
    refreshStations,
  }
}

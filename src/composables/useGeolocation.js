import { ref } from 'vue'

function getPosition(options) {
  return new Promise((resolve, reject) => {
    navigator.geolocation.getCurrentPosition(resolve, reject, options)
  })
}

async function getPermissionState() {
  if (!navigator.permissions?.query) return null
  try {
    const status = await navigator.permissions.query({ name: 'geolocation' })
    return status.state
  } catch {
    return null
  }
}

async function getApproximatePosition() {
  const response = await fetch('https://ipwho.is/', { headers: { Accept: 'application/json' } })
  if (!response.ok) throw new Error('IP geolocation HTTP error')
  const data = await response.json()
  if (!data?.success || typeof data.latitude !== 'number' || typeof data.longitude !== 'number') {
    throw new Error('IP geolocation unavailable')
  }
  return { lat: data.latitude, lng: data.longitude }
}

function getGeolocationErrorMessage(permissionState) {
  if (!window.isSecureContext && window.location.hostname !== 'localhost') {
    return 'La posizione precisa richiede HTTPS. Inserisci un indirizzo manualmente.'
  }
  if (permissionState === 'denied') {
    return 'Permesso posizione negato. Riattivalo dal browser e tocca "Riprova posizione".'
  }
  return 'Posizione precisa non disponibile. Usa "Riprova posizione" oppure inserisci un indirizzo.'
}

export function useGeolocation() {
  const position  = ref(null)
  const loading   = ref(false)
  const error     = ref(null)
  const isFallback = ref(false)

  async function requestLocation() {
    loading.value = true
    error.value   = null

    if (!navigator.geolocation) {
      try {
        position.value  = await getApproximatePosition()
        isFallback.value = true
        error.value     = 'Posizione precisa non supportata: uso localizzazione approssimata.'
      } catch {
        position.value  = null
        isFallback.value = false
        error.value     = 'Geolocalizzazione non supportata dal browser.'
      } finally {
        loading.value = false
      }
      return
    }

    const permissionState = await getPermissionState()

    try {
      const pos = await getPosition({ enableHighAccuracy: true, timeout: 12000, maximumAge: 0 })
      position.value  = { lat: pos.coords.latitude, lng: pos.coords.longitude }
      isFallback.value = false
      loading.value   = false
      return
    } catch {
      try {
        const pos = await getPosition({ enableHighAccuracy: false, timeout: 8000, maximumAge: 120000 })
        position.value  = { lat: pos.coords.latitude, lng: pos.coords.longitude }
        isFallback.value = false
        loading.value   = false
        return
      } catch {
        try {
          position.value  = await getApproximatePosition()
          isFallback.value = true
          error.value     = 'Posizione precisa non disponibile: uso localizzazione approssimata dalla rete.'
        } catch {
          position.value  = null
          isFallback.value = false
          error.value     = getGeolocationErrorMessage(permissionState)
        } finally {
          loading.value = false
        }
      }
    }
  }

  return { position, loading, error, isFallback, requestLocation }
}

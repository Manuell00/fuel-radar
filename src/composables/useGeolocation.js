import { ref } from 'vue'

function getPosition(options) {
  return new Promise((resolve, reject) => {
    navigator.geolocation.getCurrentPosition(resolve, reject, options)
  })
}

function getBrowserContext() {
  const userAgent = navigator.userAgent || ''
  const knownInAppBrowsers = [
    { pattern: /WhatsApp/i, label: 'WhatsApp' },
    { pattern: /Instagram/i, label: 'Instagram' },
    { pattern: /FBAN|FBAV|FB_IAB|Messenger/i, label: 'Facebook' },
    { pattern: /Line/i, label: 'LINE' },
    { pattern: /LinkedInApp/i, label: 'LinkedIn' },
    { pattern: /Twitter/i, label: 'X' },
  ]

  const matched = knownInAppBrowsers.find(({ pattern }) => pattern.test(userAgent))

  return {
    appName: matched?.label ?? 'questo browser',
    isInAppBrowser: Boolean(matched),
    isSecureContext: window.isSecureContext || window.location.hostname === 'localhost',
  }
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
  try {
    const response = await fetch('/api/geoip', {
      headers: { Accept: 'application/json' },
      cache: 'no-store',
    })

    if (!response.ok) throw new Error('GeoIP proxy HTTP error')

    const data = await response.json()
    if (!data?.success || typeof data.lat !== 'number' || typeof data.lng !== 'number') {
      throw new Error('GeoIP proxy unavailable')
    }

    return { lat: data.lat, lng: data.lng }
  } catch {
    const response = await fetch('https://ipwho.is/', { headers: { Accept: 'application/json' } })
    if (!response.ok) throw new Error('IP geolocation HTTP error')

    const data = await response.json()
    if (!data?.success || typeof data.latitude !== 'number' || typeof data.longitude !== 'number') {
      throw new Error('IP geolocation unavailable')
    }

    return { lat: data.latitude, lng: data.longitude }
  }
}

function getGeolocationErrorMessage(permissionState, browserContext, userInitiated) {
  if (!browserContext.isSecureContext) {
    return 'La posizione precisa richiede HTTPS. Inserisci un indirizzo manualmente.'
  }
  if (permissionState === 'denied') {
    return 'Permesso posizione negato. Riattivalo dal browser e tocca "Riprova posizione".'
  }
  if (browserContext.isInAppBrowser) {
    if (userInitiated) {
      return `Il browser interno di ${browserContext.appName} puo bloccare il GPS. Apri il link in Safari o Chrome e riprova.`
    }

    return `Il browser interno di ${browserContext.appName} non attiva sempre il GPS da solo. Tocca "Mia posizione" oppure apri il link in Safari o Chrome.`
  }
  return 'Posizione precisa non disponibile. Usa "Riprova posizione" oppure inserisci un indirizzo.'
}

export function useGeolocation() {
  const position  = ref(null)
  const loading   = ref(false)
  const error     = ref(null)
  const isFallback = ref(false)

  async function requestLocation(options = {}) {
    const { userInitiated = false } = options
    loading.value = true
    error.value   = null

    const browserContext = getBrowserContext()

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

    if (!userInitiated && browserContext.isInAppBrowser) {
      const permissionState = await getPermissionState()

      try {
        position.value = await getApproximatePosition()
        isFallback.value = true
        error.value = `Posizione approssimata attiva. Per il GPS preciso da ${browserContext.appName}, tocca "Mia posizione" oppure apri il link in Safari o Chrome.`
      } catch {
        position.value = null
        isFallback.value = false
        error.value = getGeolocationErrorMessage(permissionState, browserContext, userInitiated)
      } finally {
        loading.value = false
      }
      return
    }

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
        const permissionState = await getPermissionState()

        try {
          position.value  = await getApproximatePosition()
          isFallback.value = true
          error.value     = 'Posizione precisa non disponibile: uso localizzazione approssimata dalla rete.'
        } catch {
          position.value  = null
          isFallback.value = false
          error.value     = getGeolocationErrorMessage(permissionState, browserContext, userInitiated)
        } finally {
          loading.value = false
        }
      }
    }
  }

  return { position, loading, error, isFallback, requestLocation }
}

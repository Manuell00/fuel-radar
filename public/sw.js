/**
 * Fuel Radar — Service Worker
 * Strategia stale-while-revalidate per shell e asset statici.
 * Le chiamate MIMIT (dati live) non vengono mai messe in cache.
 */

const CACHE = 'fuel-radar-v1'

self.addEventListener('install', (ev) => {
  ev.waitUntil(
    caches.open(CACHE).then((c) => c.add('/')).catch(() => {})
  )
  self.skipWaiting()
})

self.addEventListener('activate', (ev) => {
  ev.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
    )
  )
  self.clients.claim()
})

self.addEventListener('fetch', (ev) => {
  const { request } = ev
  const url = new URL(request.url)

  // Solo GET e stessa origine (mai intercettare MIMIT o risorse esterne)
  if (request.method !== 'GET' || url.origin !== self.location.origin) return

  // Dati MIMIT: sempre rete (no cache)
  if (url.pathname.startsWith('/mimit/')) return

  ev.respondWith(
    caches.match(request).then((cached) => {
      const networkFetch = fetch(request)
        .then((res) => {
          if (res.ok) {
            const clone = res.clone()
            caches.open(CACHE).then((c) => c.put(request, clone)).catch(() => {})
          }
          return res
        })
        .catch(() => cached)

      // Stale-while-revalidate: risponde subito con cache, aggiorna in background
      return cached || networkFetch
    })
  )
})

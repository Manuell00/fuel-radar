export default async function handler(request, response) {
  response.setHeader('Cache-Control', 'no-store, max-age=0')

  try {
    const upstreamResponse = await fetch('https://ipwho.is/', {
      headers: {
        Accept: 'application/json',
      },
    })

    if (!upstreamResponse.ok) {
      response.status(upstreamResponse.status).json({ success: false, error: 'upstream_http_error' })
      return
    }

    const payload = await upstreamResponse.json()

    if (!payload?.success || typeof payload.latitude !== 'number' || typeof payload.longitude !== 'number') {
      response.status(502).json({ success: false, error: 'upstream_invalid_payload' })
      return
    }

    response.status(200).json({
      success: true,
      lat: payload.latitude,
      lng: payload.longitude,
      city: payload.city ?? null,
      region: payload.region ?? null,
      country: payload.country ?? null,
    })
  } catch {
    response.status(500).json({ success: false, error: 'upstream_unreachable' })
  }
}

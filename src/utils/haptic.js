/**
 * haptic.js
 *
 * Piccola vibrazione per feedback tattile su dispositivi mobili.
 * Safe no-op se l'API non è disponibile (desktop, iOS Safari senza permessi).
 */

function safeVibrate(pattern) {
  if (typeof navigator === 'undefined') return
  if (typeof navigator.vibrate !== 'function') return
  try {
    navigator.vibrate(pattern)
  } catch {
    // silently ignore
  }
}

/** Tap leggero — per selezioni, chip, filtri */
export function hapticLight() {
  safeVibrate(8)
}

/** Tap medio — per toggle preferiti, share, azioni significative */
export function hapticMedium() {
  safeVibrate(16)
}

/** Pattern di conferma — due brevi impulsi */
export function hapticSuccess() {
  safeVibrate([12, 40, 12])
}

import type { StateStorage } from 'zustand/middleware'

/**
 * localStorage, but honest about it.
 *
 * The app has no backend, so this is the only thing standing between a user and
 * losing their work. Three things can go wrong and all three are silent by
 * default: storage disabled (private windows, blocked cookies), quota exhausted,
 * and a write that simply throws. This wrapper records which of those happened
 * so the UI can say so, rather than pretending everything saved.
 */

export type StorageHealth = 'ok' | 'unavailable' | 'full'

export interface StorageState {
  health: StorageHealth
  /** Epoch ms of the last successful write, or null if nothing has saved yet. */
  lastSavedAt: number | null
}

const PROBE_KEY = '__impact_mapping_probe__'

let state: StorageState = { health: 'ok', lastSavedAt: null }
const listeners = new Set<() => void>()

function update(patch: Partial<StorageState>): void {
  const next = { ...state, ...patch }
  if (next.health === state.health && next.lastSavedAt === state.lastSavedAt) return
  state = next
  for (const listener of listeners) listener()
}

export function getStorageState(): StorageState {
  return state
}

export function subscribeToStorage(listener: () => void): () => void {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

let available: boolean | null = null

function backing(): Storage | null {
  if (available === false) return null
  try {
    const store = window.localStorage
    if (available === null) {
      // Reading alone is not proof: some browsers expose localStorage and then
      // throw on write. Probe with an actual round trip.
      store.setItem(PROBE_KEY, '1')
      store.removeItem(PROBE_KEY)
      available = true
    }
    return store
  } catch {
    available = false
    update({ health: 'unavailable' })
    return null
  }
}

function isQuotaError(error: unknown): boolean {
  return (
    error instanceof DOMException &&
    (error.name === 'QuotaExceededError' ||
      error.name === 'NS_ERROR_DOM_QUOTA_REACHED' ||
      error.code === 22)
  )
}

export const localMapStorage: StateStorage = {
  getItem(name) {
    const store = backing()
    if (!store) return null
    try {
      return store.getItem(name)
    } catch {
      update({ health: 'unavailable' })
      return null
    }
  },

  setItem(name, value) {
    const store = backing()
    if (!store) return
    try {
      store.setItem(name, value)
      update({ health: 'ok', lastSavedAt: Date.now() })
    } catch (error) {
      update({ health: isQuotaError(error) ? 'full' : 'unavailable' })
    }
  },

  removeItem(name) {
    const store = backing()
    if (!store) return
    try {
      store.removeItem(name)
    } catch {
      update({ health: 'unavailable' })
    }
  },
}

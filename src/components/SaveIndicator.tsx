import { useEffect, useReducer, useRef, useSyncExternalStore } from 'react'
import type { ReactElement } from 'react'
import {
  getStorageState,
  subscribeToStorage,
  type StorageHealth,
} from '../model/storage.ts'
import { toast } from '../toast.ts'

const WARNING: Record<Exclude<StorageHealth, 'ok'>, string> = {
  unavailable:
    'This browser is not letting the page store anything, so nothing is being saved. Export your map to keep it.',
  full: 'Browser storage is full — recent changes were not saved. Export your map, then delete a map you no longer need.',
}

const TITLE: Record<StorageHealth, string> = {
  ok: 'Maps are stored in this browser only. Export JSON to keep a copy elsewhere.',
  unavailable: WARNING.unavailable,
  full: WARNING.full,
}

function ago(at: number): string {
  const seconds = Math.round((Date.now() - at) / 1000)
  if (seconds < 5) return 'just now'
  if (seconds < 60) return `${seconds}s ago`
  const minutes = Math.round(seconds / 60)
  if (minutes < 60) return `${minutes}m ago`
  return `${Math.round(minutes / 60)}h ago`
}

export function SaveIndicator(): ReactElement {
  const state = useSyncExternalStore(
    subscribeToStorage,
    getStorageState,
    getStorageState,
  )

  // The label is relative time, so it goes stale without a repaint of its own.
  const [, tick] = useReducer((n: number) => n + 1, 0)
  useEffect(() => {
    const id = setInterval(tick, 20_000)
    return () => clearInterval(id)
  }, [])

  const warned = useRef<StorageHealth | null>(null)
  useEffect(() => {
    if (state.health === 'ok' || warned.current === state.health) return
    warned.current = state.health
    toast(WARNING[state.health], 'error')
  }, [state.health])

  const label =
    state.health === 'unavailable'
      ? 'Not saving'
      : state.health === 'full'
        ? 'Storage full'
        : state.lastSavedAt
          ? `Saved ${ago(state.lastSavedAt)}`
          : 'Saves locally'

  return (
    <span className={`save save--${state.health}`} title={TITLE[state.health]}>
      <i aria-hidden="true" />
      {label}
    </span>
  )
}

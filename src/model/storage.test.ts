import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import type { StateStorage } from 'zustand/middleware'
import type { StorageState } from './storage.ts'

/**
 * The interesting cases here are the ones you cannot reproduce by clicking:
 * storage switched off, and storage full. Both are silent in the browser, which
 * is exactly why they are worth pinning down.
 *
 * `storage.ts` caches its availability probe at module scope, so each case
 * imports a fresh copy via a unique query string.
 */

interface StorageModule {
  localMapStorage: StateStorage
  getStorageState: () => StorageState
}

async function loadWith(fakeLocalStorage: unknown, tag: string): Promise<StorageModule> {
  ;(globalThis as Record<string, unknown>).window = { localStorage: fakeLocalStorage }
  return (await import(`./storage.ts?case=${tag}`)) as StorageModule
}

/** A working localStorage. */
function workingStorage(): Storage & { map: Map<string, string> } {
  const map = new Map<string, string>()
  return {
    map,
    get length() {
      return map.size
    },
    key: (i: number) => [...map.keys()][i] ?? null,
    getItem: (k: string) => map.get(k) ?? null,
    setItem: (k: string, v: string) => void map.set(k, v),
    removeItem: (k: string) => void map.delete(k),
    clear: () => map.clear(),
  }
}

function quotaError(): DOMException {
  return new DOMException('exceeded', 'QuotaExceededError')
}

describe('local storage wrapper', () => {
  it('reports a successful write, with a timestamp', async () => {
    const { localMapStorage, getStorageState } = await loadWith(workingStorage(), 'ok')
    assert.equal(getStorageState().lastSavedAt, null)

    localMapStorage.setItem('impact-mapping/v1', '{"maps":{}}')

    const state = getStorageState()
    assert.equal(state.health, 'ok')
    assert.ok(state.lastSavedAt !== null)
    assert.equal(localMapStorage.getItem('impact-mapping/v1'), '{"maps":{}}')
  })

  it('reports storage that is switched off rather than throwing', async () => {
    const blocked = {
      getItem: () => {
        throw new Error('denied')
      },
      setItem: () => {
        throw new Error('denied')
      },
      removeItem: () => {
        throw new Error('denied')
      },
    }
    const { localMapStorage, getStorageState } = await loadWith(blocked, 'blocked')

    assert.equal(localMapStorage.getItem('anything'), null)
    localMapStorage.setItem('anything', 'value')

    assert.equal(getStorageState().health, 'unavailable')
    assert.equal(getStorageState().lastSavedAt, null)
  })

  it('tells a full disk apart from a broken one', async () => {
    const store = workingStorage()
    const full = {
      ...store,
      // The availability probe uses its own key and must still succeed; only the
      // real payload is too big to fit.
      setItem: (k: string) => {
        if (k.includes('probe')) return
        throw quotaError()
      },
    }
    const { localMapStorage, getStorageState } = await loadWith(full, 'full')

    localMapStorage.setItem('impact-mapping/v1', 'x'.repeat(100))

    assert.equal(getStorageState().health, 'full')
    assert.equal(getStorageState().lastSavedAt, null)
  })

  it('notifies subscribers when the health changes', async () => {
    const { localMapStorage, getStorageState, ...rest } = await loadWith(
      workingStorage(),
      'subscribe',
    )
    const { subscribeToStorage } = rest as unknown as {
      subscribeToStorage: (l: () => void) => () => void
    }

    let calls = 0
    const unsubscribe = subscribeToStorage(() => {
      calls += 1
    })

    localMapStorage.setItem('impact-mapping/v1', 'a')
    assert.equal(calls, 1)
    assert.equal(getStorageState().health, 'ok')

    unsubscribe()
    localMapStorage.setItem('impact-mapping/v1', 'b')
    assert.equal(calls, 1, 'unsubscribed listener should stop being called')
  })
})

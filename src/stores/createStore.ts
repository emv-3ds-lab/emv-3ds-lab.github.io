/**
 * Lightweight external store with useSyncExternalStore integration.
 * Same usage shape as Zustand: `const x = useStore(store, selector)`.
 *
 * Why this exists: avoids a new dependency while still breaking the
 * "god-component" anti-pattern. Each store file is a small typed module
 * that owns its slice of state and exposes a `useStore(selector)` hook.
 */

import { useSyncExternalStore } from 'react';

type Listener = () => void;
// Updater returns either a full state object (T) or a partial patch
// (Partial<T>). We accept both because the canonical Zustand pattern
// uses partials (only the changed keys) inside setState((s) => …).
type Updater<T> = (state: T) => T | Partial<T>;

export interface ExternalStore<T> {
  getState: () => T;
  setState: (updater: Partial<T> | Updater<T>) => void;
  subscribe: (listener: Listener) => () => void;
  useStore: <U>(selector: (state: T) => U) => U;
}

export function createExternalStore<T extends object>(initial: T): ExternalStore<T> {
  let state: T = initial;
  const listeners = new Set<Listener>();

  const store: ExternalStore<T> = {
    getState: () => state,
    setState: (updater) => {
      // Canonical Zustand pattern: an updater function returns a
      // partial patch; a plain object is also a partial patch. We
      // shallow-merge either into the current state. The result is
      // type-cast to T because TypeScript can't prove that the patch
      // fills in all required keys — the caller is responsible for
      // preserving invariants (see flowStore's `rebuild` helper).
      const result = typeof updater === 'function'
        ? (updater as Updater<T>)(state)
        : updater;
      const next = { ...state, ...result } as T;
      if (Object.is(next, state)) return;
      state = next;
      listeners.forEach((l) => l());
    },
    subscribe: (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    useStore: (selector) => {
      const subscribe = (listener: Listener) => store.subscribe(listener);
      const getSnapshot = () => selector(state);
      // useSyncExternalStore requires a stable getSnapshot for primitive returns;
      // we rely on Object.is to bail out when selectors return the same ref.
      return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
    },
  };

  return store;
}

/** Stable identity helper to use as default selector. */
export const identity = <T>(x: T): T => x;

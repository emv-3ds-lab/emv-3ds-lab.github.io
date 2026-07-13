/**
 * Lightweight hash-based router for the SPA. The lab is a Vite
 * single-page app, so the only way to get multiple *indexable* URLs
 * out of it is via hash routes. Each route maps to a top-level page
 * component; the default route is the interactive lab canvas.
 *
 * The router is intentionally tiny — no nested routes, no params, no
 * history API. It only needs to flip between the lab and the five
 * research landing pages that drive public visibility.
 */

import { useEffect, useState } from 'react';

export type RouteId =
  | 'lab'
  | 'versions'
  | 'fields'
  | 'flows'
  | 'pitfalls'
  | 'cite';

export const ROUTES: { id: RouteId; hash: string; path: string }[] = [
  { id: 'lab', hash: '', path: '/' },
  { id: 'versions', hash: '#/versions', path: '/versions' },
  { id: 'fields', hash: '#/fields', path: '/fields' },
  { id: 'flows', hash: '#/flows', path: '/flows' },
  { id: 'pitfalls', hash: '#/pitfalls', path: '/pitfalls' },
  { id: 'cite', hash: '#/cite', path: '/cite' },
];

export const DEFAULT_ROUTE: RouteId = 'lab';

/**
 * Map a window.location.hash string to a route id. Unknown hashes
 * fall back to the default lab route.
 */
export function hashToRouteId(hash: string): RouteId {
  const normalized = hash.replace(/^#/, '').toLowerCase();
  for (const r of ROUTES) {
    if (r.hash.replace(/^#/, '').toLowerCase() === normalized) return r.id;
  }
  return DEFAULT_ROUTE;
}

/**
 * Map a route id back to a hash string suitable for window.location.
 */
export function routeIdToHash(id: RouteId): string {
  return ROUTES.find((r) => r.id === id)?.hash ?? '';
}

/**
 * React hook that subscribes to hash changes and returns the current
 * route id. Updates state on `hashchange` events.
 */
export function useHashRoute(): RouteId {
  const [route, setRoute] = useState<RouteId>(() => hashToRouteId(window.location.hash));

  useEffect(() => {
    const onChange = () => setRoute(hashToRouteId(window.location.hash));
    window.addEventListener('hashchange', onChange);
    return () => window.removeEventListener('hashchange', onChange);
  }, []);

  return route;
}

/**
 * Navigate to a route by setting the hash. The `hashchange` listener
 * installed by `useHashRoute` will pick this up and re-render.
 */
export function navigateToRoute(id: RouteId): void {
  const target = routeIdToHash(id);
  if (target) {
    window.location.hash = target;
  } else {
    // Empty hash lands on the lab.
    if (window.location.hash) {
      // Use replaceState to avoid leaving a junk entry in history.
      const url = window.location.pathname + window.location.search;
      window.history.replaceState(null, '', url);
    }
    // Fire a synthetic hashchange so subscribers re-read the route.
    window.dispatchEvent(new HashChangeEvent('hashchange'));
  }
}

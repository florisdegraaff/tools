# Platform: web first, PWA optional, Capacitor possible later

## Status

Accepted.

## Context

We want a personal life tool available on **desktop and mobile** without maintaining separate native codebases from day one. We are standardizing on **Next.js** for the product surface.

## Decision

1. **Ship as a Next.js website** with a **responsive** UI so phone browsers are a primary experience, not an afterthought.
2. **PWA** (manifest, service worker as needed) is in scope when we want “add to home screen” or light offline—not a second app stack.
3. **Capacitor** (or similar WebView wrapper) remains a **possible later step** for app-store distribution, reusing the same deployed experience. We do not block that path with web-only assumptions in auth or routing where we can avoid it.

## Consequences

- Prefer **URL-based** navigation and **API-first** boundaries so a future shell can load the same origin.
- **Auth and cookies:** be explicit about what works in a browser vs. what would need adjustment inside a WebView or hybrid shell if we add Capacitor later.
- Avoid depending on features that only exist in native apps unless we have a clear web fallback.

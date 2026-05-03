# Project context

## What we are building

A **personal life tool**: a single product made of **separate modules**, each focused on one job. The goal is practical day-to-day support (capture, organize, interpret, plan) without turning into a generic “do everything” platform.

## Product shape

- **Modular**: features are grouped into modules with clear boundaries and responsibilities.
- **Personal**: scoped for individual use; no assumption of team or enterprise workflows unless we add them later.
- **Composable**: modules can share patterns (UI, auth, storage) but stay understandable on their own.

## Modules (examples and direction)

These are **examples** of the kind of modules we want—not an exhaustive or final list:

| Module | Role |
|--------|------|
| **LLM interpreter** | Use an LLM as a helper for specific tasks (e.g. rephrase, summarize, extract actions) in a controlled, repeatable way. |
| **Notes** | Free-form capture and retrieval of thoughts and reference material. |
| **Lists** | Structured items (tasks, shopping, packing, etc.) with simple workflows. |

Additional modules may appear over time; each should own its domain and stay easy to reason about.

## Platform and delivery

- **Primary:** ship as a **website** built with **Next.js**: responsive layout so it works well on phones and desktops from one codebase and deployment.
- **Mobile-in-browser:** treat mobile Safari/Chrome as first-class; optimize touch targets, navigation, and performance for small screens.
- **Progressive Web App (PWA):** adopt PWA pieces (e.g. web app manifest, service worker where useful) when we want installability or modest offline behavior—still the same Next.js app.
- **Later extension:** we may add a **store app** by wrapping the same web experience with **Capacitor** (WebView shell around our deployed URL or a compatible build). Design APIs, auth, and URLs so that step stays optional and does not require a rewrite.

See `.cursor/decisions/` for the recorded decision and any follow-ups.

## How to use this file

Treat this document as the **north star** for product intent and architecture tone. When design or implementation choices conflict with it, update this file deliberately rather than drifting.

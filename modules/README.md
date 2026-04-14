# Modules Directory

This folder contains all project modules.

## Rule

Each module must have its own folder:

- `modules/<module-name>/`

## Responsibility

- Place business logic inside module folders.
- In `apps/web`, import modules and compose them into pages/routes.
- Avoid implementing core module logic directly in `apps/web` unless it is app-shell-only glue code.

## Suggested Module Shape

```text
modules/
  <module-name>/
    README.md
    src/
      index.ts
```

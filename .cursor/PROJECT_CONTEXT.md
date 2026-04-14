# Project Context

This is a personal-use project made up of practical tools that support daily life.

## Project Structure

- Each tool is implemented as its own module.
- Modules are documented in `.cursor/modules`.
- Source modules live under the root `modules/` folder.
- Each module description should explain:
  - Purpose
  - Main features
  - Inputs/outputs
  - Any dependencies or setup notes

## Code Conventions

- Frontend uses Material UI (MUI) components.
- Visual overrides are done through SCSS classes.
- Prisma is used for the database layer.
- `apps/web` composes modules, while module logic lives in `modules/`.

## Working Principle

Build modules to be focused and independent where possible, so tools can evolve without tightly coupling unrelated functionality.

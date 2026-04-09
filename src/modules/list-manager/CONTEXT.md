# List Manager Context

## Problem

Users need a flexible way to build lists quickly:

- by adding individual items one by one
- by applying presets that generate multiple related items

## Primary Scenarios

### Grocery list presets

- A user chooses a dish preset.
- The app expands the preset into ingredient items.
- Example preset: `Spaghetti Night`
  - spaghetti noodles
  - sauce
  - vegetables

### Vacation planning presets

- A user chooses a trip preset.
- The app expands it into day-based activities.
- Example preset:
  - 5 days hiking
  - 3 days skiing
  - 6 days vacation

## Domain Objects (Initial)

- `List`: container for user-managed entries
- `ListItem`: individual entry in a list
- `Preset`: reusable template with one or more template items
- `PresetItem`: item definition used to generate `ListItem` records

## Behavior Expectations

- Users can always add custom items manually.
- Presets should be optional accelerators, not required workflow.
- Generated items must be editable and removable like manual items.
- Preset expansion should not overwrite existing items automatically.

## Non-Goals (For First Pass)

- Multi-user collaboration
- Sync conflict resolution
- Advanced recommendation logic for presets

# Claude Code Rules for This Project

## Status Verification (MANDATORY)

Before claiming any feature is "not implemented" or making status/priority recommendations:

1. **SEARCH** the codebase for related files (Glob/Grep)
2. **READ** the relevant files to understand what exists
3. **CROSS-REFERENCE** with `docs/PROGRESS.md`
4. **CITE EVIDENCE** - make claims with file:line references

**Never rely on:**
- Conversation summaries alone
- Planning documents (PLAN.md describes intent, not reality)
- Memory of what was "just implemented"

**For comprehensive status reviews:** Use the Explore agent to thoroughly search before making any claims.

## Progress Tracking

After completing any feature:
1. Update `docs/PROGRESS.md` with the file:line reference
2. Mark the checkbox as complete

Before starting work on a "missing" feature:
1. Check `docs/PROGRESS.md` first
2. Search the codebase to verify it's actually missing
3. Only then proceed

## Code Quality Rules

(From PLAN.md - repeated here for visibility)

- **Max 400 lines per file** - Split if larger
- **Components are interfaces** - No methods, no classes
- **Systems are pure functions** - `(world: World, dt: number) => void`
- **No `Math.random()`** - Use seeded PRNG
- **No `Date.now()` in game logic** - Fixed timestep only

## Formatting Rules (MANDATORY)

This project uses Biome for formatting and linting. A pre-commit hook enforces these rules.

**Never compress code to fit line limits.** If a file approaches 400 lines:
1. Split the file into logical modules
2. Do NOT put multiple statements on one line
3. Do NOT remove blank lines or compress formatting
4. Do NOT remove comments or documentation to reduce line count

**STOP SIGNAL:** If a pre-commit hook fails due to file size, or if you are about to edit code solely to reduce line count, STOP. The only correct response is to split into modules. Re-read this section before proceeding.

**Wrong responses to "file too long":**
- Merging comment lines or shortening documentation
- Removing console.log/output statements
- Removing blank lines between functions
- Removing tests or functionality
- Any edit whose primary purpose is "make file shorter"

**Correct response:**
- Identify logically separable code (utilities, constants, types, sub-tests)
- Create new module file(s) for that code
- Import from the new module(s)

**Correct formatting:**
```typescript
if (condition) {
  doSomething();
  doSomethingElse();
}
```

**Wrong (compressed):**
```typescript
if (condition) { doSomething(); doSomethingElse(); }
```

**Commands:**
- `npm run format` - Auto-format code
- `npm run lint` - Check for lint errors
- `npm run lint:fix` - Fix lint errors
- `npm run check-size` - Verify file size limits

**Before committing:** Run `npm run lint` to ensure code passes checks.

## UI Screen Pattern (MANDATORY)

All UI screens must use the Screen framework in `src/ui/framework/screen.ts`. This provides:
- Automatic event delegation (one listener per event type)
- Automatic cleanup on re-render and destroy
- Type-safe state management with `setState()`

### Creating a Screen

```typescript
import { createScreen, type Screen, type ScreenAPI, type ScreenHandle } from '../framework/screen';

interface MyState {
  selectedItem: string | null;
}

interface MyProps {
  data: SomeData;
  onAction: () => void;
}

const MyScreenComponent: Screen<MyState, MyProps> = {
  render(state, props) {
    return `<div>...</div>`;  // HTML string
  },

  bind(api: ScreenAPI<MyState>, props: MyProps) {
    api.on('#btn-action', 'click', () => {
      props.onAction();
    });

    api.on('.item', 'click', (_e, el) => {
      api.setState({ selectedItem: el.dataset.id ?? null });
    });
  },
};

// Create the screen
const handle = createScreen(MyScreenComponent, element, initialState, props);
```

### Event Binding Methods

- `api.on(selector, event, handler)` - Event delegation (matches via closest())
- `api.onRoot(event, handler)` - Direct listener on root element
- `api.onGlobal(event, handler)` - Listener on document (auto-removed on destroy)

### State Updates

- `api.setState(partial)` - Merge partial state, triggers re-render
- `api.getState()` - Get current state

### Screen Handle

The `createScreen()` function returns a handle for external control:
- `handle.setState(partial)` - Update state from outside
- `handle.replaceState(newState)` - Replace entire state
- `handle.setProps(newProps)` - Update props and re-render
- `handle.destroy()` - Cleanup all listeners

### Modal Pattern

For modal dialogs, use `showModal()`:

```typescript
import { showModal, type ModalProps } from '../framework/screen';

interface MyModalProps extends ModalProps<ResultType> {
  // Additional props
}

const result = await showModal(MyModalScreen, initialState, props);
```

Call `props.onClose(result)` to resolve the promise and close the modal.

### Legacy UI Interface

When migrating screens, preserve the existing public interface by returning a legacy UI object:

```typescript
export function createMyUI(...): MyUI {
  screenHandle = createScreen(...);

  return {
    element,
    // ... other legacy properties
  };
}
```

### Key Rules

1. **Never use raw `addEventListener`** - Use `api.on()`, `api.onRoot()`, or `api.onGlobal()`
2. **Always clean up handles** - Call `screenHandle?.destroy()` before creating new ones
3. **Keep render pure** - No side effects in `render()`, only return HTML string
4. **Bind after render** - `bind()` is called after every `render()`, handlers are auto-cleared

## Weapon Icon System

Weapon, missile, and ship icons use inline SVGs for CSS styling. Use the render functions in `src/ui/utils/weapon-icon.ts`.

### Why Inline SVGs?

SVGs loaded via `<img>` tags are treated as external images - CSS cannot reach inside them. To style `currentColor` elements via CSS, the SVG must be inline in the DOM.

### File Locations

- **Source SVGs**: `src/assets/icons/{weapons,missiles,ships}/*.svg`
- **Render API**: `src/ui/utils/weapon-icon.ts` (primary interface)
- **SVG Loader**: `src/ui/utils/inline-svg.ts` (low-level loader)
- **Icon Styles**: `src/ui/styles/weapon-icons.css`
- **Type declarations**: `src/vite-env.d.ts`

### Usage

```typescript
import { renderWeaponIcon, renderMissileIcon } from '../../utils/weapon-icon';

// Primary weapons
renderWeaponIcon('redlaser', { size: 'lg', color: 'var(--color-primary)' })
renderWeaponIcon('autocannon', { size: 'sm', className: 'picker-icon' })

// Missiles
renderMissileIcon('hornet', { size: 'md', color: 'var(--color-danger)' })

// Size presets: 'xs' | 'sm' | 'md' | 'lg' | 'xl'
```

### Dual Coloring (Laser Weapons)

Laser weapons have two color zones with separate glow effects:

1. **Fixed color beam** (e.g., `#f00` for red laser) - defined in SVG with internal `<filter>` for glow
2. **currentColor body** - controlled via CSS `color` property, uses CSS drop-shadow

The `renderWeaponIcon()` function automatically detects lasers and applies the `has-svg-glow` class to disable CSS drop-shadow (preventing double glow).

### SVG Filter ID Convention

Beam weapons with internal filters for glow effects. Filter IDs must be unique per weapon to avoid collision when multiple icons are on the same page:

- `rl-beam`, `rl-body` - Red laser
- `bl-beam`, `bl-body` - Blue laser
- `gl-beam`, `gl-body` - Green laser
- `nl-beam`, `nl-body` - Nuclear lance

### Adding New Icons

1. Add the SVG file to `src/assets/icons/{category}/`
2. Use `currentColor` for elements that should be CSS-styled
3. Use fixed colors for elements that should stay constant
4. If adding internal filters, use a unique prefix (e.g., `xx-beam`, `xx-body`)
5. The loader will automatically pick it up via Vite's glob imports
6. For weapons with internal glow, add to `WEAPONS_WITH_SVG_GLOW` in `weapon-icon.ts`

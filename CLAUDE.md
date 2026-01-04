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

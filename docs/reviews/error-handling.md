# Error Handling and Edge Case Review

**Review Date:** 2026-01-16
**Reviewer:** Automated Code Analysis
**Scope:** Comprehensive review of error handling patterns across the codebase

## Executive Summary

The Spaceflight codebase demonstrates **generally solid error handling practices** with several commendable patterns:
- Comprehensive validation for external data (replays, campaigns)
- Proper HTML escaping for XSS prevention
- Null coalescing operators (`??`) used consistently for array access
- Strong try-catch coverage for storage operations

However, there are **areas requiring attention**:
- Unsafe type assertions after DOM queries (querySelector)
- Inconsistent HTML escaping in UI templates
- Some find() results used without null checks
- Type assertions (`as`) used without runtime validation in some cases

**Overall Risk Assessment:** LOW-MEDIUM
Most issues are edge cases unlikely to cause crashes in normal operation, but could cause problems with corrupted data or DOM manipulation errors.

---

## 1. Async Error Handling

### Assessment: GOOD

**Positive Patterns Found:**

1. **IndexedDB Operations** - All database operations properly reject with errors:
   - `src/replay/storage.ts:69-72` - `request.onerror = () => reject(request.error)`
   - `src/campaign/storage/campaign-db.ts:162-164` - Transaction error handling
   - `src/campaign/storage/db-connection.ts:90-97` - Connection error handling with timeout

2. **Async/Await with Try-Catch** - Storage modules wrap operations:
   ```typescript
   // src/campaign/storage/campaign-autosave.ts:56-66
   try {
     const slotId = getActiveSlotId();
     if (!slotId) { /* handle */ }
     await saveCampaign(state, slotId);
   } catch (error) {
     logError(`Auto-save failed (${reason}):`, error);
   }
   ```

3. **Graceful Fallbacks** - Import/export operations return result objects:
   ```typescript
   // src/campaign/storage/campaign-export.ts:139-144
   } catch (error) {
     const message = error instanceof Error ? error.message : 'Unknown error';
     return { success: false, error: message };
   }
   ```

**No Issues Found:**
- No empty `.catch()` handlers
- No swallowed exceptions in critical paths
- Promise rejections properly propagate or are handled

---

## 2. Null/Undefined Checks

### Assessment: MEDIUM CONCERN

**Safe Patterns (Majority of Code):**

The codebase generally returns early when `find()` returns undefined:

```typescript
// src/campaign/loadout.ts:33-36
const ship = state.ships.find((s) => s.id === shipId);
if (!ship || slotIndex < 0 || slotIndex >= ship.primaryWeapons.slotCount) {
  return state;
}
```

```typescript
// src/campaign/pilot-assignment.ts:107-110
const pilot = state.pilots.find((p) => p.id === pilotId);
const ship = state.ships.find((s) => s.id === shipId);
if (!pilot || !ship) {
  return state;
}
```

**Potential Issues:**

| Location | Issue | Risk |
|----------|-------|------|
| `src/campaign/pilot-assignment.ts:146` | `targetShip.pilot !== null` check may fail if pilot is `undefined` | LOW - defensive check exists |
| `src/ui/screens/squadron/index.ts:85-95` | Multiple find operations without combined null check before use | LOW - separate conditional rendering |
| `src/campaign/salvage.ts:88,111` | Find results used in conditionals, OK | NONE |

**Files with Most find() Calls:**
- `src/campaign/loadout.ts` - 4 calls, all properly guarded
- `src/campaign/pilot-assignment.ts` - 10 calls, all properly guarded
- `src/ui/screens/popover/weapon.ts` - 3 calls, all properly guarded

---

## 3. Type Assertions (as casts)

### Assessment: MEDIUM CONCERN

**Safe Assertions (with validation):**

1. **External Data Validation** - Proper validation before casting:
   ```typescript
   // src/replay/storage-validation.ts:78
   const metadata = replay.metadata as Record<string, unknown>;
   // Followed by explicit type checks on each property
   ```

2. **DOM Elements with Type Safety:**
   ```typescript
   // src/ui/framework/screen.ts:104
   const target = e.target as HTMLElement | null;
   if (!target) return;
   ```

3. **Pool Objects (Controlled Usage):**
   ```typescript
   // src/systems/targeting.ts:42
   const info = targetCollectorPool[poolIndex] as TargetCollectorInfo;
   // Pool is always expanded before access
   ```

**Unsafe Assertions (Potential Runtime Errors):**

| Location | Code | Risk |
|----------|------|------|
| `src/rendering/hud/hud.ts:195-221` | `container.querySelector('.speed-fill') as HTMLElement` | MEDIUM - No null check after query |
| `src/rendering/hud/allied-hud.ts:57-64` | Multiple `querySelector` casts without null checks | MEDIUM |
| `src/rendering/hud/target-stats.ts:74-91` | Multiple `querySelector` casts without null checks | MEDIUM |
| `src/replay/gzip.ts:128` | `JSON.parse(json) as T` without validation | LOW - Wrapper function |
| `src/input/input-recorder.ts:223` | `JSON.parse(json) as ReplayData` without validation | LOW - Version check follows |

**Detailed HUD Issue:**
```typescript
// src/rendering/hud/hud.ts:195-221
return {
  speedFill: container.querySelector('.speed-fill') as HTMLElement,  // Could be null!
  afterburnerFill: container.querySelector('.afterburner-fill') as HTMLElement,
  // ... 15 more similar lines
};
```
If CSS class names change, these will become null at runtime but TypeScript won't catch it.

**Recommendation:** Add assertions or null checks:
```typescript
const speedFill = container.querySelector('.speed-fill');
if (!speedFill) throw new Error('HUD element .speed-fill not found');
```

---

## 4. External Data Validation

### Assessment: GOOD

**IndexedDB Data Validation:**

1. **Campaign Storage** - Comprehensive validation:
   ```typescript
   // src/campaign/storage/campaign-db.ts:190-196
   if (stored.version !== CAMPAIGN_STORAGE_VERSION) {
     logError(`Campaign version ${stored.version} not supported`);
     return null;
   }
   ```

2. **Replay Validation** - Full structure validation in dedicated module:
   - `src/replay/storage-validation.ts` - 262 lines of validation
   - Validates version, core fields, metadata, stats, loadouts, wingmen
   - Throws descriptive errors for each field

**localStorage Data Validation:**

1. **Game Settings** - Validates each field:
   ```typescript
   // src/settings/game-settings.ts:149-177
   const parsed: unknown = JSON.parse(json);
   if (!parsed || typeof parsed !== 'object') {
     logWarn('Invalid game settings format');
     return null;
   }
   // Individual field validation follows
   ```

2. **Key Bindings** - Validates action names:
   ```typescript
   // src/input/key-bindings.ts:200-212
   const parsed: unknown = JSON.parse(json);
   const obj = parsed as Record<string, unknown>;
   for (const [key, value] of Object.entries(obj)) {
     if (isValidAction(key) && typeof value === 'string') {
       validBindings[action as GameAction] = value;
     }
   }
   ```

3. **Emergency Save Recovery** - Multi-layer validation:
   ```typescript
   // src/campaign/storage/campaign-autosave.ts:148-179
   // Validates: structure, version, state object, required properties
   ```

**No Major Issues Found** - External data is well-validated before use.

---

## 5. Array Bounds Access

### Assessment: GOOD

**Safe Patterns Used:**

1. **Null Coalescing for Array Access:**
   ```typescript
   // src/input/input-recorder.ts:174,184,193
   return this.inputs[tick] ?? 0;
   ```

2. **Bounds Checking Before Access:**
   ```typescript
   // src/input/input-recorder.ts:170-174
   if (tick < 0 || tick >= this.tickCount) {
     return decodeInput(0);
   }
   return decodeInput(this.inputs[tick] ?? 0);
   ```

3. **Optional Chaining for Potentially Missing Elements:**
   ```typescript
   // src/rendering/reticle/reticle-helpers.ts:97-104
   boxCorners[0]?.set(min.x, min.y, min.z);
   boxCorners[1]?.set(min.x, min.y, max.z);
   // etc.
   ```

4. **First Element Access with Fallback:**
   ```typescript
   // src/replay/compression.ts:41,45,134
   let currentValue = inputs[0] ?? 0;
   ```

5. **Explicit Length Checks:**
   ```typescript
   // src/replay/gzip.ts:26
   data.length >= 2 && data[0] === GZIP_MAGIC_0 && data[1] === GZIP_MAGIC_1
   ```

**Minor Concerns:**

| Location | Pattern | Risk |
|----------|---------|------|
| `src/campaign/mission/mission-waves.ts:202` | `const firstWave = waves[0]` | LOW - Array built from non-empty source |
| `src/ui/screens/replay/replay-camera.ts:167` | `state.entityList[0] ?? null` | NONE - Proper fallback |

---

## 6. User Input Sanitization

### Assessment: GOOD (with minor gaps)

**XSS Prevention - escapeHtml Function:**

```typescript
// src/ui/utils.ts:14-24
export function escapeHtml(text: string): string {
  const htmlEntities: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  };
  return text.replace(/[&<>"']/g, (char) => htmlEntities[char] ?? char);
}
```

**Properly Escaped Locations:**

| File | Usage |
|------|-------|
| `src/ui/common/notification.ts:58` | `escapeHtml(message)` |
| `src/ui/screens/load-campaign-render.ts:62` | `escapeHtml(commanderName)` |
| `src/ui/screens/alert-modal.ts:33-37` | `escapeHtml(state.title)`, `escapeHtml(state.message)` |
| `src/ui/screens/campaign-create.ts:92` | `escapeHtml(state.commanderName)` |
| `src/ui/screens/replay/replay-list-render.ts:110,112` | `escapeHtml(replay.id)`, `escapeHtml(replay.missionName)` |
| `src/ui/screens/replay/replay-detail-tabs.ts:89` | `escapeHtml(pilotName)` |

**Potentially Unescaped User-Controlled Data:**

| Location | Data | Risk |
|----------|------|------|
| `src/ui/screens/squadron/list.ts:71,78` | `pilot.name` in aria-label and display | LOW - Names from game data |
| `src/ui/screens/squadron/list.ts:103,107` | `recruit.name` in aria-label and display | LOW - Names from game data |
| `src/ui/common/ship-item.ts:129` | `pilot.name` | LOW - Names from game data |
| `src/ui/screens/roster/pilot-viewer.ts:128` | `pilot.name` | LOW - Names from game data |

**Risk Assessment:** LOW - All unescaped values are from internal game state (pilot names, ship classes, etc.), not direct user input. The only true user input (commander name) is properly escaped.

**Note:** While current risk is low, escaping all dynamic text would provide defense-in-depth against future features that might accept user text.

---

## 7. Additional Findings

### DOM Query Patterns

**Pattern Found in HUD Components:**
```typescript
// Multiple files use this pattern without null checks
container.querySelector('.some-class') as HTMLElement
```

Files affected:
- `src/rendering/hud/hud.ts` (15+ instances)
- `src/rendering/hud/allied-hud.ts` (4 instances)
- `src/rendering/hud/target-stats.ts` (10 instances)

### ECS Type Safety

The ECS system uses type assertions that are safe due to query guarantees:
```typescript
// src/core/ecs.ts:187
const components = world.components.get(entity) as ComponentMap;
// Safe: hasComponents() check guarantees entity exists
```

### AI Target Assertions

```typescript
// src/systems/ai/ai-pursuit.ts:55,77,127,142
ai.target as Entity
```
These are documented as "caller checks ai.target before calling" but could benefit from runtime assertions.

---

## Recommendations

### High Priority

1. **Add Null Checks for HUD DOM Queries**
   - Files: `hud.ts`, `allied-hud.ts`, `target-stats.ts`
   - Risk: Runtime errors if CSS class names change
   - Fix: Add runtime assertions or optional chaining

### Medium Priority

2. **Escape All Dynamic Text in Templates**
   - Files: `squadron/list.ts`, `ship-item.ts`, `roster/*.ts`
   - Risk: Low (internal data), but good defense-in-depth
   - Fix: Apply `escapeHtml()` to all dynamic text

3. **Add Runtime Validation for JSON Parse**
   - Files: `replay/gzip.ts:128`, `input-recorder.ts:223`
   - Risk: Corrupted data could cause type errors
   - Fix: Add validation after JSON.parse before casting

### Low Priority

4. **Add Assertions for AI Target Access**
   - File: `systems/ai/ai-pursuit.ts`
   - Risk: Very low (callers check target)
   - Fix: Add defensive null check in function

5. **Document Type Assertion Safety**
   - Various files
   - Risk: Future developers may not understand safety guarantees
   - Fix: Add comments explaining why assertions are safe

---

## Conclusion

The Spaceflight codebase demonstrates mature error handling practices, particularly around external data validation and storage operations. The main areas for improvement are:

1. **DOM query type safety** - Most significant practical risk
2. **Consistent HTML escaping** - Good defense-in-depth
3. **Runtime type validation** - Minor edge case protection

None of the issues identified are likely to cause problems during normal gameplay, but addressing them would improve robustness against corrupted data, unexpected DOM states, and future code changes.

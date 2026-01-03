# Simulation Tests

Headless simulations that test game mechanics without rendering. These validate that systems work correctly across many scenarios.

## Running Simulations

```bash
npm run sim          # Run all simulations
npm run sim:dust     # Run only dust particle tests
npm run sim:ai       # Run only AI behavior tests
```

## Available Simulations

### dust.mjs - Dust Particle System

Tests the tiled cube dust particle system for uniform density and determinism.

**Flight Scenarios:**
- Straight flight at max speed
- 180° turn (fly forward, reverse direction)
- 90° turn (fly forward, turn up)
- Spiral (continuous turning)
- Stationary (no movement)
- Random direction changes

**Pass criteria:** <20% variance in visible particles, minimum 100 particles visible at all times.

**Determinism Tests:**
- Same position always returns same particles
- Returning to origin shows same particles
- Cube boundaries have >90% particle overlap
- Works at extreme distances (1M+ units)
- Works with negative coordinates

### ai-tests.mjs - AI Behavior System

Tests the AI state machine, weapon firing, constraints, and movement.

**Files:** Split into modules for maintainability (<150 lines each):
- `ai-tests.mjs` - Main test runner
- `ai-test-utils.mjs` - Shared test infrastructure
- `ai-state-tests.mjs` - State transition tests
- `ai-combat-tests.mjs` - Combat, movement, determinism tests

**State Transition Tests (9 tests):**
- Idle → Pursue when enemy detected
- Pursue → Engage at close range (≤600 units)
- Engage → Pursue when target far (>1200 units)
- Engage → Evade when shields <20%
- Engage → Regroup when shields <10% or heat >90%
- Evade → Pursue after 5s cooldown + shield recovery
- Regroup → Pursue after 3s + recovery
- AI does not acquire dying entities as new targets

**Weapon Firing Tests (3 tests):**
- AI fires primary weapons only in Engage state
- AI does not fire in Pursue state
- AI does not fire in Evade state

**Constraint Tests (2 tests):**
- Max 3 AI can engage player simultaneously
- Overflow AI remain in Pursue state

**Movement Tests (3 tests):**
- AI in Pursue moves toward target
- AI in Evade moves away from target
- AI accelerates to max speed

**Determinism Tests (1 test):**
- Same seed produces identical AI behavior

### Future Simulations

As the project grows, add simulations for:

- **combat.mjs** - Weapon balance, damage calculations, heat management
- **economy.mjs** - Campaign progression, salvage rates, credit curves

## Writing New Simulations

1. Create `scripts/simulation/yourtest.mjs`
2. Export nothing (script runs on execution)
3. Use `process.exit(0)` for pass, `process.exit(1)` for fail
4. Support `--quiet` flag for CI (just exit code, no output)
5. Add to `SIMULATIONS` array in `run-all.mjs`
6. Add npm script: `"sim:yourtest": "node scripts/simulation/yourtest.mjs"`

## Configuration Sync

Simulations must match game constants. When updating values in `src/`, update the corresponding simulation:

| Game File | Simulation |
|-----------|------------|
| `src/rendering/dust.ts` | `dust.mjs` |
| `src/systems/ai.ts` | `ai-tests.mjs` |
| `src/systems/ai-behaviors.ts` | `ai-tests.mjs` |
| `src/systems/weapons.ts` | `ai-tests.mjs` |
| `src/components/health.ts` | `ai-tests.mjs` |

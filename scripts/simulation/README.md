# Simulation Tests

Headless simulations that test game mechanics without rendering. These validate that systems work correctly across many scenarios.

## Running Simulations

```bash
npm run sim          # Run all simulations
npm run sim:dust     # Run only dust particle tests
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

### Future Simulations

As the project grows, add simulations for:

- **combat.mjs** - Weapon balance, damage calculations, heat management
- **economy.mjs** - Campaign progression, salvage rates, credit curves
- **ai.mjs** - AI state transitions, aim error distribution, target selection

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

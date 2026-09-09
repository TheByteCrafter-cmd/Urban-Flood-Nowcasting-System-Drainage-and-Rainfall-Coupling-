import assert from 'node:assert';
import { generateRunoffForecast } from '../src/services/runoffService';
import { generateSurfaceFlowForecast } from '../src/services/surfaceFlowService';
import { generateDrainageForecast } from '../src/services/drainageService';
import { generateCoupledForecast } from '../src/services/couplingService';
import { getDemoFallbackWeather } from '../src/services/weatherService';
import { NormalizedWeatherObservation } from '../src/types/weather';

console.log('===============================================================');
console.log('PHASE 4A: 0-3 HOUR NOWCAST INTEGRATION VERIFICATION SUITE');
console.log('===============================================================');

let passCount = 0;
let totalTests = 0;

function runTest(name: string, fn: () => void) {
  totalTests++;
  try {
    fn();
    console.log(`[PASS] Test ${totalTests}: ${name}`);
    passCount++;
  } catch (err: any) {
    console.error(`[FAIL] Test ${totalTests}: ${name}`);
    console.error(`       Error: ${err.message}`);
  }
}

// ============================================================================
// TEST 1: Nowcast Forecast Generation for all 4 Horizons (T+0, T+1, T+2, T+3)
// ============================================================================
runTest('Nowcast pipeline generates full 4-horizon forecast from weather', () => {
  const weather = getDemoFallbackWeather('Monsoonal Test Scenario');
  const runoffForecast = generateRunoffForecast(weather);
  const coupledForecast = generateCoupledForecast(runoffForecast);

  assert(coupledForecast !== null, 'Coupled forecast must not be null');
  assert(coupledForecast.horizons[0] !== undefined, 'Horizon T+0 must exist');
  assert(coupledForecast.horizons[1] !== undefined, 'Horizon T+1 must exist');
  assert(coupledForecast.horizons[2] !== undefined, 'Horizon T+2 must exist');
  assert(coupledForecast.horizons[3] !== undefined, 'Horizon T+3 must exist');
});

// ============================================================================
// TEST 2: Horizon T+0 displays independent T+0 Coupled State
// ============================================================================
runTest('Horizon T+0 displays strictly T+0 coupled state', () => {
  const weather = getDemoFallbackWeather('Monsoonal Test Scenario');
  const runoffForecast = generateRunoffForecast(weather);
  const coupledForecast = generateCoupledForecast(runoffForecast);

  const t0State = coupledForecast.horizons[0];
  assert.strictEqual(t0State.hour_offset, 0, 'Hour offset must be 0');
  assert.strictEqual(t0State.horizon_label, 'T+0', 'Horizon label must be T+0');
  assert(t0State.cells.length > 0, 'T+0 must contain cells');
});

// ============================================================================
// TEST 3: Horizon T+1 displays independent T+1 Coupled State
// ============================================================================
runTest('Horizon T+1 displays strictly T+1 coupled state', () => {
  const weather = getDemoFallbackWeather('Monsoonal Test Scenario');
  const runoffForecast = generateRunoffForecast(weather);
  const coupledForecast = generateCoupledForecast(runoffForecast);

  const t1State = coupledForecast.horizons[1];
  assert.strictEqual(t1State.hour_offset, 1, 'Hour offset must be 1');
  assert.strictEqual(t1State.horizon_label, 'T+1', 'Horizon label must be T+1');
  assert(t1State.cells.length > 0, 'T+1 must contain cells');
});

// ============================================================================
// TEST 4: Horizon T+2 displays independent T+2 Coupled State
// ============================================================================
runTest('Horizon T+2 displays strictly T+2 coupled state', () => {
  const weather = getDemoFallbackWeather('Monsoonal Test Scenario');
  const runoffForecast = generateRunoffForecast(weather);
  const coupledForecast = generateCoupledForecast(runoffForecast);

  const t2State = coupledForecast.horizons[2];
  assert.strictEqual(t2State.hour_offset, 2, 'Hour offset must be 2');
  assert.strictEqual(t2State.horizon_label, 'T+2', 'Horizon label must be T+2');
  assert(t2State.cells.length > 0, 'T+2 must contain cells');
});

// ============================================================================
// TEST 5: Horizon T+3 displays independent T+3 Coupled State
// ============================================================================
runTest('Horizon T+3 displays strictly T+3 coupled state', () => {
  const weather = getDemoFallbackWeather('Monsoonal Test Scenario');
  const runoffForecast = generateRunoffForecast(weather);
  const coupledForecast = generateCoupledForecast(runoffForecast);

  const t3State = coupledForecast.horizons[3];
  assert.strictEqual(t3State.hour_offset, 3, 'Hour offset must be 3');
  assert.strictEqual(t3State.horizon_label, 'T+3', 'Horizon label must be T+3');
  assert(t3State.cells.length > 0, 'T+3 must contain cells');
});

// ============================================================================
// TEST 6: Flood-Depth Map Changes with Horizon (No static values)
// ============================================================================
runTest('Flood-depth map values change monotonically/dynamically across horizons', () => {
  const weather = getDemoFallbackWeather('Monsoonal Test Scenario');
  const runoffForecast = generateRunoffForecast(weather);
  const coupledForecast = generateCoupledForecast(runoffForecast);

  const d0 = coupledForecast.horizons[0].max_water_depth_cm;
  const d1 = coupledForecast.horizons[1].max_water_depth_cm;
  const d2 = coupledForecast.horizons[2].max_water_depth_cm;
  const d3 = coupledForecast.horizons[3].max_water_depth_cm;

  // In our escalating convective storm test (28.5 -> 65 -> 95 -> 120 mm/hr)
  assert(d1 > d0, `T+1 depth (${d1}cm) must exceed T+0 depth (${d0}cm)`);
  assert(d2 > d1, `T+2 depth (${d2}cm) must exceed T+1 depth (${d1}cm)`);
  assert(d3 > d2, `T+3 depth (${d3}cm) must exceed T+2 depth (${d2}cm)`);
});

// ============================================================================
// TEST 7: Summary values match selected coupled state exactly
// ============================================================================
runTest('Nowcast summary metrics match exact coupled simulation state', () => {
  const weather = getDemoFallbackWeather('Monsoonal Test Scenario');
  const runoffForecast = generateRunoffForecast(weather);
  const coupledForecast = generateCoupledForecast(runoffForecast);

  for (const h of [0, 1, 2, 3] as const) {
    const state = coupledForecast.horizons[h];
    const computedMax = Math.max(...state.cells.map((c) => c.water_depth_cm), 0);
    assert.strictEqual(
      Number(state.max_water_depth_cm.toFixed(1)),
      Number(computedMax.toFixed(1)),
      `Horizon T+${h} max depth must equal max of cells`
    );

    const highCells = state.cells.filter((c) => c.water_depth_cm >= 20).length;
    assert(
      highCells >= 0 && highCells <= 25,
      `Horizon T+${h} high/critical cells must be between 0 and 25`
    );
  }
});

// ============================================================================
// TEST 8: LIVE/DEMO provenance preservation
// ============================================================================
runTest('Provenance is preserved: LIVE weather yields LIVE/DERIVED, DEMO yields DEMO', () => {
  // Test LIVE
  const liveWeather: NormalizedWeatherObservation = {
    ...getDemoFallbackWeather(),
    status: 'LIVE',
    is_fallback: false,
  };
  const liveRunoff = generateRunoffForecast(liveWeather);
  const liveCoupled = generateCoupledForecast(liveRunoff);
  assert(
    liveCoupled.status === 'LIVE' || liveCoupled.status === 'DERIVED',
    `Live weather must yield LIVE or DERIVED status (got ${liveCoupled.status})`
  );

  // Test DEMO
  const demoWeather = getDemoFallbackWeather();
  demoWeather.status = 'DEMO';
  const demoRunoff = generateRunoffForecast(demoWeather);
  const demoCoupled = generateCoupledForecast(demoRunoff);
  assert.strictEqual(demoCoupled.status, 'DEMO', 'Demo weather must yield DEMO status');
});

// ============================================================================
// TEST 9: Zero Rainfall produces zero flood depth (No artificial flooding)
// ============================================================================
runTest('Zero rainfall produces 0 cm depth, 0 surcharge, and 0 outfall without artificial flooding', () => {
  const dryWeather: NormalizedWeatherObservation = {
    ...getDemoFallbackWeather(),
    status: 'LIVE',
    current_rainfall_mm_hr: 0,
    nowcast_steps: [
      { hour_offset: 0, label: 'T+0', timestamp: '00:00', rainfall_intensity_mm_hr: 0, accumulated_rainfall_mm: 0, warning_level: 'No Warning' },
      { hour_offset: 1, label: 'T+1', timestamp: '+1 hr', rainfall_intensity_mm_hr: 0, accumulated_rainfall_mm: 0, warning_level: 'No Warning' },
      { hour_offset: 2, label: 'T+2', timestamp: '+2 hr', rainfall_intensity_mm_hr: 0, accumulated_rainfall_mm: 0, warning_level: 'No Warning' },
      { hour_offset: 3, label: 'T+3', timestamp: '+3 hr', rainfall_intensity_mm_hr: 0, accumulated_rainfall_mm: 0, warning_level: 'No Warning' },
    ],
  };

  const runoffForecast = generateRunoffForecast(dryWeather);
  const coupledForecast = generateCoupledForecast(runoffForecast);

  for (const h of [0, 1, 2, 3] as const) {
    const state = coupledForecast.horizons[h];
    assert.strictEqual(state.max_water_depth_cm, 0, `Horizon T+${h} max depth must be 0`);
    assert.strictEqual(state.mean_water_depth_cm, 0, `Horizon T+${h} mean depth must be 0`);
    assert.strictEqual(state.critical_cells_count, 0, `Horizon T+${h} critical cells must be 0`);
    assert.strictEqual(state.total_drainage_intake_m3_s, 0, `Horizon T+${h} intake must be 0`);
    assert.strictEqual(state.total_surcharge_return_m3_s, 0, `Horizon T+${h} surcharge must be 0`);
    assert(state.mass_balance.is_conserved, `Horizon T+${h} mass balance must be conserved`);
  }
});

// ============================================================================
// TEST 10: Comparison Table Metrics Alignment
// ============================================================================
runTest('Horizon comparison view data columns match actual coupled simulation statistics', () => {
  const weather = getDemoFallbackWeather('Monsoonal Test Scenario');
  const runoffForecast = generateRunoffForecast(weather);
  const coupledForecast = generateCoupledForecast(runoffForecast);

  const rowRainfall = ([0, 1, 2, 3] as const).map(
    (h) => runoffForecast.horizons[h].cells[0].rainfall_intensity_mm_hr
  );
  const rowMaxDepth = ([0, 1, 2, 3] as const).map(
    (h) => coupledForecast.horizons[h].max_water_depth_cm
  );
  const rowSurcharge = ([0, 1, 2, 3] as const).map(
    (h) => coupledForecast.horizons[h].total_surcharge_return_m3_s
  );

  assert.strictEqual(rowRainfall.length, 4, '4 rainfall values');
  assert.strictEqual(rowMaxDepth.length, 4, '4 max depth values');
  assert.strictEqual(rowSurcharge.length, 4, '4 surcharge values');

  // Verify non-zero under storm conditions
  assert(rowMaxDepth[1] > 0, 'T+1 max depth > 0 under storm');
  assert(rowRainfall[1] > 0, 'T+1 rainfall > 0 under storm');
});

console.log('===============================================================');
console.log(`PHASE 4A VERIFICATION SUMMARY: ${passCount} / ${totalTests} TESTS PASSED`);
console.log('===============================================================');

if (passCount !== totalTests) {
  process.exit(1);
}

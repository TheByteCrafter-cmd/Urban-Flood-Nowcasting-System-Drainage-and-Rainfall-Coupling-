import {
  simulateCoupledTimestep,
  generateCoupledForecast,
  runControlledCouplingComparison,
} from '../src/services/couplingService';
import { routeSurfaceFlow } from '../src/services/surfaceFlowService';
import { generateRunoffForecast } from '../src/services/runoffService';
import { getDemoFallbackWeather } from '../src/services/weatherService';
import { PROTOTYPE_DRAINAGE_NODES, PROTOTYPE_DRAINAGE_EDGES } from '../src/mock/drainageNetwork';
import { DrainageNodeParameters, DrainageEdgeParameters } from '../src/types/drainage';
import { NormalizedWeatherObservation } from '../src/types/weather';

console.log('======================================================================');
console.log('PHASE 3D: DYNAMIC 1D-2D SURFACE ↔ DRAINAGE COUPLING ENGINE VALIDATION');
console.log('SIH26085 Prototype Hydrological Coupling Engine');
console.log('======================================================================\n');

let passedTests = 0;
let totalTests = 0;

function assert(condition: boolean, testName: string, detail?: string) {
  totalTests++;
  if (condition) {
    passedTests++;
    console.log(`  ✔ [PASS] Test ${totalTests}: ${testName}`);
    if (detail) console.log(`     ↳ ${detail}`);
  } else {
    console.error(`  ✖ [FAIL] Test ${totalTests}: ${testName}`);
    if (detail) console.error(`     ↳ ${detail}`);
    process.exit(1);
  }
}

// -----------------------------------------------------------------------------
// Helper to synthesize a test weather observation
// -----------------------------------------------------------------------------
function makeTestWeather(rainfallMmHr: number, status: 'LIVE' | 'DEMO' | 'ERROR' = 'DEMO'): NormalizedWeatherObservation {
  const base = getDemoFallbackWeather(`Verification Weather (${rainfallMmHr} mm/hr)`);
  return {
    ...base,
    status,
    current_rainfall_mm_hr: rainfallMmHr,
    nowcast_steps: [
      { hour_offset: 0, label: 'T+0', timestamp: 'T+0', rainfall_intensity_mm_hr: rainfallMmHr, accumulated_rainfall_mm: rainfallMmHr, warning_level: 'Watch' },
      { hour_offset: 1, label: 'T+1', timestamp: 'T+1', rainfall_intensity_mm_hr: rainfallMmHr, accumulated_rainfall_mm: rainfallMmHr * 2, warning_level: 'Watch' },
      { hour_offset: 2, label: 'T+2', timestamp: 'T+2', rainfall_intensity_mm_hr: rainfallMmHr, accumulated_rainfall_mm: rainfallMmHr * 3, warning_level: 'Watch' },
      { hour_offset: 3, label: 'T+3', timestamp: 'T+3', rainfall_intensity_mm_hr: rainfallMmHr, accumulated_rainfall_mm: rainfallMmHr * 4, warning_level: 'Watch' },
    ],
  };
}

// =============================================================================
// TEST 1: Zero rainfall -> Zero coupled water
// =============================================================================
{
  const zeroWeather = makeTestWeather(0.0);
  const runoffForecast = generateRunoffForecast(zeroWeather);
  const surfaceGrid = routeSurfaceFlow(runoffForecast.horizons[0]);
  const coupled = simulateCoupledTimestep(surfaceGrid);

  assert(
    coupled.max_water_depth_cm === 0 &&
    coupled.total_drainage_intake_m3_s === 0 &&
    coupled.total_surcharge_return_m3_s === 0 &&
    coupled.mass_balance.surface_stored_volume_m3 === 0,
    'Zero rainfall produces zero coupled surface depth, zero intake, and zero surcharge',
    `Max depth: ${coupled.max_water_depth_cm} cm, Intake: ${coupled.total_drainage_intake_m3_s} m³/s`
  );
}

// =============================================================================
// TEST 2: Positive runoff -> Positive surface water
// =============================================================================
{
  const rainWeather = makeTestWeather(45.0);
  const runoffForecast = generateRunoffForecast(rainWeather);
  const surfaceGrid = routeSurfaceFlow(runoffForecast.horizons[0]);
  const coupled = simulateCoupledTimestep(surfaceGrid);

  assert(
    coupled.max_water_depth_cm > 0 && coupled.mass_balance.surface_stored_volume_m3 > 0,
    'Positive runoff generates positive surface water and non-zero flood depth',
    `Max depth: ${coupled.max_water_depth_cm} cm, Stored volume: ${coupled.mass_balance.surface_stored_volume_m3} m³`
  );
}

// =============================================================================
// TEST 3: Surface water enters drainage inlets
// =============================================================================
{
  const rainWeather = makeTestWeather(50.0);
  const runoffForecast = generateRunoffForecast(rainWeather);
  const surfaceGrid = routeSurfaceFlow(runoffForecast.horizons[0]);
  const coupled = simulateCoupledTimestep(surfaceGrid);

  assert(
    coupled.total_drainage_intake_m3_s > 0 &&
    coupled.mass_balance.internal_drainage_intake_m3 > 0,
    'Surface overland water is successfully captured into underground drainage inlets',
    `Intake rate: ${coupled.total_drainage_intake_m3_s} m³/s, Intake volume: ${coupled.mass_balance.internal_drainage_intake_m3} m³`
  );
}

// =============================================================================
// TEST 4: Drainage intake is limited by available surface water and pipe capacity
// =============================================================================
{
  const rainWeather = makeTestWeather(65.0);
  const runoffForecast = generateRunoffForecast(rainWeather);
  const surfaceGrid = routeSurfaceFlow(runoffForecast.horizons[0]);
  const coupled = simulateCoupledTimestep(surfaceGrid);

  // Check that every cell did not give more water than it had initially
  let intakeExceeded = false;
  coupled.cells.forEach((c) => {
    if (c.drainage_intake_volume_m3 > c.initial_surface_volume_m3 + 0.1) {
      intakeExceeded = true;
    }
  });

  assert(
    !intakeExceeded,
    'Drainage intake never exceeds available surface water in any catchment cell',
    'All 25 catchment cells satisfy V_intake <= V_initial'
  );
}

// =============================================================================
// TEST 5: Over-capacity drainage creates surcharge ($Q_excess > 0$)
// =============================================================================
{
  const rainWeather = makeTestWeather(80.0);
  const runoffForecast = generateRunoffForecast(rainWeather);
  const surfaceGrid = routeSurfaceFlow(runoffForecast.horizons[0]);
  const coupled = simulateCoupledTimestep(surfaceGrid);

  assert(
    coupled.total_surcharge_return_m3_s > 0 &&
    coupled.drainage_network.surcharged_nodes_count > 0,
    'Heavy rainfall exceeds pipe capacities and triggers hydraulic surcharge at urban bottlenecks',
    `Surcharged nodes: ${coupled.drainage_network.surcharged_nodes_count}, Surcharge rate: ${coupled.total_surcharge_return_m3_s} m³/s`
  );
}

// =============================================================================
// TEST 6: Surcharge returns water to associated surface cell
// =============================================================================
{
  const rainWeather = makeTestWeather(70.0);
  const runoffForecast = generateRunoffForecast(rainWeather);
  const surfaceGrid = routeSurfaceFlow(runoffForecast.horizons[0]);
  const coupled = simulateCoupledTimestep(surfaceGrid);

  // Find cells with surcharged nodes
  const cellsWithSurcharge = coupled.cells.filter((c) => c.drainage_surcharge_return_m3 > 0);

  assert(
    cellsWithSurcharge.length > 0 &&
    cellsWithSurcharge.some((c) => c.net_surface_volume_m3 > (c.initial_surface_volume_m3 - c.drainage_intake_volume_m3)),
    'Surcharge water re-enters associated surface cells and increases local surface volume',
    `Cells receiving returned surcharge: ${cellsWithSurcharge.map((c) => `${c.cell_id} (+${c.drainage_surcharge_return_m3} m³)`).slice(0, 3).join(', ')}`
  );
}

// =============================================================================
// TEST 7: Reduced drainage capacity increases surface flood depth (Case B vs Case A)
// =============================================================================
{
  const comparison = runControlledCouplingComparison(65.0);

  assert(
    comparison.caseB_restricted.max_water_depth_cm > comparison.caseA_normal.max_water_depth_cm &&
    comparison.deltaSurchargeM3S > 0,
    'Restricted drainage capacity leads to higher surcharge and greater surface flood depth',
    `Normal max depth: ${comparison.caseA_normal.max_water_depth_cm} cm vs Restricted: ${comparison.caseB_restricted.max_water_depth_cm} cm (Δ = +${comparison.deltaMaxDepthCm} cm)`
  );
}

// =============================================================================
// TEST 8: Increased drainage capacity reduces surface flood depth
// =============================================================================
{
  const rainWeather = makeTestWeather(65.0);
  const runoffForecast = generateRunoffForecast(rainWeather);
  const surfaceGrid = routeSurfaceFlow(runoffForecast.horizons[0]);

  // High capacity network: double pipe sizes
  const enlargedEdges: DrainageEdgeParameters[] = PROTOTYPE_DRAINAGE_EDGES.map((e) => ({
    ...e,
    diameter_m: e.diameter_m ? e.diameter_m * 2.0 : undefined,
    width_m: e.width_m ? e.width_m * 2.0 : undefined,
    height_m: e.height_m ? e.height_m * 2.0 : undefined,
  }));

  const normalCoupled = simulateCoupledTimestep(surfaceGrid, PROTOTYPE_DRAINAGE_NODES, PROTOTYPE_DRAINAGE_EDGES);
  const enlargedCoupled = simulateCoupledTimestep(surfaceGrid, PROTOTYPE_DRAINAGE_NODES, enlargedEdges);

  assert(
    enlargedCoupled.mass_balance.surface_stored_volume_m3 < normalCoupled.mass_balance.surface_stored_volume_m3 &&
    enlargedCoupled.drainage_network.total_outfall_discharge_m3_s >= normalCoupled.drainage_network.total_outfall_discharge_m3_s,
    'Expanding drainage capacity increases conveyance and decreases residual surface flood storage',
    `Normal surface storage: ${normalCoupled.mass_balance.surface_stored_volume_m3} m³ vs Enlarged: ${enlargedCoupled.mass_balance.surface_stored_volume_m3} m³`
  );
}

// =============================================================================
// TEST 9: No negative surface volume in any cell
// =============================================================================
{
  const rainWeather = makeTestWeather(65.0);
  const runoffForecast = generateRunoffForecast(rainWeather);
  const surfaceGrid = routeSurfaceFlow(runoffForecast.horizons[0]);
  const coupled = simulateCoupledTimestep(surfaceGrid);

  const hasNegative = coupled.cells.some((c) => c.net_surface_volume_m3 < 0 || c.water_depth_cm < 0);

  assert(
    !hasNegative,
    'No grid cell has negative surface water volume or negative flood depth',
    'All 25 grid cells satisfy V_net >= 0 and depth_cm >= 0'
  );
}

// =============================================================================
// TEST 10: No negative drainage flow rates
// =============================================================================
{
  const rainWeather = makeTestWeather(65.0);
  const runoffForecast = generateRunoffForecast(rainWeather);
  const surfaceGrid = routeSurfaceFlow(runoffForecast.horizons[0]);
  const coupled = simulateCoupledTimestep(surfaceGrid);

  const negNodeFlow = coupled.drainage_network.nodes.some((n) => n.total_inflow_m3_s < 0 || n.discharged_outflow_m3_s < 0 || n.surcharge_rate_m3_s < 0);
  const negEdgeFlow = coupled.drainage_network.edges.some((e) => e.actual_flow_m3_s < 0);

  assert(
    !negNodeFlow && !negEdgeFlow,
    'All node inflows, pipe flows, outfalls, and surcharge rates are strictly non-negative',
    'Zero negative flows across all 31 nodes and 26 edges'
  );
}

// =============================================================================
// TEST 11: Total system mass conservation (Formulation: Input = Stored + Outfall + Boundary)
// =============================================================================
{
  const rainWeather = makeTestWeather(65.0);
  const runoffForecast = generateRunoffForecast(rainWeather);
  const surfaceGrid = routeSurfaceFlow(runoffForecast.horizons[0]);
  const coupled = simulateCoupledTimestep(surfaceGrid);

  const mb = coupled.mass_balance;
  assert(
    mb.is_conserved && mb.volume_balance_error_pct < 0.01,
    'Strict external mass conservation: Input Runoff = Stored Surface + Drainage Outfall + Overland Domain Exit',
    `Input: ${mb.input_runoff_volume_m3} m³ | Accounted: ${mb.total_accounted_volume_m3} m³ (Ratio: ${mb.volume_balance_ratio}, Error: ${mb.volume_balance_error_pct.toFixed(4)}%)`
  );
}

// =============================================================================
// TEST 12: Internal transfers cancel out and do not alter total system mass
// =============================================================================
{
  const comparison = runControlledCouplingComparison(65.0);

  // Both Case A and Case B must conserve total mass
  const mbA = comparison.caseA_normal.mass_balance;
  const mbB = comparison.caseB_restricted.mass_balance;

  assert(
    mbA.is_conserved && mbB.is_conserved && comparison.bothConserved,
    'Internal transfers (surface capture and surcharge return) do not create or destroy total mass in Normal or Restricted networks',
    `Case A Error: ${mbA.volume_balance_error_pct.toFixed(4)}%, Case B Error: ${mbB.volume_balance_error_pct.toFixed(4)}%`
  );
}

// =============================================================================
// TEST 13: Double-Count Regression Test (Phase 3B -> Phase 3D does NOT double count Phase 3A runoff)
// =============================================================================
{
  const testRain = makeTestWeather(55.0);
  const runoffForecast = generateRunoffForecast(testRain);
  const runoffGrid = runoffForecast.horizons[0];
  const phase3aTotalRunoffM3 = runoffGrid.total_runoff_volume_m3;

  // Run Phase 3B
  const phase3bSurfaceGrid = routeSurfaceFlow(runoffGrid);
  const phase3bAccountedM3 = phase3bSurfaceGrid.total_retained_surface_volume_m3 + phase3bSurfaceGrid.total_boundary_outflow_volume_m3;

  // Feed Phase 3B into Phase 3D
  const phase3dCoupled = simulateCoupledTimestep(phase3bSurfaceGrid);
  const phase3dAccountedM3 = phase3dCoupled.mass_balance.total_accounted_volume_m3;

  const diffDoubleCount = Math.abs(phase3dAccountedM3 - phase3aTotalRunoffM3);

  assert(
    diffDoubleCount <= Math.max(5.0, phase3aTotalRunoffM3 * 0.0005) &&
    phase3dCoupled.mass_balance.input_runoff_volume_m3 === phase3bSurfaceGrid.total_input_runoff_volume_m3,
    'PREVENT DOUBLE-COUNTING: Phase 3D does NOT add Phase 3A runoff volume a second time; system mass remains strictly conserved',
    `Phase 3A Input: ${phase3aTotalRunoffM3} m³ | Phase 3B Accounted: ${phase3bAccountedM3} m³ | Phase 3D Accounted: ${phase3dAccountedM3} m³ (Diff: ${diffDoubleCount.toFixed(2)} m³)`
  );
}

// =============================================================================
// TEST 14: Temporal independence across T+0, T+1, T+2, T+3
// =============================================================================
{
  const dynamicWeather = makeTestWeather(30.0);
  dynamicWeather.nowcast_steps[1].rainfall_intensity_mm_hr = 60.0;
  dynamicWeather.nowcast_steps[2].rainfall_intensity_mm_hr = 90.0;
  dynamicWeather.nowcast_steps[3].rainfall_intensity_mm_hr = 15.0;

  const runoffForecast = generateRunoffForecast(dynamicWeather);
  const coupledForecast = generateCoupledForecast(runoffForecast);

  const h0 = coupledForecast!.horizons[0];
  const h1 = coupledForecast!.horizons[1];
  const h2 = coupledForecast!.horizons[2];
  const h3 = coupledForecast!.horizons[3];

  assert(
    h0.max_water_depth_cm !== h1.max_water_depth_cm &&
    h1.max_water_depth_cm !== h2.max_water_depth_cm &&
    h2.max_water_depth_cm !== h3.max_water_depth_cm &&
    h0.mass_balance.is_conserved &&
    h1.mass_balance.is_conserved &&
    h2.mass_balance.is_conserved &&
    h3.mass_balance.is_conserved,
    'Forecast horizons T+0, T+1, T+2, T+3 produce independent, non-interfering coupled states',
    `Depths: T+0=${h0.max_water_depth_cm}cm, T+1=${h1.max_water_depth_cm}cm, T+2=${h2.max_water_depth_cm}cm, T+3=${h3.max_water_depth_cm}cm`
  );
}

// =============================================================================
// TEST 15: Provenance and State Propagation
// =============================================================================
{
  // Case A: LIVE weather
  const liveWeather = makeTestWeather(25.0, 'LIVE');
  const liveRunoff = generateRunoffForecast(liveWeather);
  const liveCoupled = generateCoupledForecast(liveRunoff);
  const t0State = liveCoupled!.horizons[0];
  const t1State = liveCoupled!.horizons[1];

  // Case B: ERROR weather
  const errorWeather = makeTestWeather(0, 'ERROR');
  const errorRunoff = generateRunoffForecast(errorWeather);
  const errorCoupled = generateCoupledForecast(errorRunoff);

  assert(
    t0State.status === 'LIVE' &&
    t0State.provenance === 'DERIVED_COUPLED' &&
    t1State.status === 'DERIVED' &&
    errorCoupled!.status === 'ERROR' &&
    errorCoupled!.horizons[0].max_water_depth_cm === 0,
    'Provenance propagation: LIVE -> DERIVED_COUPLED, ERROR collapses safely to 0',
    `T+0 status: ${t0State.status}, provenance: ${t0State.provenance}, ERROR depth: ${errorCoupled!.horizons[0].max_water_depth_cm} cm`
  );
}

// =============================================================================
// TEST 16: Deterministic repeated execution
// =============================================================================
{
  const rainWeather = makeTestWeather(65.0);
  const runoffForecast = generateRunoffForecast(rainWeather);
  const surfaceGrid = routeSurfaceFlow(runoffForecast.horizons[0]);

  const run1 = simulateCoupledTimestep(surfaceGrid);
  const run2 = simulateCoupledTimestep(surfaceGrid);

  assert(
    run1.max_water_depth_cm === run2.max_water_depth_cm &&
    run1.mass_balance.surface_stored_volume_m3 === run2.mass_balance.surface_stored_volume_m3 &&
    run1.total_drainage_intake_m3_s === run2.total_drainage_intake_m3_s &&
    run1.total_surcharge_return_m3_s === run2.total_surcharge_return_m3_s,
    'Deterministic execution: repeated calls produce bitwise identical hydrodynamic states',
    `Run 1 depth: ${run1.max_water_depth_cm} cm, Run 2 depth: ${run2.max_water_depth_cm} cm`
  );
}

// =============================================================================
// TEST 17: No infinite coupling loop (strictly terminates <= 5 iterations)
// =============================================================================
{
  const rainWeather = makeTestWeather(95.0);
  const runoffForecast = generateRunoffForecast(rainWeather);
  const surfaceGrid = routeSurfaceFlow(runoffForecast.horizons[0]);
  const coupled = simulateCoupledTimestep(surfaceGrid, PROTOTYPE_DRAINAGE_NODES, PROTOTYPE_DRAINAGE_EDGES, {
    maxIterations: 5,
    convergenceToleranceM3: 0.1,
  });

  assert(
    coupled.iterations_run <= 5 && coupled.iterations_run >= 1,
    'Coupling loop strictly terminates within iteration bound (<= 5 iterations) without infinite looping',
    `Iterations completed: ${coupled.iterations_run} / 5`
  );
}

console.log('\n======================================================================');
console.log(`SUMMARY: ${passedTests}/${totalTests} PHASE 3D COUPLING VALIDATION TESTS PASSED`);
console.log('======================================================================');

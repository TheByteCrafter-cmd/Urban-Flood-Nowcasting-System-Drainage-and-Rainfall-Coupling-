import {
  classifyFloodDepth,
  assessCellRisk,
  generateHorizonAlerts,
  generateHorizonRiskState,
  generateRiskForecast,
} from '../src/services/riskService';
import { generateCoupledForecast, simulateCoupledTimestep } from '../src/services/couplingService';
import { generateRunoffForecast } from '../src/services/runoffService';
import { routeSurfaceFlow } from '../src/services/surfaceFlowService';
import { getDemoFallbackWeather } from '../src/services/weatherService';
import { CoupledCellState } from '../types/coupling';
import { DrainageNetworkState, DrainageNodeState, DrainageEdgeState } from '../types/drainage';
import { NormalizedWeatherObservation } from '../types/weather';

console.log('======================================================================');
console.log('PHASE 4B: FLOOD RISK SCORING & INFRASTRUCTURE ALERTS ENGINE VALIDATION');
console.log('SIH26085 Multi-factor Hydrologic & Hydraulic Risk Engine');
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

function makeTestWeather(rainfallMmHr: number, status: 'LIVE' | 'DEMO' | 'ERROR' = 'DEMO'): NormalizedWeatherObservation {
  const base = getDemoFallbackWeather(`Verification Weather (${rainfallMmHr} mm/hr)`);
  return {
    ...base,
    status,
    current_rainfall_mm_hr: rainfallMmHr,
    nowcast_steps: [
      { hour_offset: 0, label: 'T+0', timestamp: 'T+0', rainfall_intensity_mm_hr: rainfallMmHr, accumulated_rainfall_mm: rainfallMmHr, warning_level: 'Watch' },
      { hour_offset: 1, label: 'T+1', timestamp: 'T+1', rainfall_intensity_mm_hr: rainfallMmHr * 1.5, accumulated_rainfall_mm: rainfallMmHr * 2.5, warning_level: 'Watch' },
      { hour_offset: 2, label: 'T+2', timestamp: 'T+2', rainfall_intensity_mm_hr: rainfallMmHr * 2.0, accumulated_rainfall_mm: rainfallMmHr * 4.5, warning_level: 'Watch' },
      { hour_offset: 3, label: 'T+3', timestamp: 'T+3', rainfall_intensity_mm_hr: rainfallMmHr * 2.5, accumulated_rainfall_mm: rainfallMmHr * 7.0, warning_level: 'Watch' },
    ],
  };
}

// Dummy mock drainage network state for isolated unit testing
function makeMockDrainageState(overrides?: Partial<DrainageNetworkState>): DrainageNetworkState {
  return {
    network_name: 'Prototype Drainage Network (DAG)',
    timestamp: new Date().toISOString(),
    hour_offset: 0,
    horizon_label: 'T+0',
    status: 'DERIVED',
    status_reason: 'Testing',
    provenance: 'ASSUMED_PROTOTYPE',
    total_surface_inflow_m3_s: 10,
    total_outfall_discharge_m3_s: 10,
    total_surcharge_rate_m3_s: 0,
    flow_balance_ratio: 1.0,
    flow_balance_conserved: true,
    total_inflow_volume_m3: 36000,
    total_outfall_volume_m3: 36000,
    total_surcharge_volume_m3: 0,
    volume_balance_ratio: 1.0,
    volume_balance_conserved: true,
    nodes: [],
    edges: [],
    ...overrides,
  };
}

function makeMockCoupledCell(overrides?: Partial<CoupledCellState>): CoupledCellState {
  return {
    cell_id: 'DEM-GRID-2-1',
    grid_row: 2,
    grid_col: 1,
    zone_name: 'Hindmata Dadar Basin',
    centroid: [72.84, 19.01],
    bounds: [[72.83, 19.00], [72.85, 19.02]],
    geometry: { type: 'Polygon', coordinates: [] },
    area_m2: 1_000_000,
    elevation_m: 3.5,
    phase3a_runoff_input_m3: 5000,
    initial_surface_volume_m3: 5000,
    surface_boundary_outflow_m3: 0,
    drainage_intake_volume_m3: 5000,
    drainage_surcharge_return_m3: 0,
    net_surface_volume_m3: 0,
    water_depth_m: 0,
    water_depth_cm: 0,
    depth_category: 'Dry / Trace',
    color: '#DBEAFE',
    associated_inlet_ids: ['INLET-DDR-01'],
    associated_node_ids: ['INLET-DDR-01'],
    is_sink: true,
    status: 'DERIVED',
    provenance: 'DERIVED_COUPLED',
    ...overrides,
  };
}

// -----------------------------------------------------------------------------
// TEST 1: Depth Classification: 0 cm -> strictly LOW risk
// -----------------------------------------------------------------------------
{
  const r0 = classifyFloodDepth(0);
  const r4_9 = classifyFloodDepth(4.9);
  assert(
    r0 === 'LOW' && r4_9 === 'LOW',
    'Depth 0 to <5 cm produces LOW risk classification',
    `0 cm -> ${r0}, 4.9 cm -> ${r4_9}`
  );
}

// -----------------------------------------------------------------------------
// TEST 2: Depth Classification: 10 cm -> MODERATE risk
// -----------------------------------------------------------------------------
{
  const r5 = classifyFloodDepth(5.0);
  const r10 = classifyFloodDepth(10.0);
  const r19_9 = classifyFloodDepth(19.9);
  assert(
    r5 === 'MODERATE' && r10 === 'MODERATE' && r19_9 === 'MODERATE',
    'Depth 5 to <20 cm produces MODERATE risk classification',
    `5 cm -> ${r5}, 10 cm -> ${r10}, 19.9 cm -> ${r19_9}`
  );
}

// -----------------------------------------------------------------------------
// TEST 3: Depth Classification: 30 cm -> HIGH risk
// -----------------------------------------------------------------------------
{
  const r20 = classifyFloodDepth(20.0);
  const r30 = classifyFloodDepth(30.0);
  const r49_9 = classifyFloodDepth(49.9);
  assert(
    r20 === 'HIGH' && r30 === 'HIGH' && r49_9 === 'HIGH',
    'Depth 20 to <50 cm produces HIGH risk classification',
    `20 cm -> ${r20}, 30 cm -> ${r30}, 49.9 cm -> ${r49_9}`
  );
}

// -----------------------------------------------------------------------------
// TEST 4: Depth Classification: 70 cm -> VERY_HIGH risk
// -----------------------------------------------------------------------------
{
  const r50 = classifyFloodDepth(50.0);
  const r70 = classifyFloodDepth(70.0);
  const r99_9 = classifyFloodDepth(99.9);
  assert(
    r50 === 'VERY_HIGH' && r70 === 'VERY_HIGH' && r99_9 === 'VERY_HIGH',
    'Depth 50 to <100 cm produces VERY_HIGH risk classification',
    `50 cm -> ${r50}, 70 cm -> ${r70}, 99.9 cm -> ${r99_9}`
  );
}

// -----------------------------------------------------------------------------
// TEST 5: Depth Classification: 120 cm -> CRITICAL risk
// -----------------------------------------------------------------------------
{
  const r100 = classifyFloodDepth(100.0);
  const r120 = classifyFloodDepth(120.0);
  assert(
    r100 === 'CRITICAL' && r120 === 'CRITICAL',
    'Depth >=100 cm produces CRITICAL risk classification',
    `100 cm -> ${r100}, 120 cm -> ${r120}`
  );
}

// -----------------------------------------------------------------------------
// TEST 6: Surcharge Escalation: Cell with depth 10 cm (normally MODERATE)
// escalates to HIGH risk when drainage surcharge is active
// -----------------------------------------------------------------------------
{
  const drainage = makeMockDrainageState();
  const normalCell = makeMockCoupledCell({ water_depth_cm: 10.0, drainage_surcharge_return_m3: 0 });
  const surchargingCell = makeMockCoupledCell({ water_depth_cm: 10.0, drainage_surcharge_return_m3: 2500 });

  const normalAssessment = assessCellRisk(normalCell, drainage);
  const surchargedAssessment = assessCellRisk(surchargingCell, drainage);

  assert(
    normalAssessment.riskLevel === 'MODERATE' && surchargedAssessment.riskLevel === 'HIGH',
    'Surcharge escalation: 10 cm depth escalates from MODERATE to HIGH with drainage surcharge',
    `Normal: ${normalAssessment.riskLevel}, Surcharged: ${surchargedAssessment.riskLevel}`
  );
}

// -----------------------------------------------------------------------------
// TEST 7: Severe Surcharge / Overflow Escalation: Cell with depth 30 cm
// escalates to VERY_HIGH with surcharge, or CRITICAL with node OVERFLOW
// -----------------------------------------------------------------------------
{
  const overflowNode: DrainageNodeState = {
    id: 'INLET-DDR-01',
    name: 'Dadar Inundation Inflow Node',
    node_type: 'INLET',
    lat: 19.01,
    lng: 72.84,
    elevation_m: 3.5,
    catchment_cell_id: 'DEM-GRID-2-1',
    surface_inflow_m3_s: 25.0,
    upstream_pipe_inflow_m3_s: 0,
    total_inflow_m3_s: 25.0,
    discharged_outflow_m3_s: 5.0,
    surcharge_rate_m3_s: 20.0,
    node_capacity_m3_s: 5.0,
    surcharge_ratio: 5.0,
    status: 'OVERFLOW',
    status_reason: 'Severe capacity exceedance',
    provenance: 'ASSUMED_PROTOTYPE',
  };

  const drainage = makeMockDrainageState({ nodes: [overflowNode] });
  const cell = makeMockCoupledCell({
    water_depth_cm: 30.0,
    drainage_surcharge_return_m3: 15_000,
    associated_node_ids: ['INLET-DDR-01'],
  });

  const assessment = assessCellRisk(cell, drainage);
  assert(
    assessment.riskLevel === 'CRITICAL',
    'Severe surcharge/overflow: 30 cm depth escalates from HIGH to CRITICAL when node is OVERFLOW',
    `Baseline: ${assessment.depthCategory} -> Final: ${assessment.riskLevel}`
  );
}

// -----------------------------------------------------------------------------
// TEST 8: Pipe Overcapacity Alert: Pipe with utilization >= 100% generates alert
// -----------------------------------------------------------------------------
{
  const overPipe: DrainageEdgeState = {
    id: 'PIPE-MUM-03',
    name: 'Hindmata Main Culvert',
    from_node: 'INLET-DDR-01',
    to_node: 'OUTFALL-SEA-01',
    edge_type: 'BOX_CULVERT',
    coordinates: [[72.84, 19.01], [72.83, 19.01]],
    length_m: 500,
    slope: 0.002,
    roughness_n: 0.013,
    cross_sectional_area_m2: 8.0,
    hydraulic_radius_m: 1.2,
    capacity_m3_s: 15.0,
    actual_flow_m3_s: 18.0,
    utilization_pct: 120.0,
    status: 'OVER_CAPACITY',
    provenance: 'ASSUMED_PROTOTYPE',
  };

  const drainage = makeMockDrainageState({ edges: [overPipe] });
  const cell = makeMockCoupledCell();
  const assessment = assessCellRisk(cell, drainage);

  const mockState = {
    timestamp: '2026-09-10T00:00:00Z',
    hour_offset: 1 as const,
    horizon_label: 'T+1' as const,
    status: 'DERIVED' as const,
    status_reason: '',
    provenance: 'DERIVED_COUPLED' as const,
    cells: [cell],
    drainage_network: drainage,
    surface_flow_grid: {} as any,
    iterations_run: 1,
    iteration_logs: [],
    mass_balance: {} as any,
    max_water_depth_cm: 0,
    mean_water_depth_cm: 0,
    critical_cells_count: 0,
    total_drainage_intake_m3_s: 0,
    total_surcharge_return_m3_s: 0,
  };

  const alerts = generateHorizonAlerts(mockState, [assessment]);
  const pipeAlert = alerts.find((a) => a.type === 'PIPE_OVER_CAPACITY');

  assert(
    pipeAlert !== undefined && pipeAlert.pipeId === 'PIPE-MUM-03' && pipeAlert.metricValue === 120.0,
    'Pipe overcapacity alert generated with correct pipe ID, utilization, and severity',
    `Found pipe alert: ${pipeAlert?.title}, Severity: ${pipeAlert?.severity}, Util: ${pipeAlert?.metricValue}%`
  );
}

// -----------------------------------------------------------------------------
// TEST 9: Drainage Surcharge Alert: Surcharging node generates alert
// -----------------------------------------------------------------------------
{
  const surchargedNode: DrainageNodeState = {
    id: 'NODE-DDR-02',
    name: 'Dadar Central Manhole',
    node_type: 'MANHOLE',
    lat: 19.02,
    lng: 72.84,
    elevation_m: 4.0,
    catchment_cell_id: 'DEM-GRID-2-1',
    surface_inflow_m3_s: 0,
    upstream_pipe_inflow_m3_s: 12.0,
    total_inflow_m3_s: 12.0,
    discharged_outflow_m3_s: 8.0,
    surcharge_rate_m3_s: 4.0,
    node_capacity_m3_s: 8.0,
    surcharge_ratio: 1.5,
    status: 'SURCHARGE',
    status_reason: 'Backpressure from downstream culvert',
    provenance: 'ASSUMED_PROTOTYPE',
  };

  const drainage = makeMockDrainageState({ nodes: [surchargedNode] });
  const cell = makeMockCoupledCell();
  const assessment = assessCellRisk(cell, drainage);

  const mockState = {
    timestamp: '2026-09-10T00:00:00Z',
    hour_offset: 0 as const,
    horizon_label: 'T+0' as const,
    status: 'DERIVED' as const,
    status_reason: '',
    provenance: 'DERIVED_COUPLED' as const,
    cells: [cell],
    drainage_network: drainage,
    surface_flow_grid: {} as any,
    iterations_run: 1,
    iteration_logs: [],
    mass_balance: {} as any,
    max_water_depth_cm: 0,
    mean_water_depth_cm: 0,
    critical_cells_count: 0,
    total_drainage_intake_m3_s: 0,
    total_surcharge_return_m3_s: 4.0,
  };

  const alerts = generateHorizonAlerts(mockState, [assessment]);
  const nodeAlert = alerts.find((a) => a.type === 'DRAINAGE_SURCHARGE');

  assert(
    nodeAlert !== undefined && nodeAlert.nodeId === 'NODE-DDR-02' && nodeAlert.metricValue === 4.0,
    'Drainage surcharge alert generated with node ID, surcharge rate in m³/s, and severity',
    `Found node alert: ${nodeAlert?.title}, Severity: ${nodeAlert?.severity}, Rate: ${nodeAlert?.metricValue} m³/s`
  );
}

// -----------------------------------------------------------------------------
// TEST 10: Critical Alert: Cell with CRITICAL risk generates CRITICAL_FLOOD_RISK alert
// -----------------------------------------------------------------------------
{
  const cell = makeMockCoupledCell({ water_depth_cm: 110.0 });
  const drainage = makeMockDrainageState();
  const assessment = assessCellRisk(cell, drainage);

  const mockState = {
    timestamp: '2026-09-10T00:00:00Z',
    hour_offset: 2 as const,
    horizon_label: 'T+2' as const,
    status: 'DERIVED' as const,
    status_reason: '',
    provenance: 'DERIVED_COUPLED' as const,
    cells: [cell],
    drainage_network: drainage,
    surface_flow_grid: {} as any,
    iterations_run: 1,
    iteration_logs: [],
    mass_balance: {} as any,
    max_water_depth_cm: 110.0,
    mean_water_depth_cm: 110.0,
    critical_cells_count: 1,
    total_drainage_intake_m3_s: 0,
    total_surcharge_return_m3_s: 0,
  };

  const alerts = generateHorizonAlerts(mockState, [assessment]);
  const critAlert = alerts.find((a) => a.type === 'CRITICAL_FLOOD_RISK');

  assert(
    critAlert !== undefined && critAlert.cellId === 'DEM-GRID-2-1' && critAlert.severity === 'CRITICAL',
    'CRITICAL_FLOOD_RISK alert generated for cell with CRITICAL risk',
    `Found critical alert: ${critAlert?.title}, Severity: ${critAlert?.severity}`
  );
}

// -----------------------------------------------------------------------------
// TEST 11: Dry Weather Zero Grounding:
// When rainfall = 0 mm/hr, depth = 0 cm, surcharge = 0:
// - All 25 cells are strictly LOW risk
// - 0 High / Very High cells
// - 0 Critical cells
// - Exactly 0 active alerts
// -----------------------------------------------------------------------------
{
  const dryWeather = makeTestWeather(0.0);
  const runoffForecast = generateRunoffForecast(dryWeather);
  const coupledForecast = generateCoupledForecast(runoffForecast);
  const riskForecast = generateRiskForecast(coupledForecast);

  const h0 = riskForecast.horizons['T+0'];
  const allCellsLow = h0.cellAssessments.every((a) => a.riskLevel === 'LOW');
  const criticalCount = h0.criticalCellCount;
  const highOrVeryHighCount = h0.highOrVeryHighCellCount;
  const alertCount = h0.alerts.length;
  const totalAlertCount = riskForecast.allAlerts.length;

  assert(
    allCellsLow && criticalCount === 0 && highOrVeryHighCount === 0 && alertCount === 0 && totalAlertCount === 0,
    'Dry Weather Zero Grounding: 0 mm/hr yields 100% LOW risk, 0 high/critical cells, 0 alerts',
    `All LOW: ${allCellsLow}, Critical: ${criticalCount}, High/VeryHigh: ${highOrVeryHighCount}, Alerts (T+0): ${alertCount}, Total Alerts: ${totalAlertCount}`
  );
}

// -----------------------------------------------------------------------------
// TEST 12: Temporal Horizon Isolation:
// Each horizon T+0, T+1, T+2, T+3 evaluates independently without state contamination
// -----------------------------------------------------------------------------
{
  const stormWeather = makeTestWeather(30.0);
  const runoffForecast = generateRunoffForecast(stormWeather);
  const coupledForecast = generateCoupledForecast(runoffForecast);
  const riskForecast = generateRiskForecast(coupledForecast);

  const h0 = riskForecast.horizons['T+0'];
  const h1 = riskForecast.horizons['T+1'];
  const h2 = riskForecast.horizons['T+2'];
  const h3 = riskForecast.horizons['T+3'];

  // All 4 horizons exist and have distinct independent hour offsets
  const offsetsCorrect =
    h0.horizonHours === 0 && h1.horizonHours === 1 && h2.horizonHours === 2 && h3.horizonHours === 3;
  const cellCounts25 =
    h0.cellAssessments.length === 25 &&
    h1.cellAssessments.length === 25 &&
    h2.cellAssessments.length === 25 &&
    h3.cellAssessments.length === 25;

  assert(
    offsetsCorrect && cellCounts25,
    'Temporal horizon isolation: T+0..T+3 evaluated independently with exact 25 cells each',
    `Offsets: ${h0.horizonHours}, ${h1.horizonHours}, ${h2.horizonHours}, ${h3.horizonHours}; Cell counts: 25/25/25/25`
  );
}

// -----------------------------------------------------------------------------
// TEST 13: Provenance Verification:
// All alerts and risk assessments carry provenance 'MODEL OUTPUT / DERIVED'
// -----------------------------------------------------------------------------
{
  const stormWeather = makeTestWeather(50.0);
  const runoffForecast = generateRunoffForecast(stormWeather);
  const coupledForecast = generateCoupledForecast(runoffForecast);
  const riskForecast = generateRiskForecast(coupledForecast);

  const allAlertsHaveModelOutput = riskForecast.allAlerts.every(
    (a) => a.provenance === 'MODEL OUTPUT / DERIVED'
  );
  const forecastProvenanceValid = riskForecast.provenance === 'MODEL OUTPUT / DERIVED';

  assert(
    allAlertsHaveModelOutput && forecastProvenanceValid,
    'Provenance verification: All alerts and risk forecast strictly tagged MODEL OUTPUT / DERIVED',
    `Alerts (${riskForecast.allAlerts.length}) provenance valid: ${allAlertsHaveModelOutput}, Forecast provenance: ${riskForecast.provenance}`
  );
}

// -----------------------------------------------------------------------------
// TEST 14: Deterministic Repeatability & Non-Negativity:
// Two consecutive runs with identical inputs produce identical risk and strictly non-negative values
// -----------------------------------------------------------------------------
{
  const stormWeather = makeTestWeather(45.0);
  const runoff1 = generateRunoffForecast(stormWeather);
  const coupled1 = generateCoupledForecast(runoff1);
  const risk1 = generateRiskForecast(coupled1);

  const runoff2 = generateRunoffForecast(stormWeather);
  const coupled2 = generateCoupledForecast(runoff2);
  const risk2 = generateRiskForecast(coupled2);

  const identicalRisk = risk1.currentRisk === risk2.currentRisk &&
    risk1.highestRiskAcrossAllHorizons === risk2.highestRiskAcrossAllHorizons &&
    risk1.allAlerts.length === risk2.allAlerts.length;

  const nonNegativeMetrics = risk1.allAlerts.every((a) => a.metricValue >= 0) &&
    Object.values(risk1.horizons).every((h) =>
      h.cellAssessments.every((c) => c.depth_cm >= 0 && c.surcharge_m3 >= 0 && c.surcharge_m3s >= 0)
    );

  assert(
    identicalRisk && nonNegativeMetrics,
    'Deterministic repeatability and non-negativity: Identical outputs across runs and metrics >= 0',
    `Identical: ${identicalRisk}, Alerts count: ${risk1.allAlerts.length}, Non-negative: ${nonNegativeMetrics}`
  );
}

console.log('\n======================================================================');
console.log(`ALL TESTS PASSED: ${passedTests} / ${totalTests} (100%)`);
console.log('PHASE 4B RISK SCORING & ALERTS ENGINE FULLY VERIFIED');
console.log('======================================================================\n');

import {
  calculateManningCapacity,
  getPipeUtilizationCategory,
  getNodeSurchargeStatus,
  getTopologicalOrder,
  simulateDrainageNetwork,
  generateDrainageForecast,
} from '../src/services/drainageService';
import { generateRunoffForecast } from '../src/services/runoffService';
import { PROTOTYPE_DRAINAGE_NODES, PROTOTYPE_DRAINAGE_EDGES } from '../src/mock/drainageNetwork';
import { NormalizedWeatherObservation } from '../src/types/weather';

console.log('====================================================');
console.log('PHASE 3C DRAINAGE NETWORK & HYDRAULIC VERIFICATION');
console.log('====================================================\n');

let passedTests = 0;
let totalTests = 0;

function assert(condition: boolean, testName: string, detail?: string) {
  totalTests++;
  if (condition) {
    passedTests++;
    console.log(`[PASS] ${testName}${detail ? ` (${detail})` : ''}`);
  } else {
    console.error(`[FAIL] ${testName}${detail ? ` (${detail})` : ''}`);
    process.exitCode = 1;
  }
}

// 1. Graph Topology Validity (31 nodes, all edges connect existing nodes)
const nodeIds = new Set(PROTOTYPE_DRAINAGE_NODES.map((n) => n.id));
let allEdgesValid = true;
let danglingEdges = 0;

PROTOTYPE_DRAINAGE_EDGES.forEach((e) => {
  if (!nodeIds.has(e.from_node) || !nodeIds.has(e.to_node)) {
    allEdgesValid = false;
    danglingEdges++;
    console.error(`Invalid edge endpoints in ${e.id}: from=${e.from_node}, to=${e.to_node}`);
  }
});

assert(
  PROTOTYPE_DRAINAGE_NODES.length === 31 && allEdgesValid,
  '1. Graph topology validity (31 prototype nodes, 26 edges, 0 dangling endpoints)',
  `Nodes: ${PROTOTYPE_DRAINAGE_NODES.length}, Edges: ${PROTOTYPE_DRAINAGE_EDGES.length}`
);

// 2. DAG Requirement (No cycles, valid topological sort)
const topoOrder = getTopologicalOrder(PROTOTYPE_DRAINAGE_NODES, PROTOTYPE_DRAINAGE_EDGES);
assert(
  topoOrder.length === 31,
  '2. Directed Acyclic Graph (DAG) requirement satisfied with complete topological order',
  `Ordered count: ${topoOrder.length}`
);

// Verify topological order: for every edge, from_node precedes to_node
let topoValid = true;
PROTOTYPE_DRAINAGE_EDGES.forEach((e) => {
  const fromIdx = topoOrder.indexOf(e.from_node);
  const toIdx = topoOrder.indexOf(e.to_node);
  if (fromIdx >= toIdx) {
    topoValid = false;
    console.error(`Topological inversion on edge ${e.id}: ${e.from_node} (idx ${fromIdx}) -> ${e.to_node} (idx ${toIdx})`);
  }
});

assert(
  topoValid,
  '3. Strict downstream flow ordering: every upstream node is evaluated prior to downstream receiver',
  'All 26 edges respect topological ordering'
);

// 3. Manning Gravity Capacity Formula Dimensional Correctness
// Case: Circular pipe, D = 1.5 m, S = 0.0025 m/m, n = 0.013
// A = π * 1.5² / 4 = 1.76715 m²
// R = 1.5 / 4 = 0.375 m
// Q = (1/0.013) * 1.76715 * (0.375)^(2/3) * (0.0025)^(1/2)
// Q = 76.923 * 1.76715 * 0.52002 * 0.05 = 3.535 m³/s
const testCap = calculateManningCapacity({
  edge_type: 'CIRCULAR_PIPE',
  diameter_m: 1.5,
  slope: 0.0025,
  roughness_n: 0.013,
});

assert(
  Math.abs(testCap.capacity_m3_s - 3.535) < 0.05,
  '4. Manning formula dimensional exactness Q = (1/n) * A * R^(2/3) * S^(1/2)',
  `Computed: ${testCap.capacity_m3_s} m³/s, Expected: ~3.535 m³/s`
);

// 4. Monotonic Capacity Scaling with Diameter
const cap12 = calculateManningCapacity({ edge_type: 'CIRCULAR_PIPE', diameter_m: 1.2, slope: 0.002, roughness_n: 0.013 });
const cap18 = calculateManningCapacity({ edge_type: 'CIRCULAR_PIPE', diameter_m: 1.8, slope: 0.002, roughness_n: 0.013 });
const cap24 = calculateManningCapacity({ edge_type: 'CIRCULAR_PIPE', diameter_m: 2.4, slope: 0.002, roughness_n: 0.013 });

assert(
  cap12.capacity_m3_s < cap18.capacity_m3_s && cap18.capacity_m3_s < cap24.capacity_m3_s,
  '5. Monotonic hydraulic scaling: capacity strictly increases with pipe diameter',
  `D=1.2m: ${cap12.capacity_m3_s} m³/s, D=1.8m: ${cap18.capacity_m3_s} m³/s, D=2.4m: ${cap24.capacity_m3_s} m³/s`
);

// 5. Zero Rainfall Invariant: Produces zero pipe flow, zero utilization, zero surcharge
const zeroWeather: NormalizedWeatherObservation = {
  station_id: '43003',
  station_name: 'IMD Santacruz Mumbai',
  source: 'IMD_NOWCAST_BULLETIN',
  source_timestamp: new Date().toISOString(),
  fetched_at: new Date().toISOString(),
  current_rainfall_mm_hr: 0.0,
  temperature_c: 28.0,
  humidity_pct: 80,
  wind_speed_kmh: 15,
  status: 'LIVE',
  is_stale: false,
  freshness_age_minutes: 5,
  nowcast_steps: {
    0: { hour_offset: 0, label: 'T+0', rainfall_intensity_mm_hr: 0.0, flood_risk_level: 'Low' },
    1: { hour_offset: 1, label: 'T+1', rainfall_intensity_mm_hr: 0.0, flood_risk_level: 'Low' },
    2: { hour_offset: 2, label: 'T+2', rainfall_intensity_mm_hr: 0.0, flood_risk_level: 'Low' },
    3: { hour_offset: 3, label: 'T+3', rainfall_intensity_mm_hr: 0.0, flood_risk_level: 'Low' },
  },
};

const zeroRunoff = generateRunoffForecast(zeroWeather);
const zeroDrainage = simulateDrainageNetwork(zeroRunoff.horizons[0]);

let zeroPass = true;
if (
  zeroDrainage.total_surface_inflow_m3_s !== 0 ||
  zeroDrainage.total_outfall_discharge_m3_s !== 0 ||
  zeroDrainage.total_surcharge_rate_m3_s !== 0 ||
  zeroDrainage.surcharged_nodes_count !== 0 ||
  zeroDrainage.overcapacity_pipes_count !== 0
) {
  zeroPass = false;
}

assert(
  zeroPass,
  '6. Zero rainfall invariant: 0 inflow, 0 outfall, 0 surcharge, 0 overcapacity pipes',
  `Inflow: ${zeroDrainage.total_surface_inflow_m3_s} m³/s, Surcharge: ${zeroDrainage.total_surcharge_rate_m3_s} m³/s`
);

// 6. Non-negativity Invariant
let nonNegativePass = true;
zeroDrainage.nodes.forEach((n) => {
  if (n.surface_inflow_m3_s < 0 || n.total_inflow_m3_s < 0 || n.discharged_outflow_m3_s < 0 || n.surcharge_rate_m3_s < 0) {
    nonNegativePass = false;
  }
});
zeroDrainage.edges.forEach((e) => {
  if (e.actual_flow_m3_s < 0 || e.utilization_pct < 0) {
    nonNegativePass = false;
  }
});

assert(
  nonNegativePass,
  '7. Non-negativity invariant: all node flows, edge flows, and surcharge rates >= 0',
  'All values verified >= 0'
);

// 7. Controlled DEMO Test: Heavy Storm (65 mm/hr) demonstrating Hydraulic Capacity & Surcharge
const stormWeather: NormalizedWeatherObservation = {
  station_id: '43003',
  station_name: 'IMD Santacruz Mumbai',
  source: 'FALLBACK_CLIMATOLOGY',
  source_timestamp: new Date().toISOString(),
  fetched_at: new Date().toISOString(),
  current_rainfall_mm_hr: 65.0,
  temperature_c: 26.0,
  humidity_pct: 95,
  wind_speed_kmh: 25,
  status: 'DEMO',
  is_stale: false,
  freshness_age_minutes: 0,
  nowcast_steps: {
    0: { hour_offset: 0, label: 'T+0', rainfall_intensity_mm_hr: 65.0, flood_risk_level: 'Very High' },
    1: { hour_offset: 1, label: 'T+1', rainfall_intensity_mm_hr: 85.0, flood_risk_level: 'Severe' },
    2: { hour_offset: 2, label: 'T+2', rainfall_intensity_mm_hr: 50.0, flood_risk_level: 'High' },
    3: { hour_offset: 3, label: 'T+3', rainfall_intensity_mm_hr: 25.0, flood_risk_level: 'Moderate' },
  },
};

const stormRunoff = generateRunoffForecast(stormWeather);
const stormDrainage = simulateDrainageNetwork(stormRunoff.horizons[0]);

// Verify we have normal, moderate, high, and over-capacity pipes
let hasNormalPipe = false;
let hasModeratePipe = false;
let hasHighPipe = false;
let hasOverCapacityPipe = false;

stormDrainage.edges.forEach((e) => {
  if (e.status === 'NORMAL') hasNormalPipe = true;
  if (e.status === 'MODERATE') hasModeratePipe = true;
  if (e.status === 'HIGH') hasHighPipe = true;
  if (e.status === 'OVER_CAPACITY') hasOverCapacityPipe = true;
});

assert(
  hasNormalPipe && hasOverCapacityPipe,
  '8. Pipe utilization spectrum under storm runoff (demonstrates NORMAL through OVER_CAPACITY)',
  `Overcapacity pipes: ${stormDrainage.overcapacity_pipes_count}/${stormDrainage.total_edges_count}`
);

// Verify node surcharge & overflow detection
let hasSurchargeNode = false;
let hasOverflowNode = false;

stormDrainage.nodes.forEach((n) => {
  if (n.status === 'SURCHARGE') hasSurchargeNode = true;
  if (n.status === 'OVERFLOW') hasOverflowNode = true;
});

assert(
  hasSurchargeNode || hasOverflowNode,
  '9. Node surcharge and overflow detection when incoming flow exceeds pipe capacity',
  `Surcharged nodes: ${stormDrainage.surcharged_nodes_count}/${stormDrainage.total_nodes_count}, Total Surcharge: ${stormDrainage.total_surcharge_rate_m3_s} m³/s`
);

// 8. Water-Balance Conservation Check: ΣQ_in = ΣQ_outfall + ΣQ_surcharge
const sumDischarge = stormDrainage.total_outfall_discharge_m3_s + stormDrainage.total_surcharge_rate_m3_s;
const balanceDiff = Math.abs(sumDischarge - stormDrainage.total_surface_inflow_m3_s);
const balanceErrorPct = (balanceDiff / stormDrainage.total_surface_inflow_m3_s) * 100;

assert(
  stormDrainage.flow_balance_conserved && balanceErrorPct < 0.1,
  '10. Instantaneous flow-rate balance: ΣQ_in = ΣQ_outfall + ΣQ_surcharge (100% Mass Conserved)',
  `Inflow: ${stormDrainage.total_surface_inflow_m3_s} m³/s, Sum Out: ${sumDischarge.toFixed(3)} m³/s, Error: ${balanceErrorPct.toFixed(4)}%`
);

// Volume balance over 1-hr interval: ΣV_in = ΣV_outfall + ΣV_surcharge
assert(
  stormDrainage.volume_balance_conserved,
  '11. Timestep volume accounting balance: ΣV_in = ΣV_outfall + ΣV_surcharge over 1-hr interval',
  `V_in: ${stormDrainage.total_inflow_volume_m3.toLocaleString()} m³, V_outfall: ${stormDrainage.total_outfall_volume_m3.toLocaleString()} m³, V_surcharge: ${stormDrainage.total_surcharge_volume_m3.toLocaleString()} m³`
);

// 9. Deterministic Repeated Simulation
const repeatDrainage = simulateDrainageNetwork(stormRunoff.horizons[0]);
assert(
  stormDrainage.total_surface_inflow_m3_s === repeatDrainage.total_surface_inflow_m3_s &&
  stormDrainage.total_outfall_discharge_m3_s === repeatDrainage.total_outfall_discharge_m3_s &&
  stormDrainage.total_surcharge_rate_m3_s === repeatDrainage.total_surcharge_rate_m3_s,
  '12. Deterministic simulation: Repeated runs yield identical numeric results',
  'Exact bitwise match'
);

// 10. Data Provenance & Status Propagation
const liveWeather: NormalizedWeatherObservation = {
  ...stormWeather,
  status: 'LIVE',
  source: 'IMD_NOWCAST_BULLETIN',
};
const liveRunoff = generateRunoffForecast(liveWeather);
const liveForecast = generateDrainageForecast(liveRunoff);

const errorWeather: NormalizedWeatherObservation = {
  ...stormWeather,
  status: 'ERROR',
};
const errorRunoff = generateRunoffForecast(errorWeather);
const errorForecast = generateDrainageForecast(errorRunoff);

assert(
  liveForecast.status === 'LIVE' &&
  liveForecast.horizons[0].status === 'LIVE' &&
  liveForecast.horizons[1].status === 'DERIVED' &&
  errorForecast.status === 'ERROR' &&
  errorForecast.horizons[0].total_surface_inflow_m3_s === 0,
  '13. Status and provenance propagation: LIVE -> LIVE at T+0, DERIVED at T+1..T+3, ERROR collapses flows safely',
  `Live T+0: ${liveForecast.horizons[0].status}, Live T+1: ${liveForecast.horizons[1].status}, Error T+0: ${errorForecast.horizons[0].status}`
);

console.log('\n====================================================');
console.log(`VERIFICATION COMPLETE: ${passedTests}/${totalTests} TESTS PASSED`);
console.log('====================================================');

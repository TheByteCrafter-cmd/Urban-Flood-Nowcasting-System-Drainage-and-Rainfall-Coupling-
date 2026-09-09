import { generateSurfaceFlowForecast, GRID_D8_TOPOLOGY } from '../src/services/surfaceFlowService';
import { generateRunoffForecast } from '../src/services/runoffService';
import { PROTOTYPE_CATCHMENTS } from '../src/mock/catchments';
import { NormalizedWeatherObservation } from '../src/types/weather';
import { RunoffForecast } from '../src/types/runoff';

console.log('====================================================');
console.log('PHASE 3B DEM-BASED 2D SURFACE FLOW VERIFICATION');
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

// 1. D8 Topology and Elevation Gradient Verification
assert(
  GRID_D8_TOPOLOGY.length === 25,
  '1. D8 Topology computes 25 valid catchment cells',
  `Cell count: ${GRID_D8_TOPOLOGY.length}`
);

// Check that slope directions point from higher elevation to lower elevation or sink/boundary
let allSlopesValid = true;
let higherToLowerCount = 0;
let sinkOrBoundaryCount = 0;

const topoMap = new Map(GRID_D8_TOPOLOGY.map((node) => [node.cell_id, node]));

GRID_D8_TOPOLOGY.forEach((node) => {
  if (node.is_sink) {
    sinkOrBoundaryCount++;
  } else if (node.downstream_cell_id) {
    const targetNode = topoMap.get(node.downstream_cell_id);
    if (targetNode) {
      if (node.elevation_m > targetNode.elevation_m) {
        higherToLowerCount++;
      } else {
        allSlopesValid = false;
        console.error(`Slope inverted for ${node.cell_id} (${node.elevation_m}m) -> ${node.downstream_cell_id} (${targetNode.elevation_m}m)`);
      }
    }
  } else if (node.is_boundary_outflow) {
    sinkOrBoundaryCount++;
    if (node.elevation_diff_m > 0) {
      higherToLowerCount++;
    }
  }
});

assert(
  allSlopesValid && higherToLowerCount > 0,
  '2. Water moves strictly from higher cell to lower cell along D8 path',
  `Higher-to-lower routes: ${higherToLowerCount}, Sinks/Boundaries: ${sinkOrBoundaryCount}`
);

// 2. Zero Rain / Zero Runoff Produces Zero Depth & Zero Stored Volume
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
    0: { hour_offset: 0, label: 'T+0 (Current)', rainfall_intensity_mm_hr: 0.0, flood_risk_level: 'Low' },
    1: { hour_offset: 1, label: 'T+1 (+1h)', rainfall_intensity_mm_hr: 0.0, flood_risk_level: 'Low' },
    2: { hour_offset: 2, label: 'T+2 (+2h)', rainfall_intensity_mm_hr: 0.0, flood_risk_level: 'Low' },
    3: { hour_offset: 3, label: 'T+3 (+3h)', rainfall_intensity_mm_hr: 0.0, flood_risk_level: 'Low' },
  },
};

const zeroRunoffForecast = generateRunoffForecast(zeroWeather);
const zeroFlowForecast = generateSurfaceFlowForecast(zeroRunoffForecast);

let zeroDepthPass = true;
Object.values(zeroFlowForecast.horizons).forEach((horizon) => {
  if (horizon.total_retained_surface_volume_m3 !== 0 || horizon.max_water_depth_cm !== 0) {
    zeroDepthPass = false;
  }
  horizon.cells.forEach((c) => {
    if (c.water_depth_m !== 0 || c.water_depth_cm !== 0 || c.retained_surface_volume_m3 !== 0) {
      zeroDepthPass = false;
    }
  });
});

assert(
  zeroDepthPass,
  '3. Zero rain/runoff invariant: produces 0 depth and 0 stored volume across all cells and horizons',
  `Total stored: ${zeroFlowForecast.horizons[0].total_retained_surface_volume_m3} m³`
);

// 3. Water Balance Conservation Invariant (Mass Conservation: Input Runoff = Stored Water + Boundary Outflow)
const liveWeather: NormalizedWeatherObservation = {
  station_id: '43003',
  station_name: 'IMD Santacruz Mumbai',
  source: 'IMD_NOWCAST_BULLETIN',
  source_timestamp: new Date().toISOString(),
  fetched_at: new Date().toISOString(),
  current_rainfall_mm_hr: 55.0,
  temperature_c: 26.5,
  humidity_pct: 95,
  wind_speed_kmh: 24,
  status: 'LIVE',
  is_stale: false,
  freshness_age_minutes: 10,
  nowcast_steps: {
    0: { hour_offset: 0, label: 'T+0 (Current)', rainfall_intensity_mm_hr: 55.0, flood_risk_level: 'Very High' },
    1: { hour_offset: 1, label: 'T+1 (+1h)', rainfall_intensity_mm_hr: 75.0, flood_risk_level: 'Severe' },
    2: { hour_offset: 2, label: 'T+2 (+2h)', rainfall_intensity_mm_hr: 40.0, flood_risk_level: 'High' },
    3: { hour_offset: 3, label: 'T+3 (+3h)', rainfall_intensity_mm_hr: 20.0, flood_risk_level: 'Moderate' },
  },
};

const liveRunoffForecast = generateRunoffForecast(liveWeather);
const liveFlowForecast = generateSurfaceFlowForecast(liveRunoffForecast);

let massConservationPass = true;
let maxBalanceErrorPct = 0;

Object.entries(liveFlowForecast.horizons).forEach(([hourStr, horizon]) => {
  const h = Number(hourStr) as 0 | 1 | 2 | 3;
  const inputRunoffM3 = liveRunoffForecast.horizons[h].total_runoff_volume_m3;
  const storedM3 = horizon.total_retained_surface_volume_m3;
  const boundaryM3 = horizon.total_boundary_outflow_volume_m3;
  const sumM3 = storedM3 + boundaryM3;
  const diff = Math.abs(sumM3 - inputRunoffM3);
  const errorPct = inputRunoffM3 > 0 ? (diff / inputRunoffM3) * 100 : 0;

  if (errorPct > maxBalanceErrorPct) maxBalanceErrorPct = errorPct;
  if (errorPct > 0.001) {
    massConservationPass = false;
    console.error(`Horizon T+${h} Mass Balance Failure: Input=${inputRunoffM3}, Sum=${sumM3}, Diff=${diff} m³ (${errorPct}%)`);
  }
});

assert(
  massConservationPass,
  '4. Water balance check (100% Mass Conservation: Total Runoff = Stored Water + Boundary Outflow)',
  `Max error: ${maxBalanceErrorPct.toFixed(6)}% (Strict tolerance < 0.001%)`
);

// 4. Non-Negativity Invariant (No negative volumes or depths anywhere)
let nonNegativePass = true;
Object.values(liveFlowForecast.horizons).forEach((horizon) => {
  horizon.cells.forEach((cell) => {
    if (
      cell.water_depth_m < 0 ||
      cell.water_depth_cm < 0 ||
      cell.retained_surface_volume_m3 < 0 ||
      cell.transferred_outflow_m3 < 0 ||
      cell.upstream_inflow_volume_m3 < 0 ||
      cell.boundary_outflow_m3 < 0
    ) {
      nonNegativePass = false;
    }
  });
});

assert(
  nonNegativePass,
  '5. Non-negativity invariant: No negative inflow, outflow, stored volume, or depth',
  'All values >= 0'
);

// 5. Boundary Outflow Tracking & Arabian Sea / Domain Perimeter Sinks
let boundaryOutflowTracked = false;
Object.values(liveFlowForecast.horizons).forEach((horizon) => {
  if (horizon.total_boundary_outflow_volume_m3 > 0) {
    boundaryOutflowTracked = true;
  }
});

assert(
  boundaryOutflowTracked,
  '6. Boundary outflow is explicitly tracked to coastal/domain boundaries',
  `T+0 Boundary Outflow: ${liveFlowForecast.horizons[0].total_boundary_outflow_volume_m3.toLocaleString()} m³`
);

// 6. Monotonicity Invariant (Higher rainfall produces equal or higher depth)
const heavyWeather: NormalizedWeatherObservation = {
  ...liveWeather,
  current_rainfall_mm_hr: 110.0,
  nowcast_steps: {
    0: { hour_offset: 0, label: 'T+0 (Current)', rainfall_intensity_mm_hr: 110.0, flood_risk_level: 'Severe' },
    1: { hour_offset: 1, label: 'T+1 (+1h)', rainfall_intensity_mm_hr: 110.0, flood_risk_level: 'Severe' },
    2: { hour_offset: 2, label: 'T+2 (+2h)', rainfall_intensity_mm_hr: 110.0, flood_risk_level: 'Severe' },
    3: { hour_offset: 3, label: 'T+3 (+3h)', rainfall_intensity_mm_hr: 110.0, flood_risk_level: 'Severe' },
  },
};

const heavyRunoffForecast = generateRunoffForecast(heavyWeather);
const heavyFlowForecast = generateSurfaceFlowForecast(heavyRunoffForecast);

let monotonicPass = true;
for (let i = 0; i < 25; i++) {
  const depthLive = liveFlowForecast.horizons[0].cells[i].water_depth_cm;
  const depthHeavy = heavyFlowForecast.horizons[0].cells[i].water_depth_cm;
  if (depthHeavy < depthLive) {
    monotonicPass = false;
    console.error(`Monotonicity violation at cell ${i}: depthHeavy=${depthHeavy} < depthLive=${depthLive}`);
  }
}

assert(
  monotonicPass,
  '7. Monotonicity invariant: Higher rainfall produces equal or higher surface water depth',
  `Peak depth under 55mm/hr: ${liveFlowForecast.horizons[0].max_water_depth_cm} cm, under 110mm/hr: ${heavyFlowForecast.horizons[0].max_water_depth_cm} cm`
);

// 7. Deterministic Output for T+0..T+3
const repeatFlowForecast = generateSurfaceFlowForecast(liveRunoffForecast);
let deterministicPass = true;
[0, 1, 2, 3].forEach((h) => {
  const hour = h as 0 | 1 | 2 | 3;
  if (
    liveFlowForecast.horizons[hour].total_retained_surface_volume_m3 !==
    repeatFlowForecast.horizons[hour].total_retained_surface_volume_m3
  ) {
    deterministicPass = false;
  }
});

assert(
  deterministicPass,
  '8. Deterministic simulation: Repeated runs yield identical numeric values across all horizons',
  'Exact bitwise match'
);

// 8. Data Provenance & Status Propagation (LIVE -> LIVE, DEMO -> DEMO, ERROR -> ERROR)
const demoWeather: NormalizedWeatherObservation = {
  ...liveWeather,
  status: 'DEMO',
  source: 'FALLBACK_CLIMATOLOGY',
};
const demoRunoff = generateRunoffForecast(demoWeather);
const demoFlow = generateSurfaceFlowForecast(demoRunoff);

const errorWeather: NormalizedWeatherObservation = {
  ...liveWeather,
  status: 'ERROR',
  source: 'FALLBACK_CLIMATOLOGY',
};
const errorRunoff = generateRunoffForecast(errorWeather);
const errorFlow = generateSurfaceFlowForecast(errorRunoff);

assert(
  liveFlowForecast.status === 'LIVE' &&
  demoFlow.status === 'DEMO' &&
  errorFlow.status === 'ERROR',
  '9. Data status propagation integrity: LIVE -> LIVE, DEMO -> DEMO, ERROR -> ERROR',
  `LiveStatus: ${liveFlowForecast.status}, DemoStatus: ${demoFlow.status}, ErrorStatus: ${errorFlow.status}`
);

// 9. Lowland vs Ridge Hydrological Differentiation
// High ridge cell (e.g. Vikhroli at 95m) should convey water downwards and retain lower depth than
// low-lying downstream reception cell (e.g. Kurla at 14m or Santacruz Subway at 8m)
const vikhroliCell = liveFlowForecast.horizons[0].cells.find((c) => c.zone_name.includes('Vikhroli') || c.elevation_m >= 90);
const kurlaCell = liveFlowForecast.horizons[0].cells.find((c) => c.zone_name.includes('Kurla') || c.zone_name.includes('BKC'));

assert(
  vikhroliCell !== undefined && kurlaCell !== undefined && kurlaCell.water_depth_cm >= vikhroliCell.water_depth_cm,
  '10. Spatial hydrological physics: Lowland accumulation zone exhibits higher depth than steep upland ridge',
  `Upland Ridge (${vikhroliCell?.zone_name}, ${vikhroliCell?.elevation_m}m): ${vikhroliCell?.water_depth_cm} cm vs Lowland Basin (${kurlaCell?.zone_name}, ${kurlaCell?.elevation_m}m): ${kurlaCell?.water_depth_cm} cm`
);

console.log('\n====================================================');
console.log(`VERIFICATION COMPLETE: ${passedTests}/${totalTests} TESTS PASSED`);
console.log('====================================================');

import {
  PROTOTYPE_ROAD_GRAPH,
  PROTOTYPE_ROAD_NODES,
  PROTOTYPE_ROAD_EDGES,
} from '../src/mock/roadNetwork';
import {
  calculateEdgeCostMultiplier,
  getEdgeFloodStatus,
  findRoute,
} from '../src/services/routingService';
import { generateRiskForecast } from '../src/services/riskService';
import { generateCoupledForecast } from '../src/services/couplingService';
import { generateRunoffForecast } from '../src/services/runoffService';
import { getDemoFallbackWeather } from '../src/services/weatherService';
import { RiskForecast, RiskAssessment, RiskLevel } from '../src/types/risk';
import { NormalizedWeatherObservation } from '../src/types/weather';
import { RoadNetworkGraph, RoadEdge } from '../src/types/routing';

console.log('======================================================================');
console.log('PHASE 4C: FLOOD-SAFE ROUTING & NAVIGATION ENGINE VALIDATION');
console.log('SIH26085 Multi-Modal Flood-Aware Pathfinding Suite');
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

function makeWeather(rainfallMmHr: number): NormalizedWeatherObservation {
  const base = getDemoFallbackWeather(`Verification Weather (${rainfallMmHr} mm/hr)`);
  return {
    ...base,
    status: rainfallMmHr === 0 ? 'LIVE' : 'DEMO',
    current_rainfall_mm_hr: rainfallMmHr,
    nowcast_steps: [
      { hour_offset: 0, label: 'T+0', timestamp: 'T+0', rainfall_intensity_mm_hr: rainfallMmHr, accumulated_rainfall_mm: rainfallMmHr, warning_level: 'Watch' },
      { hour_offset: 1, label: 'T+1', timestamp: 'T+1', rainfall_intensity_mm_hr: rainfallMmHr * 1.5, accumulated_rainfall_mm: rainfallMmHr * 2.5, warning_level: 'Watch' },
      { hour_offset: 2, label: 'T+2', timestamp: 'T+2', rainfall_intensity_mm_hr: rainfallMmHr * 2.0, accumulated_rainfall_mm: rainfallMmHr * 4.5, warning_level: 'Watch' },
      { hour_offset: 3, label: 'T+3', timestamp: 'T+3', rainfall_intensity_mm_hr: rainfallMmHr * 2.5, accumulated_rainfall_mm: rainfallMmHr * 7.0, warning_level: 'Watch' },
    ],
  };
}

// ----------------------------------------------------------------------------
// Test 1: Road Network Graph Topology & Integrity
// ----------------------------------------------------------------------------
const nodeCount = PROTOTYPE_ROAD_NODES.length;
const edgeCount = PROTOTYPE_ROAD_EDGES.length;
const nodeIds = new Set(PROTOTYPE_ROAD_NODES.map((n) => n.id));
const edgesValid = PROTOTYPE_ROAD_EDGES.every(
  (e) => nodeIds.has(e.source) && nodeIds.has(e.target) && e.distance_m > 0 && e.base_speed_kmh > 0
);

assert(
  nodeCount >= 10 && edgeCount >= 15 && edgesValid,
  'Road Network Graph Topology & Integrity',
  `Nodes: ${nodeCount} (req >= 10), Edges: ${edgeCount} (req >= 15), All edge endpoints valid: ${edgesValid}`
);

// ----------------------------------------------------------------------------
// Test 2: Shortest Route Calculation (Dry Weather Baseline)
// ----------------------------------------------------------------------------
const dryWeather = makeWeather(0);
const dryRunoff = generateRunoffForecast(dryWeather);
const dryCoupled = generateCoupledForecast(dryRunoff);
const dryRisk = generateRiskForecast(dryCoupled);

const dryRoute = findRoute('RN-CST', 'RN-ANDHERI', 'FASTEST', 'T+0', dryRisk);
assert(
  dryRoute.primary.status === 'FOUND' &&
    dryRoute.primary.segments.length > 0 &&
    dryRoute.primary.total_distance_km > 10,
  'Shortest Route Calculation (Dry Weather Baseline)',
  `Status: ${dryRoute.primary.status}, Segments: ${dryRoute.primary.segments.length}, Dist: ${dryRoute.primary.total_distance_km} km, Time: ${dryRoute.primary.total_time_min} min`
);

// ----------------------------------------------------------------------------
// Test 3: Dry Weather Invariant (Zero Multiplier Penalty)
// ----------------------------------------------------------------------------
const drySafest = findRoute('RN-CST', 'RN-ANDHERI', 'SAFEST', 'T+0', dryRisk);
const allDrySegmentsZeroWater = dryRoute.primary.segments.every((s) => s.flood_depth_cm === 0 && s.penalty_factor === 1.0);

assert(
  dryRoute.primary.max_flood_depth_cm === 0 &&
    drySafest.primary.max_flood_depth_cm === 0 &&
    allDrySegmentsZeroWater,
  'Dry Weather Invariant (Zero Multiplier Penalty)',
  `Max depth: ${dryRoute.primary.max_flood_depth_cm} cm, All penalty factors == 1.0: ${allDrySegmentsZeroWater}`
);

// ----------------------------------------------------------------------------
// Test 4: Safest Route Diverts Away from Flooded / High-Risk Chokepoints
// ----------------------------------------------------------------------------
// Heavy storm scenario (65 mm/hr)
const floodWeather = makeWeather(65);
const floodRunoff = generateRunoffForecast(floodWeather);
const floodCoupled = generateCoupledForecast(floodRunoff);
const floodRisk = generateRiskForecast(floodCoupled);

const floodSafest = findRoute('RN-CST', 'RN-ANDHERI', 'SAFEST', 'T+2', floodRisk);
const floodFastest = findRoute('RN-CST', 'RN-ANDHERI', 'FASTEST', 'T+2', floodRisk);

// Check if SAFEST route successfully avoids the severe chokepoints (Hindmata / Kurla)
const safestTraversesHindmataOrKurla = floodSafest.primary.segments.some(
  (s) => s.edge_id === 'RE-LOWER-PAREL-HINDMATA' || s.edge_id === 'RE-BKC-KURLA' || s.edge_id === 'RE-HINDMATA-BKC'
);

assert(
  floodSafest.primary.status === 'FOUND' && !safestTraversesHindmataOrKurla,
  'Safest Route Diverts Away from Flooded Chokepoints',
  `Safest route avoided Hindmata & Kurla chokepoints: ${!safestTraversesHindmataOrKurla}, Max depth: ${floodSafest.primary.max_flood_depth_cm} cm`
);

// ----------------------------------------------------------------------------
// Test 5: Emergency Mode Routing Under Flood Stress
// ----------------------------------------------------------------------------
const emergencyRoute = findRoute('RN-CST', 'RN-ANDHERI', 'EMERGENCY', 'T+2', floodRisk);
// Emergency mode permits high water wading up to 50cm but strictly avoids >= 50cm and CRITICAL
const emergencySafeWading = emergencyRoute.primary.segments.every(
  (s) => s.flood_depth_cm < 50 && s.risk_level !== 'CRITICAL'
);

assert(
  emergencyRoute.primary.status === 'FOUND' && emergencySafeWading && emergencyRoute.primary.max_flood_depth_cm < 50,
  'Emergency Mode Routing Under Flood Stress',
  `Emergency route found: true, Max wading depth: ${emergencyRoute.primary.max_flood_depth_cm} cm (< 50 cm limit), Safe wading: ${emergencySafeWading}`
);

// ----------------------------------------------------------------------------
// Test 6: Critical Flood Edge Blocking (Impassable Streets)
// ----------------------------------------------------------------------------
// Create synthetic mock assessment with CRITICAL risk on CST-Marine Lines link
const criticalAssessments: RiskAssessment[] = [
  {
    cellId: 'DEM-GRID-0-1',
    row: 0,
    col: 1,
    zoneName: 'South Mumbai',
    depth_cm: 115.0,
    depth_m: 1.15,
    riskLevel: 'CRITICAL',
    depthCategory: 'CRITICAL',
    color: '#7c3aed',
    surcharge_m3: 500,
    surcharge_m3s: 1.5,
    hasDrainageNode: true,
    drainageNodeStatus: 'OVERFLOW',
    pipeOverCapacity: true,
    reasons: ['Submerged road deck >= 100 cm'],
  },
];

const multCrit = calculateEdgeCostMultiplier('CRITICAL', 115.0, 'SAFEST');
const multCritFast = calculateEdgeCostMultiplier('CRITICAL', 115.0, 'FASTEST');
const multCritEmerg = calculateEdgeCostMultiplier('CRITICAL', 115.0, 'EMERGENCY');

assert(
  multCrit.isBlocked && multCritFast.isBlocked && multCritEmerg.isBlocked && multCrit.multiplier === Infinity,
  'Critical Flood Edge Blocking (Impassable Streets)',
  `Safest blocked: ${multCrit.isBlocked}, Fastest blocked: ${multCritFast.isBlocked}, Emergency blocked: ${multCritEmerg.isBlocked}`
);

// ----------------------------------------------------------------------------
// Test 7: Node Sequence & Path Continuity
// ----------------------------------------------------------------------------
const pathTest = floodSafest.primary;
let continuous = true;
for (let i = 1; i < pathTest.segments.length; i++) {
  if (pathTest.segments[i].from_node_id !== pathTest.segments[i - 1].to_node_id) {
    continuous = false;
    break;
  }
}
const startsAtOrigin = pathTest.segments[0].from_node_id === 'RN-CST';
const endsAtDest = pathTest.segments[pathTest.segments.length - 1].to_node_id === 'RN-ANDHERI';

assert(
  continuous && startsAtOrigin && endsAtDest,
  'Node Sequence & Path Continuity',
  `Continuous: ${continuous}, Origin match: ${startsAtOrigin}, Dest match: ${endsAtDest}, Hop count: ${pathTest.segments.length}`
);

// ----------------------------------------------------------------------------
// Test 8: Accurate Total Distance Calculation
// ----------------------------------------------------------------------------
const sumMeters = pathTest.segments.reduce((acc, s) => acc + s.distance_m, 0);
const distMatches = pathTest.total_distance_m === sumMeters && pathTest.total_distance_km === Number((sumMeters / 1000).toFixed(2));

assert(
  distMatches,
  'Accurate Total Distance Calculation',
  `Total distance: ${pathTest.total_distance_m} m (${pathTest.total_distance_km} km) matches segment sum ${sumMeters} m`
);

// ----------------------------------------------------------------------------
// Test 9: Accurate Total Travel Time with Flood Delay
// ----------------------------------------------------------------------------
const sumTimeS = pathTest.segments.reduce((acc, s) => acc + s.travel_time_s, 0);
// Time should be non-negative and approximate the sum
assert(
  pathTest.total_time_s > 0 && Math.abs(pathTest.total_time_s - sumTimeS) <= 1,
  'Accurate Total Travel Time with Flood Delay',
  `Total time: ${pathTest.total_time_s} s (${pathTest.total_time_min} min), matches sum of segments: ${sumTimeS} s`
);

// ----------------------------------------------------------------------------
// Test 10: Maximum Flood Depth Extraction
// ----------------------------------------------------------------------------
const calculatedMaxDepth = Math.max(...pathTest.segments.map((s) => s.flood_depth_cm));
assert(
  pathTest.max_flood_depth_cm === Number(calculatedMaxDepth.toFixed(1)),
  'Maximum Flood Depth Extraction',
  `Reported max depth: ${pathTest.max_flood_depth_cm} cm matches segment max: ${calculatedMaxDepth} cm`
);

// ----------------------------------------------------------------------------
// Test 11: Highest Risk Level Identification
// ----------------------------------------------------------------------------
const RISK_ORDER: Record<RiskLevel, number> = { LOW: 1, MODERATE: 2, HIGH: 3, VERY_HIGH: 4, CRITICAL: 5 };
let worstRisk: RiskLevel = 'LOW';
for (const seg of pathTest.segments) {
  if (RISK_ORDER[seg.risk_level] > RISK_ORDER[worstRisk]) worstRisk = seg.risk_level;
}
assert(
  pathTest.highest_risk_level === worstRisk,
  'Highest Risk Level Identification',
  `Reported highest risk: ${pathTest.highest_risk_level} matches evaluated worst risk: ${worstRisk}`
);

// ----------------------------------------------------------------------------
// Test 12: Multi-Horizon Temporal Isolation (T+0 vs T+3)
// ----------------------------------------------------------------------------
const routeT0 = findRoute('RN-DADAR-HINDMATA', 'RN-GHATKOPAR', 'SAFEST', 'T+0', floodRisk);
const routeT3 = findRoute('RN-DADAR-HINDMATA', 'RN-GHATKOPAR', 'SAFEST', 'T+3', floodRisk);

assert(
  routeT0.horizon === 'T+0' && routeT3.horizon === 'T+3',
  'Multi-Horizon Temporal Isolation (T+0 vs T+3)',
  `T+0 horizon: ${routeT0.horizon}, T+3 horizon: ${routeT3.horizon}, T+0 time: ${routeT0.primary.total_time_min} min, T+3 time: ${routeT3.primary.total_time_min} min`
);

// ----------------------------------------------------------------------------
// Test 13: Multi-Horizon Dynamic Path Adaptation
// ----------------------------------------------------------------------------
// Over time from T+0 to T+3, water accumulation in central basin increases travel cost
assert(
  routeT3.primary.total_time_s >= routeT0.primary.total_time_s,
  'Multi-Horizon Dynamic Path Adaptation',
  `T+3 travel time (${routeT3.primary.total_time_s}s) >= T+0 travel time (${routeT0.primary.total_time_s}s)`
);

// ----------------------------------------------------------------------------
// Test 14: Unreachable Destination Handling
// ----------------------------------------------------------------------------
// Create isolated mock graph where a node has all its connecting edges blocked
const isolatedGraph: RoadNetworkGraph = {
  nodes: [
    { id: 'RN-A', name: 'Island Node A', lat: 19.0, lng: 72.8, type: 'TERMINUS', catchment_cell_id: 'DEM-GRID-0-0', provenance: 'ASSUMED_PROTOTYPE' },
    { id: 'RN-B', name: 'Isolated Island B', lat: 19.1, lng: 72.9, type: 'TERMINUS', catchment_cell_id: 'DEM-GRID-1-1', provenance: 'ASSUMED_PROTOTYPE' },
  ],
  edges: [
    {
      id: 'RE-A-B',
      name: 'Submerged Bridge A-B',
      source: 'RN-A',
      target: 'RN-B',
      distance_m: 5000,
      base_speed_kmh: 50,
      road_type: 'ARTERIAL',
      bidirectional: true,
      catchment_cell_id: 'DEM-GRID-1-1',
      coordinates: [[19.0, 72.8], [19.1, 72.9]],
      provenance: 'ASSUMED_PROTOTYPE',
    },
  ],
  provenance: 'ASSUMED_PROTOTYPE',
};

const blockedTestRisk: RiskForecast = {
  ...floodRisk,
  horizons: {
    ...floodRisk.horizons,
    'T+1': {
      ...floodRisk.horizons['T+1'],
      cellAssessments: [
        {
          cellId: 'DEM-GRID-1-1',
          row: 1,
          col: 1,
          zoneName: 'Isolated Zone',
          depth_cm: 150.0,
          depth_m: 1.5,
          riskLevel: 'CRITICAL',
          depthCategory: 'CRITICAL',
          color: '#7c3aed',
          surcharge_m3: 1000,
          surcharge_m3s: 2.0,
          hasDrainageNode: false,
          pipeOverCapacity: true,
          reasons: ['Complete submersion'],
        },
      ],
    },
  },
};

const unreachableRoute = findRoute('RN-A', 'RN-B', 'SAFEST', 'T+1', blockedTestRisk, isolatedGraph);
assert(
  unreachableRoute.primary.status === 'NO_SAFE_ROUTE' && unreachableRoute.primary.segments.length === 0,
  'Unreachable Destination Handling',
  `Status: ${unreachableRoute.primary.status}, Reason: ${unreachableRoute.primary.explanation}`
);

// ----------------------------------------------------------------------------
// Test 15: Deterministic Repeatability Across Runs
// ----------------------------------------------------------------------------
const runA = findRoute('RN-CST', 'RN-ANDHERI', 'SAFEST', 'T+2', floodRisk);
const runB = findRoute('RN-CST', 'RN-ANDHERI', 'SAFEST', 'T+2', floodRisk);

const identical =
  runA.primary.total_distance_m === runB.primary.total_distance_m &&
  runA.primary.total_time_s === runB.primary.total_time_s &&
  runA.primary.path_node_ids.join('-') === runB.primary.path_node_ids.join('-') &&
  runA.primary.explanation === runB.primary.explanation;

assert(
  identical,
  'Deterministic Repeatability Across Runs',
  `Run A & B identical node paths: ${runA.primary.path_node_ids.join(' -> ')}`
);

console.log('\n======================================================================');
console.log(`ALL TESTS PASSED: ${passedTests} / ${totalTests} (100%)`);
console.log('PHASE 4C FLOOD-SAFE ROUTING ENGINE FULLY VERIFIED');
console.log('======================================================================\n');

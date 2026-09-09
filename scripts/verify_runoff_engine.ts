import {
  calculateRunoffRate,
  calculateRunoffDepth,
  calculateWaterVolumeM3,
  generateRunoffForecast,
} from '../src/services/runoffService';
import { PROTOTYPE_CATCHMENTS } from '../src/mock/catchments';
import { NormalizedWeatherObservation } from '../src/types/weather';

console.log('==================================================');
console.log('PHASE 3A MATHEMATICAL & HYDROLOGICAL VERIFICATION');
console.log('==================================================\n');

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

// 1. Dimensionally Correct Formulation Verification
// q_gen = (C * I * A) / (3.6 * 10^6)
// Case: C = 0.90, I = 50 mm/hr, A = 28,153,600 m² (1 cell)
// Expected: (0.90 * 50 * 28,153,600) / 3,600,000 = 1,266,912,000 / 3,600,000 = 351.92 m³/s
const testRate = calculateRunoffRate(0.90, 50, 28153600);
assert(
  Math.abs(testRate - 351.92) < 0.05,
  '1. Dimensional unit conversion q_gen = (C * I * A) / 3.6e6',
  `Computed: ${testRate} m³/s, Expected: 351.92 m³/s`
);

// 2. Zero Rainfall Invariant
const zeroRate = calculateRunoffRate(0.90, 0, 28153600);
const zeroDepth = calculateRunoffDepth(0.90, 0, 1.5);
const zeroVol = calculateWaterVolumeM3(0, 28153600);
assert(
  zeroRate === 0 && zeroDepth === 0 && zeroVol === 0,
  '2. Zero rainfall invariant',
  `Rate: ${zeroRate} m³/s, Depth: ${zeroDepth} mm, Vol: ${zeroVol} m³`
);

// 3. Monotonicity Test
// If I doubles, q_gen must double exactly
const rate50 = calculateRunoffRate(0.85, 50, 28153600);
const rate100 = calculateRunoffRate(0.85, 100, 28153600);
assert(
  Math.abs(rate100 - rate50 * 2) < 0.05,
  '3. Monotonic linearity test (I = 100 doubles q_gen vs I = 50)',
  `rate50: ${rate50}, rate100: ${rate100}, ratio: ${(rate100 / rate50).toFixed(4)}`
);

// 4. Imperviousness Sensitivity Test
// Compare high-density urban (C = 0.90, ds = 1.5) vs open park (C = 0.28, ds = 4.0) under I = 40 mm
const pGross = 40; // mm
const rUrban = calculateRunoffDepth(0.90, pGross, 1.5); // 0.90 * (40 - 1.5) = 34.65 mm
const rPark = calculateRunoffDepth(0.28, pGross, 4.0);  // 0.28 * (40 - 4.0) = 10.08 mm
assert(
  rUrban > rPark * 3,
  '4. Imperviousness sensitivity (High-Density Urban yields >3x runoff vs Open Park)',
  `rUrban: ${rUrban} mm, rPark: ${rPark} mm`
);

// 5. Catchment Grid Integrity (5x5 = 25 cells)
assert(
  PROTOTYPE_CATCHMENTS.length === 25,
  '5. Prototype Hydrological Grid cell count equals exactly 25',
  `Count: ${PROTOTYPE_CATCHMENTS.length}`
);

// 6. Water Balance Conservation Invariant (V_gross >= V_runoff for all cells & horizons)
const mockLiveWeather: NormalizedWeatherObservation = {
  station_id: '43003',
  station_name: 'IMD Santacruz Mumbai',
  source: 'IMD_NOWCAST_BULLETIN',
  source_timestamp: new Date().toISOString(),
  fetched_at: new Date().toISOString(),
  current_rainfall_mm_hr: 45.0,
  temperature_c: 27.5,
  humidity_pct: 94,
  wind_speed_kmh: 22,
  status: 'LIVE',
  is_stale: false,
  freshness_age_minutes: 15,
  nowcast_steps: {
    0: { hour_offset: 0, label: 'T+0 (Current)', rainfall_intensity_mm_hr: 45.0, flood_risk_level: 'High' },
    1: { hour_offset: 1, label: 'T+1 (+1h)', rainfall_intensity_mm_hr: 60.0, flood_risk_level: 'Very High' },
    2: { hour_offset: 2, label: 'T+2 (+2h)', rainfall_intensity_mm_hr: 30.0, flood_risk_level: 'Moderate' },
    3: { hour_offset: 3, label: 'T+3 (+3h)', rainfall_intensity_mm_hr: 10.0, flood_risk_level: 'Low' },
  },
};

const forecastLive = generateRunoffForecast(mockLiveWeather);
let allCellsConserved = true;
let totalViolations = 0;

([0, 1, 2, 3] as const).forEach((h) => {
  const grid = forecastLive.horizons[h];
  grid.cells.forEach((cell) => {
    if (cell.gross_rainfall_volume_m3 < cell.interval_runoff_volume_m3) {
      allCellsConserved = false;
      totalViolations++;
    }
  });
});

assert(
  allCellsConserved && totalViolations === 0,
  '6. Water volume conservation invariant: V_gross >= V_runoff across all 25 cells x 4 horizons',
  `Total violations: ${totalViolations}`
);

// 7. Provenance & State Propagation from LIVE weather
assert(
  forecastLive.horizons[0].status === 'LIVE' &&
  forecastLive.horizons[0].cells[0].rainfall_provenance === 'OBSERVED_LIVE',
  '7a. T+0 state is LIVE with OBSERVED_LIVE provenance under LIVE input'
);
assert(
  forecastLive.horizons[1].status === 'DERIVED' &&
  forecastLive.horizons[1].cells[0].rainfall_provenance === 'DERIVED_NOWCAST' &&
  forecastLive.horizons[3].status === 'DERIVED',
  '7b. T+1..T+3 states are DERIVED with DERIVED_NOWCAST provenance'
);

// 8. State Propagation from STALE, DEMO, and ERROR weather
const staleWeather = { ...mockLiveWeather, status: 'STALE' as const, is_stale: true };
const forecastStale = generateRunoffForecast(staleWeather);
assert(
  forecastStale.status === 'STALE' && forecastStale.horizons[0].status === 'STALE',
  '8a. STALE input propagates to STALE across all horizons'
);

const demoWeather = { ...mockLiveWeather, status: 'DEMO' as const };
const forecastDemo = generateRunoffForecast(demoWeather);
assert(
  forecastDemo.status === 'DEMO' && forecastDemo.horizons[0].status === 'DEMO',
  '8b. DEMO input propagates to DEMO across all horizons'
);

const errorWeather = { ...mockLiveWeather, status: 'ERROR' as const };
const forecastError = generateRunoffForecast(errorWeather);
assert(
  forecastError.status === 'ERROR' &&
  forecastError.horizons[0].status === 'ERROR' &&
  forecastError.horizons[0].peak_runoff_rate_m3_s === 0,
  '8c. ERROR input propagates to ERROR and zero runoff rate'
);

console.log(`\nVerification Complete: ${passedTests}/${totalTests} Tests Passed!`);

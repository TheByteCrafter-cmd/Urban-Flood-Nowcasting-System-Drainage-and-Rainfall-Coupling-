import { RunoffCellParameters, LandUseClass } from '../types/runoff';
import { MOCK_DEM_GEOJSON } from './dem';

/**
 * Prototype Hydrological Grid Catchment Parameters (5x5 Grid over Mumbai)
 * Bounds: Lng 72.78 to 72.98, Lat 18.92 to 19.22
 * Note: Land-use impervious fractions and depression storage values are
 * engineering assumptions based on Indian CPHEEO guidelines for urban catchments.
 * Provenance: ASSUMED_PROTOTYPE (Not measured municipal flow records).
 */

const CELL_AREA_M2 = 28153600; // ~28.15 km² per macro cell (4.24 km x 6.64 km)

// Land-use assignment matrix for 5 rows (North to South) x 5 cols (West to East)
const LANDUSE_PROFILES: {
  class: LandUseClass;
  f_imp: number;
  C: number;
  ds_mm: number;
}[] = [
  // Row 0 (North: Malad / Borivali / SGNP)
  { class: 'RESIDENTIAL_MIXED', f_imp: 0.70, C: 0.65, ds_mm: 2.5 },
  { class: 'RESIDENTIAL_MIXED', f_imp: 0.72, C: 0.68, ds_mm: 2.5 },
  { class: 'OPEN_SPACE_PARK',   f_imp: 0.20, C: 0.28, ds_mm: 4.0 }, // SGNP Ridge
  { class: 'OPEN_SPACE_PARK',   f_imp: 0.18, C: 0.25, ds_mm: 4.0 },
  { class: 'WETLAND_WATER',     f_imp: 0.90, C: 0.88, ds_mm: 1.0 }, // Thane Creek

  // Row 1 (North-Central: Andheri / Powai)
  { class: 'COMMERCIAL_PAVED',   f_imp: 0.92, C: 0.86, ds_mm: 1.5 },
  { class: 'HIGH_DENSITY_URBAN', f_imp: 0.88, C: 0.84, ds_mm: 1.5 },
  { class: 'OPEN_SPACE_PARK',    f_imp: 0.35, C: 0.40, ds_mm: 3.5 }, // Powai Lake Basin
  { class: 'RESIDENTIAL_MIXED',  f_imp: 0.65, C: 0.62, ds_mm: 2.5 },
  { class: 'WETLAND_WATER',      f_imp: 0.85, C: 0.82, ds_mm: 1.0 },

  // Row 2 (Central Corridor: Bandra / BKC / Kurla)
  { class: 'COMMERCIAL_PAVED',   f_imp: 0.94, C: 0.88, ds_mm: 1.5 },
  { class: 'HIGH_DENSITY_URBAN', f_imp: 0.90, C: 0.85, ds_mm: 1.5 }, // Kurla Mithi
  { class: 'HIGH_DENSITY_URBAN', f_imp: 0.89, C: 0.84, ds_mm: 1.5 }, // BKC
  { class: 'RESIDENTIAL_MIXED',  f_imp: 0.75, C: 0.70, ds_mm: 2.0 },
  { class: 'WETLAND_WATER',      f_imp: 0.90, C: 0.88, ds_mm: 1.0 },

  // Row 3 (South-Central: Dadar / Hindmata / Wadala)
  { class: 'HIGH_DENSITY_URBAN', f_imp: 0.95, C: 0.90, ds_mm: 1.5 }, // Hindmata Basin
  { class: 'HIGH_DENSITY_URBAN', f_imp: 0.92, C: 0.88, ds_mm: 1.5 },
  { class: 'HIGH_DENSITY_URBAN', f_imp: 0.88, C: 0.84, ds_mm: 1.8 },
  { class: 'RESIDENTIAL_MIXED',  f_imp: 0.70, C: 0.65, ds_mm: 2.5 },
  { class: 'WETLAND_WATER',      f_imp: 0.95, C: 0.92, ds_mm: 1.0 }, // Port Trust

  // Row 4 (South: Colaba / Fort / Marine Lines)
  { class: 'COMMERCIAL_PAVED',   f_imp: 0.95, C: 0.90, ds_mm: 1.5 }, // Colaba / Fort
  { class: 'HIGH_DENSITY_URBAN', f_imp: 0.92, C: 0.88, ds_mm: 1.5 },
  { class: 'COMMERCIAL_PAVED',   f_imp: 0.90, C: 0.86, ds_mm: 1.5 },
  { class: 'WETLAND_WATER',      f_imp: 0.95, C: 0.92, ds_mm: 0.8 },
  { class: 'WETLAND_WATER',      f_imp: 1.00, C: 0.98, ds_mm: 0.5 }, // Harbour
];

export const PROTOTYPE_CATCHMENTS: RunoffCellParameters[] = MOCK_DEM_GEOJSON.features.map(
  (demFeature, idx) => {
    const profile = LANDUSE_PROFILES[idx % LANDUSE_PROFILES.length];
    const coords = demFeature.geometry.coordinates[0];
    
    // Extract bounding box from coordinates
    const lngs = coords.map((c: number[]) => c[0]);
    const lats = coords.map((c: number[]) => c[1]);
    const minLng = Math.min(...lngs);
    const maxLng = Math.max(...lngs);
    const minLat = Math.min(...lats);
    const maxLat = Math.max(...lats);
    
    const row = Math.floor(idx / 5);
    const col = idx % 5;
    
    // Calculate approximate topographic slope based on elevation differences
    const elevation = demFeature.properties.elevation_m;
    const slopePct = Math.max(0.2, Number(((elevation / 4000) * 100).toFixed(1)));

    return {
      cell_id: demFeature.id || `HYDRO-CELL-${idx + 1}`,
      grid_row: row,
      grid_col: col,
      zone_name: demFeature.properties.zone_name || `Cell R${row}C${col}`,
      centroid: [Number(((minLng + maxLng) / 2).toFixed(4)), Number(((minLat + maxLat) / 2).toFixed(4))],
      bounds: [[minLat, minLng], [maxLat, maxLng]],
      geometry: demFeature.geometry,
      area_m2: CELL_AREA_M2,
      elevation_m: elevation,
      slope_pct: slopePct,
      landuse_class: profile.class,
      impervious_fraction: profile.f_imp,
      runoff_coefficient: profile.C,
      depression_storage_mm: profile.ds_mm,
      provenance: 'ASSUMED_PROTOTYPE',
    };
  }
);
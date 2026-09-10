from typing import List, Dict, Any
from app.services.risk_service import get_risk_classification

def compute_surface_flow_grid(rainfall_mm_hr: float = 48.5) -> List[Dict[str, Any]]:
    """
    Computes 2D overland surface storage grid based on micro-topography & rainfall runoff.
    """
    # 4x4 Grid representation for demo basin
    cells = []
    base_elevations = [
        [15.0, 12.0, 8.5, 6.0],
        [11.0, 4.2, 5.0, 7.5],
        [9.0,  4.5, 8.5, 10.0],
        [12.0, 7.8, 11.0, 14.0]
    ]
    
    # Rainfall depth multiplier
    depth_factor = rainfall_mm_hr / 48.5 if rainfall_mm_hr > 0 else 0.0
    
    for r in range(4):
        for c in range(4):
            elev = base_elevations[r][c]
            # Low elevation depressions retain more water
            if elev < 5.0:
                depth_cm = round(120.0 * depth_factor, 1)
            elif elev < 8.0:
                depth_cm = round(65.0 * depth_factor, 1)
            elif elev < 10.0:
                depth_cm = round(28.0 * depth_factor, 1)
            else:
                depth_cm = round(2.5 * depth_factor, 1)
                
            risk_info = get_risk_classification(depth_cm)
            cell_area = 625.0  # 25m x 25m cell
            vol_m3 = (depth_cm / 100.0) * cell_area
            outflow_m3 = vol_m3 * 0.15
            
            cells.append({
                "cell_id": f"CELL-{r}-{c}",
                "grid_row": r,
                "grid_col": c,
                "elevation_m": elev,
                "retained_volume_m3": round(vol_m3, 2),
                "boundary_outflow_m3": round(outflow_m3, 2),
                "water_depth_m": round(depth_cm / 100.0, 3),
                "water_depth_cm": depth_cm,
                "depth_category": risk_info["category"],
                "color": risk_info["color"]
            })
            
    return cells

import math
from typing import Dict, Any, Optional

def calculate_circular_pipe_capacity(
    diameter_m: float,
    slope: float,
    roughness_n: float = 0.013
) -> Dict[str, float]:
    """
    Calculate full-flow gravity capacity of a circular pipe using Manning's Equation:
    Q = (1/n) * A * (R_h)^(2/3) * S^(1/2)
    
    Parameters:
    - diameter_m: Inner diameter of circular pipe (meters)
    - slope: Longitudinal bed slope S (m/m)
    - roughness_n: Manning's n roughness coefficient (dimensionless, default 0.013 for concrete)
    
    Returns dict with cross_sectional_area_m2, wetted_perimeter_m, hydraulic_radius_m, capacity_m3_s, full_velocity_m_s
    """
    if diameter_m <= 0 or slope <= 0 or roughness_n <= 0:
        return {
            "cross_sectional_area_m2": 0.0,
            "wetted_perimeter_m": 0.0,
            "hydraulic_radius_m": 0.0,
            "capacity_m3_s": 0.0,
            "full_velocity_m_s": 0.0
        }
    
    radius = diameter_m / 2.0
    area = math.pi * (radius ** 2)
    perimeter = math.pi * diameter_m
    r_h = area / perimeter  # Equals D/4 for full circular pipe
    
    capacity = (1.0 / roughness_n) * area * (r_h ** (2.0 / 3.0)) * math.sqrt(slope)
    velocity = capacity / area if area > 0 else 0.0
    
    return {
        "cross_sectional_area_m2": round(area, 4),
        "wetted_perimeter_m": round(perimeter, 4),
        "hydraulic_radius_m": round(r_h, 4),
        "capacity_m3_s": round(capacity, 4),
        "full_velocity_m_s": round(velocity, 2)
    }

def calculate_box_culvert_capacity(
    width_m: float,
    height_m: float,
    slope: float,
    roughness_n: float = 0.015
) -> Dict[str, float]:
    """
    Calculate full-flow gravity capacity of a rectangular box culvert using Manning's Equation.
    """
    if width_m <= 0 or height_m <= 0 or slope <= 0 or roughness_n <= 0:
        return {
            "cross_sectional_area_m2": 0.0,
            "wetted_perimeter_m": 0.0,
            "hydraulic_radius_m": 0.0,
            "capacity_m3_s": 0.0,
            "full_velocity_m_s": 0.0
        }
    
    area = width_m * height_m
    perimeter = 2.0 * (width_m + height_m)
    r_h = area / perimeter
    
    capacity = (1.0 / roughness_n) * area * (r_h ** (2.0 / 3.0)) * math.sqrt(slope)
    velocity = capacity / area if area > 0 else 0.0
    
    return {
        "cross_sectional_area_m2": round(area, 4),
        "wetted_perimeter_m": round(perimeter, 4),
        "hydraulic_radius_m": round(r_h, 4),
        "capacity_m3_s": round(capacity, 4),
        "full_velocity_m_s": round(velocity, 2)
    }

def calculate_open_canal_capacity(
    width_m: float,
    depth_m: float,
    slope: float,
    roughness_n: float = 0.020
) -> Dict[str, float]:
    """
    Calculate gravity capacity of an open trapezoidal/rectangular channel.
    """
    if width_m <= 0 or depth_m <= 0 or slope <= 0 or roughness_n <= 0:
        return {
            "cross_sectional_area_m2": 0.0,
            "wetted_perimeter_m": 0.0,
            "hydraulic_radius_m": 0.0,
            "capacity_m3_s": 0.0,
            "full_velocity_m_s": 0.0
        }
    
    area = width_m * depth_m
    perimeter = width_m + (2.0 * depth_m)  # No top cover for open canal
    r_h = area / perimeter
    
    capacity = (1.0 / roughness_n) * area * (r_h ** (2.0 / 3.0)) * math.sqrt(slope)
    velocity = capacity / area if area > 0 else 0.0
    
    return {
        "cross_sectional_area_m2": round(area, 4),
        "wetted_perimeter_m": round(perimeter, 4),
        "hydraulic_radius_m": round(r_h, 4),
        "capacity_m3_s": round(capacity, 4),
        "full_velocity_m_s": round(velocity, 2)
    }

def compute_pipe_utilization(actual_flow_m3_s: float, capacity_m3_s: float) -> Dict[str, Any]:
    """
    Calculate capacity utilization percentage and pipe utilization category.
    """
    if capacity_m3_s <= 0:
        pct = 100.0 if actual_flow_m3_s > 0 else 0.0
    else:
        pct = (actual_flow_m3_s / capacity_m3_s) * 100.0
    
    pct = round(pct, 1)
    
    if pct <= 60.0:
        category = "NORMAL"
    elif pct <= 85.0:
        category = "MODERATE"
    elif pct <= 100.0:
        category = "HIGH"
    else:
        category = "CAPACITY_EXCEEDED"
        
    return {
        "utilization_pct": pct,
        "status": category
    }

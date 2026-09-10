from sqlalchemy import Column, Integer, String, Float, Boolean, DateTime, Text, JSON
from datetime import datetime
from app.core.database import Base

class WeatherReadingRecord(Base):
    __tablename__ = "weather_readings"

    id = Column(Integer, primary_key=True, index=True)
    city_id = Column(String, index=True, default="mumbai")
    rainfall_mm_hr = Column(Float, nullable=False)
    source = Column(String, default="IMD_LIVE")
    recorded_at = Column(DateTime, default=datetime.utcnow)

class NowcastFrameRecord(Base):
    __tablename__ = "nowcast_frames"

    id = Column(Integer, primary_key=True, index=True)
    city_id = Column(String, index=True, default="mumbai")
    horizon_label = Column(String, nullable=False)  # T+0, T+1, T+2, T+3
    hour_offset = Column(Integer, nullable=False)
    current_rainfall_mm_hr = Column(Float, nullable=False)
    max_predicted_water_depth_cm = Column(Float, nullable=False)
    critical_intersections_count = Column(Integer, default=0)
    surcharged_manholes_count = Column(Integer, default=0)
    created_at = Column(DateTime, default=datetime.utcnow)

class CatchmentRunoffRecord(Base):
    __tablename__ = "catchment_runoff"

    id = Column(Integer, primary_key=True, index=True)
    catchment_id = Column(String, index=True)
    land_use = Column(String, default="COMMERCIAL_DENSE_URBAN")
    runoff_coefficient_c = Column(Float, default=0.85)
    area_m2 = Column(Float, nullable=False)
    rainfall_mm_hr = Column(Float, nullable=False)
    runoff_m3_s = Column(Float, nullable=False)
    calculated_at = Column(DateTime, default=datetime.utcnow)

class DrainageNodeRecord(Base):
    __tablename__ = "drainage_nodes"

    id = Column(Integer, primary_key=True, index=True)
    node_id = Column(String, unique=True, index=True, nullable=False)
    name = Column(String, nullable=False)
    node_type = Column(String, default="MANHOLE")
    lat = Column(Float, nullable=False)
    lng = Column(Float, nullable=False)
    elevation_m = Column(Float, default=10.0)
    capacity_m3_s = Column(Float, default=2.5)

class DrainageEdgeRecord(Base):
    __tablename__ = "drainage_edges"

    id = Column(Integer, primary_key=True, index=True)
    pipe_id = Column(String, unique=True, index=True, nullable=False)
    name = Column(String, nullable=False)
    from_node = Column(String, nullable=False)
    to_node = Column(String, nullable=False)
    edge_type = Column(String, default="CIRCULAR_PIPE")
    diameter_m = Column(Float, default=1.2)
    length_m = Column(Float, default=250.0)
    slope = Column(Float, default=0.004)
    roughness_n = Column(Float, default=0.013)
    capacity_m3_s = Column(Float, nullable=False)

class CouplingStateRecord(Base):
    __tablename__ = "coupling_states"

    id = Column(Integer, primary_key=True, index=True)
    horizon_label = Column(String, index=True, default="T+1")
    input_runoff_volume_m3 = Column(Float, nullable=False)
    drainage_outfall_volume_m3 = Column(Float, nullable=False)
    surface_boundary_outflow_m3 = Column(Float, nullable=False)
    surface_stored_volume_m3 = Column(Float, nullable=False)
    is_conserved = Column(Boolean, default=True)
    internal_surcharge_return_m3 = Column(Float, default=0.0)
    internal_drainage_intake_m3 = Column(Float, default=0.0)
    computed_at = Column(DateTime, default=datetime.utcnow)

class AlertRecord(Base):
    __tablename__ = "alerts"

    id = Column(Integer, primary_key=True, index=True)
    alert_id = Column(String, unique=True, index=True)
    severity = Column(String, nullable=False)  # CRITICAL, HIGH, MODERATE
    location = Column(String, nullable=False)
    predicted_depth_cm = Column(Float, nullable=False)
    time_window = Column(String, nullable=False)
    recommended_action = Column(Text, nullable=False)
    issued_at = Column(DateTime, default=datetime.utcnow)

class SafeRouteRecord(Base):
    __tablename__ = "safe_routes"

    id = Column(Integer, primary_key=True, index=True)
    origin_name = Column(String, nullable=False)
    destination_name = Column(String, nullable=False)
    mode = Column(String, default="SAFEST")  # SAFEST, FASTEST, EMERGENCY
    total_distance_m = Column(Float, nullable=False)
    total_time_min = Column(Float, nullable=False)
    max_flood_depth_cm = Column(Float, nullable=False)
    evaluated_at = Column(DateTime, default=datetime.utcnow)

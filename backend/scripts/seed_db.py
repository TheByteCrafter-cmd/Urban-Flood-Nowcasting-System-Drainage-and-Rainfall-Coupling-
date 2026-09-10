import sys
import os
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from app.core.database import engine, Base, SessionLocal
from app.models.database_models import DrainageNodeRecord, DrainageEdgeRecord
from app.data.seed_data import MUMBAI_DRAINAGE_NODES, MUMBAI_DRAINAGE_EDGES

def seed_database():
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    try:
        # Seed nodes
        for node in MUMBAI_DRAINAGE_NODES:
            existing = db.query(DrainageNodeRecord).filter_by(node_id=node["node_id"]).first()
            if not existing:
                record = DrainageNodeRecord(
                    node_id=node["node_id"],
                    name=node["name"],
                    node_type=node["node_type"],
                    lat=node["lat"],
                    lng=node["lng"],
                    elevation_m=node["elevation_m"],
                    capacity_m3_s=node["capacity_m3_s"]
                )
                db.add(record)
                
        # Seed edges
        for edge in MUMBAI_DRAINAGE_EDGES:
            existing = db.query(DrainageEdgeRecord).filter_by(pipe_id=edge["pipe_id"]).first()
            if not existing:
                record = DrainageEdgeRecord(
                    pipe_id=edge["pipe_id"],
                    name=edge["name"],
                    from_node=edge["from_node"],
                    to_node=edge["to_node"],
                    edge_type=edge["edge_type"],
                    diameter_m=edge.get("diameter_m", 1.2),
                    length_m=edge["length_m"],
                    slope=edge["slope"],
                    roughness_n=edge["roughness_n"],
                    capacity_m3_s=2.46
                )
                db.add(record)
                
        db.commit()
        print("[OK] Database seeded successfully!")
    except Exception as e:
        db.rollback()
        print(f"[ERROR] Database seeding failed: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    seed_database()

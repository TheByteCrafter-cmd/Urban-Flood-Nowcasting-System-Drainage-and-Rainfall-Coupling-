from fastapi import APIRouter
from app.schemas.schemas import MapLayersResponse
from app.data.seed_data import MAP_LAYERS_METADATA

router = APIRouter()

@router.get("/map/layers", response_model=MapLayersResponse)
def get_map_layers_endpoint():
    return {
        "status": "success",
        "city_id": "mumbai",
        "crs": "EPSG:4326",
        "layers": MAP_LAYERS_METADATA
    }

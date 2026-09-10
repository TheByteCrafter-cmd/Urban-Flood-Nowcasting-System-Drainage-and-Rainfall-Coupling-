from fastapi import APIRouter
from app.models.schemas import CityListResponse
from app.data.mumbai_data import MUMBAI_CITY_INFO
from app.data.chennai_data import CHENNAI_CITY_INFO

router = APIRouter()

@router.get("/cities", response_model=CityListResponse)
def get_cities():
    """
    Returns dynamic listing of supported metropolitan study basins.
    Mumbai Metropolitan Region (MMR) is the default basin.
    """
    return {
        "status": "success",
        "data": [
            MUMBAI_CITY_INFO,
            CHENNAI_CITY_INFO
        ]
    }

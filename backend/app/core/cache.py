import time
from typing import Any, Optional, Dict, Tuple

class SimpleInMemoryCache:
    """
    In-memory TTL cache wrapper (mimics Redis GET/SET interface).
    Prevents API rate limiting when fetching live weather/telemetry data.
    """
    def __init__(self, default_ttl_seconds: int = 300):
        self._store: Dict[str, Tuple[Any, float]] = {}
        self.default_ttl = default_ttl_seconds

    def get(self, key: str) -> Optional[Any]:
        if key not in self._store:
            return None
        value, expiry = self._store[key]
        if time.time() > expiry:
            del self._store[key]
            return None
        return value

    def set(self, key: str, value: Any, ttl_seconds: Optional[int] = None) -> None:
        ttl = ttl_seconds if ttl_seconds is not None else self.default_ttl
        expiry = time.time() + ttl
        self._store[key] = (value, expiry)

    def clear(self) -> None:
        self._store.clear()

cache_service = SimpleInMemoryCache(default_ttl_seconds=300)

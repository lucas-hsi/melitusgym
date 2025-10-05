from .auth import router as auth_router
from .health import router as health_router
from .clinical import router as clinical_router

__all__ = ["auth_router", "health_router", "clinical_router"]
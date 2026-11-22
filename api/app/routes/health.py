"""Whether the API is up."""

from fastapi import APIRouter

from app.models import Health

router = APIRouter()


@router.get("/health", tags=["Health"], summary="Check the API is up")
def health() -> Health:
    """Always `ok` while the API is serving. Doesn't touch the database."""
    return Health(status="ok")

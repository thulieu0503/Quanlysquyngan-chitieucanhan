from datetime import datetime, timezone

from fastapi import APIRouter

router = APIRouter(prefix="/api/health", tags=["health"])


@router.get("")
async def health():
    return {"status": "ok", "timestamp": datetime.now(timezone.utc).isoformat()}

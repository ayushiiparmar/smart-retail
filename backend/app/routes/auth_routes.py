from fastapi import APIRouter, Depends

from app.dependencies import verify_manager_access

router = APIRouter(prefix="/api/auth", tags=["Auth"])


@router.post("/verify-pin")
def verify_pin(_: bool = Depends(verify_manager_access)):
    """
    Confirms whether the X-Manager-PIN header sent by the client matches the
    server-configured Store Manager PIN. Returns 200 on success, 403 on
    failure (raised by verify_manager_access). The frontend should use this
    instead of comparing the stored PIN against a hardcoded value, so that
    changing STORE_MANAGER_PIN (or the PIN saved in Settings) actually takes
    effect everywhere.
    """
    return {"authorized": True}

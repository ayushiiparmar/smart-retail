from fastapi import Header, HTTPException, status
import os

# Default store manager PIN for demonstration (can be overridden via env)
DEFAULT_MANAGER_PIN = os.getenv("STORE_MANAGER_PIN", "1234")

def verify_manager_access(x_manager_pin: str = Header(None, alias="X-Manager-PIN")):
    """
    Validates that the incoming request contains the authorized Store Manager PIN.
    Protects administrative routes: SKU deletion, catalog updates, supplier removal.
    """
    if not x_manager_pin or x_manager_pin.strip() != DEFAULT_MANAGER_PIN:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Administrative Access Denied: Valid Store Manager PIN required."
        )
    return True
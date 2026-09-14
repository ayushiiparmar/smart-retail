from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime

class SupplierBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=150)
    company: str = Field(..., min_length=1, max_length=150)
    phone: str = Field(..., min_length=10, max_length=20)
    email: Optional[str] = None
    address: Optional[str] = None

class SupplierCreate(SupplierBase):
    pass

class SupplierUpdate(BaseModel):
    name: Optional[str] = None
    company: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    address: Optional[str] = None

class ProductSimpleForSupplier(BaseModel):
    id: int
    name: str
    barcode: str
    selling_price: float
    current_stock: int

    class Config:
        from_attributes = True

class SupplierResponse(SupplierBase):
    id: int
    created_at: datetime
    product_count: int = 0

    class Config:
        from_attributes = True
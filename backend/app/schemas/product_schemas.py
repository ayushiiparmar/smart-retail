from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime

class CategorySimple(BaseModel):
    id: int
    name: str

    class Config:
        from_attributes = True

class SupplierSimple(BaseModel):
    id: int
    name: str
    company: str

    class Config:
        from_attributes = True

class ProductBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=200)
    category_id: int
    supplier_id: Optional[int] = None
    barcode: str = Field(..., min_length=3, max_length=64)
    cost_price: float = Field(..., ge=0.0)
    selling_price: float = Field(..., ge=0.0)
    current_stock: int = Field(..., ge=0)
    min_stock_level: int = Field(default=5, ge=0)

class ProductCreate(ProductBase):
    pass

class ProductUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=200)
    category_id: Optional[int] = None
    supplier_id: Optional[int] = None
    barcode: Optional[str] = Field(None, min_length=3, max_length=64)
    cost_price: Optional[float] = Field(None, ge=0.0)
    selling_price: Optional[float] = Field(None, ge=0.0)
    current_stock: Optional[int] = Field(None, ge=0)
    min_stock_level: Optional[int] = Field(None, ge=0)

class StockAdjustment(BaseModel):
    adjustment: int  # Can be positive (restock) or negative (shrinkage/damaged)

class ProductResponse(ProductBase):
    id: int
    created_at: datetime
    updated_at: Optional[datetime] = None
    category: Optional[CategorySimple] = None
    supplier: Optional[SupplierSimple] = None

    class Config:
        from_attributes = True
from pydantic import BaseModel, Field
from typing import List, Optional
from datetime import datetime

class SaleItemCreate(BaseModel):
    product_id: int
    quantity: int = Field(..., gt=0)

class SaleCreate(BaseModel):
    customer_id: Optional[int] = None
    payment_method: str = Field(default="Cash")  # Cash, UPI, Card
    discount: float = Field(default=0.0, ge=0.0)
    tax_rate: float = Field(default=0.0, ge=0.0)  # Percentage (e.g. 5 for 5% GST)
    items: List[SaleItemCreate] = Field(..., min_length=1)

class SaleItemDetail(BaseModel):
    id: int
    product_id: int
    product_name: str
    unit_price: float
    quantity: int
    line_total: float

    class Config:
        from_attributes = True

class CustomerSimple(BaseModel):
    id: int
    name: str
    phone: str

    class Config:
        from_attributes = True

class SaleReceiptResponse(BaseModel):
    id: int
    invoice_number: str
    customer_id: Optional[int] = None
    customer: Optional[CustomerSimple] = None
    subtotal: float
    tax_amount: float
    discount: float
    grand_total: float
    payment_method: str
    created_at: datetime
    items: List[SaleItemDetail]

    class Config:
        from_attributes = True
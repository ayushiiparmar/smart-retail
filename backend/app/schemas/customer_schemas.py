from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime

class CustomerBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=150)
    phone: str = Field(..., min_length=10, max_length=20)
    email: Optional[str] = None
    address: Optional[str] = None

class CustomerCreate(CustomerBase):
    pass

class CustomerUpdate(BaseModel):
    name: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    address: Optional[str] = None

class CustomerResponse(CustomerBase):
    id: int
    created_at: datetime
    total_spent: float = 0.0
    order_count: int = 0
    last_order_date: Optional[datetime] = None

    class Config:
        from_attributes = True

class OrderItemSimple(BaseModel):
    product_name: str
    quantity: int
    unit_price: float
    line_total: float

class OrderHistoryRecord(BaseModel):
    id: int
    invoice_number: str
    grand_total: float
    payment_method: str
    created_at: datetime
    items: List[OrderItemSimple]

    class Config:
        from_attributes = True
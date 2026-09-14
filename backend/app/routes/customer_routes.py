from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import func, desc
from typing import List

from app.database.connection import get_db
from app.models.customer import Customer
from app.models.sale import Sale
from app.models.sale_item import SaleItem
from app.schemas.customer_schemas import (
    CustomerCreate, 
    CustomerUpdate, 
    CustomerResponse, 
    OrderHistoryRecord,
    OrderItemSimple
)

router = APIRouter(prefix="/api/customers", tags=["Customers"])

@router.get("", response_model=List[CustomerResponse])
def list_customers(db: Session = Depends(get_db)):
    customers = db.query(Customer).order_by(Customer.name.asc()).all()
    results = []

    for c in customers:
        # Aggregated stats per customer
        stats = db.query(
            func.coalesce(func.sum(Sale.grand_total), 0.0).label("total_spent"),
            func.count(Sale.id).label("order_count"),
            func.max(Sale.created_at).label("last_order")
        ).filter(Sale.customer_id == c.id).first()

        results.append(
            CustomerResponse(
                id=c.id,
                name=c.name,
                phone=c.phone,
                email=c.email,
                address=c.address,
                created_at=c.created_at,
                total_spent=round(float(stats.total_spent), 2),
                order_count=int(stats.order_count),
                last_order_date=stats.last_order
            )
        )
    return results

@router.post("", response_model=CustomerResponse, status_code=status.HTTP_201_CREATED)
def create_customer(customer_in: CustomerCreate, db: Session = Depends(get_db)):
    existing = db.query(Customer).filter(Customer.phone == customer_in.phone.strip()).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Customer with phone number {customer_in.phone} already exists."
        )

    customer = Customer(
        name=customer_in.name.strip(),
        phone=customer_in.phone.strip(),
        email=customer_in.email.strip() if customer_in.email else None,
        address=customer_in.address.strip() if customer_in.address else None
    )
    db.add(customer)
    db.commit()
    db.refresh(customer)
    return CustomerResponse(
        id=customer.id,
        name=customer.name,
        phone=customer.phone,
        email=customer.email,
        address=customer.address,
        created_at=customer.created_at,
        total_spent=0.0,
        order_count=0,
        last_order_date=None
    )

@router.put("/{customer_id}", response_model=CustomerResponse)
def update_customer(customer_id: int, customer_in: CustomerUpdate, db: Session = Depends(get_db)):
    customer = db.query(Customer).filter(Customer.id == customer_id).first()
    if not customer:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Customer not found.")

    if customer_in.phone and customer_in.phone.strip() != customer.phone:
        duplicate = db.query(Customer).filter(Customer.phone == customer_in.phone.strip()).first()
        if duplicate:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Phone number is already registered.")
        customer.phone = customer_in.phone.strip()

    update_data = customer_in.model_dump(exclude_unset=True)
    for field, val in update_data.items():
        if field != "phone" and val is not None:
            setattr(customer, field, val.strip() if isinstance(val, str) else val)

    db.commit()
    db.refresh(customer)

    stats = db.query(
        func.coalesce(func.sum(Sale.grand_total), 0.0),
        func.count(Sale.id),
        func.max(Sale.created_at)
    ).filter(Sale.customer_id == customer.id).first()

    return CustomerResponse(
        id=customer.id,
        name=customer.name,
        phone=customer.phone,
        email=customer.email,
        address=customer.address,
        created_at=customer.created_at,
        total_spent=round(float(stats[0]), 2),
        order_count=int(stats[1]),
        last_order_date=stats[2]
    )

@router.delete("/{customer_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_customer(customer_id: int, db: Session = Depends(get_db)):
    customer = db.query(Customer).filter(Customer.id == customer_id).first()
    if not customer:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Customer not found.")

    # Disassociate customer from historical sales instead of breaking sales integrity
    db.query(Sale).filter(Sale.customer_id == customer_id).update({"customer_id": None})
    db.delete(customer)
    db.commit()
    return None

@router.get("/{customer_id}/history", response_model=List[OrderHistoryRecord])
def get_customer_purchase_history(customer_id: int, db: Session = Depends(get_db)):
    customer = db.query(Customer).filter(Customer.id == customer_id).first()
    if not customer:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Customer not found.")

    sales = db.query(Sale).options(
        joinedload(Sale.items).joinedload(SaleItem.product)
    ).filter(Sale.customer_id == customer_id).order_by(desc(Sale.created_at)).all()

    result = []
    for s in sales:
        line_items = [
            OrderItemSimple(
                product_name=it.product.name if it.product else "Discontinued Item",
                quantity=it.quantity,
                unit_price=it.unit_price,
                line_total=it.line_total
            )
            for it in s.items
        ]
        result.append(
            OrderHistoryRecord(
                id=s.id,
                invoice_number=s.invoice_number,
                grand_total=s.grand_total,
                payment_method=s.payment_method,
                created_at=s.created_at,
                items=line_items
            )
        )
    return result
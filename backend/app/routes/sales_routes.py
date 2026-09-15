from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session, joinedload
from typing import List
from datetime import datetime
import uuid

from app.database.connection import get_db
from app.models.sale import Sale
from app.models.sale_item import SaleItem
from app.models.product import Product
from app.models.customer import Customer
from app.schemas.sales_schemas import SaleCreate, SaleReceiptResponse, SaleItemDetail, CustomerSimple

router = APIRouter(prefix="/api/sales", tags=["Sales"])

@router.post("", response_model=SaleReceiptResponse, status_code=status.HTTP_201_CREATED)
def process_checkout(sale_in: SaleCreate, db: Session = Depends(get_db)):
    # 1. Verify customer if specified
    customer = None
    if sale_in.customer_id:
        customer = db.query(Customer).filter(Customer.id == sale_in.customer_id).first()
        if not customer:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Customer not found.")

    # 2. Validate line items and stock availability
    subtotal = 0.0
    items_to_create = []
    products_to_update = []

    for item_in in sale_in.items:
        product = db.query(Product).filter(Product.id == item_in.product_id).first()
        if not product:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Product with ID {item_in.product_id} not found."
            )

        if product.current_stock < item_in.quantity:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Insufficient stock for '{product.name}'. Available: {product.current_stock}, Requested: {item_in.quantity}."
            )

        # Calculate line item price snapshot
        unit_price = product.selling_price
        line_total = round(unit_price * item_in.quantity, 2)
        subtotal += line_total

        # Queue stock decrement
        product.current_stock -= item_in.quantity
        products_to_update.append(product)

        items_to_create.append({
            "product_id": product.id,
            "product_name": product.name,
            "unit_price": unit_price,
            "quantity": item_in.quantity,
            "line_total": line_total
        })

    subtotal = round(subtotal, 2)
    tax_amount = round(subtotal * (sale_in.tax_rate / 100.0), 2)
    grand_total = max(0.0, round(subtotal + tax_amount - sale_in.discount, 2))

    # Generate sequential/unique invoice number (INV-YYYYMMDD-XXXX)
    timestamp_prefix = datetime.utcnow().strftime("%Y%m%d%H%M")
    random_suffix = str(uuid.uuid4().hex[:4]).upper()
    invoice_number = f"INV-{timestamp_prefix}-{random_suffix}"

    try:
        # Create Sale header
        sale = Sale(
            invoice_number=invoice_number,
            customer_id=sale_in.customer_id,
            subtotal=subtotal,
            tax_amount=tax_amount,
            discount=sale_in.discount,
            grand_total=grand_total,
            payment_method=sale_in.payment_method,
            created_at=datetime.utcnow()
        )
        db.add(sale)
        db.flush()  # Populates sale.id for line items

        # Create Sale Items
        sale_items = []
        for it in items_to_create:
            sale_item = SaleItem(
                sale_id=sale.id,
                product_id=it["product_id"],
                unit_price=it["unit_price"],
                quantity=it["quantity"],
                line_total=it["line_total"]
            )
            db.add(sale_item)
            sale_items.append((sale_item, it["product_name"]))

        db.commit()
        db.refresh(sale)

        # Each sale_item now has its real, DB-generated id after commit.
        detail_items_list = [
            SaleItemDetail(
                id=sale_item.id,
                product_id=sale_item.product_id,
                product_name=product_name,
                unit_price=sale_item.unit_price,
                quantity=sale_item.quantity,
                line_total=sale_item.line_total
            )
            for sale_item, product_name in sale_items
        ]

        return SaleReceiptResponse(
            id=sale.id,
            invoice_number=sale.invoice_number,
            customer_id=sale.customer_id,
            customer=CustomerSimple.model_validate(customer) if customer else None,
            subtotal=sale.subtotal,
            tax_amount=sale.tax_amount,
            discount=sale.discount,
            grand_total=sale.grand_total,
            payment_method=sale.payment_method,
            created_at=sale.created_at,
            items=detail_items_list
        )

    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Checkout transaction aborted: {str(e)}"
        )

@router.get("", response_model=List[SaleReceiptResponse])
def get_recent_sales(db: Session = Depends(get_db)):
    sales = db.query(Sale).options(
        joinedload(Sale.customer),
        joinedload(Sale.items).joinedload(SaleItem.product)
    ).order_by(Sale.created_at.desc()).limit(20).all()

    result = []
    for s in sales:
        items_detail = [
            SaleItemDetail(
                id=it.id,
                product_id=it.product_id,
                product_name=it.product.name if it.product else "Unknown Product",
                unit_price=it.unit_price,
                quantity=it.quantity,
                line_total=it.line_total
            )
            for it in s.items
        ]
        result.append(SaleReceiptResponse(
            id=s.id,
            invoice_number=s.invoice_number,
            customer_id=s.customer_id,
            customer=CustomerSimple.model_validate(s.customer) if s.customer else None,
            subtotal=s.subtotal,
            tax_amount=s.tax_amount,
            discount=s.discount,
            grand_total=s.grand_total,
            payment_method=s.payment_method,
            created_at=s.created_at,
            items=items_detail
        ))
    return result
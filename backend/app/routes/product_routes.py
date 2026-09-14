from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session, joinedload
from typing import List, Optional
import re

from app.database.connection import get_db
from app.models.product import Product
from app.models.category import Category
from app.models.sale_item import SaleItem
from app.schemas.product_schemas import (
    ProductCreate, 
    ProductUpdate, 
    ProductResponse, 
    StockAdjustment
)
from app.dependencies import verify_manager_access

router = APIRouter(prefix="/api/products", tags=["Products"])

@router.get("", response_model=List[ProductResponse])
def list_products(
    search: Optional[str] = Query(None, description="Search by title or barcode"),
    category_id: Optional[int] = Query(None, description="Filter by category"),
    stock_status: Optional[str] = Query(None, description="all, in_stock, low_stock, out_of_stock"),
    db: Session = Depends(get_db)
):
    query = db.query(Product).options(
        joinedload(Product.category),
        joinedload(Product.supplier)
    )

    if search:
        clean_search = re.sub(r'[^a-zA-Z0-9\s-]', '', search).strip()
        if clean_search:
            search_pattern = f"%{clean_search}%"
            query = query.filter(
                (Product.name.ilike(search_pattern)) | 
                (Product.barcode.ilike(search_pattern))
            )

    if category_id:
        query = query.filter(Product.category_id == category_id)

    if stock_status == "out_of_stock":
        query = query.filter(Product.current_stock <= 0)
    elif stock_status == "low_stock":
        query = query.filter(Product.current_stock > 0, Product.current_stock <= Product.min_stock_level)
    elif stock_status == "in_stock":
        query = query.filter(Product.current_stock > Product.min_stock_level)

    return query.order_by(Product.name.asc()).all()

@router.post("", response_model=ProductResponse, status_code=status.HTTP_201_CREATED)
def create_product(
    product_in: ProductCreate, 
    db: Session = Depends(get_db),
    _: bool = Depends(verify_manager_access)
):
    clean_barcode = product_in.barcode.strip()
    if len(clean_barcode) < 3:
        raise HTTPException(status_code=400, detail="Barcode must be at least 3 characters.")

    existing = db.query(Product).filter(Product.barcode == clean_barcode).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Barcode '{clean_barcode}' already registered to '{existing.name}'."
        )

    cat = db.query(Category).filter(Category.id == product_in.category_id).first()
    if not cat:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Specified category does not exist.")

    product = Product(
        name=product_in.name.strip(),
        category_id=product_in.category_id,
        supplier_id=product_in.supplier_id,
        barcode=clean_barcode,
        cost_price=round(product_in.cost_price, 2),
        selling_price=round(product_in.selling_price, 2),
        current_stock=max(0, product_in.current_stock),
        min_stock_level=max(1, product_in.min_stock_level),
        lead_time_days=getattr(product_in, 'lead_time_days', 7),
        safety_stock_days=getattr(product_in, 'safety_stock_days', 2),
        reorder_cycle_days=getattr(product_in, 'reorder_cycle_days', 14)
    )
    db.add(product)
    db.commit()
    db.refresh(product)
    return product

@router.put("/{product_id}", response_model=ProductResponse)
def update_product(
    product_id: int, 
    product_in: ProductUpdate, 
    db: Session = Depends(get_db),
    _: bool = Depends(verify_manager_access)
):
    product = db.query(Product).filter(Product.id == product_id).first()
    if not product:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Product not found.")

    if product_in.barcode and product_in.barcode.strip() != product.barcode:
        clean_barcode = product_in.barcode.strip()
        duplicate = db.query(Product).filter(Product.barcode == clean_barcode).first()
        if duplicate:
            raise HTTPException(status_code=400, detail=f"Barcode '{clean_barcode}' is already in use.")
        product.barcode = clean_barcode

    update_data = product_in.model_dump(exclude_unset=True)
    for field, val in update_data.items():
        if field != "barcode" and val is not None:
            if field in ["cost_price", "selling_price"]:
                val = max(0.0, round(val, 2))
            elif field in ["current_stock", "min_stock_level"]:
                val = max(0, val)
            setattr(product, field, val)

    db.commit()
    db.refresh(product)
    return product

@router.delete("/{product_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_product(
    product_id: int, 
    db: Session = Depends(get_db),
    _: bool = Depends(verify_manager_access)
):
    product = db.query(Product).filter(Product.id == product_id).first()
    if not product:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Product not found.")

    has_sales = db.query(SaleItem).filter(SaleItem.product_id == product_id).first()
    if has_sales:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot delete product with historical sales records. Set current stock to 0 instead."
        )

    db.delete(product)
    db.commit()
    return None

@router.patch("/{product_id}/stock", response_model=ProductResponse)
def adjust_stock(product_id: int, adj: StockAdjustment, db: Session = Depends(get_db)):
    product = db.query(Product).filter(Product.id == product_id).first()
    if not product:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Product not found.")

    new_stock = product.current_stock + adj.adjustment
    if new_stock < 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Stock cannot fall below zero. Current stock is {product.current_stock}."
        )

    product.current_stock = new_stock
    db.commit()
    db.refresh(product)
    return product
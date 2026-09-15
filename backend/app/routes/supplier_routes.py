from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List

from app.database.connection import get_db
from app.models.supplier import Supplier
from app.models.product import Product
from app.dependencies import verify_manager_access
from app.schemas.supplier_schemas import SupplierCreate, SupplierUpdate, SupplierResponse

router = APIRouter(prefix="/api/suppliers", tags=["Suppliers"])

# Routes
@router.get("", response_model=List[SupplierResponse])
def list_suppliers(db: Session = Depends(get_db)):
    return db.query(Supplier).order_by(Supplier.company.asc()).all()

@router.get("/{supplier_id}", response_model=SupplierResponse)
def get_supplier(supplier_id: int, db: Session = Depends(get_db)):
    supplier = db.query(Supplier).filter(Supplier.id == supplier_id).first()
    if not supplier:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Supplier not found.")
    return supplier

@router.get("/{supplier_id}/products")
def get_supplier_products(supplier_id: int, db: Session = Depends(get_db)):
    supplier = db.query(Supplier).filter(Supplier.id == supplier_id).first()
    if not supplier:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Supplier not found.")
    
    products = db.query(Product).filter(Product.supplier_id == supplier_id).all()
    return [
        {
            "id": p.id,
            "name": p.name,
            "barcode": p.barcode,
            "current_stock": p.current_stock,
            "selling_price": p.selling_price
        }
        for p in products
    ]

@router.post("", response_model=SupplierResponse, status_code=status.HTTP_201_CREATED)
def create_supplier(
    supplier_in: SupplierCreate, 
    db: Session = Depends(get_db),
    _: bool = Depends(verify_manager_access)
):
    supplier = Supplier(
        name=supplier_in.name.strip(),
        company=supplier_in.company.strip(),
        phone=supplier_in.phone.strip() if supplier_in.phone else None,
        email=supplier_in.email.strip() if supplier_in.email else None,
        address=supplier_in.address.strip() if supplier_in.address else None
    )
    db.add(supplier)
    db.commit()
    db.refresh(supplier)
    return supplier

@router.put("/{supplier_id}", response_model=SupplierResponse)
def update_supplier(
    supplier_id: int, 
    supplier_in: SupplierUpdate, 
    db: Session = Depends(get_db),
    _: bool = Depends(verify_manager_access)
):
    supplier = db.query(Supplier).filter(Supplier.id == supplier_id).first()
    if not supplier:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Supplier not found.")

    update_data = supplier_in.model_dump(exclude_unset=True)
    for key, val in update_data.items():
        if val is not None:
            setattr(supplier, key, val.strip() if isinstance(val, str) else val)

    db.commit()
    db.refresh(supplier)
    return supplier

@router.delete("/{supplier_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_supplier(
    supplier_id: int, 
    db: Session = Depends(get_db),
    _: bool = Depends(verify_manager_access)
):
    supplier = db.query(Supplier).filter(Supplier.id == supplier_id).first()
    if not supplier:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Supplier not found.")

    # Unlink products before deleting supplier
    db.query(Product).filter(Product.supplier_id == supplier_id).update({"supplier_id": None})
    db.delete(supplier)
    db.commit()
    return None
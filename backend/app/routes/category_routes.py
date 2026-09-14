from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from typing import List
from pydantic import BaseModel

from app.database.connection import get_db
from app.models.category import Category

router = APIRouter(prefix="/api/categories", tags=["Categories"])

class CategoryResponse(BaseModel):
    id: int
    name: str
    description: str | None = None

    class Config:
        from_attributes = True

@router.get("", response_model=List[CategoryResponse])
def get_all_categories(db: Session = Depends(get_db)):
    return db.query(Category).order_by(Category.name.asc()).all()
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Dict, Any

from app.database.connection import get_db
from app.services.ai_reorder_service import (
    compute_inventory_intelligence, 
    process_natural_language_query
)

router = APIRouter(prefix="/api/ai", tags=["AI Inventory Engine"])

class ChatRequest(BaseModel):
    message: str

@router.get("/recommendations")
def get_reorder_recommendations(db: Session = Depends(get_db)) -> Dict[str, Any]:
    return compute_inventory_intelligence(db)

@router.post("/chat")
def handle_assistant_chat(chat_in: ChatRequest, db: Session = Depends(get_db)) -> Dict[str, Any]:
    return process_natural_language_query(db, chat_in.message)
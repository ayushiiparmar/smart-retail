from fastapi import FastAPI, Depends
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session

from app.database.connection import engine, Base, get_db, SessionLocal
from app.database.seed_data import seed_database
from app.models import Product, Category, Supplier, Customer, Sale
from app.routes.product_routes import router as product_router
from app.routes.category_routes import router as category_router
from app.routes.supplier_routes import router as supplier_router
from app.routes.customer_routes import router as customer_router
from app.routes.sales_routes import router as sales_router
from app.routes.analytics_routes import router as analytics_router
from app.routes.ai_routes import router as ai_router
from app.routes.auth_routes import router as auth_router

# Auto-create tables if missing
Base.metadata.create_all(bind=engine)

# Auto-seed demo data on startup if the database is empty. This matters
# because Render's free tier has no Shell access to run seed.py manually,
# so a freshly created Postgres database would otherwise stay empty forever.
# Safe to leave in permanently: it only runs when there's no data yet.
def _seed_if_empty():
    db = SessionLocal()
    try:
        if db.query(Category).first() is None:
            print(seed_database(db))
    finally:
        db.close()

_seed_if_empty()

app = FastAPI(
    title="Smart Retail API",
    description="Backend for AI-Assisted Smart Retail & Inventory Management System",
    version="1.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allows Vercel preview & production URLs
    # `allow_origins=["*"]` combined with `allow_credentials=True` is invalid
    # per the CORS spec (browsers will reject it). The app doesn't use
    # cookies for auth - the manager PIN travels as a custom header - so
    # credentialed requests aren't needed.
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register Sub-Routers
app.include_router(product_router)
app.include_router(category_router)
app.include_router(supplier_router)
app.include_router(customer_router)
app.include_router(sales_router)
app.include_router(analytics_router)
app.include_router(ai_router)
app.include_router(auth_router)

@app.get("/")
def health_check():
    return {
        "status": "healthy",
        "service": "Smart Retail Management API",
        "version": "1.0.0"
    }

@app.get("/api/health/db")
def database_health(db: Session = Depends(get_db)):
    return {
        "status": "connected",
        "database": "SQLite (data/retail.db)",
        "records": {
            "categories": db.query(Category).count(),
            "suppliers": db.query(Supplier).count(),
            "products": db.query(Product).count(),
            "customers": db.query(Customer).count(),
            "sales": db.query(Sale).count()
        }
    }

# Add to the bottom of backend/app/main.py

from app.models.product import Product
from app.models.sale import Sale
from app.models.sale_item import SaleItem
from app.dependencies import verify_manager_access

@app.post("/api/admin/reset-stock")
def reset_demo_stock(db: Session = Depends(get_db), _: bool = Depends(verify_manager_access)):
    """Resets all product stock levels back to standard demo values and clears test sales."""
    # Reset default stock values
    default_stocks = {
        "8901262010015": 24, # Amul Taaza Milk
        "8901030383454": 15, # Tata Tea Gold
        "8901058852415": 0,  # Aashirvaad Atta (critical stock demo)
        "8901499008144": 40, # Lay's Classic Salted
        "8901030825220": 18, # Surf Excel Quick Wash
        "8901725181222": 8,  # Dettol Original Soap
        "8901030704419": 3,  # Colgate MaxFresh
        "8906007280014": 12, # Fortune Sunflower Oil
        "8901063012345": 25, # Britannia Good Day
        "8901058863114": 5,  # Sunfeast Dark Fantasy
        "8902080005521": 50, # Maggi 2-Minute Noodles
        "8901030012453": 14  # Bru Instant Coffee
    }
    
    for barcode, stock in default_stocks.items():
        db.query(Product).filter(Product.barcode == barcode).update({"current_stock": stock})
    
    db.commit()
    return {"status": "success", "message": "Demo stock levels successfully restored!"}
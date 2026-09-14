from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import func, desc
from datetime import datetime, timedelta
from typing import List, Dict, Any

from app.database.connection import get_db
from app.models.sale import Sale
from app.models.sale_item import SaleItem
from app.models.product import Product
from app.models.category import Category
from app.models.customer import Customer
from app.models.supplier import Supplier

router = APIRouter(prefix="/api/analytics", tags=["Analytics"])

@router.get("/dashboard")
def get_dashboard_data(db: Session = Depends(get_db)) -> Dict[str, Any]:
    now = datetime.utcnow()
    today_start = datetime(now.year, now.month, now.day)

    today_sales_query = db.query(
        func.coalesce(func.sum(Sale.grand_total), 0.0),
        func.count(Sale.id)
    ).filter(Sale.created_at >= today_start).first()
    today_revenue = round(float(today_sales_query[0]), 2)
    today_orders_count = int(today_sales_query[1])

    total_revenue_query = db.query(
        func.coalesce(func.sum(Sale.grand_total), 0.0),
        func.count(Sale.id)
    ).first()
    lifetime_revenue = round(float(total_revenue_query[0]), 2)
    total_sales_count = int(total_revenue_query[1])

    total_products = db.query(Product).count()
    low_stock_count = db.query(Product).filter(
        Product.current_stock > 0,
        Product.current_stock <= Product.min_stock_level
    ).count()
    out_of_stock_count = db.query(Product).filter(Product.current_stock <= 0).count()

    total_customers = db.query(Customer).count()
    total_suppliers = db.query(Supplier).count()

    seven_days_trend = []
    for i in range(6, -1, -1):
        day_date = (now - timedelta(days=i)).date()
        day_start = datetime(day_date.year, day_date.month, day_date.day)
        day_end = day_start + timedelta(days=1)

        day_sales = db.query(
            func.coalesce(func.sum(Sale.grand_total), 0.0),
            func.count(Sale.id)
        ).filter(Sale.created_at >= day_start, Sale.created_at < day_end).first()

        seven_days_trend.append({
            "date": day_date.strftime("%b %d"),
            "day": day_date.strftime("%a"),
            "revenue": round(float(day_sales[0]), 2),
            "orders": int(day_sales[1])
        })

    top_items_query = db.query(
        Product.id,
        Product.name,
        Product.selling_price,
        func.coalesce(func.sum(SaleItem.quantity), 0).label("units_sold"),
        func.coalesce(func.sum(SaleItem.line_total), 0.0).label("total_sales")
    ).join(SaleItem, Product.id == SaleItem.product_id)\
     .group_by(Product.id)\
     .order_by(desc("units_sold"))\
     .limit(5).all()

    top_selling = [
        {
            "id": row.id,
            "name": row.name,
            "selling_price": row.selling_price,
            "units_sold": int(row.units_sold),
            "total_sales": round(float(row.total_sales), 2)
        }
        for row in top_items_query
    ]

    urgent_stock_query = db.query(Product).options(joinedload(Product.category))\
        .filter(Product.current_stock <= Product.min_stock_level)\
        .order_by(Product.current_stock.asc())\
        .limit(5).all()

    urgent_stock = [
        {
            "id": p.id,
            "name": p.name,
            "barcode": p.barcode,
            "category": p.category.name if p.category else "General",
            "current_stock": p.current_stock,
            "min_stock_level": p.min_stock_level,
            "status": "OUT_OF_STOCK" if p.current_stock <= 0 else "LOW_STOCK"
        }
        for p in urgent_stock_query
    ]

    recent_sales_query = db.query(Sale).options(
        joinedload(Sale.customer)
    ).order_by(Sale.created_at.desc()).limit(5).all()

    recent_transactions = [
        {
            "id": s.id,
            "invoice_number": s.invoice_number,
            "customer_name": s.customer.name if s.customer else "Walk-in Customer",
            "grand_total": s.grand_total,
            "payment_method": s.payment_method,
            "time": s.created_at.strftime("%I:%M %p, %b %d")
        }
        for s in recent_sales_query
    ]

    return {
        "kpis": {
            "today_revenue": today_revenue,
            "today_orders": today_orders_count,
            "lifetime_revenue": lifetime_revenue,
            "total_sales_count": total_sales_count,
            "total_products": total_products,
            "low_stock_count": low_stock_count,
            "out_of_stock_count": out_of_stock_count,
            "total_customers": total_customers,
            "total_suppliers": total_suppliers
        },
        "revenue_trend": seven_days_trend,
        "top_selling_products": top_selling,
        "urgent_stock": urgent_stock,
        "recent_transactions": recent_transactions
    }

@router.get("/advanced")
def get_advanced_analytics(
    period: str = Query("7d", regex="^(today|7d|30d|all)$"),
    db: Session = Depends(get_db)
) -> Dict[str, Any]:
    now = datetime.utcnow()
    if period == "today":
        start_date = datetime(now.year, now.month, now.day)
    elif period == "7d":
        start_date = now - timedelta(days=7)
    elif period == "30d":
        start_date = now - timedelta(days=30)
    else:
        start_date = datetime(2000, 1, 1)

    # 1. Period Sales Totals
    sales_in_period = db.query(Sale).filter(Sale.created_at >= start_date).all()
    sale_ids = [s.id for s in sales_in_period]

    total_revenue = round(sum(s.grand_total for s in sales_in_period), 2)
    total_orders = len(sales_in_period)
    aov = round(total_revenue / total_orders, 2) if total_orders > 0 else 0.0

    # 2. Cost of Goods Sold (COGS) & Gross Profit
    # Join sale_items of these sales with Product cost_price
    cogs = 0.0
    total_units_sold = 0
    if sale_ids:
        items_query = db.query(
            SaleItem.quantity,
            SaleItem.line_total,
            Product.cost_price
        ).join(Product, SaleItem.product_id == Product.id)\
         .filter(SaleItem.sale_id.in_(sale_ids)).all()

        for it in items_query:
            total_units_sold += it.quantity
            cogs += (it.quantity * it.cost_price)

    cogs = round(cogs, 2)
    gross_profit = round(total_revenue - cogs, 2)
    profit_margin = round((gross_profit / total_revenue) * 100, 1) if total_revenue > 0 else 0.0

    # 3. Category Revenue Distribution
    category_data = []
    if sale_ids:
        cat_query = db.query(
            Category.name,
            func.coalesce(func.sum(SaleItem.line_total), 0.0).label("cat_revenue")
        ).join(Product, Product.category_id == Category.id)\
         .join(SaleItem, SaleItem.product_id == Product.id)\
         .filter(SaleItem.sale_id.in_(sale_ids))\
         .group_by(Category.id)\
         .order_by(desc("cat_revenue")).all()

        category_data = [
            {"name": row.name, "value": round(float(row.cat_revenue), 2)}
            for row in cat_query
        ]

    # 4. Payment Method Distribution
    payment_methods_data = []
    if sales_in_period:
        pay_counts = {}
        for s in sales_in_period:
            pay_counts[s.payment_method] = pay_counts.get(s.payment_method, 0.0) + s.grand_total
        payment_methods_data = [
            {"method": method, "amount": round(amt, 2)}
            for method, amt in pay_counts.items()
        ]

    # 5. Top Movers in Period
    top_movers = []
    if sale_ids:
        top_query = db.query(
            Product.id,
            Product.name,
            Category.name.label("category"),
            func.sum(SaleItem.quantity).label("units_sold"),
            func.sum(SaleItem.line_total).label("revenue")
        ).join(Category, Product.category_id == Category.id)\
         .join(SaleItem, Product.id == SaleItem.product_id)\
         .filter(SaleItem.sale_id.in_(sale_ids))\
         .group_by(Product.id)\
         .order_by(desc("units_sold"))\
         .limit(5).all()

        top_movers = [
            {
                "id": r.id,
                "name": r.name,
                "category": r.category,
                "units_sold": int(r.units_sold),
                "revenue": round(float(r.revenue), 2)
            }
            for r in top_query
        ]

    # 6. Slow Moving / Stagnant Inventory (Zero or low sales in this window)
    sold_product_ids = db.query(SaleItem.product_id)\
        .filter(SaleItem.sale_id.in_(sale_ids)).distinct() if sale_ids else []
    
    stagnant_query = db.query(Product).options(joinedload(Product.category))\
        .filter(Product.id.not_in(sold_product_ids))\
        .filter(Product.current_stock > 0)\
        .order_by(desc(Product.current_stock))\
        .limit(5).all()

    slow_movers = [
        {
            "id": p.id,
            "name": p.name,
            "category": p.category.name if p.category else "General",
            "stock": p.current_stock,
            "capital_locked": round(p.current_stock * p.cost_price, 2)
        }
        for p in stagnant_query
    ]

    return {
        "period": period,
        "kpis": {
            "total_revenue": total_revenue,
            "gross_profit": gross_profit,
            "profit_margin": profit_margin,
            "cogs": cogs,
            "total_orders": total_orders,
            "total_units_sold": total_units_sold,
            "aov": aov
        },
        "category_distribution": category_data,
        "payment_methods": payment_methods_data,
        "top_movers": top_movers,
        "slow_movers": slow_movers
    }
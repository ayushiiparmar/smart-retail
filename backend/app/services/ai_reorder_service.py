import math
from datetime import datetime, timedelta
from typing import List, Dict, Any
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import func

from app.models.product import Product
from app.models.sale_item import SaleItem
from app.models.sale import Sale

def compute_inventory_intelligence(db: Session) -> Dict[str, Any]:
    """
    Computes Level 1 deterministic inventory intelligence:
    - Daily Sales Velocity (V_d) over 30-day historical window
    - Estimated Days to Stockout (T_run)
    - Reorder Point (ROP = (V_d * lead_time) + safety_stock)
    - Recommended Reorder Quantity (ROQ)
    """
    now = datetime.utcnow()
    window_days = 30
    cutoff_date = now - timedelta(days=window_days)

    products = db.query(Product).options(
        joinedload(Product.category),
        joinedload(Product.supplier)
    ).all()

    recommendations = []
    summary = {
        "critical_count": 0,
        "reorder_needed_count": 0,
        "dead_stock_count": 0,
        "healthy_count": 0,
        "total_capital_at_risk": 0.0
    }

    for p in products:
        # Sum quantities sold over the 30-day window
        sold_units = db.query(func.coalesce(func.sum(SaleItem.quantity), 0))\
            .join(Sale, SaleItem.sale_id == Sale.id)\
            .filter(SaleItem.product_id == p.id, Sale.created_at >= cutoff_date)\
            .scalar() or 0

        # 1. Daily Sales Velocity (V_d)
        velocity_daily = round(sold_units / window_days, 2)

        # 2. Dynamic Safety Stock in units
        safety_stock_units = math.ceil(velocity_daily * p.safety_stock_days)
        effective_safety_stock = max(p.min_stock_level, safety_stock_units)

        # 3. Reorder Point (ROP) = (V_d * Lead Time) + Safety Stock
        lead_time_demand = math.ceil(velocity_daily * p.lead_time_days)
        rop = lead_time_demand + effective_safety_stock

        # 4. Days until stockout (T_run)
        if velocity_daily > 0:
            days_to_stockout = round(p.current_stock / velocity_daily, 1)
        else:
            days_to_stockout = 999.0 if p.current_stock > 0 else 0.0

        # 5. Recommended Order Quantity (ROQ) to cover reorder cycle
        target_stock_cover = math.ceil(velocity_daily * p.reorder_cycle_days) + effective_safety_stock
        roq = max(0, target_stock_cover - p.current_stock)

        # 6. Status Determination
        if p.current_stock <= 0:
            status = "OUT_OF_STOCK"
            urgency_score = 100
            summary["critical_count"] += 1
        elif days_to_stockout <= 3.0 or p.current_stock <= p.min_stock_level:
            status = "CRITICAL"
            urgency_score = 90
            summary["critical_count"] += 1
        elif p.current_stock <= rop:
            status = "REORDER_NOW"
            urgency_score = 70
            summary["reorder_needed_count"] += 1
        elif velocity_daily == 0 and p.current_stock > 0:
            status = "DEAD_STOCK"
            urgency_score = 40
            capital_locked = round(p.current_stock * p.cost_price, 2)
            summary["dead_stock_count"] += 1
            summary["total_capital_at_risk"] += capital_locked
        else:
            status = "HEALTHY"
            urgency_score = 10
            summary["healthy_count"] += 1

        recommendations.append({
            "product_id": p.id,
            "product_name": p.name,
            "barcode": p.barcode,
            "category": p.category.name if p.category else "Unassigned",
            "supplier_company": p.supplier.company if p.supplier else "Direct / Unassigned",
            "supplier_phone": p.supplier.phone if p.supplier else "N/A",
            "cost_price": p.cost_price,
            "selling_price": p.selling_price,
            "current_stock": p.current_stock,
            "min_stock_level": p.min_stock_level,
            "lead_time_days": p.lead_time_days,
            "safety_stock_days": p.safety_stock_days,
            "reorder_cycle_days": p.reorder_cycle_days,
            "daily_velocity": velocity_daily,
            "units_sold_30d": sold_units,
            "days_to_stockout": days_to_stockout,
            "reorder_point": rop,
            "recommended_reorder_qty": roq,
            "estimated_reorder_cost": round(roq * p.cost_price, 2),
            "status": status,
            "urgency_score": urgency_score
        })

    # Sort items by highest urgency score first
    recommendations.sort(key=lambda x: (x["urgency_score"], -x["units_sold_30d"]), reverse=True)
    summary["total_capital_at_risk"] = round(summary["total_capital_at_risk"], 2)

    return {
        "summary": summary,
        "recommendations": recommendations,
        "calculated_at": now.isoformat()
    }

def process_natural_language_query(db: Session, query: str) -> Dict[str, Any]:
    """
    Local Natural Language Processor that translates retail prompts into
    verified database metrics without requiring external API tokens.
    """
    q = query.lower().strip()
    data = compute_inventory_intelligence(db)
    recs = data["recommendations"]
    summary = data["summary"]

    if any(w in q for w in ["critical", "emergency", "run out", "urgent"]):
        critical_items = [r for r in recs if r["status"] in ["OUT_OF_STOCK", "CRITICAL"]]
        if not critical_items:
            return {"reply": "All catalog items are currently operating with healthy stock margins."}
        
        reply = f"🚨 Found {len(critical_items)} items requiring immediate attention:\n"
        for it in critical_items:
            days_str = "RUNOUT: TODAY" if it["days_to_stockout"] <= 0 else f"Runout in {it['days_to_stockout']} days"
            reply += f"• **{it['product_name']}**: {it['current_stock']} units on shelf ({days_str}). Order {it['recommended_reorder_qty']} units from {it['supplier_company']}.\n"
        return {"reply": reply, "items": critical_items}

    elif any(w in q for w in ["dead stock", "stagnant", "slow"]):
        dead = [r for r in recs if r["status"] == "DEAD_STOCK"]
        if not dead:
            return {"reply": "Great news: Zero dead stock detected. All inventory has recorded sales velocity."}
        reply = f"📦 Found {len(dead)} stagnant items with 0 sales in 30 days, locking ₹{summary['total_capital_at_risk']:.2f} in working capital:\n"
        for it in dead:
            reply += f"• **{it['product_name']}**: {it['current_stock']} units unsold (₹{it['current_stock'] * it['cost_price']:.2f} cost value).\n"
        return {"reply": reply, "items": dead}

    elif any(w in q for w in ["reorder", "order", "purchase", "restock"]):
        needed = [r for r in recs if r["recommended_reorder_qty"] > 0]
        total_po_cost = sum(r["estimated_reorder_cost"] for r in needed)
        reply = f"📋 Suggested Purchase Orders for {len(needed)} items (Est. Wholesale Cost: ₹{total_po_cost:.2f}):\n"
        for it in needed[:5]:
            reply += f"• **{it['product_name']}**: Order {it['recommended_reorder_qty']} units from {it['supplier_company']} (₹{it['estimated_reorder_cost']:.2f})\n"
        if len(needed) > 5:
            reply += f"...and {len(needed) - 5} additional items."
        return {"reply": reply, "items": needed}

    else:
        # Check if user asked about a specific item name
        matched = [r for r in recs if any(part in r["product_name"].lower() for part in q.split() if len(part) > 2)]
        if matched:
            it = matched[0]
            return {
                "reply": f"📊 **{it['product_name']}** Analysis:\n"
                         f"• Stock: {it['current_stock']} units (Safety: {it['min_stock_level']})\n"
                         f"• Sales Velocity: {it['daily_velocity']} units/day ({it['units_sold_30d']} sold in 30d)\n"
                         f"• Est. Runout: {it['days_to_stockout']} days\n"
                         f"• Reorder Point (ROP): {it['reorder_point']} units\n"
                         f"• Recommended Order: {it['recommended_reorder_qty']} units from {it['supplier_company']}",
                "items": [it]
            }

        return {
            "reply": f"Here is your store summary:\n"
                     f"• Critical Items: {summary['critical_count']}\n"
                     f"• Orders Needed: {summary['reorder_needed_count']}\n"
                     f"• Stagnant Items: {summary['dead_stock_count']} (₹{summary['total_capital_at_risk']} locked)\n"
                     f"You can ask me: 'What should I reorder?', 'Show critical items', or 'Check dead stock'."
        }
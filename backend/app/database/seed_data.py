from datetime import datetime, timedelta
from sqlalchemy.orm import Session
from app.models import Category, Supplier, Product, Customer, Sale, SaleItem

def seed_database(db: Session):
    # Check if data already exists
    if db.query(Product).first():
        return "Database already seeded."

    # 1. Seed Categories
    categories = [
        Category(name="Dairy & Refrigerated", description="Milk, butter, curd, cheese"),
        Category(name="Staples & Grains", description="Rice, flour, pulses, spices"),
        Category(name="Bakery & Snacks", description="Breads, biscuits, namkeen"),
        Category(name="Beverages", description="Tea, coffee, packaged juices"),
        Category(name="Personal Care", description="Soaps, shampoos, oral hygiene"),
        Category(name="Household & Cleaning", description="Detergents, floor cleaners")
    ]
    db.add_all(categories)
    db.commit()

    # 2. Seed Suppliers
    suppliers = [
        Supplier(
            name="Rajesh Sharma",
            company="Amul Dairy Distributors",
            phone="9829012345",
            email="rajesh@amuldist.in",
            address="Plot 14, Industrial Area, Jaipur"
        ),
        Supplier(
            name="Sunil Verma",
            company="Britannia Logistics Hub",
            phone="9829054321",
            email="sunil@britanniahub.in",
            address="Sector 5, Transport Nagar, Jaipur"
        ),
        Supplier(
            name="Pooja Gupta",
            company="Tata Consumer Supply Agency",
            phone="9829098765",
            email="pooja@tataconsumeragency.com",
            address="G-12, Commercial Complex, Jaipur"
        ),
        Supplier(
            name="Vikram Singh",
            company="ITC Wholesale Network",
            phone="9829067890",
            email="vikram@itcnetwork.in",
            address="Warehouse 3, Sanganer, Jaipur"
        )
    ]
    db.add_all(suppliers)
    db.commit()

    # Query category & supplier references
    cat_dairy = db.query(Category).filter_by(name="Dairy & Refrigerated").first()
    cat_staples = db.query(Category).filter_by(name="Staples & Grains").first()
    cat_bakery = db.query(Category).filter_by(name="Bakery & Snacks").first()
    cat_bev = db.query(Category).filter_by(name="Beverages").first()
    cat_personal = db.query(Category).filter_by(name="Personal Care").first()

    sup_amul = db.query(Supplier).filter_by(company="Amul Dairy Distributors").first()
    sup_britannia = db.query(Supplier).filter_by(company="Britannia Logistics Hub").first()
    sup_tata = db.query(Supplier).filter_by(company="Tata Consumer Supply Agency").first()
    sup_itc = db.query(Supplier).filter_by(company="ITC Wholesale Network").first()

    # 3. Seed Products (12 realistic Indian retail items)
    products = [
        Product(
            name="Amul Taaza Toned Milk 500ml",
            category_id=cat_dairy.id,
            supplier_id=sup_amul.id,
            barcode="8901262010015",
            cost_price=24.0,
            selling_price=27.0,
            current_stock=28,
            min_stock_level=10
        ),
        Product(
            name="Amul Pasteurized Butter 100g",
            category_id=cat_dairy.id,
            supplier_id=sup_amul.id,
            barcode="8901262010022",
            cost_price=50.0,
            selling_price=58.0,
            current_stock=18,
            min_stock_level=5
        ),
        Product(
            name="Britannia 100% Whole Wheat Bread 400g",
            category_id=cat_bakery.id,
            supplier_id=sup_britannia.id,
            barcode="8901063012011",
            cost_price=35.0,
            selling_price=45.0,
            current_stock=4,        # Low stock trigger
            min_stock_level=10
        ),
        Product(
            name="Britannia Good Day Butter Cookies 200g",
            category_id=cat_bakery.id,
            supplier_id=sup_britannia.id,
            barcode="8901063012028",
            cost_price=32.0,
            selling_price=40.0,
            current_stock=35,
            min_stock_level=12
        ),
        Product(
            name="Parle-G Original Glucose Biscuits 250g",
            category_id=cat_bakery.id,
            supplier_id=sup_itc.id,
            barcode="8901719101018",
            cost_price=20.0,
            selling_price=25.0,
            current_stock=50,
            min_stock_level=15
        ),
        Product(
            name="India Gate Basmati Rice Feast Rozzana 1kg",
            category_id=cat_staples.id,
            supplier_id=sup_itc.id,
            barcode="8906001201019",
            cost_price=110.0,
            selling_price=135.0,
            current_stock=16,
            min_stock_level=8
        ),
        Product(
            name="Tata Salt Vacuum Evaporated Iodized 1kg",
            category_id=cat_staples.id,
            supplier_id=sup_tata.id,
            barcode="8904043901012",
            cost_price=22.0,
            selling_price=28.0,
            current_stock=32,
            min_stock_level=10
        ),
        Product(
            name="Tata Tea Gold Leaf 250g",
            category_id=cat_bev.id,
            supplier_id=sup_tata.id,
            barcode="8901052010114",
            cost_price=130.0,
            selling_price=160.0,
            current_stock=14,
            min_stock_level=6
        ),
        Product(
            name="Fortune Sunlite Refined Sunflower Oil 1L",
            category_id=cat_staples.id,
            supplier_id=sup_itc.id,
            barcode="8906007281015",
            cost_price=122.0,
            selling_price=145.0,
            current_stock=12,
            min_stock_level=8
        ),
        Product(
            name="Dettol Original Germ Protection Bathing Soap 75g",
            category_id=cat_personal.id,
            supplier_id=sup_itc.id,
            barcode="8901396112016",
            cost_price=32.0,
            selling_price=40.0,
            current_stock=3,        # Low stock trigger
            min_stock_level=10
        ),
        Product(
            name="Colgate Strong Teeth Anticavity Toothpaste 100g",
            category_id=cat_personal.id,
            supplier_id=sup_itc.id,
            barcode="8901314010110",
            cost_price=54.0,
            selling_price=68.0,
            current_stock=24,
            min_stock_level=8
        ),
        Product(
            name="Aashirvaad Shudh Chakki Atta 5kg",
            category_id=cat_staples.id,
            supplier_id=sup_itc.id,
            barcode="8901725181234",
            cost_price=215.0,
            selling_price=250.0,
            current_stock=0,        # Out of stock trigger
            min_stock_level=5
        )
    ]
    db.add_all(products)
    db.commit()

    # 4. Seed Customers
    customers = [
        Customer(name="Rahul Sharma", phone="9876543210", email="rahul.sharma@example.com", address="B-12, Vaishali Nagar, Jaipur"),
        Customer(name="Priya Patel", phone="9812345678", email="priya.patel@example.com", address="45, Malviya Nagar, Jaipur"),
        Customer(name="Amit Verma", phone="9823456789", email="amit.verma@example.com", address="Flat 201, Mansarovar, Jaipur")
    ]
    db.add_all(customers)
    db.commit()

    # 5. Seed Historical Sales (3 demo transactions)
    now = datetime.utcnow()
    prod_milk = db.query(Product).filter_by(barcode="8901262010015").first()
    prod_bread = db.query(Product).filter_by(barcode="8901063012011").first()
    prod_butter = db.query(Product).filter_by(barcode="8901262010022").first()
    prod_tea = db.query(Product).filter_by(barcode="8901052010114").first()
    cust_rahul = db.query(Customer).filter_by(phone="9876543210").first()
    cust_priya = db.query(Customer).filter_by(phone="9812345678").first()

    # Sale 1 (2 days ago)
    sale1 = Sale(
        invoice_number="INV-2026-0001",
        customer_id=cust_rahul.id,
        subtotal=99.0,
        tax_amount=0.0,
        discount=0.0,
        grand_total=99.0,
        payment_method="UPI",
        created_at=now - timedelta(days=2)
    )
    db.add(sale1)
    db.commit()
    db.refresh(sale1)

    db.add_all([
        SaleItem(sale_id=sale1.id, product_id=prod_milk.id, unit_price=27.0, quantity=2, line_total=54.0),
        SaleItem(sale_id=sale1.id, product_id=prod_bread.id, unit_price=45.0, quantity=1, line_total=45.0)
    ])

    # Sale 2 (Yesterday)
    sale2 = Sale(
        invoice_number="INV-2026-0002",
        customer_id=cust_priya.id,
        subtotal=218.0,
        tax_amount=0.0,
        discount=10.0,
        grand_total=208.0,
        payment_method="Card",
        created_at=now - timedelta(days=1)
    )
    db.add(sale2)
    db.commit()
    db.refresh(sale2)

    db.add_all([
        SaleItem(sale_id=sale2.id, product_id=prod_butter.id, unit_price=58.0, quantity=1, line_total=58.0),
        SaleItem(sale_id=sale2.id, product_id=prod_tea.id, unit_price=160.0, quantity=1, line_total=160.0)
    ])

    db.commit()
    return "Seed successfully executed."
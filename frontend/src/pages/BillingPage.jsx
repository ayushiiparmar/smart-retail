import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  Receipt, 
  Search, 
  Barcode, 
  ShoppingCart, 
  Plus, 
  Minus, 
  Trash2, 
  CreditCard, 
  Wallet, 
  Banknote, 
  UserPlus, 
  CheckCircle2, 
  Printer, 
  X, 
  AlertCircle 
} from 'lucide-react';
import { getProducts, getCategories } from '../services/productApi';
import { processCheckout, getCustomers, createCustomer } from '../services/salesApi';

export default function BillingPage() {
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);

  // Search & Filter State
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [barcodeInput, setBarcodeInput] = useState('');

  // Cart State
  const [cart, setCart] = useState([]);
  const [selectedCustomer, setSelectedCustomer] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('Cash'); // Cash, UPI, Card
  const [discountAmount, setDiscountAmount] = useState(0);
  const [applyTax, setApplyTax] = useState(false); // 5% GST option

  // UI Modals
  const [isProcessing, setIsProcessing] = useState(false);
  const [notification, setNotification] = useState(null);
  const [completedSale, setCompletedSale] = useState(null);
  const [isCustomerModalOpen, setIsCustomerModalOpen] = useState(false);
  const [newCustomer, setNewCustomer] = useState({ name: '', phone: '', email: '' });

  const barcodeInputRef = useRef(null);

  const showToast = (message, type = 'success') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 3500);
  };

  const loadInitialData = async () => {
    try {
      setLoading(true);
      const [prodData, catData, custData] = await Promise.all([
        getProducts(),
        getCategories(),
        getCustomers()
      ]);
      setProducts(prodData);
      setCategories(catData);
      setCustomers(custData);
    } catch (err) {
      showToast('Failed to load store catalog data.', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadInitialData();
  }, []);

  // Filter Catalog
  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      const matchesSearch = 
        p.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
        p.barcode.includes(searchQuery);
      const matchesCategory = selectedCategory ? p.category_id === parseInt(selectedCategory) : true;
      return matchesSearch && matchesCategory;
    });
  }, [products, searchQuery, selectedCategory]);

  // Cart Actions
  const addToCart = (product) => {
    if (product.current_stock <= 0) {
      showToast(`"${product.name}" is out of stock!`, 'error');
      return;
    }

    setCart((prevCart) => {
      const existing = prevCart.find((item) => item.id === product.id);
      if (existing) {
        if (existing.quantity >= product.current_stock) {
          showToast(`Maximum available stock reached for ${product.name}`, 'error');
          return prevCart;
        }
        return prevCart.map((item) =>
          item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item
        );
      }
      return [...prevCart, { ...product, quantity: 1 }];
    });
  };

  const updateQuantity = (productId, delta) => {
    setCart((prevCart) =>
      prevCart
        .map((item) => {
          if (item.id === productId) {
            const newQty = item.quantity + delta;
            const product = products.find((p) => p.id === productId);
            if (newQty > product.current_stock) {
              showToast(`Only ${product.current_stock} units available in stock.`, 'error');
              return item;
            }
            return newQty > 0 ? { ...item, quantity: newQty } : null;
          }
          return item;
        })
        .filter(Boolean)
    );
  };

  const removeFromCart = (productId) => {
    setCart((prevCart) => prevCart.filter((item) => item.id !== productId));
  };

  const clearCart = () => {
    setCart([]);
    setDiscountAmount(0);
    setApplyTax(false);
  };

  // Barcode Fast Scan / Lookup
  const handleBarcodeSubmit = (e) => {
    e.preventDefault();
    if (!barcodeInput.trim()) return;

    const matchedProduct = products.find((p) => p.barcode === barcodeInput.trim());
    if (matchedProduct) {
      addToCart(matchedProduct);
      setBarcodeInput('');
    } else {
      showToast(`No product found with barcode: ${barcodeInput}`, 'error');
    }
  };

  // Financial Calculations
  const subtotal = useMemo(() => {
    return cart.reduce((sum, item) => sum + item.selling_price * item.quantity, 0);
  }, [cart]);

  const taxAmount = useMemo(() => {
    return applyTax ? Math.round(subtotal * 0.05 * 100) / 100 : 0.0;
  }, [subtotal, applyTax]);

  const grandTotal = useMemo(() => {
    const total = subtotal + taxAmount - (parseFloat(discountAmount) || 0);
    return total > 0 ? Math.round(total * 100) / 100 : 0.0;
  }, [subtotal, taxAmount, discountAmount]);

  // Execute Checkout
  const handleCompleteSale = async () => {
    if (cart.length === 0) {
      showToast('Cart is empty. Add products before completing sale.', 'error');
      return;
    }

    try {
      setIsProcessing(true);
      const payload = {
        customer_id: selectedCustomer ? parseInt(selectedCustomer) : null,
        payment_method: paymentMethod,
        discount: parseFloat(discountAmount) || 0.0,
        tax_rate: applyTax ? 5.0 : 0.0,
        items: cart.map((item) => ({
          product_id: item.id,
          quantity: item.quantity
        }))
      };

      const result = await processCheckout(payload);
      setCompletedSale(result);
      clearCart();
      loadInitialData(); // Refreshes products to reflect decreased stock counts
      showToast(`Sale completed! Invoice: ${result.invoice_number}`, 'success');
    } catch (err) {
      showToast(err.response?.data?.detail || 'Transaction failed. Check stock availability.', 'error');
    } finally {
      setIsProcessing(false);
    }
  };

  // On-the-fly Customer Creation
  const handleCreateCustomer = async (e) => {
    e.preventDefault();
    try {
      const created = await createCustomer(newCustomer);
      setCustomers((prev) => [...prev, created]);
      setSelectedCustomer(created.id);
      setIsCustomerModalOpen(false);
      setNewCustomer({ name: '', phone: '', email: '' });
      showToast(`Registered "${created.name}" successfully.`);
    } catch (err) {
      showToast(err.response?.data?.detail || 'Error registering customer.', 'error');
    }
  };

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      {notification && (
        <div className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-lg shadow-lg border text-sm font-medium transition-all ${
          notification.type === 'error' 
            ? 'bg-rose-50 text-rose-800 border-rose-200' 
            : 'bg-emerald-50 text-emerald-800 border-emerald-200'
        }`}>
          {notification.message}
        </div>
      )}

      {/* POS Top Bar & Barcode Scanner */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3 w-full md:w-auto">
          <div className="p-2.5 bg-indigo-50 text-indigo-600 rounded-lg">
            <Receipt size={22} />
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-900 leading-tight">POS Billing Terminal</h2>
            <p className="text-xs text-slate-500 font-medium">Fast Barcode Scanning & Checkout</p>
          </div>
        </div>

        {/* Barcode Fast-Add Form */}
        <form onSubmit={handleBarcodeSubmit} className="flex items-center gap-2 w-full md:w-96">
          <div className="relative flex-1">
            <Barcode className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input
              ref={barcodeInputRef}
              type="text"
              placeholder="Scan or type barcode & Enter..."
              value={barcodeInput}
              onChange={(e) => setBarcodeInput(e.target.value)}
              className="w-full pl-10 pr-4 py-2 font-mono text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
            />
          </div>
          <button
            type="submit"
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-semibold transition shrink-0"
          >
            Scan Item
          </button>
        </form>
      </div>

      {/* Main POS Split Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Product Selection Grid (7 Cols) */}
        <div className="lg:col-span-7 space-y-4">
          {/* Search & Category Filter */}
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={17} />
              <input
                type="text"
                placeholder="Search catalog by name..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-2 text-sm bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
              />
            </div>

            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="px-3 py-2 text-sm bg-white border border-slate-200 rounded-lg text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
            >
              <option value="">All Categories</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>

          {/* Product Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3.5 max-h-[620px] overflow-y-auto pr-1">
            {loading ? (
              <div className="col-span-full py-16 text-center text-slate-400 text-sm">
                Loading store items...
              </div>
            ) : filteredProducts.length === 0 ? (
              <div className="col-span-full py-16 text-center text-slate-400 text-sm">
                No matching products found.
              </div>
            ) : (
              filteredProducts.map((p) => {
                const isOutOfStock = p.current_stock <= 0;
                return (
                  <div
                    key={p.id}
                    onClick={() => !isOutOfStock && addToCart(p)}
                    className={`p-3.5 bg-white rounded-xl border transition flex flex-col justify-between select-none ${
                      isOutOfStock
                        ? 'opacity-50 cursor-not-allowed border-slate-200'
                        : 'hover:border-indigo-500 hover:shadow-sm cursor-pointer border-slate-200'
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between gap-1 mb-1">
                        <span className="text-[10px] font-medium text-slate-400 uppercase tracking-wider">
                          {p.category?.name || 'General'}
                        </span>
                        <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${
                          isOutOfStock 
                            ? 'bg-rose-100 text-rose-700' 
                            : p.current_stock <= p.min_stock_level 
                            ? 'bg-amber-100 text-amber-700' 
                            : 'bg-emerald-100 text-emerald-700'
                        }`}>
                          {isOutOfStock ? 'Out of Stock' : `${p.current_stock} left`}
                        </span>
                      </div>
                      <h4 className="font-semibold text-slate-900 text-sm leading-snug line-clamp-2">
                        {p.name}
                      </h4>
                      <p className="font-mono text-[11px] text-slate-400 mt-1">{p.barcode}</p>
                    </div>

                    <div className="mt-3 flex items-center justify-between pt-2 border-t border-slate-100">
                      <span className="font-bold text-slate-900 text-base">
                        ₹{p.selling_price.toFixed(2)}
                      </span>
                      <button
                        disabled={isOutOfStock}
                        className="p-1.5 bg-indigo-50 text-indigo-600 rounded-md hover:bg-indigo-600 hover:text-white transition disabled:opacity-40"
                      >
                        <Plus size={16} />
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Right Column: Checkout Cart & Register (5 Cols) */}
        <div className="lg:col-span-5 bg-white rounded-2xl border border-slate-200 shadow-sm p-5 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <ShoppingCart size={20} className="text-indigo-600" />
              <h3 className="font-bold text-slate-900">Current Cart</h3>
              <span className="text-xs px-2 py-0.5 bg-slate-100 text-slate-600 font-semibold rounded-full">
                {cart.reduce((sum, item) => sum + item.quantity, 0)} items
              </span>
            </div>
            {cart.length > 0 && (
              <button
                onClick={clearCart}
                className="text-xs font-semibold text-rose-600 hover:underline"
              >
                Clear Cart
              </button>
            )}
          </div>

          {/* Customer Attachment */}
          <div className="flex items-center gap-2">
            <select
              value={selectedCustomer}
              onChange={(e) => setSelectedCustomer(e.target.value)}
              className="flex-1 px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
            >
              <option value="">Walk-in Customer (Unregistered)</option>
              {customers.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} ({c.phone})
                </option>
              ))}
            </select>
            <button
              onClick={() => setIsCustomerModalOpen(true)}
              className="p-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition"
              title="Quick Register Customer"
            >
              <UserPlus size={18} />
            </button>
          </div>

          {/* Line Items List */}
          <div className="space-y-2.5 max-h-[260px] overflow-y-auto pr-1">
            {cart.length === 0 ? (
              <div className="py-12 text-center text-slate-400">
                <ShoppingCart size={32} className="mx-auto mb-2 text-slate-300" />
                <p className="text-sm font-medium">Cart is currently empty</p>
                <p className="text-xs text-slate-400 mt-0.5">Click products or scan barcodes to begin billing.</p>
              </div>
            ) : (
              cart.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between p-2.5 bg-slate-50 rounded-xl border border-slate-100"
                >
                  <div className="flex-1 min-w-0 pr-2">
                    <p className="text-xs font-semibold text-slate-800 truncate">{item.name}</p>
                    <p className="text-[11px] text-slate-400 font-mono">
                      ₹{item.selling_price.toFixed(2)} × {item.quantity}
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <div className="flex items-center bg-white border border-slate-200 rounded-lg shadow-sm">
                      <button
                        onClick={() => updateQuantity(item.id, -1)}
                        className="p-1 text-slate-500 hover:text-slate-900"
                      >
                        <Minus size={13} />
                      </button>
                      <span className="w-6 text-center text-xs font-bold text-slate-800">
                        {item.quantity}
                      </span>
                      <button
                        onClick={() => updateQuantity(item.id, 1)}
                        className="p-1 text-slate-500 hover:text-slate-900"
                      >
                        <Plus size={13} />
                      </button>
                    </div>

                    <span className="font-bold text-xs text-slate-900 w-16 text-right font-mono">
                      ₹{(item.selling_price * item.quantity).toFixed(2)}
                    </span>

                    <button
                      onClick={() => removeFromCart(item.id)}
                      className="text-slate-400 hover:text-rose-600 p-1"
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Pricing Adjustments & Summary */}
          <div className="space-y-2 pt-3 border-t border-slate-100 text-sm">
            <div className="flex justify-between text-slate-600">
              <span>Subtotal</span>
              <span className="font-mono font-medium">₹{subtotal.toFixed(2)}</span>
            </div>

            <div className="flex items-center justify-between gap-4">
              <label className="text-xs text-slate-600">Apply GST (5%)</label>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={applyTax}
                  onChange={(e) => setApplyTax(e.target.checked)}
                  className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500"
                />
                <span className="font-mono text-xs text-slate-600 w-16 text-right">
                  +₹{taxAmount.toFixed(2)}
                </span>
              </div>
            </div>

            <div className="flex items-center justify-between gap-4">
              <label className="text-xs text-slate-600">Discount (₹)</label>
              <input
                type="number"
                min="0"
                value={discountAmount}
                onChange={(e) => setDiscountAmount(e.target.value)}
                className="w-20 px-2 py-1 text-right text-xs bg-slate-50 border border-slate-200 rounded font-mono focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
            </div>

            <div className="flex justify-between items-center pt-2 border-t border-slate-200">
              <span className="text-base font-bold text-slate-900">Grand Total</span>
              <span className="text-2xl font-bold text-indigo-600 font-mono">
                ₹{grandTotal.toFixed(2)}
              </span>
            </div>
          </div>

          {/* Payment Method Selector */}
          <div className="space-y-1.5 pt-1">
            <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
              Payment Method
            </label>
            <div className="grid grid-cols-3 gap-2">
              {[
                { method: 'Cash', icon: Banknote },
                { method: 'UPI', icon: Wallet },
                { method: 'Card', icon: CreditCard }
              ].map(({ method, icon: Icon }) => (
                <button
                  key={method}
                  type="button"
                  onClick={() => setPaymentMethod(method)}
                  className={`flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-semibold border transition ${
                    paymentMethod === method
                      ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm'
                      : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  <Icon size={14} />
                  <span>{method}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Checkout Action Button */}
          <button
            onClick={handleCompleteSale}
            disabled={cart.length === 0 || isProcessing}
            className="w-full py-3.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-xl font-bold text-sm shadow-md shadow-emerald-600/20 transition flex items-center justify-center gap-2"
          >
            <CheckCircle2 size={18} />
            <span>{isProcessing ? 'Processing Transaction...' : `Complete Sale (₹${grandTotal.toFixed(2)})`}</span>
          </button>
        </div>
      </div>

      {/* Invoice Receipt Modal */}
      {completedSale && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full shadow-2xl border border-slate-200 overflow-hidden">
            {/* Thermal Receipt Body */}
            <div className="p-6 font-mono text-xs text-slate-800 space-y-4" id="printable-receipt">
              <div className="text-center border-b border-dashed border-slate-300 pb-3">
                <h3 className="font-bold text-sm tracking-wider uppercase">SMART RETAIL STORE</h3>
                <p className="text-[10px] text-slate-500 mt-0.5">Plot 14, Commercial Hub, Jaipur</p>
                <p className="text-[10px] text-slate-500">GSTIN: 08AAACR1234F1Z9</p>
              </div>

              <div className="space-y-1 text-[11px] border-b border-dashed border-slate-300 pb-3">
                <div className="flex justify-between">
                  <span className="text-slate-500">Invoice No:</span>
                  <span className="font-bold">{completedSale.invoice_number}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Date:</span>
                  <span>{new Date(completedSale.created_at).toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Customer:</span>
                  <span>{completedSale.customer?.name || 'Walk-in'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Payment:</span>
                  <span className="font-bold">{completedSale.payment_method}</span>
                </div>
              </div>

              {/* Line items */}
              <div className="border-b border-dashed border-slate-300 pb-3 space-y-1.5">
                <div className="flex justify-between font-bold text-[10px] text-slate-400 uppercase">
                  <span>Item</span>
                  <span>Qty × Rate</span>
                  <span>Amt</span>
                </div>
                {completedSale.items.map((it, idx) => (
                  <div key={idx} className="flex justify-between text-[11px]">
                    <span className="truncate max-w-[130px]">{it.product_name}</span>
                    <span>{it.quantity} × {it.unit_price.toFixed(0)}</span>
                    <span className="font-bold">₹{it.line_total.toFixed(2)}</span>
                  </div>
                ))}
              </div>

              {/* Receipt Totals */}
              <div className="space-y-1 text-xs border-b border-dashed border-slate-300 pb-3">
                <div className="flex justify-between">
                  <span>Subtotal:</span>
                  <span>₹{completedSale.subtotal.toFixed(2)}</span>
                </div>
                {completedSale.tax_amount > 0 && (
                  <div className="flex justify-between">
                    <span>GST (5%):</span>
                    <span>₹{completedSale.tax_amount.toFixed(2)}</span>
                  </div>
                )}
                {completedSale.discount > 0 && (
                  <div className="flex justify-between text-emerald-600">
                    <span>Discount:</span>
                    <span>-₹{completedSale.discount.toFixed(2)}</span>
                  </div>
                )}
                <div className="flex justify-between font-bold text-sm pt-1">
                  <span>Grand Total:</span>
                  <span>₹{completedSale.grand_total.toFixed(2)}</span>
                </div>
              </div>

              <p className="text-center text-[10px] text-slate-400 pt-1">
                Thank you for shopping with us!
              </p>
            </div>

            {/* Modal Actions */}
            <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between gap-3">
              <button
                onClick={() => window.print()}
                className="flex items-center gap-1.5 px-3 py-2 bg-slate-200 hover:bg-slate-300 text-slate-800 rounded-lg text-xs font-bold transition"
              >
                <Printer size={15} />
                <span>Print Bill</span>
              </button>
              <button
                onClick={() => setCompletedSale(null)}
                className="flex-1 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold transition text-center"
              >
                Start New Sale
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Quick Customer Registration Modal */}
      {isCustomerModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-2xl border border-slate-200">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-bold text-slate-900">Add Customer</h3>
              <button onClick={() => setIsCustomerModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCreateCustomer} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Full Name *</label>
                <input
                  type="text"
                  required
                  value={newCustomer.name}
                  onChange={(e) => setNewCustomer({ ...newCustomer, name: e.target.value })}
                  placeholder="e.g. Ramesh Kumar"
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500/20"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Phone Number *</label>
                <input
                  type="tel"
                  required
                  value={newCustomer.phone}
                  onChange={(e) => setNewCustomer({ ...newCustomer, phone: e.target.value })}
                  placeholder="e.g. 9876543210"
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500/20"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Email (Optional)</label>
                <input
                  type="email"
                  value={newCustomer.email}
                  onChange={(e) => setNewCustomer({ ...newCustomer, email: e.target.value })}
                  placeholder="ramesh@example.com"
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500/20"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsCustomerModalOpen(false)}
                  className="px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-100 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 text-xs font-bold bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
                >
                  Save & Select
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
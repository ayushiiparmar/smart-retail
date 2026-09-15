import React, { useState, useEffect, useMemo } from 'react';
import { 
  Package, 
  Plus, 
  Search, 
  Filter, 
  AlertTriangle, 
  CheckCircle2, 
  XCircle, 
  Edit2, 
  Trash2, 
  Barcode, 
  ArrowUpDown,
  RefreshCw,
  PlusCircle,
  MinusCircle,
  X,
  Lock,
  Download
} from 'lucide-react';
import { 
  getProducts, 
  createProduct, 
  updateProduct, 
  deleteProduct, 
  adjustStock, 
  getCategories, 
  getSuppliers 
} from '../services/productApi';
import api from '../services/api';

export default function InventoryPage() {
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [stockTab, setStockTab] = useState('all'); // all, in_stock, low_stock, out_of_stock
  const [notification, setNotification] = useState(null);

  // Manager Mode Authorization Check - verified against the server rather
  // than comparing the stored PIN to a hardcoded value on the client.
  const [isManager, setIsManager] = useState(false);

  useEffect(() => {
    const storedPin = localStorage.getItem('smart_retail_manager_pin');
    if (!storedPin) return;
    api.post('/api/auth/verify-pin')
      .then(() => setIsManager(true))
      .catch(() => setIsManager(false));
  }, []);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    category_id: '',
    supplier_id: '',
    barcode: '',
    cost_price: '',
    selling_price: '',
    current_stock: '',
    min_stock_level: 5
  });

  const showToast = (message, type = 'success') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 3500);
  };

  const loadData = async () => {
    try {
      setLoading(true);
      const [prodData, catData, supData] = await Promise.all([
        getProducts(),
        getCategories(),
        getSuppliers()
      ]);
      setProducts(prodData);
      setCategories(catData);
      setSuppliers(supData);
    } catch (err) {
      showToast(err.response?.data?.detail || 'Failed to load inventory data', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Filtered Products Logic
  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      const matchesSearch = 
        p.name.toLowerCase().includes(search.toLowerCase()) || 
        p.barcode.includes(search);
      
      const matchesCategory = selectedCategory ? p.category_id === parseInt(selectedCategory) : true;

      let matchesTab = true;
      if (stockTab === 'in_stock') matchesTab = p.current_stock > p.min_stock_level;
      if (stockTab === 'low_stock') matchesTab = p.current_stock > 0 && p.current_stock <= p.min_stock_level;
      if (stockTab === 'out_of_stock') matchesTab = p.current_stock <= 0;

      return matchesSearch && matchesCategory && matchesTab;
    });
  }, [products, search, selectedCategory, stockTab]);

  // Stock Summary Counts
  const stats = useMemo(() => {
    const total = products.length;
    const low = products.filter(p => p.current_stock > 0 && p.current_stock <= p.min_stock_level).length;
    const out = products.filter(p => p.current_stock <= 0).length;
    const inStock = products.filter(p => p.current_stock > p.min_stock_level).length;
    return { total, inStock, low, out };
  }, [products]);

  // One-Click CSV Export Handler
  const handleExportCSV = () => {
    if (products.length === 0) {
      showToast('No inventory records to export.', 'error');
      return;
    }

    const headers = ['ID', 'Product Name', 'Barcode', 'Category', 'Cost Price (INR)', 'Selling Price (INR)', 'Stock', 'Min Stock'];
    const rows = products.map((p) => [
      p.id,
      `"${p.name.replace(/"/g, '""')}"`,
      `"${p.barcode}"`,
      `"${p.category?.name || 'Unassigned'}"`,
      p.cost_price,
      p.selling_price,
      p.current_stock,
      p.min_stock_level
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `store_inventory_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast('Inventory exported to CSV successfully!');
  };

  // Role Guarded Action Handlers
  const handleAddClick = () => {
    if (!isManager) {
      showToast('Manager Access Required: Unlock Manager Mode in the top navigation bar.', 'error');
      return;
    }
    openModal();
  };

  const handleEditClick = (product) => {
    if (!isManager) {
      showToast('Manager Access Required: Unlock Manager Mode to edit catalog items.', 'error');
      return;
    }
    openModal(product);
  };

  const handleDeleteClick = (id, name) => {
    if (!isManager) {
      showToast('Manager Access Required: Unauthorized to delete inventory.', 'error');
      return;
    }
    handleDelete(id, name);
  };

  // Open Modal (Add or Edit)
  const openModal = (product = null) => {
    if (product) {
      setEditingProduct(product);
      setFormData({
        name: product.name,
        category_id: product.category_id,
        supplier_id: product.supplier_id || '',
        barcode: product.barcode,
        cost_price: product.cost_price,
        selling_price: product.selling_price,
        current_stock: product.current_stock,
        min_stock_level: product.min_stock_level
      });
    } else {
      setEditingProduct(null);
      setFormData({
        name: '',
        category_id: categories[0]?.id || '',
        supplier_id: suppliers[0]?.id || '',
        barcode: Math.floor(100000000000 + Math.random() * 900000000000).toString(),
        cost_price: '',
        selling_price: '',
        current_stock: 10,
        min_stock_level: 5
      });
    }
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingProduct(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        ...formData,
        category_id: parseInt(formData.category_id),
        supplier_id: formData.supplier_id ? parseInt(formData.supplier_id) : null,
        cost_price: parseFloat(formData.cost_price),
        selling_price: parseFloat(formData.selling_price),
        current_stock: parseInt(formData.current_stock),
        min_stock_level: parseInt(formData.min_stock_level)
      };

      if (editingProduct) {
        await updateProduct(editingProduct.id, payload);
        showToast(`Updated "${payload.name}" successfully`);
      } else {
        await createProduct(payload);
        showToast(`Added "${payload.name}" to inventory`);
      }
      closeModal();
      loadData();
    } catch (err) {
      showToast(err.response?.data?.detail || 'Validation error saving product', 'error');
    }
  };

  const handleDelete = async (id, name) => {
    if (!window.confirm(`Are you sure you want to delete "${name}"?`)) return;
    try {
      await deleteProduct(id);
      showToast(`Deleted "${name}"`);
      loadData();
    } catch (err) {
      showToast(err.response?.data?.detail || 'Failed to delete product', 'error');
    }
  };

  const handleStockAdjustment = async (id, name, delta) => {
    if (!isManager) {
      showToast('Manager Access Required: Unlock Manager Mode to adjust stock.', 'error');
      return;
    }
    try {
      await adjustStock(id, delta);
      showToast(`Updated stock for ${name}`);
      loadData();
    } catch (err) {
      showToast(err.response?.data?.detail || 'Cannot adjust stock', 'error');
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

      {/* Header & Main Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 tracking-tight">Inventory Management</h2>
          <p className="text-sm text-slate-500 mt-0.5">Control SKUs, barcode mappings, and safety stock levels.</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => loadData()}
            className="p-2.5 bg-white border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-50 transition"
            title="Refresh list"
          >
            <RefreshCw size={17} className={loading ? 'animate-spin text-indigo-600' : ''} />
          </button>
          
          {/* CSV Export Button */}
          <button
            onClick={handleExportCSV}
            className="flex items-center gap-1.5 px-3 py-2.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-lg text-sm font-semibold shadow-sm transition"
            title="Export catalog as CSV"
          >
            <Download size={16} />
            <span className="hidden sm:inline">Export CSV</span>
          </button>

          {/* Add Product Button */}
          <button
            onClick={handleAddClick}
            className="flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-semibold shadow-sm transition"
          >
            <Plus size={18} />
            <span>Add Product</span>
          </button>
        </div>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div 
          onClick={() => setStockTab('all')}
          className={`p-4 bg-white rounded-xl border cursor-pointer transition ${stockTab === 'all' ? 'border-indigo-500 ring-2 ring-indigo-500/10' : 'border-slate-200 hover:border-slate-300'}`}
        >
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total SKUs</p>
          <p className="text-2xl font-bold text-slate-900 mt-1">{stats.total}</p>
        </div>
        <div 
          onClick={() => setStockTab('in_stock')}
          className={`p-4 bg-white rounded-xl border cursor-pointer transition ${stockTab === 'in_stock' ? 'border-emerald-500 ring-2 ring-emerald-500/10' : 'border-slate-200 hover:border-slate-300'}`}
        >
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold text-emerald-700 uppercase tracking-wider">In Stock</p>
            <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
          </div>
          <p className="text-2xl font-bold text-slate-900 mt-1">{stats.inStock}</p>
        </div>
        <div 
          onClick={() => setStockTab('low_stock')}
          className={`p-4 bg-white rounded-xl border cursor-pointer transition ${stockTab === 'low_stock' ? 'border-amber-500 ring-2 ring-amber-500/10' : 'border-slate-200 hover:border-slate-300'}`}
        >
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold text-amber-700 uppercase tracking-wider">Low Stock</p>
            <span className="w-2 h-2 rounded-full bg-amber-500"></span>
          </div>
          <p className="text-2xl font-bold text-slate-900 mt-1">{stats.low}</p>
        </div>
        <div 
          onClick={() => setStockTab('out_of_stock')}
          className={`p-4 bg-white rounded-xl border cursor-pointer transition ${stockTab === 'out_of_stock' ? 'border-rose-500 ring-2 ring-rose-500/10' : 'border-slate-200 hover:border-slate-300'}`}
        >
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold text-rose-700 uppercase tracking-wider">Out of Stock</p>
            <span className="w-2 h-2 rounded-full bg-rose-500"></span>
          </div>
          <p className="text-2xl font-bold text-slate-900 mt-1">{stats.out}</p>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="p-4 bg-white rounded-xl border border-slate-200 flex flex-col md:flex-row items-center justify-between gap-3 shadow-sm">
        <div className="relative w-full md:w-80">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={17} />
          <input
            type="text"
            placeholder="Search by product name or barcode..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
          />
        </div>

        <div className="flex items-center gap-3 w-full md:w-auto">
          {/* Category Dropdown */}
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="w-full md:w-auto px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
          >
            <option value="">All Categories</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>

          {/* Quick Tab Pill */}
          <div className="flex bg-slate-100 p-1 rounded-lg text-xs font-medium text-slate-600">
            {['all', 'in_stock', 'low_stock', 'out_of_stock'].map((t) => (
              <button
                key={t}
                onClick={() => setStockTab(t)}
                className={`px-3 py-1 rounded-md capitalize transition ${stockTab === t ? 'bg-white text-slate-900 shadow-sm font-semibold' : 'hover:text-slate-900'}`}
              >
                {t.replace('_', ' ')}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Products Data Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50/75 border-b border-slate-200 text-xs font-semibold text-slate-500 uppercase tracking-wider">
              <tr>
                <th className="px-6 py-3.5">Product & SKU</th>
                <th className="px-6 py-3.5">Category</th>
                <th className="px-6 py-3.5">Cost Price</th>
                <th className="px-6 py-3.5">Selling Price</th>
                <th className="px-6 py-3.5 text-center">Stock Level</th>
                <th className="px-6 py-3.5 text-center">Status</th>
                <th className="px-6 py-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {loading ? (
                <tr>
                  <td colSpan="7" className="text-center py-12 text-slate-400">
                    Loading inventory records...
                  </td>
                </tr>
              ) : filteredProducts.length === 0 ? (
                <tr>
                  <td colSpan="7" className="text-center py-16">
                    <Package className="mx-auto text-slate-300 mb-2" size={36} />
                    <p className="font-semibold text-slate-700">No products found</p>
                    <p className="text-xs text-slate-400 mt-1">Try adjusting your search query or active filters.</p>
                  </td>
                </tr>
              ) : (
                filteredProducts.map((product) => {
                  let statusBadge = (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                      <CheckCircle2 size={12} /> IN STOCK
                    </span>
                  );
                  if (product.current_stock <= 0) {
                    statusBadge = (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200">
                        <XCircle size={12} /> OUT OF STOCK
                      </span>
                    );
                  } else if (product.current_stock <= product.min_stock_level) {
                    statusBadge = (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">
                        <AlertTriangle size={12} /> LOW STOCK
                      </span>
                    );
                  }

                  return (
                    <tr key={product.id} className="hover:bg-slate-50/70 transition">
                      <td className="px-6 py-4">
                        <div className="font-semibold text-slate-900">{product.name}</div>
                        <div className="flex items-center gap-1.5 text-xs text-slate-400 mt-0.5">
                          <Barcode size={14} />
                          <span className="font-mono">{product.barcode}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-xs font-medium px-2 py-1 bg-slate-100 rounded-md text-slate-700">
                          {product.category?.name || 'Unassigned'}
                        </span>
                      </td>

                      {/* Obscured Cost Price if in Cashier Mode */}
                      <td className="px-6 py-4 font-mono font-medium text-slate-600">
                        {isManager ? (
                          `₹${product.cost_price.toFixed(2)}`
                        ) : (
                          <span className="text-slate-400 text-xs flex items-center gap-1" title="Manager Mode Required">
                            <Lock size={12} /> ••••••
                          </span>
                        )}
                      </td>

                      <td className="px-6 py-4 font-mono font-semibold text-slate-900">
                        ₹{product.selling_price.toFixed(2)}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            onClick={() => handleStockAdjustment(product.id, product.name, -1)}
                            disabled={product.current_stock <= 0}
                            className="text-slate-400 hover:text-rose-600 disabled:opacity-30 disabled:cursor-not-allowed transition"
                            title="Quick deduct 1"
                          >
                            <MinusCircle size={18} />
                          </button>
                          <span className="font-bold text-slate-900 w-8 text-center">
                            {product.current_stock}
                          </span>
                          <button
                            onClick={() => handleStockAdjustment(product.id, product.name, 1)}
                            className="text-slate-400 hover:text-emerald-600 transition"
                            title="Quick add 1"
                          >
                            <PlusCircle size={18} />
                          </button>
                        </div>
                        <p className="text-[10px] text-center text-slate-400 mt-0.5">
                          Min: {product.min_stock_level}
                        </p>
                      </td>
                      <td className="px-6 py-4 text-center">
                        {statusBadge}
                      </td>
                      <td className="px-6 py-4 text-right space-x-2">
                        <button
                          onClick={() => handleEditClick(product)}
                          className="p-1.5 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-md transition"
                          title={isManager ? "Edit Product" : "Manager Mode Required"}
                        >
                          <Edit2 size={16} />
                        </button>
                        <button
                          onClick={() => handleDeleteClick(product.id, product.name)}
                          className="p-1.5 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-md transition"
                          title={isManager ? "Delete Product" : "Manager Mode Required"}
                        >
                          <Trash2 size={16} />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add / Edit Product Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl border border-slate-200 overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/50">
              <h3 className="font-bold text-slate-900">
                {editingProduct ? 'Edit Product' : 'Add New Product'}
              </h3>
              <button 
                onClick={closeModal} 
                className="text-slate-400 hover:text-slate-600 p-1 rounded-md"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                  Product Name *
                </label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g. Amul Butter 100g"
                  className="w-full px-3.5 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                    Category *
                  </label>
                  <select
                    required
                    value={formData.category_id}
                    onChange={(e) => setFormData({ ...formData, category_id: e.target.value })}
                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                  >
                    <option value="">Select Category</option>
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                    Supplier
                  </label>
                  <select
                    value={formData.supplier_id}
                    onChange={(e) => setFormData({ ...formData, supplier_id: e.target.value })}
                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                  >
                    <option value="">None / Direct</option>
                    {suppliers.map((s) => (
                      <option key={s.id} value={s.id}>{s.company}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                  Barcode (EAN / SKU) *
                </label>
                <input
                  type="text"
                  required
                  value={formData.barcode}
                  onChange={(e) => setFormData({ ...formData, barcode: e.target.value })}
                  className="w-full font-mono px-3.5 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                    Cost Price (₹) *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    required
                    value={formData.cost_price}
                    onChange={(e) => setFormData({ ...formData, cost_price: e.target.value })}
                    className="w-full px-3.5 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                    Selling Price (₹) *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    required
                    value={formData.selling_price}
                    onChange={(e) => setFormData({ ...formData, selling_price: e.target.value })}
                    className="w-full px-3.5 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                    Current Stock *
                  </label>
                  <input
                    type="number"
                    min="0"
                    required
                    value={formData.current_stock}
                    onChange={(e) => setFormData({ ...formData, current_stock: e.target.value })}
                    className="w-full px-3.5 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                    Min Stock Threshold *
                  </label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={formData.min_stock_level}
                    onChange={(e) => setFormData({ ...formData, min_stock_level: e.target.value })}
                    className="w-full px-3.5 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={closeModal}
                  className="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-lg transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-sm font-semibold bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg shadow-sm transition"
                >
                  {editingProduct ? 'Update Product' : 'Save Product'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
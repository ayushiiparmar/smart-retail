import React, { useState, useEffect, useMemo } from 'react';
import { 
  Truck, 
  Plus, 
  Search, 
  Phone, 
  Mail, 
  MapPin, 
  Package, 
  Edit2, 
  Trash2, 
  X, 
  RefreshCw,
  ExternalLink
} from 'lucide-react';
import { 
  getSuppliers, 
  createSupplier, 
  updateSupplier, 
  deleteSupplier, 
  getSupplierProducts 
} from '../services/supplierApi';
import api from '../services/api';

export default function SuppliersPage() {
  const [suppliers, setSuppliers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [notification, setNotification] = useState(null);

  // Manager Mode Authorization Check - verified against the server, same
  // approach as InventoryPage, so Add/Edit/Delete only show when the
  // action will actually be allowed by the backend.
  const [isManager, setIsManager] = useState(false);

  useEffect(() => {
    const storedPin = localStorage.getItem('smart_retail_manager_pin');
    if (!storedPin) return;
    api.post('/api/auth/verify-pin')
      .then(() => setIsManager(true))
      .catch(() => setIsManager(false));
  }, []);

  // Add/Edit Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    company: '',
    phone: '',
    email: '',
    address: ''
  });

  // Supplied Products Modal
  const [activeSupplierProducts, setActiveSupplierProducts] = useState(null);
  const [supplierProductsList, setSupplierProductsList] = useState([]);
  const [loadingProducts, setLoadingProducts] = useState(false);

  const showToast = (message, type = 'success') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 3500);
  };

  const fetchSuppliers = async () => {
    try {
      setLoading(true);
      const data = await getSuppliers();
      setSuppliers(data);
    } catch (err) {
      showToast('Failed to load supplier records.', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSuppliers();
  }, []);

  const filteredSuppliers = useMemo(() => {
    return suppliers.filter((s) => {
      const q = search.toLowerCase();
      return (
        s.company.toLowerCase().includes(q) ||
        s.name.toLowerCase().includes(q) ||
        s.phone.includes(q)
      );
    });
  }, [suppliers, search]);

  const openModal = (supplier = null) => {
    if (supplier) {
      setEditingSupplier(supplier);
      setFormData({
        name: supplier.name,
        company: supplier.company,
        phone: supplier.phone,
        email: supplier.email || '',
        address: supplier.address || ''
      });
    } else {
      setEditingSupplier(null);
      setFormData({ name: '', company: '', phone: '', email: '', address: '' });
    }
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingSupplier(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!isManager) {
      showToast('Manager Access Required: Unlock Manager Mode to save suppliers.', 'error');
      return;
    }
    try {
      if (editingSupplier) {
        await updateSupplier(editingSupplier.id, formData);
        showToast(`Updated "${formData.company}" successfully.`);
      } else {
        await createSupplier(formData);
        showToast(`Registered new supplier "${formData.company}".`);
      }
      closeModal();
      fetchSuppliers();
    } catch (err) {
      showToast(err.response?.data?.detail || 'Error saving supplier.', 'error');
    }
  };

  const handleDelete = async (id, company) => {
    if (!isManager) {
      showToast('Manager Access Required: Unlock Manager Mode to delete suppliers.', 'error');
      return;
    }
    if (!window.confirm(`Are you sure you want to remove supplier "${company}"?`)) return;
    try {
      await deleteSupplier(id);
      showToast(`Supplier "${company}" removed.`);
      fetchSuppliers();
    } catch (err) {
      showToast('Failed to delete supplier.', 'error');
    }
  };

  const handleViewProducts = async (supplier) => {
    setActiveSupplierProducts(supplier);
    try {
      setLoadingProducts(true);
      const prods = await getSupplierProducts(supplier.id);
      setSupplierProductsList(prods);
    } catch (err) {
      showToast('Error loading supplied products.', 'error');
    } finally {
      setLoadingProducts(false);
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

      {/* Header & Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 tracking-tight">Supplier Management</h2>
          <p className="text-sm text-slate-500 mt-0.5">Maintain vendor relationships and catalog fulfillment sources.</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={fetchSuppliers}
            className="p-2.5 bg-white border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-50 transition"
            title="Refresh list"
          >
            <RefreshCw size={17} className={loading ? 'animate-spin text-indigo-600' : ''} />
          </button>
          {isManager && (
            <button
              onClick={() => openModal()}
              className="flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-semibold shadow-sm transition"
            >
              <Plus size={18} />
              <span>Add Supplier</span>
            </button>
          )}
        </div>
      </div>

      {/* Search Bar */}
      <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-sm max-w-md">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={17} />
          <input
            type="text"
            placeholder="Search by company, contact name, or phone..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
          />
        </div>
      </div>

      {/* Supplier Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {loading ? (
          <div className="col-span-full py-16 text-center text-slate-400 text-sm">
            Loading supplier profiles...
          </div>
        ) : filteredSuppliers.length === 0 ? (
          <div className="col-span-full py-16 text-center text-slate-400 text-sm">
            No suppliers found matching your query.
          </div>
        ) : (
          filteredSuppliers.map((s) => (
            <div
              key={s.id}
              className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 flex flex-col justify-between hover:border-slate-300 transition"
            >
              <div>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <span className="text-[10px] font-semibold uppercase px-2 py-0.5 rounded bg-indigo-50 text-indigo-700 border border-indigo-100">
                      Supplier #{s.id}
                    </span>
                    <h3 className="font-bold text-slate-900 text-base mt-2 leading-tight">
                      {s.company}
                    </h3>
                    <p className="text-xs text-slate-500 font-medium">{s.name}</p>
                  </div>
                  {isManager && (
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => openModal(s)}
                        className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded transition"
                        title="Edit Supplier"
                      >
                        <Edit2 size={15} />
                      </button>
                      <button
                        onClick={() => handleDelete(s.id, s.company)}
                        className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded transition"
                        title="Delete Supplier"
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  )}
                </div>

                {/* Contact Information */}
                <div className="space-y-2 mt-4 text-xs text-slate-600">
                  <div className="flex items-center gap-2">
                    <Phone size={14} className="text-slate-400 shrink-0" />
                    <span>{s.phone}</span>
                  </div>
                  {s.email && (
                    <div className="flex items-center gap-2">
                      <Mail size={14} className="text-slate-400 shrink-0" />
                      <span className="truncate">{s.email}</span>
                    </div>
                  )}
                  {s.address && (
                    <div className="flex items-start gap-2">
                      <MapPin size={14} className="text-slate-400 shrink-0 mt-0.5" />
                      <span className="line-clamp-2">{s.address}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Bottom Products Action */}
              <div className="mt-5 pt-3 border-t border-slate-100 flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-700">
                  {s.product_count} Supplied Products
                </span>
                <button
                  onClick={() => handleViewProducts(s)}
                  className="flex items-center gap-1 text-xs font-semibold text-indigo-600 hover:text-indigo-700"
                >
                  <span>View Items</span>
                  <ExternalLink size={12} />
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Add / Edit Supplier Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-slate-200 overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/50">
              <h3 className="font-bold text-slate-900">
                {editingSupplier ? 'Edit Supplier' : 'Add New Supplier'}
              </h3>
              <button onClick={closeModal} className="text-slate-400 hover:text-slate-600 p-1">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Company / Entity Name *</label>
                <input
                  type="text"
                  required
                  value={formData.company}
                  onChange={(e) => setFormData({ ...formData, company: e.target.value })}
                  placeholder="e.g. Amul Dairy Logistics"
                  className="w-full px-3.5 py-2 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500/20"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Contact Person Name *</label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g. Rajesh Sharma"
                  className="w-full px-3.5 py-2 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500/20"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Phone Number *</label>
                  <input
                    type="tel"
                    required
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    placeholder="9829012345"
                    className="w-full px-3.5 py-2 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500/20"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Email</label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="vendor@example.com"
                    className="w-full px-3.5 py-2 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500/20"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Warehouse / Office Address</label>
                <textarea
                  rows="2"
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  placeholder="Plot number, industrial area, city..."
                  className="w-full px-3.5 py-2 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500/20"
                />
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={closeModal}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg shadow-sm"
                >
                  {editingSupplier ? 'Update Supplier' : 'Save Supplier'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Supplied Products Viewer Modal */}
      {activeSupplierProducts && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl border border-slate-200 overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/50">
              <div>
                <h3 className="font-bold text-slate-900">{activeSupplierProducts.company}</h3>
                <p className="text-xs text-slate-500">Products fulfilled by this vendor</p>
              </div>
              <button 
                onClick={() => setActiveSupplierProducts(null)} 
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X size={18} />
              </button>
            </div>

            <div className="p-6 max-h-[380px] overflow-y-auto">
              {loadingProducts ? (
                <div className="py-8 text-center text-slate-400 text-xs">Loading items...</div>
              ) : supplierProductsList.length === 0 ? (
                <div className="py-8 text-center text-slate-400 text-xs">
                  No products currently linked to this supplier. Assign products in the Inventory module.
                </div>
              ) : (
                <div className="divide-y divide-slate-100">
                  {supplierProductsList.map((prod) => (
                    <div key={prod.id} className="py-2.5 flex items-center justify-between">
                      <div>
                        <p className="text-xs font-semibold text-slate-800">{prod.name}</p>
                        <p className="text-[10px] text-slate-400 font-mono">Barcode: {prod.barcode}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-xs font-bold text-slate-900 font-mono">₹{prod.selling_price.toFixed(2)}</p>
                        <span className="text-[10px] font-semibold text-slate-500">
                          {prod.current_stock} in stock
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="p-4 bg-slate-50 border-t border-slate-100 text-right">
              <button
                onClick={() => setActiveSupplierProducts(null)}
                className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-800 text-xs font-bold rounded-lg"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
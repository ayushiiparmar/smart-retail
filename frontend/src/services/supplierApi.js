import api from './api';

export const getSuppliers = async () => {
  const response = await api.get('/api/suppliers');
  return response.data;
};

export const createSupplier = async (data) => {
  const response = await api.post('/api/suppliers', data);
  return response.data;
};

export const updateSupplier = async (id, data) => {
  const response = await api.put(`/api/suppliers/${id}`, data);
  return response.data;
};

export const deleteSupplier = async (id) => {
  const response = await api.delete(`/api/suppliers/${id}`);
  return response.data;
};

export const getSupplierProducts = async (id) => {
  const response = await api.get(`/api/suppliers/${id}/products`);
  return response.data;
};
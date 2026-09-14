import api from './api';

export const getProducts = async (params = {}) => {
  const response = await api.get('/api/products', { params });
  return response.data;
};

export const createProduct = async (productData) => {
  const response = await api.post('/api/products', productData);
  return response.data;
};

export const updateProduct = async (id, productData) => {
  const response = await api.put(`/api/products/${id}`, productData);
  return response.data;
};

export const deleteProduct = async (id) => {
  const response = await api.delete(`/api/products/${id}`);
  return response.data;
};

export const adjustStock = async (id, adjustment) => {
  const response = await api.patch(`/api/products/${id}/stock`, { adjustment });
  return response.data;
};

export const getCategories = async () => {
  const response = await api.get('/api/categories');
  return response.data;
};

export const getSuppliers = async () => {
  const response = await api.get('/api/suppliers');
  return response.data;
};
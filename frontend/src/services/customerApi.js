import api from './api';

export const getCustomers = async () => {
  const response = await api.get('/api/customers');
  return response.data;
};

export const createCustomer = async (data) => {
  const response = await api.post('/api/customers', data);
  return response.data;
};

export const updateCustomer = async (id, data) => {
  const response = await api.put(`/api/customers/${id}`, data);
  return response.data;
};

export const deleteCustomer = async (id) => {
  const response = await api.delete(`/api/customers/${id}`);
  return response.data;
};

export const getCustomerHistory = async (id) => {
  const response = await api.get(`/api/customers/${id}/history`);
  return response.data;
};
import api from './api';

export const processCheckout = async (saleData) => {
  const response = await api.post('/api/sales', saleData);
  return response.data;
};

export const getRecentSales = async () => {
  const response = await api.get('/api/sales');
  return response.data;
};

export const getCustomers = async () => {
  const response = await api.get('/api/customers');
  return response.data;
};

export const createCustomer = async (customerData) => {
  const response = await api.post('/api/customers', customerData);
  return response.data;
};
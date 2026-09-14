import api from './api';

export const getDashboardSummary = async () => {
  const response = await api.get('/api/analytics/dashboard');
  return response.data;
};

export const getAdvancedAnalytics = async (period = '7d') => {
  const response = await api.get('/api/analytics/advanced', {
    params: { period }
  });
  return response.data;
};
import api from './api';

export const getReorderRecommendations = async () => {
  const response = await api.get('/api/ai/recommendations');
  return response.data;
};

export const sendAIChatMessage = async (message) => {
  const response = await api.post('/api/ai/chat', { message });
  return response.data;
};
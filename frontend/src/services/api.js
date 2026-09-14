import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:8000',
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 15000,
});

api.interceptors.request.use((config) => {
  const managerPin = localStorage.getItem('smart_retail_manager_pin');
  if (managerPin) {
    config.headers['X-Manager-PIN'] = managerPin;
  }
  return config;
});

export default api;
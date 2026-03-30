import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.PROD ? '/api' : 'http://localhost:5000/api',
});

// Intercept requests to inject the JWT token if present
api.interceptors.request.use((config) => {
  const userInfo = JSON.parse(localStorage.getItem('userInfo'));
  if (userInfo && userInfo.token) {
    config.headers.Authorization = `Bearer ${userInfo.token}`;
  }
  return config;
}, (error) => {
  return Promise.reject(error);
});

export const loginAdmin = (credentials) => api.post('/auth/login', credentials);
export const getNodes = () => api.get('/nodes');
export const getNode = (id) => api.get(`/nodes/${id}`);
export const createNode = (data) => api.post('/nodes', data);
export const updateNode = (id, data) => api.put(`/nodes/${id}`, data);
export const deleteNode = (id) => api.delete(`/nodes/${id}`);

export default api;

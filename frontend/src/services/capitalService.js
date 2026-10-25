import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api/v1',
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('danzason_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response.data,
  (error) => {
    const message = error.response?.data?.message || error.message || 'API request failed';
    return Promise.reject(new Error(message));
  }
);

export const capitalService = {
  // Get all capital transactions & owner drawings
  getCapitalEntries: (params) => api.get('/finance/capital', { params }),

  // Summary statistics, net capital balance and withdrawal ratios
  getCapitalStats: () => api.get('/finance/capital/stats'),

  // Get single transaction / voucher
  getCapitalEntryById: (id) => api.get(`/finance/capital/${id}`),

  // Record new capital infusion or owner withdrawal
  createCapitalEntry: (data) => api.post('/finance/capital', data),

  // Update existing voucher
  updateCapitalEntry: (id, data) => api.put(`/finance/capital/${id}`, data),

  // Cancel / reverse voucher
  cancelCapitalEntry: (id) => api.post(`/finance/capital/${id}/cancel`),
};

export default capitalService;

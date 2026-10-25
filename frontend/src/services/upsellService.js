import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api/v1',
  headers: {
    'Content-Type': 'application/json',
    'x-api-key': '2ee062fd20e15a2da9c359fac339da2c24396001c9d748df0ef4c6a1d6a776a6',
    'Authorization': 'Bearer 2ee062fd20e15a2da9c359fac339da2c24396001c9d748df0ef4c6a1d6a776a6',
  },
});

api.interceptors.response.use(
  (response) => response.data,
  (error) => {
    const message = error.response?.data?.message || error.message || 'API request failed';
    return Promise.reject(new Error(message));
  }
);

export const upsellService = {
  // Analytics & Dashboard KPIs
  getAnalytics: () => api.get('/sales/upsell/analytics'),

  // Upsell & Cross-sell Rules Management
  getRules: (params) => api.get('/sales/upsell/rules', { params }),
  getRuleById: (id) => api.get(`/sales/upsell/rules/${id}`),
  createRule: (data) => api.post('/sales/upsell/rules', data),
  updateRule: (id, data) => api.put(`/sales/upsell/rules/${id}`, data),
  deleteRule: (id) => api.delete(`/sales/upsell/rules/${id}`),

  // Smart Engine Recommendations
  getRecommendations: (data) => api.post('/sales/upsell/recommendations', data),

  // Pitch Tracker & Opportunity Pipeline
  logPitchResult: (data) => api.post('/sales/upsell/pitch', data),
  getOpportunities: (params) => api.get('/sales/upsell/opportunities', { params }),

  // Support helpers
  getProducts: (params) => api.get('/products', { params }),
  getCustomers: (params) => api.get('/sales/customers', { params }),
};

export default upsellService;

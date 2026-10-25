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
    const message = error.response?.data?.message || error.message || 'Marketing API request failed';
    return Promise.reject(new Error(message));
  }
);

export const marketingService = {
  // Aggregate KPIs, Funnel & Attribution
  getAnalytics: (params) => api.get('/marketing/analytics', { params }),

  // Campaigns CRUD
  getCampaigns: (params) => api.get('/marketing/campaigns', { params }),
  createCampaign: (data) => api.post('/marketing/campaigns', data),
  updateCampaign: (id, data) => api.put(`/marketing/campaigns/${id}`, data),
  deleteCampaign: (id) => api.delete(`/marketing/campaigns/${id}`),

  // Master References
  getProducts: (params) => api.get('/products', { params }),
  getLeads: (params) => api.get('/sales/leads', { params }),
};

export default marketingService;

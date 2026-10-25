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

export const financeService = {
  // Overview & Metrics
  getOverview: (params) => api.get('/finance/overview', { params }),

  // Masters
  getMasters: () => api.get('/finance/masters'),

  // Transactions CRUD
  getTransactions: (params) => api.get('/finance/transactions', { params }),
  getTransactionById: (id) => api.get(`/finance/transactions/${id}`),
  createTransaction: (data) => api.post('/finance/transactions', data),
  updateTransaction: (id, data) => api.put(`/finance/transactions/${id}`, data),
  cancelTransaction: (id, data) => api.post(`/finance/transactions/${id}/cancel`, data),

  // Reports
  getReports: (params) => api.get('/finance/reports', { params }),

  // Comprehensive Profitability Analysis
  getProfitability: (params) => api.get('/finance/profitability', { params }),

  // Sync Bills
  syncBills: () => api.post('/finance/sync-bills'),
};

export default financeService;

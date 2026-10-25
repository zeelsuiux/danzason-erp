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

export const bankAccountService = {
  // Get all company bank accounts with summary totals
  getBankAccounts: (params) => api.get('/bank-accounts', { params }),

  // Get single bank account by ID
  getBankAccountById: (id) => api.get(`/bank-accounts/${id}`),

  // Create new bank account
  createBankAccount: (data) => api.post('/bank-accounts', data),

  // Update bank account details / balances
  updateBankAccount: (id, data) => api.put(`/bank-accounts/${id}`, data),

  // Soft delete bank account
  deleteBankAccount: (id) => api.delete(`/bank-accounts/${id}`),
};

export default bankAccountService;

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

export const repeatOrderService = {
  // Analytics & Dashboard KPIs
  getAnalytics: () => api.get('/sales/repeat-orders/analytics'),

  // Repeat Orders CRUD
  getRepeatOrders: (params) => api.get('/sales/repeat-orders', { params }),
  getRepeatOrderById: (id) => api.get(`/sales/repeat-orders/${id}`),
  createRepeatOrder: (data) => api.post('/sales/repeat-orders', data),
  updateRepeatOrder: (id, data) => api.put(`/sales/repeat-orders/${id}`, data),
  deleteRepeatOrder: (id) => api.delete(`/sales/repeat-orders/${id}`),

  // Actions
  generateFromPastOrder: (data) => api.post('/sales/repeat-orders/generate-from-order', data),
  logContact: (id, data) => api.post(`/sales/repeat-orders/${id}/log-contact`, data),
  convertToInvoice: (id) => api.post(`/sales/repeat-orders/${id}/convert-to-invoice`),

  // Reference Masters
  getCustomers: (params) => api.get('/sales/customers', { params }),
  getProducts: (params) => api.get('/products', { params }),
  getPastInvoices: (params) => api.get('/sales/invoices', { params }),
  getWarehouses: () => api.get('/purchase/warehouses'),
};

export default repeatOrderService;

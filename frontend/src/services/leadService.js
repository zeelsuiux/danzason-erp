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

export const leadService = {
  // Summary & KPIs
  getSummary: () => api.get('/leads/summary'),

  // Leads CRUD
  getLeads: (params) => api.get('/leads', { params }),
  getLeadById: (id) => api.get(`/leads/${id}`),
  createLead: (data) => api.post('/leads', data),
  updateLead: (id, data) => api.put(`/leads/${id}`, data),
  deleteLead: (id) => api.delete(`/leads/${id}`),

  // Follow-ups
  addFollowup: (id, data) => api.post(`/leads/${id}/followups`, data),
  updateFollowup: (id, followupId, data) => api.put(`/leads/${id}/followups/${followupId}`, data),
  getAllFollowups: (params) => api.get('/leads/followups', { params }),

  // Conversion
  convertToCustomer: (id, data = {}) => api.post(`/leads/${id}/convert-customer`, data),
};

export default leadService;

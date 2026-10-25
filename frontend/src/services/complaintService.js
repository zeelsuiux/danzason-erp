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

export const complaintService = {
  // Get paginated list of complaints / tickets
  getComplaints: (params) => api.get('/complaints', { params }),

  // Summary statistics & KPI metrics
  getComplaintStats: () => api.get('/complaints/stats'),

  // Get single complaint ticket by ID
  getComplaintById: (id) => api.get(`/complaints/${id}`),

  // Create new ticket
  createComplaint: (data) => api.post('/complaints', data),

  // Update complaint details
  updateComplaint: (id, data) => api.put(`/complaints/${id}`, data),

  // Update ticket status
  updateStatus: (id, data) => api.put(`/complaints/${id}/status`, data),

  // Add timeline / call log entry
  addTimelineEntry: (id, data) => api.post(`/complaints/${id}/timeline`, data),

  // Apply resolution (Credit note / Replacement / Repair)
  resolveComplaint: (id, data) => api.put(`/complaints/${id}/resolve`, data),
};

export default complaintService;

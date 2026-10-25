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

export const teamService = {
  // Masters (Roles, Templates, Modules, Levels, Dynamic Departments)
  getMasters: () => api.get('/team/masters'),

  // Departments Master CRUD (Managed from Settings)
  getDepartments: (params) => api.get('/team/departments', { params }),
  createDepartment: (data) => api.post('/team/departments', data),
  updateDepartment: (id, data) => api.put(`/team/departments/${id}`, data),
  deleteDepartment: (id) => api.delete(`/team/departments/${id}`),

  // Performance Reports
  getPerformanceReport: (params) => api.get('/team/performance', { params }),

  // Team Members CRUD
  getTeamMembers: (params) => api.get('/team', { params }),
  getTeamMemberById: (id) => api.get(`/team/${id}`),
  createTeamMember: (data) => api.post('/team', data),
  updateTeamMember: (id, data) => api.put(`/team/${id}`, data),
  deleteTeamMember: (id) => api.delete(`/team/${id}`),
};

export default teamService;

import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api/v1',
  headers: {
    'Content-Type': 'application/json',
    'x-api-key': '2ee062fd20e15a2da9c359fac339da2c24396001c9d748df0ef4c6a1d6a776a6',
    'Authorization': 'Bearer 2ee062fd20e15a2da9c359fac339da2c24396001c9d748df0ef4c6a1d6a776a6',
  },
});

const targetGoalService = {
  // Get all targets with optional filters
  getTargetGoals: async (params = {}) => {
    const response = await api.get('/targets', { params });
    return response.data;
  },

  // Get single goal by ID
  getTargetGoalById: async (id) => {
    const response = await api.get(`/targets/${id}`);
    return response.data;
  },

  // Create new target goal
  createTargetGoal: async (data) => {
    const response = await api.post('/targets', data);
    return response.data;
  },

  // Update existing target goal
  updateTargetGoal: async (id, data) => {
    const response = await api.put(`/targets/${id}`, data);
    return response.data;
  },

  // Delete target goal
  deleteTargetGoal: async (id) => {
    const response = await api.delete(`/targets/${id}`);
    return response.data;
  },

  // Record manual progress & notes
  recordGoalProgress: async (id, data) => {
    const response = await api.post(`/targets/${id}/progress`, data);
    return response.data;
  },

  // Auto sync progress with live ERP transactions
  syncGoalProgress: async () => {
    const response = await api.post('/targets/sync-progress');
    return response.data;
  },

  // Get KPI analytics summary and leaderboard
  getAnalyticsSummary: async () => {
    const response = await api.get('/targets/analytics');
    return response.data;
  },

  // Seed default starter goals
  seedDefaultTargetGoals: async () => {
    const response = await api.post('/targets/seed');
    return response.data;
  },
};

export default targetGoalService;

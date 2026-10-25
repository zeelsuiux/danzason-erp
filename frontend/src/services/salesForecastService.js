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

export const salesForecastService = {
  // Get all forecast plans with filters
  getForecasts: (params) => api.get('/sales/forecasting', { params }),

  // Aggregate KPI stats and projections
  getForecastStats: () => api.get('/sales/forecasting/stats'),

  // Get single forecast by ID
  getForecastById: (id) => api.get(`/sales/forecasting/${id}`),

  // Create new forecast plan
  createForecast: (data) => api.post('/sales/forecasting', data),

  // Update existing forecast
  updateForecast: (id, data) => api.put(`/sales/forecasting/${id}`, data),

  // Soft delete / archive forecast
  deleteForecast: (id) => api.delete(`/sales/forecasting/${id}`),

  // Interactive What-If Growth Simulation
  simulateGrowth: (growth_rate_pct) =>
    api.post('/sales/forecasting/simulate', { growth_rate_pct }),
};

export default salesForecastService;

import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api/v1',
  headers: {
    'Content-Type': 'application/json',
  },
});

// Attach token dynamically to every outgoing request
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('danzason_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Response interceptor
api.interceptors.response.use(
  (response) => response.data,
  (error) => {
    const message = error.response?.data?.message || error.message || 'Authentication failed';
    return Promise.reject(new Error(message));
  }
);

export const authService = {
  // Login
  login: async ({ email, password }) => {
    const res = await api.post('/auth/login', { email, password });
    if (res.token && res.data) {
      localStorage.setItem('danzason_token', res.token);
      localStorage.setItem('danzason_user', JSON.stringify(res.data));
    }
    return res;
  },

  // Signup / Register
  signup: async (userData) => {
    const res = await api.post('/auth/signup', userData);
    if (res.token && res.data) {
      localStorage.setItem('danzason_token', res.token);
      localStorage.setItem('danzason_user', JSON.stringify(res.data));
    }
    return res;
  },

  // Get current user profile
  getProfile: async () => {
    return await api.get('/auth/me');
  },

  // Update current user profile
  updateProfile: async (data) => {
    const res = await api.put('/auth/profile', data);
    if (res.data) {
      localStorage.setItem('danzason_user', JSON.stringify(res.data));
    }
    return res;
  },

  // Logout
  logout: () => {
    localStorage.removeItem('danzason_token');
    localStorage.removeItem('danzason_user');
  },

  // Helper getters
  getStoredUser: () => {
    try {
      const u = localStorage.getItem('danzason_user');
      return u ? JSON.parse(u) : null;
    } catch {
      return null;
    }
  },

  getStoredToken: () => {
    return localStorage.getItem('danzason_token');
  },
};

export default authService;

import axios from 'axios';

const BASE_URL = 'http://172.20.10.5:5000/api';

const api = axios.create({
  baseURL: BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

export const authAPI = {
  register: (email: string, password: string, role: 'GUEST' | 'HOST') =>
    api.post('/auth/register', { email, password, role }),
  verify: (email: string, code: string) =>
    api.post('/auth/verify', { email, code }),
  resendCode: (email: string) =>
    api.post('/auth/resend-code', { email }),
  login: (email: string, password: string) =>
    api.post('/auth/login', { email, password }),
  forgotPassword: (email: string) =>
    api.post('/auth/forgot-password', { email }),
  verifyResetCode: (email: string, code: string) =>
    api.post('/auth/verify-reset-code', { email, code }),
  resetPassword: (email: string, code: string, newPassword: string) =>
    api.post('/auth/reset-password', { email, code, newPassword }),
};

export const userAPI = {
  getProfile: (token: string) =>
    api.get('/users/me', {
      headers: { Authorization: `Bearer ${token}` },
    }),
  updateProfile: (
    token: string,
    data: { firstName?: string; lastName?: string; phone?: string; avatarUrl?: string }
  ) =>
    api.patch('/users/me', data, {
      headers: { Authorization: `Bearer ${token}` },
    }),
  changePassword: (
    token: string,
    data: { currentPassword: string; newPassword: string }
  ) =>
    api.post('/users/me/change-password', data, {
      headers: { Authorization: `Bearer ${token}` },
    }),
};

export default api;
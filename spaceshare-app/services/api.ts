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
};

export default api;
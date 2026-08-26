import axios from 'axios';

const BASE_URL = 'https://spaceshare-backend-lix6.onrender.com/api';

const api = axios.create({
  baseURL: BASE_URL,
  timeout: 60000,
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
 googleLogin: (idToken: string, role?: 'GUEST' | 'HOST') =>
    api.post('/auth/google', { idToken, role }),
  appleLogin: (identityToken: string, fullName?: { firstName?: string | null; lastName?: string | null }, role?: 'GUEST' | 'HOST') =>
    api.post('/auth/apple', { identityToken, fullName, role }),
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
  completeFirstLogin: (token: string) =>
    api.patch('/users/me/first-login-complete', {}, {
      headers: { Authorization: `Bearer ${token}` },
    }),
  updateRole: (token: string, role: 'GUEST' | 'HOST') =>
    api.patch('/users/me/role', { role }, {
      headers: { Authorization: `Bearer ${token}` },
    }),
 savePushToken: (token: string, pushToken: string) =>
    api.post('/users/me/push-token', { pushToken }, {
      headers: { Authorization: `Bearer ${token}` },
    }),
  getNotificationSettings: (token: string) =>
    api.get('/users/me/notification-settings', {
      headers: { Authorization: `Bearer ${token}` },
    }),
  updateNotificationSettings: (
    token: string,
    data: { emailNotifications: boolean; smsNotifications: boolean; pushNotifications: boolean }
  ) =>
    api.patch('/users/me/notification-settings', data, {
      headers: { Authorization: `Bearer ${token}` },
    }),
};

export const listingsAPI = {
  create: (
    token: string,
    data: {
      spaceName: string;
      spaceCategory: string;
      addressLine: string;
      area: string;
      description: string;
      photos: string[];
      amenities: string[];
     spaceCapacity: string;
      spacePrice: string;
      addOns: { name: string; unitPrice: string; available: string }[];
      hostRules: string;
      parkingInstruction: string;
      startTime: string;
      endTime: string;
      unavailableDates: string[];
    }
  ) =>
    api.post('/listings', data, {
      headers: { Authorization: `Bearer ${token}` },
    }),
  getMine: (token: string) =>
    api.get('/listings/mine', {
      headers: { Authorization: `Bearer ${token}` },
    }),
  getById: (id: string) => api.get(`/listings/${id}`),
  getPublic: () => api.get('/listings/public'),
  getPublicById: (id: string) => api.get(`/listings/public/${id}`),
 update: (token: string, id: string, data: Partial<{
    spaceName: string; spaceCategory: string; addressLine: string; area: string;
    description: string; photos: string[]; amenities: string[]; spaceCapacity: string;
    spacePrice: string;
    addOns: { name: string; unitPrice: string; available: string }[];
    hostRules: string; parkingInstruction: string; startTime: string; endTime: string;
    unavailableDates: string[];
  }>) =>
    api.patch(`/listings/${id}`, data, {
      headers: { Authorization: `Bearer ${token}` },
    }),
  delete: (token: string, id: string) =>
    api.delete(`/listings/${id}`, {
      headers: { Authorization: `Bearer ${token}` },
    }),
};

export const bookingsAPI = {
  create: (
    token: string,
    data: {
      listingId: string;
      spaceName: string;
      spaceLocation: string;
      spacePrice: number;
      startDate: string;
      endDate: string;
      startTime: string;
      endTime: string;
      guests: number;
      addOnsBreakdown?: { name: string; total: number }[];
      cautionFee?: number;
      serviceFee?: number;
      totalPrice: number;
    }
  ) =>
    api.post('/bookings', data, {
      headers: { Authorization: `Bearer ${token}` },
    }),
  getMine: (token: string) =>
    api.get('/bookings/mine', {
      headers: { Authorization: `Bearer ${token}` },
    }),
  getHostBookings: (token: string) =>
    api.get('/bookings/host', {
      headers: { Authorization: `Bearer ${token}` },
    }),
  getById: (token: string, id: string) =>
    api.get(`/bookings/${id}`, {
      headers: { Authorization: `Bearer ${token}` },
    }),
  getListingDates: (token: string, listingId: string) =>
    api.get(`/bookings/listing/${listingId}/dates`, {
      headers: { Authorization: `Bearer ${token}` },
    }),
 updateStatus: (
    token: string,
    id: string,
    status: 'APPROVED' | 'DECLINED' | 'PAID' | 'COMPLETED' | 'CANCELLED',
    declineReason?: string,
    cancelReason?: string
  ) =>
    api.patch(`/bookings/${id}/status`, { status, declineReason, cancelReason }, {
      headers: { Authorization: `Bearer ${token}` },
    }),
};
export const paymentsAPI = {
  initiate: (token: string, bookingId: string) =>
    api.post('/payments/initiate', { bookingId }, {
      headers: { Authorization: `Bearer ${token}` },
    }),
};
export const notificationsAPI = {
  getMine: (token: string) =>
    api.get('/notifications/mine', {
      headers: { Authorization: `Bearer ${token}` },
    }),
  markRead: (token: string, id: string) =>
    api.patch(`/notifications/${id}/read`, {}, {
      headers: { Authorization: `Bearer ${token}` },
    }),
  markAllRead: (token: string) =>
    api.patch('/notifications/read-all', {}, {
      headers: { Authorization: `Bearer ${token}` },
    }),
};

export const disputesAPI = {
  create: (
    token: string,
    data: { bookingId: string; issueDetail: string; evidenceUrl?: string }
  ) =>
    api.post('/disputes', data, {
      headers: { Authorization: `Bearer ${token}` },
    }),
  getMine: (token: string) =>
    api.get('/disputes/mine', {
      headers: { Authorization: `Bearer ${token}` },
    }),
  getByBooking: (token: string, bookingId: string) =>
    api.get(`/disputes/booking/${bookingId}`, {
      headers: { Authorization: `Bearer ${token}` },
    }),
  getById: (token: string, id: string) =>
    api.get(`/disputes/${id}`, {
      headers: { Authorization: `Bearer ${token}` },
    }),
};

export default api;
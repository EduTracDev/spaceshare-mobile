import { createSlice, PayloadAction } from '@reduxjs/toolkit';

type User = {
  id: string;
  email: string;
  role: 'GUEST' | 'HOST';
  firstName?: string;
  lastName?: string;
  phone?: string;
  avatarUrl?: string;
};

type AuthState = {
  email: string;
  role: 'GUEST' | 'HOST' | null;
  token: string | null;
  user: User | null;
  isVerified: boolean;
  isFirstLogin: boolean;
};

const initialState: AuthState = {
  email: '',
  role: null,
  token: null,
  user: null,
  isVerified: false,
  isFirstLogin: true,
};

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    setEmail: (state, action: PayloadAction<string>) => {
      state.email = action.payload;
    },
    setRole: (state, action: PayloadAction<'GUEST' | 'HOST'>) => {
      state.role = action.payload;
    },
    setAuth: (state, action: PayloadAction<{ token: string; user: User }>) => {
      state.token = action.payload.token;
      state.user = action.payload.user;
      state.isVerified = true;
    },
    setFirstName: (state, action: PayloadAction<string>) => {
      if (state.user) {
        state.user.firstName = action.payload;
      }
    },
    updateUser: (state, action: PayloadAction<Partial<User>>) => {
      if (state.user) {
        state.user = { ...state.user, ...action.payload };
      }
    },
    setFirstLoginDone: (state) => {
      state.isFirstLogin = false;
    },
    logout: (state) => {
      state.email = '';
      state.role = null;
      state.token = null;
      state.user = null;
      state.isVerified = false;
      state.isFirstLogin = true;
    },
  },
});

export const { setEmail, setRole, setAuth, setFirstName, updateUser, setFirstLoginDone, logout } = authSlice.actions;
export default authSlice.reducer;
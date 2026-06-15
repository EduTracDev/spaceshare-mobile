import { createSlice, PayloadAction } from '@reduxjs/toolkit';

type User = {
  id: string;
  email: string;
  role: 'GUEST' | 'HOST';
};

type AuthState = {
  email: string;
  role: 'GUEST' | 'HOST' | null;
  token: string | null;
  user: User | null;
  isVerified: boolean;
};

const initialState: AuthState = {
  email: '',
  role: null,
  token: null,
  user: null,
  isVerified: false,
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
    logout: (state) => {
      state.email = '';
      state.role = null;
      state.token = null;
      state.user = null;
      state.isVerified = false;
    },
  },
});

export const { setEmail, setRole, setAuth, logout } = authSlice.actions;
export default authSlice.reducer;
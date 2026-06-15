import { createSlice, PayloadAction } from '@reduxjs/toolkit';

type AuthState = {
  email: string;
};

const initialState: AuthState = {
  email: '',
};

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    setEmail: (state, action: PayloadAction<string>) => {
      state.email = action.payload;
    },
  },
});

export const { setEmail } = authSlice.actions;
export default authSlice.reducer;
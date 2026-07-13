import { configureStore } from '@reduxjs/toolkit';
import authReducer from './slices/authSlice';
import createListingReducer from './slices/createListingSlice';

export const store = configureStore({
  reducer: {
    auth: authReducer,
    createListing: createListingReducer,
  },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
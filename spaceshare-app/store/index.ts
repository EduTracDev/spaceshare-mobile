import { configureStore } from '@reduxjs/toolkit';
import authReducer from './slices/authSlice';
import createListingReducer from './slices/createListingSlice';
import bookingsReducer from './slices/bookingsSlice';
import wishlistReducer from './slices/wishlistSlice';
import bankAccountReducer from './slices/bankAccountSlice';

export const store = configureStore({
  reducer: {
    auth: authReducer,
    createListing: createListingReducer,
    bookings: bookingsReducer,
    wishlist: wishlistReducer,
    bankAccount: bankAccountReducer,
  },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
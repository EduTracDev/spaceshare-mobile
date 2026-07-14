import { createSlice, PayloadAction } from '@reduxjs/toolkit';

export type BookingStatus = 'Approved' | 'Pending' | 'Paid' | 'Completed' | 'Declined' | 'Cancelled';

export type Booking = {
  id: string;
  spaceName: string;
  spaceLocation: string;
  spacePrice: number;
  spaceImage: any;
  startDate: string;
  endDate: string;
  startTime: string;
  endTime: string;
  guests: number;
  status: BookingStatus;
  category: 'upcoming' | 'completed';
  createdAt: string;
  addOnsBreakdown?: { name: string; total: number }[];
  cautionFee?: number;
  serviceFee?: number;
  totalPrice?: number;
};

type BookingsState = {
  bookings: Booking[];
};

const initialState: BookingsState = {
  bookings: [],
};

const bookingsSlice = createSlice({
  name: 'bookings',
  initialState,
  reducers: {
    addBooking: (state, action: PayloadAction<Booking>) => {
      state.bookings.unshift(action.payload);
    },
    removeBooking: (state, action: PayloadAction<string>) => {
      state.bookings = state.bookings.filter((b) => b.id !== action.payload);
    },
    updateBookingStatus: (state, action: PayloadAction<{ id: string; status: BookingStatus }>) => {
      const booking = state.bookings.find((b) => b.id === action.payload.id);
      if (booking) booking.status = action.payload.status;
    },
  },
});

export const { addBooking, removeBooking, updateBookingStatus } = bookingsSlice.actions;
export default bookingsSlice.reducer;
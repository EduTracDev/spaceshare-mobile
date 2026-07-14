import { createSlice, PayloadAction } from '@reduxjs/toolkit';

export type WishlistItem = {
  id: string;
  name: string;
  location: string;
  rating: number;
  guests: number;
  price: number;
  image: any;
};

type WishlistState = {
  items: WishlistItem[];
};

const initialState: WishlistState = {
  items: [],
};

const wishlistSlice = createSlice({
  name: 'wishlist',
  initialState,
  reducers: {
    addToWishlist: (state, action: PayloadAction<WishlistItem>) => {
      const exists = state.items.some((i) => i.id === action.payload.id);
      if (!exists) state.items.unshift(action.payload);
    },
    removeFromWishlist: (state, action: PayloadAction<string>) => {
      state.items = state.items.filter((i) => i.id !== action.payload);
    },
    toggleWishlist: (state, action: PayloadAction<WishlistItem>) => {
      const exists = state.items.some((i) => i.id === action.payload.id);
      if (exists) {
        state.items = state.items.filter((i) => i.id !== action.payload.id);
      } else {
        state.items.unshift(action.payload);
      }
    },
  },
});

export const { addToWishlist, removeFromWishlist, toggleWishlist } = wishlistSlice.actions;
export default wishlistSlice.reducer;
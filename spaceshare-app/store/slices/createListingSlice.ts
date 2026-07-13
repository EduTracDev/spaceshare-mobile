import { createSlice, PayloadAction } from '@reduxjs/toolkit';

type CreateListingState = {
  step: number;
  totalSteps: number;
  spaceName: string;
  spaceCategory: string;
  addressLine: string;
  area: string;
  description: string;
  photos: string[];
};

const initialState: CreateListingState = {
  step: 1,
  totalSteps: 8,
  spaceName: '',
  spaceCategory: '',
  addressLine: '',
  area: '',
  description: '',
  photos: [],
};

const createListingSlice = createSlice({
  name: 'createListing',
  initialState,
  reducers: {
    setStep: (state, action: PayloadAction<number>) => {
      state.step = action.payload;
    },
    updateListingData: (state, action: PayloadAction<Partial<CreateListingState>>) => {
      Object.assign(state, action.payload);
    },
    resetListing: () => initialState,
  },
});

export const { setStep, updateListingData, resetListing } = createListingSlice.actions;
export default createListingSlice.reducer;
import { createSlice, PayloadAction } from '@reduxjs/toolkit';

export type AddOnItem = { name: string; unitPrice: string; available: string };

type CreateListingState = {
  step: number;
  totalSteps: number;
  spaceName: string;
  spaceCategory: string;
  addressLine: string;
  area: string;
  description: string;
  photos: string[];
  amenities: string[];
 spaceCapacity: string;
  spacePrice: string;
 addOns: AddOnItem[];
  hostRules: string;
  parkingInstruction: string;
  startTime: string;
  endTime: string;
  unavailableDates: string[];

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
  amenities: [],
 spaceCapacity: '',
  spacePrice: '',
 addOns: [],
  hostRules: '',
  parkingInstruction: '',
  startTime: '10:00AM',
  endTime: '06:00PM',
  unavailableDates: [],

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
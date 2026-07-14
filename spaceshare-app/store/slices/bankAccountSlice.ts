import { createSlice, PayloadAction } from '@reduxjs/toolkit';

export type BankAccount = {
  accountNumber: string;
  bankName: string;
  accountName: string;
};

type BankAccountState = {
  account: BankAccount | null;
};

const initialState: BankAccountState = {
  account: null,
};

const bankAccountSlice = createSlice({
  name: 'bankAccount',
  initialState,
  reducers: {
    saveBankAccount: (state, action: PayloadAction<BankAccount>) => {
      state.account = action.payload;
    },
    clearBankAccount: (state) => {
      state.account = null;
    },
  },
});

export const { saveBankAccount, clearBankAccount } = bankAccountSlice.actions;
export default bankAccountSlice.reducer;
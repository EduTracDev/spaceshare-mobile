import { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Keyboard,
  TouchableWithoutFeedback,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useSelector, useDispatch } from 'react-redux';
import { RootState } from '@/store';
import { saveBankAccount } from '@/store/slices/bankAccountSlice';

const BANKS = [
  'Access Bank',
  'FirstBank',
  'Globus Bank',
  'Guaranty Trust Bank',
  'OPAY',
  'Polaris Bank',
  'Providus Bank',
  'UBA',
  'Zenith Bank',
];

export default function BankAccountScreen() {
  const dispatch = useDispatch();
  const existing = useSelector((state: RootState) => state.bankAccount.account);

  const [accountNumber, setAccountNumber] = useState(existing?.accountNumber ?? '');
  const [bankName, setBankName] = useState(existing?.bankName ?? '');
  const [accountName, setAccountName] = useState(existing?.accountName ?? '');
  const [bankDropdownOpen, setBankDropdownOpen] = useState(false);
  const [touched, setTouched] = useState(false);
  const [saved, setSaved] = useState(false);

  const accountNumberError =
    touched && accountNumber.length > 0 && accountNumber.length !== 10
      ? 'Account number must be 10 digits'
      : null;

  const canSave =
    accountNumber.length === 10 &&
    bankName.trim().length > 0 &&
    accountName.trim().length > 0;

  const handleSave = () => {
    if (!canSave) return;
    dispatch(saveBankAccount({ accountNumber, bankName, accountName }));
    setSaved(true);
    Keyboard.dismiss();
    setTimeout(() => {
      setSaved(false);
      router.back();
    }, 1200);
  };

  return (
    <SafeAreaView style={s.root}>
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={{ flex: 1 }}
        >
          <View style={s.header}>
            <TouchableOpacity onPress={() => router.back()}>
              <Feather name="arrow-left" size={20} color="#020203" />
            </TouchableOpacity>
            <Text style={s.headerTitle}>Bank Account</Text>
            <View style={{ width: 20 }} />
          </View>

          {saved && (
            <View style={s.toast}>
              <Feather name="check-circle" size={15} color="#16A34A" />
              <Text style={s.toastText}>Bank account saved successfully.</Text>
            </View>
          )}

          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={s.content}
            keyboardShouldPersistTaps="handled"
          >
            <Text style={s.subtitle}>
              Your payout will be sent to this account after a completed booking.
            </Text>

            <View style={s.field}>
              <Text style={s.label}>Account Number</Text>
              <TextInput
                style={[s.input, accountNumberError && s.inputError]}
                placeholder="e.g 1234567890"
                placeholderTextColor="#C0C0C0"
                keyboardType="number-pad"
                maxLength={10}
                value={accountNumber}
                onChangeText={(t) => setAccountNumber(t.replace(/[^0-9]/g, ''))}
                onBlur={() => setTouched(true)}
                returnKeyType="done"
                onSubmitEditing={Keyboard.dismiss}
              />
              {accountNumberError && (
                <View style={s.errorRow}>
                  <Feather name="alert-triangle" size={13} color="#EF4444" />
                  <Text style={s.errorText}>{accountNumberError}</Text>
                </View>
              )}
            </View>

            <View style={s.field}>
              <Text style={s.label}>Bank Name</Text>
              <TouchableOpacity
                style={[s.input, s.dropdown]}
                onPress={() => setBankDropdownOpen(!bankDropdownOpen)}
                activeOpacity={0.7}
              >
                <Text style={bankName ? s.dropdownSelected : s.dropdownPlaceholder}>
                  {bankName || 'Enter bank name'}
                </Text>
                <Feather name={bankDropdownOpen ? 'chevron-up' : 'chevron-down'} size={16} color="#6A7181" />
              </TouchableOpacity>

              {bankDropdownOpen && (
                <View style={s.dropdownList}>
                  {BANKS.map((bank, i) => (
                    <TouchableOpacity
                      key={bank}
                      style={[s.dropdownItem, i === BANKS.length - 1 && { borderBottomWidth: 0 }]}
                      onPress={() => {
                        setBankName(bank);
                        setBankDropdownOpen(false);
                      }}
                    >
                      <Text style={s.dropdownItemText}>{bank}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            </View>

            <View style={s.field}>
              <Text style={s.label}>Account Name</Text>
              <TextInput
                style={s.input}
                placeholder="Enter account name"
                placeholderTextColor="#C0C0C0"
                value={accountName}
                onChangeText={setAccountName}
                returnKeyType="done"
                onSubmitEditing={Keyboard.dismiss}
              />
            </View>

            <View style={s.infoBox}>
              <Feather name="info" size={14} color="#B45309" />
              <Text style={s.infoText}>
                Ensure your bank details are correct and match your account name to avoid payout delays or failed transfers.
              </Text>
            </View>
          </ScrollView>

          <View style={s.footer}>
            <TouchableOpacity
              style={[s.saveBtn, !canSave && s.saveBtnDisabled]}
              onPress={handleSave}
              disabled={!canSave}
            >
              <Text style={s.saveBtnText}>Save Account</Text>
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </TouchableWithoutFeedback>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#FFFFFF' },

  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 14,
    borderBottomWidth: 1, borderBottomColor: '#F2F4F7',
  },
  headerTitle: { fontFamily: 'MonaSans-Bold', fontSize: 16, color: '#020203' },

  toast: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: '#DCFCE7', marginHorizontal: 16, marginTop: 12,
    borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10,
  },
  toastText: { fontFamily: 'Inter-Regular', fontSize: 12, color: '#16A34A', flex: 1 },

  content: { paddingHorizontal: 16, paddingTop: 16, paddingBottom: 32, gap: 20 },
  subtitle: { fontFamily: 'Inter-Regular', fontSize: 13, color: '#6A7181', lineHeight: 20 },

  field: { gap: 8 },
  label: { fontFamily: 'Inter-Regular', fontSize: 13, color: '#3A414E' },
  input: {
    borderWidth: 1, borderColor: '#E4E7EC', borderRadius: 12,
    paddingHorizontal: 16, paddingVertical: 14,
    fontFamily: 'Inter-Regular', fontSize: 15, color: '#020203',
  },
  inputError: { borderColor: '#EF4444' },
  errorRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  errorText: { fontFamily: 'Inter-Regular', fontSize: 12, color: '#EF4444', flex: 1 },

  dropdown: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  dropdownPlaceholder: { fontFamily: 'Inter-Regular', fontSize: 15, color: '#C0C0C0' },
  dropdownSelected: { fontFamily: 'Inter-Regular', fontSize: 15, color: '#020203' },
  dropdownList: {
    borderWidth: 1, borderColor: '#E4E7EC', borderRadius: 12,
    marginTop: 4, overflow: 'hidden', maxHeight: 240,
  },
  dropdownItem: {
    paddingHorizontal: 16, paddingVertical: 14,
    borderBottomWidth: 1, borderBottomColor: '#F2F4F7',
  },
  dropdownItemText: { fontFamily: 'Inter-Regular', fontSize: 14, color: '#020203' },

  infoBox: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 8,
    backgroundColor: '#FFF7E5', borderRadius: 12, padding: 14,
  },
  infoText: { flex: 1, fontFamily: 'Inter-Regular', fontSize: 12, color: '#B45309', lineHeight: 18 },

  footer: { padding: 16, borderTopWidth: 1, borderTopColor: '#F2F4F7' },
  saveBtn: {
    backgroundColor: '#6200EE', borderRadius: 99, height: 52,
    alignItems: 'center', justifyContent: 'center',
  },
  saveBtnDisabled: { backgroundColor: '#C4B5FD' },
  saveBtnText: { color: '#FFFFFF', fontFamily: 'Inter-Regular', fontWeight: '600', fontSize: 15 },
});
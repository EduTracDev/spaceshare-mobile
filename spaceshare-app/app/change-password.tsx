import { useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  TextInput, ScrollView, ActivityIndicator,
  KeyboardAvoidingView, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { useSelector } from 'react-redux';
import { RootState } from '@/store';
import { userAPI } from '@/services/api';
import { router } from 'expo-router';

export default function ChangePasswordScreen() {
  const token = useSelector((state: RootState) => state.auth.token);

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [reenterPassword, setReenterPassword] = useState('');

  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showReenter, setShowReenter] = useState(false);

  const [currentError, setCurrentError] = useState('');
  const [newError, setNewError] = useState('');
  const [reenterError, setReenterError] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const validate = () => {
    let valid = true;
    setCurrentError('');
    setNewError('');
    setReenterError('');

    if (!currentPassword) {
      setCurrentError('Please enter your current password');
      valid = false;
    }
    if (!newPassword || newPassword.length < 6) {
      setNewError('Password must be at least 6 characters');
      valid = false;
    }
    if (newPassword !== reenterPassword) {
      setReenterError('Passwords do not match');
      valid = false;
    }
    return valid;
  };

  const handleChange = async () => {
    if (!validate() || !token) return;
    setLoading(true);
    try {
      await userAPI.changePassword(token, { currentPassword, newPassword });
      setSuccess(true);
      setCurrentPassword('');
      setNewPassword('');
      setReenterPassword('');
      setTimeout(() => router.back(), 2000);
   } catch (e: any) {
    console.log(e?.response?.data);
  const msg = e?.response?.data?.message ?? '';
  if (msg.toLowerCase().includes('current') || msg.toLowerCase().includes('incorrect')) {
    setCurrentError('Input the correct password');
  } else if (msg.toLowerCase().includes('password')) {
    setNewError(msg);
  } else {
    setCurrentError(msg || 'Something went wrong');
  }
} finally {
      setLoading(false);
    }
  };

  // Step 1: only current password filled — show just that field
  // Step 2: current password valid attempt — show all fields
const showAllFields = currentPassword.length > 0;
const canSubmit = currentPassword.length > 0 && newPassword.length > 0 && reenterPassword.length > 0;

  return (
    <View style={s.root}>
      <SafeAreaView edges={['top']} style={s.safeTop} />

      {success && (
        <View style={s.successBanner}>
          <Feather name="check-circle" size={16} color="#16A34A" />
          <Text style={s.successText}>Password changed successfully</Text>
        </View>
      )}

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={s.scroll}
          keyboardShouldPersistTaps="handled"
        >
          {/* Header */}
          <View style={s.header}>
            <TouchableOpacity style={s.backBtn} onPress={() => router.back()}>
              <Feather name="arrow-left" size={20} color="#020203" />
            </TouchableOpacity>
            <Text style={s.headerTitle}>Change Password</Text>
            <View style={{ width: 36 }} />
          </View>

          <View style={s.form}>

            {/* Current Password */}
            <View style={s.fieldWrap}>
              <Text style={s.label}>Current Password</Text>
              <View style={[s.inputRow, currentError ? s.inputRowError : null]}>
                <TextInput
                  style={s.input}
                  value={currentPassword}
                  onChangeText={(v) => { setCurrentPassword(v); setCurrentError(''); }}
                  placeholder="Enter your existing password"
                  placeholderTextColor="#C0C0C0"
                  secureTextEntry={!showCurrent}
                  autoCapitalize="none"
                />
                <TouchableOpacity onPress={() => setShowCurrent(!showCurrent)}>
                  <Feather name={showCurrent ? 'eye' : 'eye-off'} size={18} color="#6A7181" />
                </TouchableOpacity>
              </View>
              {currentError ? (
                <View style={s.errorRow}>
                  <Feather name="alert-triangle" size={13} color="#EF4444" />
                  <Text style={s.errorText}>{currentError}</Text>
                </View>
              ) : null}
            </View>

            {/* New Password — only show when current is filled */}
            {showAllFields && (
              <>
                <View style={s.fieldWrap}>
                  <Text style={s.label}>New Password</Text>
                  <View style={[s.inputRow, newError ? s.inputRowError : null]}>
                    <TextInput
                      style={s.input}
                      value={newPassword}
                      onChangeText={(v) => { setNewPassword(v); setNewError(''); }}
                      placeholder="Enter your new password"
                      placeholderTextColor="#C0C0C0"
                      secureTextEntry={!showNew}
                      autoCapitalize="none"
                    />
                    <TouchableOpacity onPress={() => setShowNew(!showNew)}>
                      <Feather name={showNew ? 'eye' : 'eye-off'} size={18} color="#6A7181" />
                    </TouchableOpacity>
                  </View>
                  {newError ? (
                    <View style={s.errorRow}>
                      <Feather name="alert-triangle" size={13} color="#EF4444" />
                      <Text style={s.errorText}>{newError}</Text>
                    </View>
                  ) : null}
                </View>

                <View style={s.fieldWrap}>
                  <Text style={s.label}>Re-enter New Password</Text>
                  <View style={[s.inputRow, reenterError ? s.inputRowError : null]}>
                    <TextInput
                      style={s.input}
                      value={reenterPassword}
                      onChangeText={(v) => { setReenterPassword(v); setReenterError(''); }}
                      placeholder="Re-enter your new password"
                      placeholderTextColor="#C0C0C0"
                      secureTextEntry={!showReenter}
                      autoCapitalize="none"
                    />
                    <TouchableOpacity onPress={() => setShowReenter(!showReenter)}>
                      <Feather name={showReenter ? 'eye' : 'eye-off'} size={18} color="#6A7181" />
                    </TouchableOpacity>
                  </View>
                  {reenterError ? (
                    <View style={s.errorRow}>
                      <Feather name="alert-triangle" size={13} color="#EF4444" />
                      <Text style={s.errorText}>{reenterError}</Text>
                    </View>
                  ) : null}
                </View>
              </>
            )}

          </View>

          <View style={{ height: 120 }} />
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Footer button */}
      <View style={s.footer}>
        <TouchableOpacity
          style={[s.saveBtn, (!canSubmit || loading) && s.saveBtnDisabled]}
          onPress={handleChange}
          disabled={!canSubmit || loading}
        >
          {loading ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text style={s.saveBtnText}>Change Password</Text>
          )}
        </TouchableOpacity>
      </View>

    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#FFFFFF' },
  safeTop: { backgroundColor: '#FFFFFF' },
  scroll: { paddingHorizontal: 16 },

  successBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: '#DCFCE7', paddingHorizontal: 16, paddingVertical: 12,
  },
  successText: { fontFamily: 'Inter-Regular', fontSize: 14, color: '#16A34A', fontWeight: '600' },

  header: {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between', paddingVertical: 16,
  },
  backBtn: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: '#F2F4F7', alignItems: 'center', justifyContent: 'center',
  },
  headerTitle: { fontFamily: 'MonaSans-Bold', fontSize: 18, color: '#020203' },

  form: { gap: 16, marginTop: 8 },
  fieldWrap: { gap: 6 },
  label: { fontFamily: 'Inter-Regular', fontSize: 13, color: '#3A414E' },

  inputRow: {
    flexDirection: 'row', alignItems: 'center',
    borderWidth: 1, borderColor: '#E4E7EC', borderRadius: 12,
    paddingHorizontal: 14, paddingVertical: 14, gap: 8,
  },
  inputRowError: { borderColor: '#EF4444' },
  input: {
    flex: 1, fontFamily: 'Inter-Regular', fontSize: 15, color: '#020203',
  },

  errorRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  errorText: { fontFamily: 'Inter-Regular', fontSize: 12, color: '#EF4444', flex: 1 },

  footer: {
    paddingHorizontal: 16, paddingBottom: 36, paddingTop: 12,
    borderTopWidth: 1, borderTopColor: '#F2F4F7', backgroundColor: '#FFFFFF',
  },
  saveBtn: {
    backgroundColor: '#6200EE', borderRadius: 99, height: 52,
    alignItems: 'center', justifyContent: 'center',
  },
  saveBtnDisabled: { backgroundColor: '#C4B5FD' },
  saveBtnText: { color: '#FFFFFF', fontFamily: 'Inter-Regular', fontWeight: '600', fontSize: 15 },
});
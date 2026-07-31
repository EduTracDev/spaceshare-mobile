import { useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  TextInput, ScrollView, Image, ActivityIndicator,
  KeyboardAvoidingView, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { useSelector, useDispatch } from 'react-redux';
import { RootState } from '@/store';
import { updateUser } from '@/store/slices/authSlice';
import { userAPI } from '@/services/api';
import { router } from 'expo-router';

export default function EditProfileScreen() {
  const dispatch = useDispatch();
  const user = useSelector((state: RootState) => state.auth.user);
  const token = useSelector((state: RootState) => state.auth.token);

  const [firstName, setFirstName] = useState(user?.firstName ?? '');
  const [lastName, setLastName] = useState(user?.lastName ?? '');
  const [phone, setPhone] = useState(user?.phone ?? '');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  const initials = `${user?.firstName?.[0] ?? ''}${user?.lastName?.[0] ?? ''}`.toUpperCase() || 'U';

  const handleSave = async () => {
    if (!token) return;
    setLoading(true);
    setError('');
    setSuccess(false);
    try {
      const res = await userAPI.updateProfile(token, { firstName, lastName, phone });
      dispatch(updateUser(res.data.user));
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (e: any) {
      setError(e?.response?.data?.message ?? 'Failed to update profile.');
    } finally {
      setLoading(false);
    }
  };

  const hasChanges =
    firstName !== (user?.firstName ?? '') ||
    lastName !== (user?.lastName ?? '') ||
    phone !== (user?.phone ?? '');

  return (
    <View style={s.root}>
      <SafeAreaView edges={['top']} style={s.safeTop} />

      {success && (
        <View style={s.successBanner}>
          <Feather name="check-circle" size={16} color="#16A34A" />
          <Text style={s.successText}>Profile updated successfully</Text>
        </View>
      )}

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={s.scroll}>

          <View style={s.header}>
            <TouchableOpacity style={s.backBtn} onPress={() => router.back()}>
              <Feather name="arrow-left" size={20} color="#020203" />
            </TouchableOpacity>
            <Text style={s.headerTitle}>Edit Profile</Text>
            <View style={{ width: 36 }} />
          </View>

          <View style={s.avatarSection}>
            <View style={s.avatarWrap}>
              {user?.avatarUrl ? (
                <Image source={{ uri: user.avatarUrl }} style={s.avatar} />
              ) : (
                <View style={s.avatarFallback}>
                  <Text style={s.avatarInitials}>{initials}</Text>
                </View>
              )}
              <TouchableOpacity style={s.editPhotoBtn}>
                <Feather name="camera" size={14} color="#FFFFFF" />
              </TouchableOpacity>
            </View>
            <Text style={s.editPhotoLabel}>Edit Photo</Text>
          </View>

          <View style={s.form}>

            <View style={s.nameRow}>
              <View style={s.nameCol}>
                <Text style={s.label}>First Name</Text>
                <TextInput
                  style={s.input}
                  value={firstName}
                  onChangeText={setFirstName}
                  placeholder="First name"
                  placeholderTextColor="#C0C0C0"
                />
              </View>
              <View style={s.nameCol}>
                <Text style={s.label}>Last Name</Text>
                <TextInput
                  style={s.input}
                  value={lastName}
                  onChangeText={setLastName}
                  placeholder="Last name"
                  placeholderTextColor="#C0C0C0"
                />
              </View>
            </View>

            <View style={s.fieldWrap}>
              <Text style={s.label}>Phone Number</Text>
              <View style={s.phoneRow}>
                <View style={s.flagBox}>
                  <Text style={s.flag}>🇳🇬</Text>
                  <Text style={s.dialCode}>+234</Text>
                </View>
                <TextInput
                  style={[s.input, s.phoneInput]}
                  value={phone}
                  onChangeText={setPhone}
                  placeholder="8031234567"
                  placeholderTextColor="#C0C0C0"
                  keyboardType="phone-pad"
                />
              </View>
            </View>

            <View style={s.fieldWrap}>
              <Text style={s.label}>Email Address</Text>
              <TextInput
                style={[s.input, s.inputDisabled]}
                value={user?.email ?? ''}
                editable={false}
              />
            </View>

            {error ? (
              <View style={s.errorRow}>
                <Feather name="alert-triangle" size={13} color="#EF4444" />
                <Text style={s.errorText}>{error}</Text>
              </View>
            ) : null}

          </View>

          <View style={{ height: 120 }} />
        </ScrollView>
      </KeyboardAvoidingView>

      <View style={s.footer}>
        <TouchableOpacity
          style={[s.saveBtn, (!hasChanges || loading) && s.saveBtnDisabled]}
          onPress={handleSave}
          disabled={!hasChanges || loading}
        >
          {loading ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text style={s.saveBtnText}>Save Changes</Text>
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
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingVertical: 16,
  },
  backBtn: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: '#F2F4F7', alignItems: 'center', justifyContent: 'center',
  },
  headerTitle: { fontFamily: 'MonaSans-Bold', fontSize: 18, color: '#020203' },

  avatarSection: { alignItems: 'center', paddingVertical: 24, gap: 8 },
  avatarWrap: { position: 'relative' },
  avatar: { width: 80, height: 80, borderRadius: 40 },
  avatarFallback: {
    width: 80, height: 80, borderRadius: 40,
    backgroundColor: '#6200EE', alignItems: 'center', justifyContent: 'center',
  },
  avatarInitials: { fontFamily: 'MonaSans-Bold', fontSize: 28, color: '#FFFFFF' },
  editPhotoBtn: {
    position: 'absolute', bottom: 0, right: 0,
    width: 26, height: 26, borderRadius: 13,
    backgroundColor: '#6200EE', alignItems: 'center', justifyContent: 'center',
    borderWidth: 2, borderColor: '#FFFFFF',
  },
  editPhotoLabel: { fontFamily: 'Inter-Regular', fontSize: 13, color: '#6200EE', fontWeight: '600' },

  form: { gap: 16 },
  nameRow: { flexDirection: 'row', gap: 12 },
  nameCol: { flex: 1, gap: 6 },
  fieldWrap: { gap: 6 },
  label: { fontFamily: 'Inter-Regular', fontSize: 13, color: '#3A414E' },
  input: {
    borderWidth: 1, borderColor: '#E4E7EC', borderRadius: 12,
    paddingHorizontal: 14, paddingVertical: 14,
    fontFamily: 'Inter-Regular', fontSize: 15, color: '#020203',
  },
  inputDisabled: { backgroundColor: '#F9FAFB', color: '#6A7181' },

  phoneRow: { flexDirection: 'row', gap: 8 },
  flagBox: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    borderWidth: 1, borderColor: '#E4E7EC', borderRadius: 12,
    paddingHorizontal: 12, paddingVertical: 14,
  },
  flag: { fontSize: 18 },
  dialCode: { fontFamily: 'Inter-Regular', fontSize: 15, color: '#020203' },
  phoneInput: { flex: 1 },

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
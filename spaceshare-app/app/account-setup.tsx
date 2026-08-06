import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useState } from 'react';
import { useDispatch } from 'react-redux';
import { updateUser } from '@/store/slices/authSlice';
import { userAPI } from '@/services/api';
import { useSelector } from 'react-redux';
import { RootState } from '@/store';

const { width } = Dimensions.get('window');

// Step 3 of 4 in the registration flow
const TOTAL_STEPS = 4;
const CURRENT_STEP = 3;

export default function AccountSetup() {
  const dispatch = useDispatch();
  const role = useSelector((state: RootState) => state.auth.role);
  const socialUser = useSelector((state: RootState) => state.auth.user);
  // Prefill from Google/Apple profile data if this user arrived via social sign-in
  const [firstName, setFirstNameLocal] = useState(socialUser?.firstName ?? '');
  const [lastName, setLastName] = useState(socialUser?.lastName ?? '');
  const [phone, setPhone] = useState('');
  const [phoneError, setPhoneError] = useState('');

  // Button active only when all fields are filled
  const isFormFilled =
    firstName.length > 0 && lastName.length > 0 && phone.length > 0;

  const [saving, setSaving] = useState(false);
  const token = useSelector((state: RootState) => state.auth.token);

  const handleFinish = async () => {
    if (!phone) {
      setPhoneError('Phone number is required');
      return;
    }
    if (phone.length !== 10) {
      setPhoneError('Please enter a valid 10-digit phone number');
      return;
    }
    setPhoneError('');

    if (!token) {
      router.replace(role === 'HOST' ? '/host/home' : '/home');
      return;
    }

    setSaving(true);
    try {
      const fullPhone = `+234${phone}`;
      const res = await userAPI.updateProfile(token, { firstName, lastName, phone: fullPhone });
      // Save the backend-confirmed user object to Redux, not just local values
      dispatch(updateUser(res.data.user));
    } catch (err) {
      console.log('Failed to save profile details:', err);
      // Fall back to at least updating Redux locally so the UI isn't empty this session
      dispatch(updateUser({ firstName, lastName, phone: `+234${phone}` }));
    } finally {
      setSaving(false);
      router.replace(role === 'HOST' ? '/host/home' : '/home');
    }
  };

  return (
    <SafeAreaView style={styles.screen}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >

        {/* Fixed Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Text style={styles.backText}>←</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Tell us about yourself</Text>

          {/* Progress bar — step 3 active */}
          <View style={styles.progressRow}>
            {Array.from({ length: TOTAL_STEPS }).map((_, i) => (
              <View
                key={i}
                style={[
                  styles.progressSegment,
                  i === CURRENT_STEP - 1
                    ? styles.progressSegmentActive
                    : styles.progressSegmentInactive,
                ]}
              />
            ))}
          </View>
        </View>

        <ScrollView
          contentContainerStyle={styles.scroll}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >

          {/* First Name */}
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>First Name</Text>
            <TextInput
              style={styles.inputFrame}
              placeholder="Enter your first name"
              placeholderTextColor="#A0A0A0"
              value={firstName}
              onChangeText={setFirstNameLocal}
              autoCapitalize="words"
            />
          </View>

          {/* Last Name */}
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Last Name</Text>
            <TextInput
              style={styles.inputFrame}
              placeholder="Enter your last name"
              placeholderTextColor="#A0A0A0"
              value={lastName}
              onChangeText={setLastName}
              autoCapitalize="words"
            />
          </View>

          {/* Phone Number */}
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Phone Number</Text>
            <View style={[styles.phoneFrame, phoneError && styles.inputFrameError]}>
              {/* Nigerian flag and country code */}
              <View style={styles.countryCode}>
                <Text style={styles.flag}>🇳🇬</Text>
                <Text style={styles.dialCode}>+234</Text>
              </View>
              <View style={styles.phoneDivider} />
              <TextInput
                style={styles.phoneInput}
                placeholder="8031234567"
                placeholderTextColor="#A0A0A0"
                value={phone}
                onChangeText={(t) => {
                  setPhone(t);
                  setPhoneError('');
                }}
                keyboardType="phone-pad"
              />
            </View>
            {phoneError ? (
              <View style={styles.errorRow}>
                <Text style={styles.errorIcon}>⚠️</Text>
                <Text style={styles.errorText}>{phoneError}</Text>
              </View>
            ) : null}
          </View>

        </ScrollView>

        {/* Finish Button pinned to bottom */}
        <View style={styles.footer}>
          <TouchableOpacity
            style={[
              styles.finishButton,
              !isFormFilled && styles.finishButtonDisabled,
            ]}
            onPress={handleFinish}
            activeOpacity={0.85}
            disabled={!isFormFilled}
          >
            <Text style={styles.finishButtonText}>Finish</Text>
          </TouchableOpacity>
        </View>

      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  header: {
    paddingHorizontal: width * 0.05,
    paddingTop: 12,
    paddingBottom: 8,
    gap: 12,
  },
  backButton: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backText: {
    fontSize: 22,
    color: '#020203',
  },
  headerTitle: {
    fontFamily: 'MonaSans-Bold',
    fontSize: 20,
    lineHeight: 20 * 1.2,
    letterSpacing: -0.5,
    color: '#020203',
  },
  progressRow: {
    flexDirection: 'row',
    gap: 6,
  },
  progressSegment: {
    flex: 1,
    height: 4,
    borderRadius: 999,
  },
  progressSegmentActive: {
    backgroundColor: '#6200EE',
  },
  progressSegmentInactive: {
    backgroundColor: '#D0D5DD',
  },
  scroll: {
    paddingHorizontal: width * 0.05,
    paddingTop: 24,
    paddingBottom: 40,
    gap: 20,
  },
  inputGroup: {
    gap: 8,
  },
  inputLabel: {
    fontFamily: 'Inter-Regular',
    fontSize: 16,
    lineHeight: 24,
    letterSpacing: -0.5,
    color: '#020203',
  },
  // Direct TextInput styled as frame — avoids iOS clipping issue with nested inputs
  inputFrame: {
    height: 56,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#D0D5DD',
    paddingHorizontal: 12,
    fontSize: 16,
    color: '#020203',
  },
  inputFrameError: {
    borderColor: '#F04438',
  },
  phoneFrame: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 56,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#D0D5DD',
    overflow: 'hidden',
  },
  countryCode: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    gap: 6,
    height: '100%',
  },
  flag: {
    fontSize: 18,
  },
  dialCode: {
    fontSize: 16,
    color: '#020203',
  },
  phoneDivider: {
    width: 1,
    height: 24,
    backgroundColor: '#D0D5DD',
  },
  phoneInput: {
    flex: 1,
    height: '100%',
    paddingHorizontal: 12,
    fontSize: 16,
    color: '#020203',
  },
  errorRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 4,
  },
  errorIcon: {
    fontSize: 12,
    marginTop: 2,
  },
  errorText: {
    fontFamily: 'Inter-Regular',
    fontSize: 13,
    color: '#F04438',
    flex: 1,
    lineHeight: 18,
  },
  footer: {
    paddingHorizontal: width * 0.05,
    paddingBottom: 24,
    paddingTop: 12,
  },
  finishButton: {
    backgroundColor: '#6200EE',
    borderRadius: 99,
    height: 56,
    alignItems: 'center',
    justifyContent: 'center',
  },
  finishButtonDisabled: {
    backgroundColor: '#CEB0FA',
  },
  finishButtonText: {
    color: '#FFFFFF',
    fontFamily: 'Inter-Regular',
    fontWeight: '600',
    fontSize: 16,
    lineHeight: 24,
    letterSpacing: -0.5,
    textAlign: 'center',
  },
});
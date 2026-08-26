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
  Image,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useState, useEffect } from 'react';
import { Feather } from '@expo/vector-icons';
import * as SecureStore from 'expo-secure-store';
import Constants from 'expo-constants';
import { registerPushToken } from '@/utils/registerPushToken';
import { useDispatch, useSelector } from 'react-redux';
import { setEmail, setAuth } from '@/store/slices/authSlice';
import { authAPI } from '@/services/api';
import { RootState } from '@/store';
import { GOOGLE_WEB_CLIENT_ID, GOOGLE_IOS_CLIENT_ID } from '@/constants/auth';

const isExpoGo = Constants.appOwnership === 'expo';

let GoogleSignin: any, isSuccessResponse: any, isErrorWithCode: any, statusCodes: any;
if (!isExpoGo) {
  const googleSigninModule = require('@react-native-google-signin/google-signin');
  GoogleSignin = googleSigninModule.GoogleSignin;
  isSuccessResponse = googleSigninModule.isSuccessResponse;
  isErrorWithCode = googleSigninModule.isErrorWithCode;
  statusCodes = googleSigninModule.statusCodes;
}

const { width } = Dimensions.get('window');

// Step 1 of 4 in the registration flow
const TOTAL_STEPS = 4;
const CURRENT_STEP = 1;

function PasswordRequirement({ met, label }: { met: boolean; label: string }) {
  return (
    <View style={styles.requirementRow}>
      <Feather
        name={met ? 'check-circle' : 'x-circle'}
        size={14}
        color={met ? '#16A34A' : '#98A2B3'}
      />
      <Text style={[styles.requirementText, met && styles.requirementTextMet]}>{label}</Text>
    </View>
  );
}

export default function Register() {
  const dispatch = useDispatch();
  const role = useSelector((state: RootState) => state.auth.role);
  const [email, setEmailLocal] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [apiError, setApiError] = useState('');
  const [errors, setErrors] = useState<{
    email?: string;
    password?: string;
    confirmPassword?: string;
  }>({});

  useEffect(() => {
    if (isExpoGo) return;
    GoogleSignin.configure({
      webClientId: GOOGLE_WEB_CLIENT_ID,
      iosClientId: GOOGLE_IOS_CLIENT_ID,
      offlineAccess: false,
    });
  }, []);

  // Live password requirement checks — updates as the user types
  const passwordChecks = {
    minLength: password.length >= 8,
    hasUppercase: /[A-Z]/.test(password),
    hasLowercase: /[a-z]/.test(password),
    hasNumber: /\d/.test(password),
    hasSpecialChar: /[@$!%*?&]/.test(password),
  };
  const showPasswordChecklist = password.length > 0;
  const allRequirementsMet = Object.values(passwordChecks).every(Boolean);

  // Button stays disabled until all fields have input
  const isFormFilled =
    email.length > 0 && password.length > 0 && confirmPassword.length > 0;

 const validate = () => {
  const newErrors: typeof errors = {};
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  if (!email || !emailRegex.test(email)) {
    newErrors.email = 'Please enter a valid email address';
  }
  if (!password || !allRequirementsMet) {
    newErrors.password = 'Please meet all password requirements above.';
  }
  if (!confirmPassword) {
    newErrors.confirmPassword = "Field can't be empty";
  } else if (password !== confirmPassword) {
    newErrors.confirmPassword = "Password doesn't match";
  }

  setErrors(newErrors);
  return Object.keys(newErrors).length === 0;
};

  const handleCreateAccount = async () => {
    if (!validate()) return;
    setApiError('');
    setLoading(true);

    try {
      // Call backend to create account and send verification email
      await authAPI.register(email, password, role ?? 'GUEST');

      // Save email to Redux so verify screen can display it
      dispatch(setEmail(email));
      router.push('/verify');
    } catch (error: any) {
      // Show error from backend (e.g. "Email already registered")
      setApiError(error.response?.data?.message || 'Something went wrong. Try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    if (isExpoGo) {
      setApiError('Google sign-in requires the dev build — not available in Expo Go.');
      return;
    }
    setApiError('');
    setGoogleLoading(true);
    try {
      await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
      const response = await GoogleSignin.signIn();

      if (!isSuccessResponse(response)) {
        // User cancelled the picker — not an error, just stop quietly
        setGoogleLoading(false);
        return;
      }

      const idToken = response.data.idToken;
      if (!idToken) {
        setApiError('Google sign-in failed. Please try again.');
        setGoogleLoading(false);
        return;
      }

      // Role was already chosen on the previous user-type screen — use it directly,
      // no need to re-ask after Google auth succeeds
      const res = await authAPI.googleLogin(idToken, role ?? 'GUEST');
      const { token, user } = res.data;

     await SecureStore.setItemAsync('token', token);
      dispatch(setAuth({ token, user }));
      registerPushToken(token);

      router.replace(user.role === 'HOST' ? '/host/home' : '/home');
    } catch (error: any) {
      if (isErrorWithCode(error)) {
        if (error.code === statusCodes.SIGN_IN_CANCELLED) {
          // Silent — user backed out intentionally
        } else if (error.code === statusCodes.PLAY_SERVICES_NOT_AVAILABLE) {
          setApiError('Google Play Services is not available on this device.');
        } else {
          setApiError('Google sign-in failed. Please try again.');
        }
      } else {
        setApiError(error.response?.data?.message || 'Google sign-in failed');
      }
    } finally {
      setGoogleLoading(false);
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
          <TouchableOpacity onPress={() => router.back()}>
            <Text style={styles.backText}>←</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Create Account</Text>

          {/* Progress bar — 4 segments, first one active */}
          <View style={styles.progressRow}>
            {Array.from({ length: TOTAL_STEPS }).map((_, i) => (
              <View
                key={i}
                style={[
                  styles.progressSegment,
                  i < CURRENT_STEP
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

          {/* API Error */}
          {apiError ? (
            <View style={styles.apiErrorBox}>
              <Text style={styles.apiErrorText}>{apiError}</Text>
            </View>
          ) : null}

          {/* Email */}
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Email address</Text>
            <View style={[styles.inputFrame, errors.email && styles.inputFrameError]}>
              <TextInput
                style={styles.input}
                placeholder="Enter your email address"
                placeholderTextColor="#A0A0A0"
                value={email}
                onChangeText={(t) => {
                  setEmailLocal(t);
                  setErrors((e) => ({ ...e, email: undefined }));
                }}
                keyboardType="email-address"
                autoCapitalize="none"
              />
            </View>
            {errors.email && (
              <View style={styles.errorRow}>
                <Text style={styles.errorIcon}>⚠️</Text>
                <Text style={styles.errorText}>{errors.email}</Text>
              </View>
            )}
          </View>

          {/* Password */}
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Password</Text>
            <View style={[styles.inputFrame, errors.password && styles.inputFrameError]}>
              <TextInput
                style={styles.input}
                placeholder="Set your password"
                placeholderTextColor="#A0A0A0"
                value={password}
                onChangeText={(t) => {
                  setPassword(t);
                  setErrors((e) => ({ ...e, password: undefined }));
                }}
                secureTextEntry={!showPassword}
                autoCapitalize="none"
              />
              <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
                <Feather
                  name={showPassword ? 'eye' : 'eye-off'}
                  size={20}
                  color="#A0A0A0"
                />
              </TouchableOpacity>
            </View>

            {showPasswordChecklist && (
              <View style={styles.checklist}>
                <PasswordRequirement met={passwordChecks.minLength} label="At least 8 characters" />
                <PasswordRequirement met={passwordChecks.hasUppercase} label="One uppercase letter" />
                <PasswordRequirement met={passwordChecks.hasLowercase} label="One lowercase letter" />
                <PasswordRequirement met={passwordChecks.hasNumber} label="One number" />
                <PasswordRequirement met={passwordChecks.hasSpecialChar} label="One special character (@$!%*?&)" />
              </View>
            )}

            {errors.password && (
              <View style={styles.errorRow}>
                <Text style={styles.errorIcon}>⚠️</Text>
                <Text style={styles.errorText}>{errors.password}</Text>
              </View>
            )}
          </View>

          {/* Confirm Password */}
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Re-enter Password</Text>
            <View style={[styles.inputFrame, errors.confirmPassword && styles.inputFrameError]}>
              <TextInput
                style={styles.input}
                placeholder="Re-enter your password"
                placeholderTextColor="#A0A0A0"
                value={confirmPassword}
                onChangeText={(t) => {
                  setConfirmPassword(t);
                  setErrors((e) => ({ ...e, confirmPassword: undefined }));
                }}
                secureTextEntry={!showConfirmPassword}
                autoCapitalize="none"
              />
              <TouchableOpacity onPress={() => setShowConfirmPassword(!showConfirmPassword)}>
                <Feather
                  name={showConfirmPassword ? 'eye' : 'eye-off'}
                  size={20}
                  color="#A0A0A0"
                />
              </TouchableOpacity>
            </View>
            {errors.confirmPassword && (
              <View style={styles.errorRow}>
                <Text style={styles.errorIcon}>⚠️</Text>
                <Text style={styles.errorText}>{errors.confirmPassword}</Text>
              </View>
            )}
          </View>

          {/* Terms */}
          <Text style={styles.terms}>
            By creating an account, you agree to the{' '}
            <Text style={styles.termsLink}>Terms of Service</Text>
            {' '}and{' '}
            <Text style={styles.termsLink}>Privacy policy</Text>
          </Text>

          {/* Create Account Button */}
          <TouchableOpacity
            style={[
              styles.primaryButton,
              (!isFormFilled || loading) && styles.primaryButtonDisabled,
            ]}
            onPress={handleCreateAccount}
            activeOpacity={0.85}
            disabled={!isFormFilled || loading}
          >
            {loading ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.primaryButtonText}>Create account</Text>
            )}
          </TouchableOpacity>

          {/* Login Row */}
          <View style={styles.loginRow}>
            <Text style={styles.loginText}>Already have an account? </Text>
            <TouchableOpacity onPress={() => router.push('/login')}>
              <Text style={styles.loginLink}>Log in</Text>
            </TouchableOpacity>
          </View>

          {/* Divider */}
          <View style={styles.divider}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>or continue with</Text>
            <View style={styles.dividerLine} />
          </View>

          {/* Social Login */}
          <TouchableOpacity style={styles.socialButton} activeOpacity={0.85}>
            <Image
              source={require('../assets/icons/apple.png')}
              style={styles.socialIcon}
              resizeMode="contain"
            />
            <Text style={styles.socialText}>Continue with Apple</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.socialButton}
            activeOpacity={0.85}
            onPress={handleGoogleSignIn}
            disabled={googleLoading}
          >
            {googleLoading ? (
              <ActivityIndicator color="#020203" />
            ) : (
              <>
                <Image
                  source={require('../assets/icons/google.png')}
                  style={styles.socialIcon}
                  resizeMode="contain"
                />
                <Text style={styles.socialText}>Continue with Google</Text>
              </>
            )}
          </TouchableOpacity>

        </ScrollView>
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
  backText: {
    fontSize: 22,
    color: '#020203',
  },
  headerTitle: {
    fontFamily: 'MonaSans-Bold',
    fontSize: width * 0.055,
    color: '#020203',
    letterSpacing: -0.5,
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
  apiErrorBox: {
    backgroundColor: '#FEF3F2',
    borderWidth: 1,
    borderColor: '#FDA29B',
    borderRadius: 12,
    padding: 12,
  },
  apiErrorText: {
    fontFamily: 'Inter-Regular',
    fontSize: 14,
    color: '#B42318',
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
  inputFrame: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 56,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#D0D5DD',
    paddingHorizontal: 12,
  },
  inputFrameError: {
    borderColor: '#F04438',
  },
  input: {
    flex: 1,
    fontFamily: 'Inter-Regular',
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
  checklist: { gap: 6, marginTop: 4 },
  requirementRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  requirementText: { fontFamily: 'Inter-Regular', fontSize: 13, color: '#98A2B3' },
  requirementTextMet: { color: '#16A34A' },
  terms: {
    fontFamily: 'Inter-Regular',
    fontSize: 13,
    color: '#3A414E',
    lineHeight: 20,
  },
  termsLink: {
    color: '#6200EE',
    fontWeight: '600',
  },
  primaryButton: {
    backgroundColor: '#6200EE',
    borderRadius: 99,
    height: 56,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryButtonDisabled: {
    backgroundColor: '#CEB0FA',
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontFamily: 'Inter-Regular',
    fontSize: width * 0.04,
    fontWeight: '600',
  },
  loginRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  loginText: {
    fontFamily: 'Inter-Regular',
    fontSize: 14,
    lineHeight: 21,
    letterSpacing: -0.5,
    color: '#3A414E',
  },
  loginLink: {
    fontFamily: 'Inter-Regular',
    fontWeight: '600',
    fontSize: 16,
    lineHeight: 24,
    letterSpacing: -0.5,
    color: '#6200EE',
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#E0E0E0',
  },
  dividerText: {
    fontFamily: 'Inter-Regular',
    fontSize: 13,
    color: '#A0A0A0',
  },
  socialButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 56,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#D0D5DD',
    gap: 10,
  },
  socialIcon: {
    width: 22,
    height: 22,
  },
  socialText: {
    fontFamily: 'Inter-Regular',
    fontSize: 15,
    color: '#020203',
  },
});
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
  Animated,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useState, useRef } from 'react';
import { Feather } from '@expo/vector-icons';
import * as SecureStore from 'expo-secure-store';
import { useDispatch } from 'react-redux';
import { setAuth } from '@/store/slices/authSlice';
import { authAPI } from '@/services/api';

const { width } = Dimensions.get('window');

export default function Login() {
  const dispatch = useDispatch();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [notification, setNotification] = useState<string | null>(null);
  const notifOpacity = useRef(new Animated.Value(1)).current;
  const notifTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Button active only when both fields have input
  const isFormFilled = email.length > 0 && password.length > 0;

  // Show floating error notification then fade out after 3 seconds
  const showNotification = (message: string) => {
    setNotification(message);
    notifOpacity.setValue(1);
    if (notifTimer.current) clearTimeout(notifTimer.current);
    notifTimer.current = setTimeout(() => {
      Animated.timing(notifOpacity, {
        toValue: 0,
        duration: 400,
        useNativeDriver: true,
      }).start(() => setNotification(null));
    }, 3000);
  };

  const handleLogin = async () => {
    setLoading(true);
    try {
      const response = await authAPI.login(email, password);
      const { token, user } = response.data;

      // Store JWT securely on device
      await SecureStore.setItemAsync('token', token);

      // Save user and token to Redux
      dispatch(setAuth({ token, user }));

      router.replace(user.role === 'HOST' ? '/host/home' : '/home');
    } catch (error: any) {
      showNotification(
        error.response?.data?.message || 'Invalid email or password'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.root}>
      <SafeAreaView style={styles.screen}>
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          <ScrollView
            contentContainerStyle={styles.scroll}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >

            {/* Header — back arrow and title on same row */}
            <View style={styles.header}>
              <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                <Text style={styles.backText}>←</Text>
              </TouchableOpacity>
              <Text style={styles.headerTitle}>Log in</Text>
            </View>

            {/* Email */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Email address</Text>
              <TextInput
                style={styles.inputFrame}
                placeholder="Enter your email address"
                placeholderTextColor="#A0A0A0"
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
              />
            </View>

            {/* Password */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Password</Text>
              <View style={styles.passwordFrame}>
                <TextInput
                  style={styles.passwordInput}
                  placeholder="Set your password"
                  placeholderTextColor="#A0A0A0"
                  value={password}
                  onChangeText={setPassword}
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
            </View>

            {/* Forgot Password */}
            <View style={styles.forgotRow}>
              <Text style={styles.forgotText}>Forget Password? </Text>
              <TouchableOpacity onPress={() => router.push('/forgot-password')}>
                <Text style={styles.resetLink}>Reset here</Text>
              </TouchableOpacity>
            </View>

            {/* Login Button */}
            <TouchableOpacity
              style={[
                styles.primaryButton,
                (!isFormFilled || loading) && styles.primaryButtonDisabled,
              ]}
              onPress={handleLogin}
              activeOpacity={0.85}
              disabled={!isFormFilled || loading}
            >
              {loading ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={styles.primaryButtonText}>Log in</Text>
              )}
            </TouchableOpacity>

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

            <TouchableOpacity style={styles.socialButton} activeOpacity={0.85}>
              <Image
                source={require('../assets/icons/google.png')}
                style={styles.socialIcon}
                resizeMode="contain"
              />
              <Text style={styles.socialText}>Continue with Google</Text>
            </TouchableOpacity>

          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>

      {/* Floating error notification — outside SafeAreaView to cover everything */}
      {notification && (
        <Animated.View style={[styles.notification, { opacity: notifOpacity }]}>
          <View style={styles.notificationIconCircle}>
            <Feather name="x" size={13} color="#FFFFFF" />
          </View>
          <Text style={styles.notificationText}>{notification}</Text>
        </Animated.View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  screen: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  scroll: {
    paddingHorizontal: width * 0.05,
    paddingTop: 12,
    paddingBottom: 40,
    gap: 20,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  backButton: {
    width: 40,
    height: 40,
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
  // Direct TextInput styled as frame — avoids iOS placeholder clipping
  inputFrame: {
    height: 56,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#D0D5DD',
    paddingHorizontal: 12,
    fontSize: 16,
    color: '#020203',
  },
  // Password needs a wrapper for the eye icon
  passwordFrame: {
    height: 56,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#D0D5DD',
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
  },
  passwordInput: {
    flex: 1,
    fontSize: 16,
    color: '#020203',
    height: '100%',
  },
  forgotRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  forgotText: {
    fontFamily: 'Inter-Regular',
    fontSize: 14,
    lineHeight: 21,
    letterSpacing: -0.5,
    color: '#3A414E',
  },
  resetLink: {
    fontFamily: 'Inter-Regular',
    fontWeight: '600',
    fontSize: 16,
    lineHeight: 24,
    letterSpacing: -0.5,
    color: '#6200EE',
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
    fontWeight: '600',
    fontSize: 16,
    lineHeight: 24,
    letterSpacing: -0.5,
    textAlign: 'center',
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
    fontSize: 12,
    lineHeight: 16,
    color: '#98A2B3',
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
    fontSize: 14,
    lineHeight: 21,
    letterSpacing: -0.5,
    color: '#3A414E',
    textAlign: 'center',
  },
  notification: {
    position: 'absolute',
    top: 52,
    left: width * 0.04,
    right: width * 0.04,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF3F2',
    borderWidth: 1,
    borderColor: '#FDA29B',
    borderRadius: 16,
    padding: 12,
    gap: 8,
    zIndex: 9999,
    elevation: 9999,
  },
  notificationIconCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#B42318',
    alignItems: 'center',
    justifyContent: 'center',
  },
  notificationText: {
    fontFamily: 'MonaSans-Bold',
    fontSize: 14,
    lineHeight: 21,
    letterSpacing: -0.5,
    color: '#B42318',
    flex: 1,
  },
});
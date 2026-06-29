import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  KeyboardAvoidingView,
  Platform,
  Animated,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useState, useRef } from 'react';
import { useDispatch } from 'react-redux';
import { setEmail } from '@/store/slices/authSlice';
import { authAPI } from '@/services/api';

const { width } = Dimensions.get('window');

export default function ForgotPassword() {
  const dispatch = useDispatch();
  const [email, setEmailLocal] = useState('');
  const [loading, setLoading] = useState(false);
  const [notification, setNotification] = useState<'success' | 'error' | null>(null);
  const [notificationMsg, setNotificationMsg] = useState('');
  const notifOpacity = useRef(new Animated.Value(1)).current;
  const notifTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const isFormFilled = email.length > 0;

  // Show floating notification then fade out after 3 seconds
  const showNotification = (type: 'success' | 'error', message: string) => {
    setNotificationMsg(message);
    setNotification(type);
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

 const handleSendInstruction = async () => {
  setLoading(true);
  try {
    // Call backend to send reset code to email
    await authAPI.forgotPassword(email);

    // Save email to Redux so verify-reset screen can display it
    dispatch(setEmail(email));

    // Navigate immediately — verify-reset screen shows the success notification
    router.push('/verify-reset');
  } catch (error: any) {
    showNotification('error', error.response?.data?.message || 'Something went wrong. Try again.');
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
          <View style={styles.container}>

            {/* Header */}
            <View style={styles.header}>
              <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                <Text style={styles.backText}>←</Text>
              </TouchableOpacity>
              <Text style={styles.headerTitle}>Forgot Password</Text>
            </View>

            {/* Email */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Email address</Text>
              <TextInput
                style={styles.inputFrame}
                placeholder="Enter your email address"
                placeholderTextColor="#A0A0A0"
                value={email}
                onChangeText={setEmailLocal}
                keyboardType="email-address"
                autoCapitalize="none"
              />
            </View>

            {/* Send Instruction Button */}
            <TouchableOpacity
              style={[
                styles.primaryButton,
                (!isFormFilled || loading) && styles.primaryButtonDisabled,
              ]}
              onPress={handleSendInstruction}
              activeOpacity={0.85}
              disabled={!isFormFilled || loading}
            >
              {loading ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={styles.primaryButtonText}>Send Instruction</Text>
              )}
            </TouchableOpacity>

            {/* Remember Password */}
            <View style={styles.loginRow}>
              <Text style={styles.loginText}>Remember now? </Text>
              <TouchableOpacity onPress={() => router.push('/login')}>
                <Text style={styles.loginLink}>Log in</Text>
              </TouchableOpacity>
            </View>

          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>

      {/* Floating notification — outside SafeAreaView to cover everything */}
      {notification && (
        <Animated.View
          style={[
            styles.notification,
            notification === 'success' ? styles.notificationSuccess : styles.notificationError,
            { opacity: notifOpacity },
          ]}
        >
          <View
            style={[
              styles.notificationIconCircle,
              notification === 'success'
                ? styles.notificationIconSuccess
                : styles.notificationIconError,
            ]}
          >
            <Text style={styles.notificationIcon}>
              {notification === 'success' ? '✓' : '✕'}
            </Text>
          </View>
          <Text
            style={[
              styles.notificationText,
              notification === 'success'
                ? styles.notificationTextSuccess
                : styles.notificationTextError,
            ]}
          >
            {notificationMsg}
          </Text>
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
  container: {
    flex: 1,
    paddingHorizontal: width * 0.05,
    paddingTop: 12,
    gap: 20,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 4,
    paddingTop: 12,
  },
  backButton: {
    marginLeft: -6,
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
  inputFrame: {
    height: 56,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#D0D5DD',
    paddingHorizontal: 12,
    fontSize: 16,
    color: '#020203',
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
  notification: {
    position: 'absolute',
    top: 52,
    left: width * 0.04,
    right: width * 0.04,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 16,
    padding: 12,
    gap: 8,
    zIndex: 9999,
    elevation: 9999,
  },
  notificationSuccess: {
    backgroundColor: '#E5FBEC',
    borderColor: '#B2F3C7',
  },
  notificationError: {
    backgroundColor: '#FEF3F2',
    borderColor: '#FDA29B',
  },
  notificationIconCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  notificationIconSuccess: {
    backgroundColor: '#007A26',
  },
  notificationIconError: {
    backgroundColor: '#B42318',
  },
  notificationIcon: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
  notificationText: {
    fontFamily: 'MonaSans-Bold',
    fontSize: 14,
    lineHeight: 21,
    letterSpacing: -0.5,
    flex: 1,
  },
  notificationTextSuccess: {
    color: '#007A26',
  },
  notificationTextError: {
    color: '#B42318',
  },
});
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
import { useRef, useState, useEffect } from 'react';
import { useSelector } from 'react-redux';
import { RootState } from '@/store';

const { width } = Dimensions.get('window');

const CODE_LENGTH = 6;

export default function VerifyReset() {
  const userEmail = useSelector((state: RootState) => state.auth.email);
  const [code, setCode] = useState<string[]>(Array(CODE_LENGTH).fill(''));
  const [loading, setLoading] = useState(false);
  const [notification, setNotification] = useState<'success' | 'error' | null>(null);
  const [notificationMsg, setNotificationMsg] = useState('');
  const inputs = useRef<(TextInput | null)[]>([]);
  const notifOpacity = useRef(new Animated.Value(1)).current;
  const notifTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

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

  // Show success notification on mount — code was just sent
  useEffect(() => {
    showNotification('success', '6 digit code has been sent to your email address');
    return () => {
      if (notifTimer.current) clearTimeout(notifTimer.current);
    };
  }, []);

  const handleChange = (text: string, index: number) => {
    const newCode = [...code];
    newCode[index] = text;
    setCode(newCode);

    if (text && index < CODE_LENGTH - 1) {
      inputs.current[index + 1]?.focus();
    } else if (text && index === CODE_LENGTH - 1) {
      inputs.current[index]?.blur();
    }
  };

  const handleKeyPress = (e: any, index: number) => {
    if (e.nativeEvent.key === 'Backspace' && !code[index] && index > 0) {
      inputs.current[index - 1]?.focus();
    }
  };

  const isComplete = code.every((c) => c.length === 1);

  const handleVerify = async () => {
    if (!isComplete) return;
    setLoading(true);
    try {
      // TODO: wire up verify reset code API call
      router.push('/new-password');
    } catch (error: any) {
      showNotification('error', error.response?.data?.message || 'Please enter the valid verification code');
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    try {
      // TODO: wire up resend code API call
      showNotification('success', '6 digit code has been resent to your email address');
    } catch (error: any) {
      showNotification('error', 'Failed to resend code. Try again.');
    }
  };

  return (
    <View style={styles.root}>
      <SafeAreaView style={styles.screen}>
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >

          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
              <Text style={styles.backText}>←</Text>
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Verify code</Text>
          </View>

          {/* Content */}
          <View style={styles.content}>

            {/* Description */}
            <Text style={styles.description}>
              A six digit verification code has been sent to your email{' '}
              <Text style={styles.emailHighlight}>{userEmail}</Text>
            </Text>

            {/* Code Input */}
            <View style={styles.codeSection}>
              <Text style={styles.codeLabel}>Enter verification code</Text>
              <View style={styles.codeRow}>
                {Array.from({ length: CODE_LENGTH }).map((_, i) => (
                  <TextInput
                    key={i}
                    ref={(ref: TextInput | null) => { inputs.current[i] = ref; }}
                    style={[
                      styles.codeBox,
                      code[i] ? styles.codeBoxFilled : styles.codeBoxEmpty,
                    ]}
                    maxLength={1}
                    keyboardType="number-pad"
                    value={code[i]}
                    onChangeText={(t) => handleChange(t, i)}
                    onKeyPress={(e) => handleKeyPress(e, i)}
                    textAlign="center"
                    selectionColor="#6200EE"
                  />
                ))}
              </View>
            </View>

            {/* Resend */}
            <View style={styles.resendRow}>
              <Text style={styles.resendText}>Didn't receive a code? </Text>
              <TouchableOpacity onPress={handleResend}>
                <Text style={styles.resendLink}>Resend</Text>
              </TouchableOpacity>
            </View>

          </View>

          {/* Verify Button pinned to bottom */}
          <View style={styles.footer}>
            <TouchableOpacity
              style={[
                styles.primaryButton,
                (!isComplete || loading) && styles.primaryButtonDisabled,
              ]}
              onPress={handleVerify}
              activeOpacity={0.85}
              disabled={!isComplete || loading}
            >
              {loading ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={styles.primaryButtonText}>Verify code</Text>
              )}
            </TouchableOpacity>
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: width * 0.05,
    paddingTop: 12,
    paddingBottom: 8,
    gap: 8,
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
  content: {
    flex: 1,
    paddingHorizontal: width * 0.05,
    paddingTop: 24,
    gap: 24,
  },
  description: {
    fontFamily: 'Inter-Regular',
    fontSize: 16,
    lineHeight: 24,
    letterSpacing: -0.5,
    color: '#3A414E',
  },
  emailHighlight: {
    fontFamily: 'Inter-Regular',
    fontSize: 16,
    lineHeight: 24,
    letterSpacing: -0.5,
    color: '#020203',
    fontWeight: '600',
  },
  codeSection: {
    gap: 8,
  },
  codeLabel: {
    fontFamily: 'Inter-Regular',
    fontSize: 16,
    lineHeight: 24,
    letterSpacing: -0.5,
    color: '#020203',
  },
  codeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
  },
  codeBox: {
    flex: 1,
    height: 64,
    borderRadius: 12,
    borderWidth: 1,
    fontFamily: 'MonaSans-Bold',
    fontSize: 24,
    lineHeight: 24 * 1.2,
    letterSpacing: 0,
    textAlign: 'center',
    color: '#020203',
  },
  codeBoxEmpty: {
    borderColor: '#D0D5DD',
    backgroundColor: '#FAFAFA',
  },
  codeBoxFilled: {
    borderColor: '#D0D5DD',
    backgroundColor: '#FAFAFA',
  },
  resendRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  resendText: {
    fontFamily: 'Inter-Regular',
    fontSize: 14,
    color: '#3A414E',
    letterSpacing: -0.5,
  },
  resendLink: {
    fontFamily: 'Inter-Regular',
    fontSize: 14,
    color: '#6200EE',
    fontWeight: '600',
    letterSpacing: -0.5,
  },
  footer: {
    paddingHorizontal: width * 0.05,
    paddingBottom: 24,
    paddingTop: 12,
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
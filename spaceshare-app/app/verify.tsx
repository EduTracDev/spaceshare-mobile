import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  Animated,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useRef, useState, useEffect } from 'react';
import { useSelector } from 'react-redux';
import { RootState } from '@/store';

const { width } = Dimensions.get('window');

const TOTAL_STEPS = 4;
const CURRENT_STEP = 2;
const CODE_LENGTH = 6;

export default function Verify() {
  const userEmail = useSelector((state: RootState) => state.auth.email);
  const [code, setCode] = useState<string[]>(Array(CODE_LENGTH).fill(''));
  const [notification, setNotification] = useState<'verify' | 'resent' | null>('verify');
  const inputs = useRef<(TextInput | null)[]>([]);
  const notifOpacity = useRef(new Animated.Value(1)).current;
  const notifTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showNotification = (type: 'verify' | 'resent') => {
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

  useEffect(() => {
    showNotification('verify');
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

  const handleVerify = () => {
    if (isComplete) router.push('/home');
  };

  const handleResend = () => {
    showNotification('resent');
  };

  return (
    <View style={styles.root}>
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
            <Text style={styles.headerTitle}>Verify Account</Text>
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

          {/* Content */}
          <View style={styles.content}>

            <Text style={styles.description}>
              A six digit verification code has been sent to your email{' '}
              <Text style={styles.emailHighlight}>{userEmail}</Text>
            </Text>

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

            <View style={styles.resendRow}>
              <Text style={styles.resendText}>Didn't receive a code? </Text>
              <TouchableOpacity onPress={handleResend}>
                <Text style={styles.resendLink}>Resend</Text>
              </TouchableOpacity>
            </View>

          </View>

          {/* Verify Button */}
          <View style={styles.footer}>
            <TouchableOpacity
              style={[
                styles.primaryButton,
                !isComplete && styles.primaryButtonDisabled,
              ]}
              onPress={handleVerify}
              activeOpacity={0.85}
              disabled={!isComplete}
            >
              <Text style={styles.primaryButtonText}>Verify account</Text>
            </TouchableOpacity>
          </View>

        </KeyboardAvoidingView>
      </SafeAreaView>

      {/* Floating Notification — outside SafeAreaView to cover everything */}
      {notification && (
        <Animated.View style={[styles.notification, { opacity: notifOpacity }]}>
          <View style={styles.notificationIconCircle}>
            <Text style={styles.notificationIcon}>✓</Text>
          </View>
          <Text style={styles.notificationText}>
            {notification === 'verify'
              ? 'Please verify your email address to continue'
              : 'Verification code has been resent to your email'}
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
  notification: {
    position: 'absolute',
    top: 52,
    left: width * 0.04,
    right: width * 0.04,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E5FBEC',
    borderWidth: 1,
    borderColor: '#B2F3C7',
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
    backgroundColor: '#007A26',
    alignItems: 'center',
    justifyContent: 'center',
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
    color: '#007A26',
    flex: 1,
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
    fontSize: width * 0.04,
    fontWeight: '600',
  },
});
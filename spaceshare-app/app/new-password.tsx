import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useState } from 'react';
import { Feather } from '@expo/vector-icons';

const { width } = Dimensions.get('window');

export default function NewPassword() {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<{
    password?: string;
    confirmPassword?: string;
  }>({});

  const isFormFilled = password.length > 0 && confirmPassword.length > 0;

  const validate = () => {
    const newErrors: typeof errors = {};
    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;

    if (!password || !passwordRegex.test(password)) {
      newErrors.password =
        'Password needs 8+ characters, an uppercase, a lowercase, a number, and a special character.';
    }
    if (!confirmPassword) {
      newErrors.confirmPassword = "Field can't be empty";
    } else if (password !== confirmPassword) {
      newErrors.confirmPassword = "Password doesn't match";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleResetPassword = async () => {
    if (!validate()) return;
    setLoading(true);
    try {
      // TODO: wire up reset password API call
      router.replace('/login');
    } catch (error: any) {
      setErrors({ password: error.response?.data?.message || 'Something went wrong.' });
    } finally {
      setLoading(false);
    }
  };

  return (
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

          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
              <Text style={styles.backText}>←</Text>
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Reset Password</Text>
          </View>

          {/* Subtitle */}
          <Text style={styles.subtitle}>
            Reset your password by entering a new one in the fields below
          </Text>

          {/* New Password */}
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>New Password</Text>
            <View style={[styles.passwordFrame, errors.password && styles.inputFrameError]}>
              <TextInputField
                placeholder="Set your new password"
                value={password}
                onChangeText={(t) => {
                  setPassword(t);
                  setErrors((e) => ({ ...e, password: undefined }));
                }}
                secureTextEntry={!showPassword}
              />
              <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
                <Feather
                  name={showPassword ? 'eye' : 'eye-off'}
                  size={20}
                  color="#A0A0A0"
                />
              </TouchableOpacity>
            </View>
            {errors.password && (
              <View style={styles.errorRow}>
                <Text style={styles.errorIcon}>⚠️</Text>
                <Text style={styles.errorText}>{errors.password}</Text>
              </View>
            )}
          </View>

          {/* Re-enter Password */}
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Re-enter Password</Text>
            <View style={[styles.passwordFrame, errors.confirmPassword && styles.inputFrameError]}>
              <TextInputField
                placeholder="Re-enter your password"
                value={confirmPassword}
                onChangeText={(t) => {
                  setConfirmPassword(t);
                  setErrors((e) => ({ ...e, confirmPassword: undefined }));
                }}
                secureTextEntry={!showConfirmPassword}
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

          {/* Reset Password Button */}
          <TouchableOpacity
            style={[
              styles.primaryButton,
              (!isFormFilled || loading) && styles.primaryButtonDisabled,
            ]}
            onPress={handleResetPassword}
            activeOpacity={0.85}
            disabled={!isFormFilled || loading}
          >
            {loading ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.primaryButtonText}>Reset Password</Text>
            )}
          </TouchableOpacity>

        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

// Inline TextInput to avoid iOS placeholder clipping
import { TextInput } from 'react-native';

function TextInputField({
  placeholder,
  value,
  onChangeText,
  secureTextEntry,
}: {
  placeholder: string;
  value: string;
  onChangeText: (t: string) => void;
  secureTextEntry?: boolean;
}) {
  return (
    <TextInput
      style={styles.passwordInput}
      placeholder={placeholder}
      placeholderTextColor="#A0A0A0"
      value={value}
      onChangeText={onChangeText}
      secureTextEntry={secureTextEntry}
      autoCapitalize="none"
    />
  );
}

const styles = StyleSheet.create({
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
  subtitle: {
    fontFamily: 'Inter-Regular',
    fontSize: 16,
    lineHeight: 24,
    letterSpacing: -0.5,
    color: '#3A414E',
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
  passwordFrame: {
    height: 56,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#D0D5DD',
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
  },
  inputFrameError: {
    borderColor: '#F04438',
  },
  passwordInput: {
    flex: 1,
    fontSize: 16,
    color: '#020203',
    height: '100%',
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
});
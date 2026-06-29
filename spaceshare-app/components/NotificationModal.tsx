import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  Modal,
} from 'react-native';
import { BlurView } from 'expo-blur';

const { width } = Dimensions.get('window');

type NotificationModalProps = {
  visible: boolean;
  onTurnOn: () => void;
  onMaybeLater: () => void;
};

export default function NotificationModal({
  visible,
  onTurnOn,
  onMaybeLater,
}: NotificationModalProps) {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
    >
      {/* Blurred background */}
      <BlurView intensity={20} tint="dark" style={styles.overlay}>
        <View style={styles.card}>

          {/* Bell icon */}
          <Text style={styles.emoji}>🔔</Text>

          {/* Title */}
          <Text style={styles.title}>Turn On Notifications</Text>

          {/* Subtitle */}
          <Text style={styles.subtitle}>
            Get booking updates, reminders, and host messages instantly.
          </Text>

          {/* Turn On Button */}
          <TouchableOpacity
            style={styles.primaryButton}
            onPress={onTurnOn}
            activeOpacity={0.85}
          >
            <Text style={styles.primaryButtonText}>Turn on Notification</Text>
          </TouchableOpacity>

          {/* Maybe Later */}
          <TouchableOpacity
            style={styles.secondaryButton}
            onPress={onMaybeLater}
            activeOpacity={0.85}
          >
            <Text style={styles.secondaryButtonText}>Maybe Later</Text>
          </TouchableOpacity>

        </View>
      </BlurView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
    paddingHorizontal: width * 0.05,
    paddingBottom: 40,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 24,
    width: '100%',
    alignItems: 'center',
    gap: 16,
  },
  emoji: {
    fontSize: 48,
  },
  title: {
    fontFamily: 'MonaSans-Bold',
    fontSize: 24,
    lineHeight: 24 * 1.2,
    letterSpacing: 0,
    textAlign: 'center',
    color: '#020203',
  },
  subtitle: {
    fontFamily: 'Inter-Regular',
    fontSize: 16,
    lineHeight: 24,
    letterSpacing: -0.5,
    textAlign: 'center',
    color: '#3A414E',
  },
  primaryButton: {
    backgroundColor: '#6200EE',
    borderRadius: 99,
    height: 56,
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
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
  secondaryButton: {
    backgroundColor: '#EDE7F6',
    borderRadius: 99,
    height: 56,
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryButtonText: {
    color: '#6200EE',
    fontFamily: 'Inter-Regular',
    fontWeight: '600',
    fontSize: 16,
    lineHeight: 24,
    letterSpacing: -0.5,
    textAlign: 'center',
  },
});
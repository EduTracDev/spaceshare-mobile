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

type WelcomeModalProps = {
  visible: boolean;
  onExplore: () => void;
};

export default function WelcomeModal({ visible, onExplore }: WelcomeModalProps) {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
    >
      {/* Blurred background */}
      <BlurView intensity={20} tint="dark" style={styles.overlay}>
        <View style={styles.card}>

          {/* Celebration emoji */}
          <Text style={styles.emoji}>🎉</Text>

          {/* Title */}
          <Text style={styles.title}>You're all set!</Text>

          {/* Subtitle */}
          <Text style={styles.subtitle}>
            Welcome to the SpaceShare. Let's find the perfect space for your next event in Lagos.
          </Text>

          {/* Explore Button */}
          <TouchableOpacity
            style={styles.button}
            onPress={onExplore}
            activeOpacity={0.85}
          >
            <Text style={styles.buttonText}>Explore Spaces</Text>
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
  button: {
    backgroundColor: '#6200EE',
    borderRadius: 99,
    height: 56,
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
  },
  buttonText: {
    color: '#FFFFFF',
    fontFamily: 'Inter-Regular',
    fontWeight: '600',
    fontSize: 16,
    lineHeight: 24,
    letterSpacing: -0.5,
    textAlign: 'center',
  },
});
import { View, Text, StyleSheet, TouchableOpacity, Modal, Dimensions } from 'react-native';
import { BlurView } from 'expo-blur';
import { Feather } from '@expo/vector-icons';

interface Props {
  visible: boolean;
  onViewBooking: () => void;
  onBackToHome: () => void;
}

export default function BookingSent({ visible, onViewBooking, onBackToHome }: Props) {
  return (
    <Modal visible={visible} transparent animationType="fade">
      <BlurView intensity={30} tint="dark" style={s.overlay}>
        <View style={s.card}>
          <View style={s.iconCircle}>
            <Feather name="check" size={28} color="#FFFFFF" />
          </View>
          <Text style={s.title}>Booking Request Sent</Text>
          <Text style={s.body}>
            Your booking request has been sent to the host. You'll receive a notification once your request is approved or declined.
          </Text>
          <TouchableOpacity style={s.primaryBtn} onPress={onViewBooking}>
            <Text style={s.primaryBtnText}>View Booking</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={onBackToHome}>
            <Text style={s.secondaryText}>Back to Home</Text>
          </TouchableOpacity>
        </View>
      </BlurView>
    </Modal>
  );
}

const s = StyleSheet.create({
  overlay: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 24 },
  card: {
    backgroundColor: '#FFFFFF', borderRadius: 20, padding: 28,
    alignItems: 'center', gap: 8, width: '100%',
  },
  iconCircle: {
    width: 56, height: 56, borderRadius: 28, backgroundColor: '#16A34A',
    alignItems: 'center', justifyContent: 'center', marginBottom: 8,
  },
  title: { fontFamily: 'MonaSans-Bold', fontSize: 18, color: '#020203' },
  body: {
    fontFamily: 'Inter-Regular', fontSize: 13, color: '#6A7181',
    textAlign: 'center', lineHeight: 20, marginBottom: 12,
  },
  primaryBtn: {
    backgroundColor: '#6200EE', borderRadius: 99, height: 52,
    alignItems: 'center', justifyContent: 'center', width: '100%',
  },
  primaryBtnText: { color: '#FFFFFF', fontFamily: 'Inter-Regular', fontWeight: '600', fontSize: 15 },
  secondaryText: { fontFamily: 'Inter-Regular', fontWeight: '600', fontSize: 14, color: '#6200EE', marginTop: 8 },
});
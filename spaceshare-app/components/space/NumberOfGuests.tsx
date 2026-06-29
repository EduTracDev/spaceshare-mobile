import {
  View, Text, StyleSheet, TouchableOpacity,
  Modal, TextInput, Dimensions,
} from 'react-native';
import { BlurView } from 'expo-blur';
import { Feather } from '@expo/vector-icons';

const { height } = Dimensions.get('window');

interface Props {
  visible: boolean;
  onClose: () => void;
  onBack: () => void;
  onConfirm: (guests: number) => void;
  spaceCapacity?: number;
}

function ProgressBar({ step }: { step: number }) {
  return (
    <View style={pb.row}>
      {[1, 2, 3, 4].map(n => (
        <View key={n} style={[pb.bar, n === step ? pb.barActive : pb.barInactive]} />
      ))}
    </View>
  );
}

const pb = StyleSheet.create({
  row: { flexDirection: 'row', gap: 6, marginBottom: 20 },
  bar: { flex: 1, height: 4, borderRadius: 99 },
  barActive: { backgroundColor: '#6200EE' },
  barInactive: { backgroundColor: '#E4E7EC' },
});

import { useState } from 'react';

export default function NumberOfGuests({
  visible, onClose, onBack, onConfirm, spaceCapacity = 50,
}: Props) {
  const [guests, setGuests] = useState('');

  const guestCount = parseInt(guests, 10);
  const canContinue = !isNaN(guestCount) && guestCount > 0 && guestCount <= spaceCapacity;

  return (
    <Modal visible={visible} transparent animationType="slide">
      <BlurView intensity={30} tint="dark" style={s.overlay}>
        <View style={s.sheet}>

          <View style={s.handle} />
          <ProgressBar step={2} />

          <View style={s.header}>
            <TouchableOpacity style={s.backBtn} onPress={onBack}>
              <Feather name="arrow-left" size={18} color="#020203" />
            </TouchableOpacity>
            <TouchableOpacity onPress={onClose}>
              <Feather name="x" size={20} color="#020203" />
            </TouchableOpacity>
          </View>

          <Text style={s.title}>How many guests are you expecting?</Text>
          <Text style={s.subtitle}>Enter the estimated number of guests attending your event.</Text>

          <View style={s.inputSection}>
            <Text style={s.inputLabel}>Number of Guests</Text>
            <TextInput
              style={s.input}
              value={guests}
              onChangeText={setGuests}
              keyboardType="number-pad"
              placeholder="0"
              placeholderTextColor="#C0C0C0"
              maxLength={4}
            />
            <Text style={s.capacityHint}>
              ⓘ This space can accommodate up to {spaceCapacity} guests.
            </Text>
          </View>

          <TouchableOpacity
            style={[s.continueBtn, !canContinue && s.continueBtnDisabled]}
            onPress={() => canContinue && onConfirm(guestCount)}
            disabled={!canContinue}
          >
            <Text style={s.continueBtnText}>Continue</Text>
          </TouchableOpacity>

        </View>
      </BlurView>
    </Modal>
  );
}

const s = StyleSheet.create({
  overlay: { flex: 1, justifyContent: 'flex-end' },
sheet: {
  backgroundColor: '#FFFFFF', borderTopLeftRadius: 24, borderTopRightRadius: 24,
  paddingHorizontal: 16, paddingBottom: 48, 
  height: height * 0.90,
},
  handle: {
    width: 40, height: 4, borderRadius: 2, backgroundColor: '#E4E7EC',
    alignSelf: 'center', marginTop: 12, marginBottom: 16,
  },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  backBtn: {
    width: 36, height: 36, borderRadius: 18, backgroundColor: '#F2F4F7',
    alignItems: 'center', justifyContent: 'center',
  },
  title: { fontFamily: 'MonaSans-Bold', fontSize: 20, color: '#020203', marginBottom: 6 },
  subtitle: { fontFamily: 'Inter-Regular', fontSize: 13, color: '#6A7181', lineHeight: 20, marginBottom: 28 },

  inputSection: { gap: 8, marginBottom: 32 },
  inputLabel: { fontFamily: 'Inter-Regular', fontSize: 13, color: '#3A414E' },
  input: {
    borderWidth: 1, borderColor: '#E4E7EC', borderRadius: 12,
    paddingHorizontal: 16, paddingVertical: 14,
    fontFamily: 'Inter-Regular', fontSize: 16, color: '#020203',
  },
  capacityHint: { fontFamily: 'Inter-Regular', fontSize: 12, color: '#6A7181' },

  continueBtn: {
    backgroundColor: '#6200EE', borderRadius: 99, height: 52,
    alignItems: 'center', justifyContent: 'center',
  },
  continueBtnDisabled: { backgroundColor: '#C4B5FD' },
  continueBtnText: { color: '#FFFFFF', fontFamily: 'Inter-Regular', fontWeight: '600', fontSize: 15 },
});
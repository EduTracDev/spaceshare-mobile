import { useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  Modal, TextInput, Dimensions,
} from 'react-native';
import { BlurView } from 'expo-blur';
import { Feather } from '@expo/vector-icons';

const { height } = Dimensions.get('window');

interface AttendeeTier {
  range: string;
  price: number;
}

interface Props {
  visible: boolean;
  onClose: () => void;
  onBack: () => void;
  onConfirm: (guests: number) => void;
  spaceCapacity?: number;
  hasAttendeePricing?: boolean;
  attendeeTiers?: AttendeeTier[];
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

export default function NumberOfGuests({
  visible, onClose, onBack, onConfirm,
  spaceCapacity = 50,
  hasAttendeePricing = false,
  attendeeTiers = [],
}: Props) {
  const [guests, setGuests] = useState('');
  const [selectedTier, setSelectedTier] = useState<number | null>(null);
  const [dropdownOpen, setDropdownOpen] = useState(false);

  const guestCount = parseInt(guests, 10);
  const exceedsCapacity = !isNaN(guestCount) && guestCount > spaceCapacity;

  const canContinue = hasAttendeePricing
    ? selectedTier !== null
    : !isNaN(guestCount) && guestCount > 0 && !exceedsCapacity;

  const handleConfirm = () => {
    if (!canContinue) return;
    if (hasAttendeePricing && selectedTier !== null) {
      onConfirm(selectedTier);
    } else {
      onConfirm(guestCount);
    }
  };

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

            {hasAttendeePricing ? (
              // Dropdown for attendee tier pricing
              <View>
                <TouchableOpacity
                  style={[s.input, s.dropdown]}
                  onPress={() => setDropdownOpen(!dropdownOpen)}
                >
                  <Text style={selectedTier !== null ? s.dropdownSelected : s.dropdownPlaceholder}>
                    {selectedTier !== null
                      ? attendeeTiers[selectedTier]?.range
                      : 'Select guest number'}
                  </Text>
                  <Feather name="chevron-down" size={16} color="#6A7181" />
                </TouchableOpacity>

                {dropdownOpen && (
                  <View style={s.dropdownList}>
                    {attendeeTiers.map((tier, i) => (
                      <TouchableOpacity
                        key={i}
                        style={[s.dropdownItem, i === attendeeTiers.length - 1 && { borderBottomWidth: 0 }]}
                        onPress={() => {
                          setSelectedTier(i);
                          setDropdownOpen(false);
                        }}
                      >
                        <Text style={s.tierRange}>{tier.range}</Text>
                        <Text style={s.tierPrice}>₦{tier.price.toLocaleString()}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                )}
              </View>
            ) : (
              // Plain text input
              <TextInput
                style={[s.input, exceedsCapacity && s.inputError]}
                value={guests}
                onChangeText={setGuests}
                keyboardType="number-pad"
                placeholder="0"
                placeholderTextColor="#C0C0C0"
                maxLength={4}
              />
            )}

            {/* Error message */}
            {exceedsCapacity && !hasAttendeePricing && (
              <View style={s.errorRow}>
                <Feather name="alert-triangle" size={13} color="#EF4444" />
                <Text style={s.errorText}>
                  Guest count exceeds the maximum capacity for this space.
                </Text>
              </View>
            )}

            <Text style={s.capacityHint}>
              ⓘ This space can accommodate up to {spaceCapacity} guests.
            </Text>
          </View>

          <View style={s.footer}>
            <TouchableOpacity style={s.backCircle} onPress={onBack}>
              <Feather name="arrow-left" size={18} color="#6200EE" />
            </TouchableOpacity>
            <TouchableOpacity
              style={[s.continueBtn, !canContinue && s.continueBtnDisabled]}
              onPress={handleConfirm}
              disabled={!canContinue}
            >
              <Text style={s.continueBtnText}>Continue</Text>
            </TouchableOpacity>
          </View>

        </View>
      </BlurView>
    </Modal>
  );
}

const s = StyleSheet.create({
  overlay: { flex: 1, justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: '#FFFFFF', borderTopLeftRadius: 24, borderTopRightRadius: 24,
    paddingHorizontal: 16, paddingBottom: 48, height: height * 0.90,
  },
  handle: {
    width: 40, height: 4, borderRadius: 2, backgroundColor: '#E4E7EC',
    alignSelf: 'center', marginTop: 12, marginBottom: 16,
  },
  header: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', marginBottom: 20,
  },
  backBtn: {
    width: 36, height: 36, borderRadius: 18, backgroundColor: '#F2F4F7',
    alignItems: 'center', justifyContent: 'center',
  },
  title: { fontFamily: 'MonaSans-Bold', fontSize: 20, color: '#020203', marginBottom: 6 },
  subtitle: { fontFamily: 'Inter-Regular', fontSize: 13, color: '#6A7181', lineHeight: 20, marginBottom: 24 },

  inputSection: { gap: 8, flex: 1 },
  inputLabel: { fontFamily: 'Inter-Regular', fontSize: 13, color: '#3A414E' },

  input: {
    borderWidth: 1, borderColor: '#E4E7EC', borderRadius: 12,
    paddingHorizontal: 16, paddingVertical: 14,
    fontFamily: 'Inter-Regular', fontSize: 16, color: '#020203',
  },
  inputError: { borderColor: '#EF4444' },

  dropdown: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
  },
  dropdownPlaceholder: { fontFamily: 'Inter-Regular', fontSize: 15, color: '#C0C0C0' },
  dropdownSelected: { fontFamily: 'Inter-Regular', fontSize: 15, color: '#020203' },

  dropdownList: {
    borderWidth: 1, borderColor: '#E4E7EC', borderRadius: 12,
    marginTop: 4, overflow: 'hidden',
  },
  dropdownItem: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 14,
    borderBottomWidth: 1, borderBottomColor: '#F2F4F7',
  },
  tierRange: { fontFamily: 'Inter-Regular', fontSize: 14, color: '#020203' },
  tierPrice: { fontFamily: 'Inter-Regular', fontSize: 14, color: '#6200EE', fontWeight: '600' },

  errorRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  errorText: { fontFamily: 'Inter-Regular', fontSize: 12, color: '#EF4444', flex: 1 },

  capacityHint: { fontFamily: 'Inter-Regular', fontSize: 12, color: '#6A7181' },

  footer: { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 16 },
  backCircle: {
    width: 48, height: 48, borderRadius: 24,
    borderWidth: 1, borderColor: '#E4E7EC',
    alignItems: 'center', justifyContent: 'center',
  },
  continueBtn: {
    flex: 1, backgroundColor: '#6200EE', borderRadius: 99, height: 52,
    alignItems: 'center', justifyContent: 'center',
  },
  continueBtnDisabled: { backgroundColor: '#C4B5FD' },
  continueBtnText: { color: '#FFFFFF', fontFamily: 'Inter-Regular', fontWeight: '600', fontSize: 15 },
});
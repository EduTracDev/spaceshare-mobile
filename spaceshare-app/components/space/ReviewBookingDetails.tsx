import { useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  Modal, ScrollView, Dimensions, Image,
} from 'react-native';
import { BlurView } from 'expo-blur';
import { Feather } from '@expo/vector-icons';

const { height } = Dimensions.get('window');

const SHORT_MONTHS = ['JAN','FEB','MAR','APR','MAY','JUN','JUL','AUG','SEP','OCT','NOV','DEC'];

function formatDateRange(start: Date | null, end: Date | null) {
  if (!start) return '';
  const s = `${SHORT_MONTHS[start.getMonth()]} ${start.getDate()}`;
  if (!end || end.toDateString() === start.toDateString()) return s;
  return `${s} - ${SHORT_MONTHS[end.getMonth()]} ${end.getDate()}`;
}

interface AddOn {
  name: string;
  price: number;
  available: number;
}

interface Props {
  visible: boolean;
  onClose: () => void;
  onBack: () => void;
  onConfirm: (selectedAddOns: { [key: string]: number }) => void;
  spaceName?: string;
  spaceLocation?: string;
  spacePrice?: number;
  spaceImage?: any;
  spaceCapacity?: number;
  addOns?: AddOn[];
  selectedAddOns?: { [key: string]: number };
  rangeStart?: Date | null;
  rangeEnd?: Date | null;
  startTime?: string;
  endTime?: string;
  guests?: number;
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

export default function ReviewBookingDetails({
  visible, onClose, onBack, onConfirm,
  spaceName = '', spaceLocation = '', spacePrice = 0, spaceImage = null,
  spaceCapacity = 50, addOns = [], selectedAddOns: initialSelected = {},
  rangeStart = null, rangeEnd = null, startTime = '', endTime = '', guests = 0,
}: Props) {
  const [selected, setSelected] = useState<{ [key: string]: number }>(initialSelected);

  const handleAdd = (name: string) => {
    const item = addOns.find(a => a.name === name);
    if (!item) return;
    const current = selected[name] || 0;
    if (current >= item.available) return;
    setSelected({ ...selected, [name]: current + 1 });
  };

  const handleRemove = (name: string) => {
    if (!selected[name]) return;
    const newSelected = { ...selected, [name]: selected[name] - 1 };
    if (newSelected[name] === 0) delete newSelected[name];
    setSelected(newSelected);
  };

  const addOnTotal = Object.entries(selected).reduce((sum, [key, qty]) => {
    const item = addOns.find(a => a.name === key);
    return sum + (item ? item.price * qty : 0);
  }, 0);

  const hasAnySelected = Object.keys(selected).length > 0;

  return (
    <Modal visible={visible} transparent animationType="slide">
      <BlurView intensity={30} tint="dark" style={s.overlay}>
        <View style={s.sheet}>

          <View style={s.handle} />
          <ProgressBar step={3} />

          <View style={s.header}>
            <TouchableOpacity style={s.backBtn} onPress={onBack}>
              <Feather name="arrow-left" size={18} color="#020203" />
            </TouchableOpacity>
            <TouchableOpacity onPress={onClose}>
              <Feather name="x" size={20} color="#020203" />
            </TouchableOpacity>
          </View>

          <Text style={s.title}>Review Booking Details</Text>
          <Text style={s.subtitle}>Confirm your selected space details and add-ons before submitting your request.</Text>

          <ScrollView showsVerticalScrollIndicator={false}>

            {/* Add-Ons Section */}
            <View style={s.section}>
              <Text style={s.sectionTitle}>Selected Add-Ons</Text>

              {!hasAnySelected && (
                <View style={s.emptyAddOns}>
                  <Feather name="package" size={16} color="#6A7181" />
                  <Text style={s.emptyText}>No add-ons available for this space.</Text>
                </View>
              )}

              {addOns.map((item, i) => (
                <View key={i} style={s.addOnRow}>
                  <View style={s.addOnLeft}>
                    <Text style={s.addOnName}>{item.name}</Text>
                    <Text style={s.addOnSub}>₦{item.price.toLocaleString()} • {item.available} available</Text>
                  </View>
                  <View style={s.counter}>
                    {selected[item.name] ? (
                      <>
                        <TouchableOpacity style={s.counterBtn} onPress={() => handleRemove(item.name)}>
                          <Feather name="minus" size={14} color="#6200EE" />
                        </TouchableOpacity>
                        <Text style={s.counterText}>{selected[item.name]}</Text>
                      </>
                    ) : null}
                    <TouchableOpacity style={s.counterBtn} onPress={() => handleAdd(item.name)}>
                      <Feather name="plus" size={14} color="#6200EE" />
                    </TouchableOpacity>
                  </View>
                </View>
              ))}
            </View>

            <View style={{ height: 24 }} />
          </ScrollView>

          {/* Footer */}
          <View style={s.footer}>
            <TouchableOpacity style={s.backCircle} onPress={onBack}>
              <Feather name="arrow-left" size={18} color="#6200EE" />
            </TouchableOpacity>
            <TouchableOpacity
              style={s.continueBtn}
              onPress={() => onConfirm(selected)}
            >
              <Text style={s.continueBtnText}>Continue to Pricing</Text>
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
    paddingHorizontal: 16, paddingBottom: 36, height: height * 0.75,
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
  subtitle: { fontFamily: 'Inter-Regular', fontSize: 13, color: '#6A7181', lineHeight: 20, marginBottom: 20 },

  section: { gap: 12 },
  sectionTitle: { fontFamily: 'MonaSans-Bold', fontSize: 16, color: '#020203' },

  emptyAddOns: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: '#F9FAFB', borderRadius: 12, padding: 16,
  },
  emptyText: { fontFamily: 'Inter-Regular', fontSize: 13, color: '#6A7181' },

  addOnRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#F2F4F7',
  },
  addOnLeft: { flex: 1, gap: 2 },
  addOnName: { fontFamily: 'Inter-Regular', fontWeight: '600', fontSize: 14, color: '#020203' },
  addOnSub: { fontFamily: 'Inter-Regular', fontSize: 12, color: '#6A7181' },
  counter: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  counterBtn: {
    width: 30, height: 30, borderRadius: 15, backgroundColor: '#EDE7F6',
    alignItems: 'center', justifyContent: 'center',
  },
  counterText: { fontFamily: 'Inter-Regular', fontWeight: '600', fontSize: 14, color: '#020203', minWidth: 16, textAlign: 'center' },

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
  continueBtnText: { color: '#FFFFFF', fontFamily: 'Inter-Regular', fontWeight: '600', fontSize: 15 },
});
import { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
  Modal,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useSelector, useDispatch } from 'react-redux';
import { RootState } from '@/store';
import { setStep, updateListingData } from '@/store/slices/createListingSlice';

const DEFAULT_AMENITIES = [
  'Wi-Fi', 'Parking', 'AC', 'Sound System',
  'Projector', 'Lighting', 'Security', 'Restroom', 'Power'
];

export default function CreateListingAmenities() {
  const dispatch = useDispatch();
  const listing = useSelector((state: RootState) => state.createListing);

  const [selected, setSelected] = useState<string[]>(listing.amenities ?? []);
  const [showAddModal, setShowAddModal] = useState(false);
  const [customInputs, setCustomInputs] = useState<string[]>(['']);

  const toggleAmenity = (name: string) => {
    setSelected((prev) =>
      prev.includes(name) ? prev.filter((a) => a !== name) : [...prev, name]
    );
  };

  const handleAddItemRow = () => {
    setCustomInputs((prev) => [...prev, '']);
  };

  const handleCustomInputChange = (text: string, index: number) => {
    setCustomInputs((prev) => prev.map((v, i) => (i === index ? text : v)));
  };

  const handleRemoveCustomRow = (index: number) => {
    setCustomInputs((prev) => prev.filter((_, i) => i !== index));
  };

  const handleCancelModal = () => {
    setCustomInputs(['']);
    setShowAddModal(false);
  };

  const handleConfirmAdd = () => {
    const newAmenities = customInputs
      .map((v) => v.trim())
      .filter((v) => v.length > 0 && !selected.includes(v));
    setSelected((prev) => [...prev, ...newAmenities]);
    setCustomInputs(['']);
    setShowAddModal(false);
  };

  const canAddFromModal = customInputs.some((v) => v.trim().length > 0);

  const handleContinue = () => {
    dispatch(updateListingData({ amenities: selected }));
    dispatch(setStep(4));
    router.push('/host/create-listing/pricing');
  };

  // Combine default amenities + any already-selected custom ones so they render as toggle-able chips too
  const allChips = [
    ...DEFAULT_AMENITIES,
    ...selected.filter((a) => !DEFAULT_AMENITIES.includes(a)),
  ];

  return (
    <View style={s.root}>
      <SafeAreaView edges={['top']} style={s.safeTop} />

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={s.scroll}>
        <View style={s.headerRow}>
          <TouchableOpacity onPress={() => router.back()} style={s.backBtn}>
            <Feather name="arrow-left" size={20} color="#020203" />
          </TouchableOpacity>
          <View style={s.progressTrack}>
            <View style={[s.progressFill, { width: `${(listing.step / listing.totalSteps) * 100}%` }]} />
          </View>
          <Text style={s.progressLabel}>{listing.step}/{listing.totalSteps}</Text>
        </View>

        <Text style={s.title}>What does your space offer?</Text>
        <Text style={s.subtitle}>Select the amenities available for guests.</Text>

        <View style={s.chipWrap}>
          {allChips.map((item) => {
            const isSelected = selected.includes(item);
            return (
              <TouchableOpacity
                key={item}
                style={[s.chip, isSelected && s.chipSelected]}
                onPress={() => toggleAmenity(item)}
              >
                <Text style={[s.chipText, isSelected && s.chipTextSelected]}>{item}</Text>
              </TouchableOpacity>
            );
          })}

          <TouchableOpacity style={s.addMoreChip} onPress={() => setShowAddModal(true)}>
            <Text style={s.addMoreText}>Add more</Text>
            <Feather name="plus" size={14} color="#6200EE" />
          </TouchableOpacity>
        </View>

        <View style={{ height: 100 }} />
      </ScrollView>

      <View style={s.footer}>
        <TouchableOpacity style={s.continueBtn} onPress={handleContinue}>
          <Text style={s.continueBtnText}>Continue</Text>
        </TouchableOpacity>
      </View>

      {/* Add Amenities modal */}
      <Modal visible={showAddModal} transparent animationType="slide" onRequestClose={handleCancelModal}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={s.modalOverlay}
        >
          <View style={s.modalSheet}>
            <View style={s.modalHandle} />
            <Text style={s.modalTitle}>Add amenities</Text>

            <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 260 }}>
              {customInputs.map((value, index) => (
                <View key={index} style={s.modalInputRow}>
                  <TextInput
                    style={s.modalInput}
                    placeholder="Enter amenities name"
                    placeholderTextColor="#C0C0C0"
                    value={value}
                    onChangeText={(t) => handleCustomInputChange(t, index)}
                  />
                  <TouchableOpacity onPress={() => handleRemoveCustomRow(index)} hitSlop={8}>
                    <Feather name="trash-2" size={18} color="#EF4444" />
                  </TouchableOpacity>
                </View>
              ))}
            </ScrollView>

            <TouchableOpacity style={s.addItemRow} onPress={handleAddItemRow}>
              <Feather name="plus" size={14} color="#6200EE" />
              <Text style={s.addItemText}>Add item</Text>
            </TouchableOpacity>

            <View style={s.modalBtnRow}>
              <TouchableOpacity style={s.modalCancelBtn} onPress={handleCancelModal}>
                <Text style={s.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[s.modalAddBtn, !canAddFromModal && s.modalAddBtnDisabled]}
                onPress={handleConfirmAdd}
                disabled={!canAddFromModal}
              >
                <Text style={s.modalAddText}>Add</Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#FFFFFF' },
  safeTop: { backgroundColor: '#FFFFFF' },
  scroll: { paddingHorizontal: 16 },

  headerRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 16 },
  backBtn: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: '#F2F4F7', alignItems: 'center', justifyContent: 'center',
  },
  progressTrack: {
    flex: 1, height: 4, borderRadius: 2, backgroundColor: '#EDE7F6', overflow: 'hidden',
  },
  progressFill: { height: 4, backgroundColor: '#6200EE', borderRadius: 2 },
  progressLabel: { fontFamily: 'Inter-Regular', fontSize: 12, color: '#98A2B3' },

  title: { fontFamily: 'MonaSans-Bold', fontSize: 18, color: '#020203', marginTop: 8 },
  subtitle: { fontFamily: 'Inter-Regular', fontSize: 13, color: '#6A7181', marginTop: 4 },

  chipWrap: {
    flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 20,
  },
  chip: {
    borderWidth: 1, borderColor: '#E4E7EC', borderRadius: 99,
    paddingHorizontal: 16, paddingVertical: 10,
  },
  chipSelected: { backgroundColor: '#6200EE', borderColor: '#6200EE' },
  chipText: { fontFamily: 'Inter-Regular', fontSize: 13, color: '#3A414E' },
  chipTextSelected: { color: '#FFFFFF', fontWeight: '600' },

  addMoreChip: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    borderWidth: 1, borderColor: '#E4E7EC', borderRadius: 99,
    paddingHorizontal: 16, paddingVertical: 10,
  },
  addMoreText: { fontFamily: 'Inter-Regular', fontSize: 13, color: '#6200EE', fontWeight: '600' },

  footer: {
    paddingHorizontal: 16, paddingBottom: 36, paddingTop: 12,
    borderTopWidth: 1, borderTopColor: '#F2F4F7', backgroundColor: '#FFFFFF',
  },
  continueBtn: {
    backgroundColor: '#6200EE', borderRadius: 99, height: 52,
    alignItems: 'center', justifyContent: 'center',
  },
  continueBtnText: { color: '#FFFFFF', fontFamily: 'Inter-Regular', fontWeight: '600', fontSize: 15 },

  modalOverlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(2,2,3,0.5)' },
  modalSheet: {
    backgroundColor: '#FFFFFF', borderTopLeftRadius: 24, borderTopRightRadius: 24,
    paddingHorizontal: 20, paddingTop: 12, paddingBottom: 32,
  },
  modalHandle: {
    width: 40, height: 4, borderRadius: 2, backgroundColor: '#E4E7EC',
    alignSelf: 'center', marginBottom: 16,
  },
  modalTitle: { fontFamily: 'MonaSans-Bold', fontSize: 17, color: '#020203', textAlign: 'center', marginBottom: 16 },

  modalInputRow: {
    flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 12,
  },
  modalInput: {
    flex: 1, borderWidth: 1, borderColor: '#E4E7EC', borderRadius: 12,
    paddingHorizontal: 14, paddingVertical: 12,
    fontFamily: 'Inter-Regular', fontSize: 14, color: '#020203',
  },

  addItemRow: {
    flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 8, marginBottom: 20,
  },
  addItemText: { fontFamily: 'Inter-Regular', fontSize: 13, color: '#6200EE', fontWeight: '600' },

  modalBtnRow: { flexDirection: 'row', gap: 12 },
  modalCancelBtn: {
    flex: 1, borderWidth: 1, borderColor: '#E4E7EC', borderRadius: 99, height: 50,
    alignItems: 'center', justifyContent: 'center',
  },
  modalCancelText: { fontFamily: 'Inter-Regular', fontWeight: '600', fontSize: 14, color: '#020203' },
  modalAddBtn: {
    flex: 1, backgroundColor: '#6200EE', borderRadius: 99, height: 50,
    alignItems: 'center', justifyContent: 'center',
  },
  modalAddBtnDisabled: { backgroundColor: '#C4B5FD' },
  modalAddText: { fontFamily: 'Inter-Regular', fontWeight: '600', fontSize: 14, color: '#FFFFFF' },
});
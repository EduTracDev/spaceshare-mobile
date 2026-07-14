import { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Modal,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useSelector, useDispatch } from 'react-redux';
import { RootState } from '@/store';
import { setStep, updateListingData } from '@/store/slices/createListingSlice';

const { width } = Dimensions.get('window');

const CATEGORIES = ['Rooftop', 'Gardens', 'Studio', 'Open Space', 'Halls', 'Lounges', 'Apartment'];

export default function CreateListingStep1() {
  const dispatch = useDispatch();
  const listing = useSelector((state: RootState) => state.createListing);

  // TODO: replace with real check once hasBankDetails exists on user/host profile
  const hasBankDetails = false;
  const [showBankGateModal, setShowBankGateModal] = useState(!hasBankDetails);

  const [spaceName, setSpaceName] = useState(listing.spaceName);
  const [spaceCategory, setSpaceCategory] = useState(listing.spaceCategory);
  const [addressLine, setAddressLine] = useState(listing.addressLine);
  const [area, setArea] = useState(listing.area);
  const [description, setDescription] = useState(listing.description);
  const [showCategoryDropdown, setShowCategoryDropdown] = useState(false);

  const canContinue =
    spaceName.trim().length > 0 &&
    spaceCategory.trim().length > 0 &&
    addressLine.trim().length > 0 &&
    area.trim().length > 0 &&
    description.trim().length > 0;

  const handleContinue = () => {
    if (!canContinue) return;
    dispatch(updateListingData({ spaceName, spaceCategory, addressLine, area, description }));
    dispatch(setStep(2));
    router.push('/host/create-listing/photos');
  };

  const handleBankModalOkay = () => {
  setShowBankGateModal(false);
};

  return (
    <View style={s.root}>
      <SafeAreaView edges={['top']} style={s.safeTop} />

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={s.scroll}
          keyboardShouldPersistTaps="handled"
        >
          <View style={s.headerRow}>
            <TouchableOpacity onPress={() => router.back()} style={s.backBtn}>
              <Feather name="arrow-left" size={20} color="#020203" />
            </TouchableOpacity>
            <View style={s.progressTrack}>
              <View style={[s.progressFill, { width: `${(listing.step / listing.totalSteps) * 100}%` }]} />
            </View>
            <Text style={s.progressLabel}>{listing.step}/{listing.totalSteps}</Text>
          </View>

          <Text style={s.title}>Tell us about your space</Text>
          <Text style={s.subtitle}>Help guests understand the type of space you're listing.</Text>

          <View style={s.form}>
            <View style={s.fieldWrap}>
              <Text style={s.label}>Space Name</Text>
              <TextInput
                style={s.input}
                value={spaceName}
                onChangeText={setSpaceName}
                placeholder="e.g. Elegant Rooftop"
                placeholderTextColor="#C0C0C0"
              />
            </View>

            <View style={s.fieldWrap}>
              <Text style={s.label}>Space Category</Text>
              <TouchableOpacity
                style={s.dropdownTrigger}
                onPress={() => setShowCategoryDropdown((prev) => !prev)}
              >
                <Text style={spaceCategory ? s.dropdownValue : s.dropdownPlaceholder}>
                  {spaceCategory || 'Select your space type'}
                </Text>
                <Feather name={showCategoryDropdown ? 'chevron-up' : 'chevron-down'} size={18} color="#6A7181" />
              </TouchableOpacity>

              {showCategoryDropdown && (
                <View style={s.dropdownList}>
                  {CATEGORIES.map((cat) => (
                    <TouchableOpacity
                      key={cat}
                      style={s.dropdownItem}
                      onPress={() => {
                        setSpaceCategory(cat);
                        setShowCategoryDropdown(false);
                      }}
                    >
                      <Text style={s.dropdownItemText}>{cat}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            </View>

            <View style={s.fieldWrap}>
              <Text style={s.label}>Space Location</Text>
              <TextInput
                style={s.input}
                value={addressLine}
                onChangeText={setAddressLine}
                placeholder="12 Admiralty Way"
                placeholderTextColor="#C0C0C0"
              />
              <TextInput
                style={[s.input, { marginTop: 8 }]}
                value={area}
                onChangeText={setArea}
                placeholder="Lekki Phase 1, Lagos"
                placeholderTextColor="#C0C0C0"
              />
            </View>

            <View style={s.fieldWrap}>
              <Text style={s.label}>Description</Text>
              <TextInput
                style={[s.input, s.textArea]}
                value={description}
                onChangeText={setDescription}
                placeholder="Tell guest what make your space special..."
                placeholderTextColor="#C0C0C0"
                multiline
                numberOfLines={4}
                textAlignVertical="top"
              />
            </View>
          </View>

          <View style={{ height: 100 }} />
        </ScrollView>
      </KeyboardAvoidingView>

      <View style={s.footer}>
        <TouchableOpacity
          style={[s.continueBtn, !canContinue && s.continueBtnDisabled]}
          onPress={handleContinue}
          disabled={!canContinue}
        >
          <Text style={s.continueBtnText}>Continue</Text>
        </TouchableOpacity>
      </View>

      {/* Bank details gate modal */}
      <Modal
        visible={showBankGateModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowBankGateModal(false)}
      >
        <View style={s.modalOverlay}>
          <View style={s.modalCard}>
            <Text style={s.modalTitle}>Add Your Bank Details</Text>
            <Text style={s.modalSubtitle}>
              Set up your payout account in the Profile section to receive payments for completed bookings without delays.
            </Text>
            <TouchableOpacity style={s.modalBtn} onPress={handleBankModalOkay}>
              <Text style={s.modalBtnText}>Okay</Text>
            </TouchableOpacity>
          </View>
        </View>
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

  form: { gap: 16, marginTop: 20 },
  fieldWrap: { gap: 6 },
  label: { fontFamily: 'Inter-Regular', fontSize: 13, color: '#3A414E' },
  input: {
    borderWidth: 1, borderColor: '#E4E7EC', borderRadius: 12,
    paddingHorizontal: 14, paddingVertical: 14,
    fontFamily: 'Inter-Regular', fontSize: 15, color: '#020203',
  },
  textArea: { minHeight: 100 },

  dropdownTrigger: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    borderWidth: 1, borderColor: '#E4E7EC', borderRadius: 12,
    paddingHorizontal: 14, paddingVertical: 14,
  },
  dropdownValue: { fontFamily: 'Inter-Regular', fontSize: 15, color: '#020203' },
  dropdownPlaceholder: { fontFamily: 'Inter-Regular', fontSize: 15, color: '#C0C0C0' },
  dropdownList: {
    borderWidth: 1, borderColor: '#E4E7EC', borderRadius: 12, marginTop: 6, overflow: 'hidden',
  },
  dropdownItem: {
    paddingHorizontal: 14, paddingVertical: 12,
    borderBottomWidth: 1, borderBottomColor: '#F2F4F7',
  },
  dropdownItemText: { fontFamily: 'Inter-Regular', fontSize: 14, color: '#3A414E' },

  footer: {
    paddingHorizontal: 16, paddingBottom: 36, paddingTop: 12,
    borderTopWidth: 1, borderTopColor: '#F2F4F7', backgroundColor: '#FFFFFF',
  },
  continueBtn: {
    backgroundColor: '#6200EE', borderRadius: 99, height: 52,
    alignItems: 'center', justifyContent: 'center',
  },
  continueBtnDisabled: { backgroundColor: '#C4B5FD' },
  continueBtnText: { color: '#FFFFFF', fontFamily: 'Inter-Regular', fontWeight: '600', fontSize: 15 },

  modalOverlay: {
    flex: 1, backgroundColor: 'rgba(2,2,3,0.5)',
    alignItems: 'center', justifyContent: 'center', paddingHorizontal: 24,
  },
  modalCard: {
    width: width - 48, backgroundColor: '#FFFFFF', borderRadius: 16,
    padding: 20, gap: 12,
  },
  modalTitle: { fontFamily: 'MonaSans-Bold', fontSize: 16, color: '#020203' },
  modalSubtitle: { fontFamily: 'Inter-Regular', fontSize: 13, color: '#3A414E', lineHeight: 19 },
  modalBtn: {
    alignSelf: 'flex-start', backgroundColor: '#6200EE', borderRadius: 99,
    paddingHorizontal: 24, paddingVertical: 10, marginTop: 4,
  },
  modalBtnText: { color: '#FFFFFF', fontFamily: 'Inter-Regular', fontWeight: '600', fontSize: 14 },
});
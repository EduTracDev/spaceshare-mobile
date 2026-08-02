import { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Modal,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useSelector, useDispatch } from 'react-redux';
import { RootState } from '@/store';
import { resetListing } from '@/store/slices/createListingSlice';
import { listingsAPI } from '@/services/api';

const CHECKLIST_ITEMS = [
  { key: 'spaceName', label: 'Space Details' },
  { key: 'photos', label: 'Photo' },
  { key: 'amenities', label: 'Amenities' },
  { key: 'pricing', label: 'Pricing' },
  { key: 'addOns', label: 'Add-ons' },
  { key: 'hostRules', label: 'House Rules' },
  { key: 'availability', label: 'Availability' },
];

export default function CreateListingReview() {
  const dispatch = useDispatch();
  const listing = useSelector((state: RootState) => state.createListing);
  const token = useSelector((state: RootState) => state.auth.token);

  const [submitting, setSubmitting] = useState(false);
  const [successModal, setSuccessModal] = useState(false);
  const [submitError, setSubmitError] = useState('');

  const isChecked = (key: string) => {
    switch (key) {
      case 'spaceName': return listing.spaceName.trim().length > 0;
      case 'photos': return listing.photos.length > 0;
      case 'amenities': return listing.amenities.length > 0;
      case 'pricing':
        return listing.spacePrice.trim().length > 0;
      case 'addOns': return true; // optional
      case 'hostRules': return listing.hostRules.trim().length > 0;
      case 'availability': return listing.startTime.trim().length > 0 && listing.endTime.trim().length > 0;
      default: return false;
    }
  };

  const handleSubmit = async () => {
    if (!token) {
      setSubmitError('You must be logged in to submit a listing.');
      return;
    }
    setSubmitError('');
    setSubmitting(true);
    try {
      await listingsAPI.create(token, {
        spaceName: listing.spaceName,
        spaceCategory: listing.spaceCategory,
        addressLine: listing.addressLine,
        area: listing.area,
        description: listing.description,
        photos: listing.photos,
        amenities: listing.amenities,
        spaceCapacity: listing.spaceCapacity,
        spacePrice: listing.spacePrice,
        addOns: listing.addOns,
        hostRules: listing.hostRules,
        parkingInstruction: listing.parkingInstruction,
        startTime: listing.startTime,
        endTime: listing.endTime,
        unavailableDates: listing.unavailableDates,
      });
      setSuccessModal(true);
    } catch (err: any) {
      setSubmitError(err?.response?.data?.message ?? 'Unable to submit listing. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleGoToListing = () => {
    setSuccessModal(false);
    dispatch(resetListing());
    router.replace('/host/my-listings');
  };

  const handleBackToHome = () => {
    setSuccessModal(false);
    dispatch(resetListing());
    router.replace('/host/home');
  };

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

        <Text style={s.title}>Review your listing</Text>
        <Text style={s.subtitle}>Check your listing details before publishing your space.</Text>

        <View style={s.checklist}>
          {CHECKLIST_ITEMS.map((item) => {
            const done = isChecked(item.key);
            return (
              <View key={item.key} style={s.checklistRow}>
                <Feather
                  name={done ? 'check-circle' : 'circle'}
                  size={18}
                  color={done ? '#16A34A' : '#D0D5DD'}
                />
                <Text style={s.checklistLabel}>{item.label}</Text>
              </View>
            );
          })}
        </View>

        <View style={s.pendingBanner}>
          <Feather name="info" size={14} color="#B54708" />
          <Text style={s.pendingText}>Your listing will be marked as Pending approval until our team verifies it.</Text>
        </View>

        {submitError ? (
          <View style={s.errorBanner}>
            <Feather name="alert-circle" size={14} color="#EF4444" />
            <Text style={s.errorBannerTitle}>Unable to submit listing</Text>
          </View>
        ) : null}

        <View style={{ height: 100 }} />
      </ScrollView>

      <View style={s.footer}>
        <TouchableOpacity
          style={s.submitBtn}
          onPress={handleSubmit}
          disabled={submitting}
        >
          {submitting ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text style={s.submitBtnText}>
              {submitError ? 'Publish Listing' : 'Submit for Approval'}
            </Text>
          )}
        </TouchableOpacity>
      </View>

      {/* Success modal */}
     {/* Success modal — bottom sheet, half screen */}
      <Modal visible={successModal} transparent animationType="slide">
        <View style={s.modalOverlaySheet}>
          <View style={s.modalSheetCard}>
            <TouchableOpacity style={s.modalClose} onPress={() => setSuccessModal(false)} hitSlop={8}>
              <Feather name="x" size={18} color="#6A7181" />
            </TouchableOpacity>
            <View style={s.successIconCircle}>
              <Feather name="check" size={28} color="#FFFFFF" />
            </View>
            <Text style={s.successTitle}>Listing submitted successfully</Text>
            <Text style={s.successBody}>
              Your space has been submitted for review. You'll be notified once it is approved and visible to guests.
            </Text>
            <View style={s.successBtnRow}>
              <TouchableOpacity style={s.backHomeBtn} onPress={handleBackToHome}>
                <Text style={s.backHomeText}>Back to Home</Text>
              </TouchableOpacity>
              <TouchableOpacity style={s.goToListingBtn} onPress={handleGoToListing}>
                <Text style={s.goToListingText}>Go to Listing</Text>
              </TouchableOpacity>
            </View>
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
  subtitle: { fontFamily: 'Inter-Regular', fontSize: 13, color: '#6A7181', marginTop: 4, marginBottom: 20 },

  checklist: { gap: 14, marginBottom: 20 },
  checklistRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  checklistLabel: { fontFamily: 'Inter-Regular', fontSize: 14, color: '#020203' },

  pendingBanner: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 8,
    backgroundColor: '#FFFAEB', borderWidth: 1, borderColor: '#FEDF89',
    borderRadius: 12, padding: 12,
  },
  pendingText: { flex: 1, fontFamily: 'Inter-Regular', fontSize: 12, color: '#B54708', lineHeight: 17 },

  errorBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: '#FEF3F2', borderWidth: 1, borderColor: '#FDA29B',
    borderRadius: 12, padding: 12, marginTop: 14,
  },
  errorBannerTitle: { fontFamily: 'Inter-Regular', fontSize: 13, color: '#B42318', fontWeight: '600' },

  footer: {
    paddingHorizontal: 16, paddingBottom: 36, paddingTop: 12,
    borderTopWidth: 1, borderTopColor: '#F2F4F7', backgroundColor: '#FFFFFF',
  },
  submitBtn: {
    backgroundColor: '#6200EE', borderRadius: 99, height: 52,
    alignItems: 'center', justifyContent: 'center',
  },
  submitBtnText: { color: '#FFFFFF', fontFamily: 'Inter-Regular', fontWeight: '600', fontSize: 15 },

 modalOverlaySheet: {
    flex: 1, backgroundColor: 'rgba(2,2,3,0.5)', justifyContent: 'flex-end',
  },
  modalSheetCard: {
    width: '100%', minHeight: '50%', backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24, borderTopRightRadius: 24,
    padding: 24, paddingTop: 40, alignItems: 'center', justifyContent: 'center', gap: 4, position: 'relative',
  },
  modalClose: { position: 'absolute', top: 12, right: 12, zIndex: 1 },
  successIconCircle: {
    width: 64, height: 64, borderRadius: 32, backgroundColor: '#16A34A',
    alignItems: 'center', justifyContent: 'center', marginBottom: 8,
  },
  successTitle: { fontFamily: 'MonaSans-Bold', fontSize: 17, color: '#020203', textAlign: 'center' },
  successBody: {
    fontFamily: 'Inter-Regular', fontSize: 13, color: '#6A7181',
    textAlign: 'center', lineHeight: 20, marginTop: 6, marginBottom: 20,
  },
  successBtnRow: { flexDirection: 'row', gap: 10, width: '100%' },
  backHomeBtn: {
    flex: 1, borderWidth: 1, borderColor: '#E4E7EC', borderRadius: 99, height: 50,
    alignItems: 'center', justifyContent: 'center',
  },
  backHomeText: { fontFamily: 'Inter-Regular', fontWeight: '600', fontSize: 14, color: '#020203' },
  goToListingBtn: {
    flex: 1, backgroundColor: '#6200EE', borderRadius: 99, height: 50,
    alignItems: 'center', justifyContent: 'center',
  },
  goToListingText: { fontFamily: 'Inter-Regular', fontWeight: '600', fontSize: 14, color: '#FFFFFF' },
});
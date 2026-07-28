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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useSelector, useDispatch } from 'react-redux';
import { RootState } from '@/store';
import { setStep, updateListingData } from '@/store/slices/createListingSlice';
import type { PricingTier } from '@/store/slices/createListingSlice';

export default function CreateListingPricing() {
  const dispatch = useDispatch();
  const listing = useSelector((state: RootState) => state.createListing);

  const [spaceCapacity, setSpaceCapacity] = useState(listing.spaceCapacity);
  const [pricingModel, setPricingModel] = useState<'FIXED' | 'ATTENDEE_TIER'>(listing.pricingModel);
  const [spacePrice, setSpacePrice] = useState(listing.spacePrice);
  const [attendeeTiers, setAttendeeTiers] = useState<PricingTier[]>(listing.attendeeTiers);

  const handleAddTier = () => {
    setAttendeeTiers((prev) => [...prev, { minGuests: '', maxGuests: '', price: '' }]);
  };

  const handleTierChange = (index: number, field: keyof PricingTier, value: string) => {
    setAttendeeTiers((prev) =>
      prev.map((tier, i) => (i === index ? { ...tier, [field]: value } : tier))
    );
  };

  const handleRemoveTier = (index: number) => {
    setAttendeeTiers((prev) => prev.filter((_, i) => i !== index));
  };

  const canContinue =
    spaceCapacity.trim().length > 0 &&
    (pricingModel === 'FIXED'
      ? spacePrice.trim().length > 0
      : attendeeTiers.length > 0 &&
        attendeeTiers.every(
          (t) => t.minGuests.trim() && t.maxGuests.trim() && t.price.trim()
        ));

  const handleContinue = () => {
    if (!canContinue) return;
    dispatch(
      updateListingData({
        spaceCapacity,
        pricingModel,
        spacePrice,
        attendeeTiers,
      })
    );
    dispatch(setStep(5));
    router.push('/host/create-listing/addons');
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

          <Text style={s.title}>Set your pricing</Text>
          <Text style={s.subtitle}>Choose how much guests will pay to book your space.</Text>

          <View style={s.fieldWrap}>
            <Text style={s.label}>Space Capacity</Text>
            <TextInput
              style={s.input}
              value={spaceCapacity}
              onChangeText={setSpaceCapacity}
              placeholder="0"
              placeholderTextColor="#C0C0C0"
              keyboardType="number-pad"
            />
          </View>

          <View style={s.fieldWrap}>
            <Text style={s.label}>Pricing model</Text>
            <View style={s.toggleRow}>
              <TouchableOpacity
                style={[s.toggleBtn, pricingModel === 'FIXED' && s.toggleBtnActive]}
                onPress={() => setPricingModel('FIXED')}
              >
                <Text style={[s.toggleText, pricingModel === 'FIXED' && s.toggleTextActive]}>
                  Fixed Price
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[s.toggleBtn, pricingModel === 'ATTENDEE_TIER' && s.toggleBtnActive]}
                onPress={() => setPricingModel('ATTENDEE_TIER')}
              >
                <Text style={[s.toggleText, pricingModel === 'ATTENDEE_TIER' && s.toggleTextActive]}>
                  Attendee Tier
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {pricingModel === 'FIXED' ? (
            <>
              <Text style={s.hintText}>One flat day-rate, regardless of guest count.</Text>
              <View style={s.fieldWrap}>
                <Text style={s.label}>Space Price (₦)</Text>
                <TextInput
                  style={s.input}
                  value={spacePrice}
                  onChangeText={setSpacePrice}
                  placeholder="0"
                  placeholderTextColor="#C0C0C0"
                  keyboardType="number-pad"
                />
              </View>
            </>
          ) : (
            <>
              <Text style={s.hintText}>Price varies by number of attendees.</Text>

              {attendeeTiers.map((tier, index) => {
                const exampleGuests = tier.maxGuests.trim();
                const exampleTotal = tier.price.trim();
                const showExample = exampleGuests.length > 0 && exampleTotal.length > 0;

                return (
                  <View key={index} style={s.tierCard}>
                    <View style={s.tierRow}>
                      <View style={s.tierCol}>
                        <Text style={s.smallLabel}>From</Text>
                        <TextInput
                          style={s.input}
                          value={tier.minGuests}
                          onChangeText={(t) => handleTierChange(index, 'minGuests', t)}
                          placeholder="1"
                          placeholderTextColor="#C0C0C0"
                          keyboardType="number-pad"
                        />
                      </View>
                      <View style={s.tierCol}>
                        <Text style={s.smallLabel}>To</Text>
                        <TextInput
                          style={s.input}
                          value={tier.maxGuests}
                          onChangeText={(t) => handleTierChange(index, 'maxGuests', t)}
                          placeholder="50"
                          placeholderTextColor="#C0C0C0"
                          keyboardType="number-pad"
                        />
                      </View>
                      <TouchableOpacity
                        onPress={() => handleRemoveTier(index)}
                        hitSlop={8}
                        style={s.tierDeleteBtn}
                      >
                        <Feather name="trash-2" size={16} color="#EF4444" />
                      </TouchableOpacity>
                    </View>

                    <View style={s.fieldWrapTight}>
                      <Text style={s.smallLabel}>Total for this tier (₦)</Text>
                      <TextInput
                        style={s.input}
                        value={tier.price}
                        onChangeText={(t) => handleTierChange(index, 'price', t)}
                        placeholder="0"
                        placeholderTextColor="#C0C0C0"
                        keyboardType="number-pad"
                      />
                      {showExample && (
                        <Text style={s.exampleText}>
                          Example: {exampleGuests} guests = ₦{Number(exampleTotal).toLocaleString()}
                        </Text>
                      )}
                    </View>
                  </View>
                );
              })}

              <TouchableOpacity style={s.addTierBtn} onPress={handleAddTier}>
                <Feather name="plus" size={14} color="#6200EE" />
                <Text style={s.addTierText}>Add Tier</Text>
              </TouchableOpacity>
            </>
          )}

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

  fieldWrap: { gap: 6, marginBottom: 16 },
  fieldWrapTight: { gap: 6 },
  label: { fontFamily: 'Inter-Regular', fontSize: 13, color: '#3A414E' },
  smallLabel: { fontFamily: 'Inter-Regular', fontSize: 12, color: '#6A7181' },
  input: {
    borderWidth: 1, borderColor: '#E4E7EC', borderRadius: 12,
    paddingHorizontal: 14, paddingVertical: 14,
    fontFamily: 'Inter-Regular', fontSize: 15, color: '#020203',
  },

  toggleRow: {
    flexDirection: 'row', backgroundColor: '#F2F4F7', borderRadius: 12, padding: 4, gap: 4,
  },
  toggleBtn: {
    flex: 1, borderRadius: 10, paddingVertical: 10, alignItems: 'center',
  },
  toggleBtnActive: { backgroundColor: '#FFFFFF' },
  toggleText: { fontFamily: 'Inter-Regular', fontSize: 13, color: '#98A2B3' },
  toggleTextActive: { color: '#020203', fontWeight: '600' },

  hintText: {
    fontFamily: 'Inter-Regular', fontSize: 12, color: '#98A2B3', marginBottom: 12,
  },

  tierCard: {
    borderWidth: 1, borderColor: '#F2F4F7', borderRadius: 14,
    padding: 14, marginBottom: 14, gap: 4,
  },
  tierRow: { flexDirection: 'row', gap: 12, alignItems: 'flex-end' },
  tierCol: { flex: 1, gap: 6, marginBottom: 10 },
  tierDeleteBtn: { paddingBottom: 14, paddingLeft: 4 },
  exampleText: {
    fontFamily: 'Inter-Regular', fontSize: 11, color: '#98A2B3', marginTop: 2,
  },

  addTierBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    borderWidth: 1, borderColor: '#E4E7EC', borderStyle: 'dashed', borderRadius: 12,
    paddingVertical: 14, marginTop: 4,
  },
  addTierText: { fontFamily: 'Inter-Regular', fontSize: 14, color: '#6200EE', fontWeight: '600' },

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
});
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

export default function CreateListingRules() {
  const dispatch = useDispatch();
  const listing = useSelector((state: RootState) => state.createListing);

  const [hostRules, setHostRules] = useState(listing.hostRules);
  const [parkingInstruction, setParkingInstruction] = useState(listing.parkingInstruction);

  const canContinue = hostRules.trim().length > 0;

  const handleContinue = () => {
    if (!canContinue) return;
    dispatch(updateListingData({ hostRules, parkingInstruction }));
    dispatch(setStep(7));
    router.push('/host/create-listing/availability');
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

          <Text style={s.title}>Add host rules</Text>
          <Text style={s.subtitle}>Let guests know what is allowed before they book your space.</Text>

          <View style={s.fieldWrap}>
            <Text style={s.label}>Host Rules</Text>
            <TextInput
              style={[s.input, s.textArea]}
              value={hostRules}
              onChangeText={setHostRules}
              placeholder="e.g. No loud music after 10 PM"
              placeholderTextColor="#C0C0C0"
              multiline
              numberOfLines={4}
              textAlignVertical="top"
            />
            <Text style={s.hintText}>Use commas to separate your house rules</Text>
          </View>

          <View style={s.fieldWrap}>
            <Text style={s.label}>Parking Instruction</Text>
            <TextInput
              style={[s.input, s.textArea]}
              value={parkingInstruction}
              onChangeText={setParkingInstruction}
              placeholder="e.g. Overnight parking is not permitted"
              placeholderTextColor="#C0C0C0"
              multiline
              numberOfLines={4}
              textAlignVertical="top"
            />
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

  fieldWrap: { gap: 6, marginBottom: 20 },
  label: { fontFamily: 'Inter-Regular', fontSize: 13, color: '#3A414E' },
  input: {
    borderWidth: 1, borderColor: '#E4E7EC', borderRadius: 12,
    paddingHorizontal: 14, paddingVertical: 14,
    fontFamily: 'Inter-Regular', fontSize: 15, color: '#020203',
  },
  textArea: { minHeight: 90 },
  hintText: { fontFamily: 'Inter-Regular', fontSize: 11, color: '#98A2B3', marginTop: 4 },

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
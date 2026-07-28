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
import type { AddOnItem } from '@/store/slices/createListingSlice';

export default function CreateListingAddOns() {
  const dispatch = useDispatch();
  const listing = useSelector((state: RootState) => state.createListing);

  const [addOns, setAddOns] = useState<AddOnItem[]>(
    listing.addOns.length > 0 ? listing.addOns : [{ name: '', unitPrice: '', available: '' }]
  );

  const handleAddItem = () => {
    setAddOns((prev) => [...prev, { name: '', unitPrice: '', available: '' }]);
  };

  const handleChange = (index: number, field: keyof AddOnItem, value: string) => {
    setAddOns((prev) =>
      prev.map((item, i) => (i === index ? { ...item, [field]: value } : item))
    );
  };

  const handleRemove = (index: number) => {
    setAddOns((prev) => prev.filter((_, i) => i !== index));
  };

  const validAddOns = addOns.filter(
    (a) => a.name.trim() || a.unitPrice.trim() || a.available.trim()
  );
  // Add-ons are optional, so Continue is always enabled — but if any row is partially
  // filled, all three fields in that row must be filled before continuing.
  const canContinue = validAddOns.every(
    (a) => a.name.trim() && a.unitPrice.trim() && a.available.trim()
  );

  const handleContinue = () => {
    if (!canContinue) return;
    dispatch(updateListingData({ addOns: validAddOns }));
    dispatch(setStep(6));
    router.push('/host/create-listing/rules');
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

          <Text style={s.title}>Add-ons</Text>
          <Text style={s.subtitle}>Offer optional services guests can rest to include during booking.</Text>

          {addOns.map((item, index) => (
            <View key={index} style={s.itemCard}>
              <TouchableOpacity
                onPress={() => handleRemove(index)}
                hitSlop={8}
                style={s.itemDeleteBtn}
              >
                <Feather name="trash-2" size={16} color="#EF4444" />
              </TouchableOpacity>

              <View style={s.fieldWrap}>
                <Text style={s.label}>Name</Text>
                <TextInput
                  style={s.input}
                  value={item.name}
                  onChangeText={(t) => handleChange(index, 'name', t)}
                  placeholder="Tiffany Chair"
                  placeholderTextColor="#C0C0C0"
                />
              </View>

              <View style={s.rowFields}>
                <View style={s.rowCol}>
                  <Text style={s.label}>Unit Price (₦)</Text>
                  <TextInput
                    style={s.input}
                    value={item.unitPrice}
                    onChangeText={(t) => handleChange(index, 'unitPrice', t)}
                    placeholder="1,500"
                    placeholderTextColor="#C0C0C0"
                    keyboardType="number-pad"
                  />
                </View>
                <View style={s.rowCol}>
                  <Text style={s.label}>Available</Text>
                  <TextInput
                    style={s.input}
                    value={item.available}
                    onChangeText={(t) => handleChange(index, 'available', t)}
                    placeholder="5"
                    placeholderTextColor="#C0C0C0"
                    keyboardType="number-pad"
                  />
                </View>
              </View>
            </View>
          ))}

          <TouchableOpacity style={s.addItemBtn} onPress={handleAddItem}>
            <Feather name="plus" size={14} color="#6200EE" />
            <Text style={s.addItemText}>Add another item</Text>
          </TouchableOpacity>

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

  itemCard: {
    borderWidth: 1, borderColor: '#F2F4F7', borderRadius: 14,
    padding: 14, marginBottom: 14, gap: 4, position: 'relative',
  },
  itemDeleteBtn: { position: 'absolute', top: 12, right: 12, zIndex: 1 },

  fieldWrap: { gap: 6, marginBottom: 12 },
  label: { fontFamily: 'Inter-Regular', fontSize: 13, color: '#3A414E' },
  input: {
    borderWidth: 1, borderColor: '#E4E7EC', borderRadius: 12,
    paddingHorizontal: 14, paddingVertical: 14,
    fontFamily: 'Inter-Regular', fontSize: 15, color: '#020203',
  },
  rowFields: { flexDirection: 'row', gap: 12 },
  rowCol: { flex: 1, gap: 6 },

  addItemBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    paddingVertical: 12, marginTop: 4,
  },
  addItemText: { fontFamily: 'Inter-Regular', fontSize: 14, color: '#6200EE', fontWeight: '600' },

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
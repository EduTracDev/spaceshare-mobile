import { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
  Image,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { useSelector } from 'react-redux';
import { RootState } from '@/store';
import { listingsAPI } from '@/services/api';
import * as ImagePicker from 'expo-image-picker';

const DEFAULT_AMENITIES = ['Wi-Fi', 'Parking', 'AC', 'Sound System', 'Projector', 'Lighting', 'Security', 'Restroom', 'Generator'];
const SPACE_TYPES = ['Rooftop', 'Hall', 'Garden', 'Studio', 'Lounge', 'Conference Room'];

const CLOUDINARY_CLOUD_NAME = 'hodfwf8j';
const CLOUDINARY_UPLOAD_PRESET = 'spaceshare';

async function uploadToCloudinary(uri: string): Promise<string> {
  const formData = new FormData();
  formData.append('file', { uri, type: 'image/jpeg', name: 'upload.jpg' } as any);
  formData.append('upload_preset', CLOUDINARY_UPLOAD_PRESET);

  const res = await fetch(`https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`, {
    method: 'POST',
    body: formData,
  });
  const data = await res.json();
  return data.secure_url;
}

type AddOnItem = { name: string; unitPrice: string; available: string };

type SectionKey =
  | 'spaceDetails' | 'spacePhotos' | 'amenities'
  | 'pricing' | 'addOn' | 'houseRules' | 'parkingInstructions';

export default function EditListing() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const token = useSelector((state: RootState) => state.auth.token);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [toast, setToast] = useState(false);
  const [initialSnapshot, setInitialSnapshot] = useState<string>('');
  const [openSections, setOpenSections] = useState<Record<SectionKey, boolean>>({
    spaceDetails: true, spacePhotos: true, amenities: false,
    pricing: false, addOn: false, houseRules: false, parkingInstructions: false,
  });

  const [spaceName, setSpaceName] = useState('');
  const [spaceType, setSpaceType] = useState('');
  const [typeDropdownOpen, setTypeDropdownOpen] = useState(false);
  const [addressLine, setAddressLine] = useState('');
  const [area, setArea] = useState('');
  const [description, setDescription] = useState('');
  const [photos, setPhotos] = useState<string[]>([]);
  const [amenities, setAmenities] = useState<string[]>([]);
  const [spacePrice, setSpacePrice] = useState('');
  const [spaceCapacity, setSpaceCapacity] = useState('');
  const [addOns, setAddOns] = useState<AddOnItem[]>([]);
  const [hostRules, setHostRules] = useState('');
  const [parkingInstruction, setParkingInstruction] = useState('');

  useEffect(() => {
    fetchListing();
  }, [id]);

  const fetchListing = async () => {
    setLoading(true);
    try {
      const res = await listingsAPI.getById(id);
      const l = res.data.listing;
      setSpaceName(l.spaceName ?? '');
      setSpaceType(l.spaceCategory ?? '');
      setAddressLine(l.addressLine ?? '');
      setArea(l.area ?? '');
      setDescription(l.description ?? '');
      setPhotos(l.photos ?? []);
      setAmenities(l.amenities ?? []);
      setSpacePrice(l.spacePrice ? String(l.spacePrice) : '');
      setSpaceCapacity(l.spaceCapacity ? String(l.spaceCapacity) : '');
      setAddOns(l.addOns ?? []);
      setHostRules(l.hostRules ?? '');
      setParkingInstruction(l.parkingInstruction ?? '');

      // Snapshot the original state so we can detect real changes later
      setInitialSnapshot(JSON.stringify({
        spaceName: l.spaceName ?? '', spaceType: l.spaceCategory ?? '',
        addressLine: l.addressLine ?? '', area: l.area ?? '', description: l.description ?? '',
        photos: l.photos ?? [], amenities: l.amenities ?? [],
        spacePrice: l.spacePrice ? String(l.spacePrice) : '',
        spaceCapacity: l.spaceCapacity ? String(l.spaceCapacity) : '',
        addOns: l.addOns ?? [], hostRules: l.hostRules ?? '',
        parkingInstruction: l.parkingInstruction ?? '',
      }));
    } catch (err) {
      console.log('Failed to fetch listing:', err);
    } finally {
      setLoading(false);
    }
  };

  const toggleSection = (key: SectionKey) => {
    setOpenSections((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const toggleAmenity = (name: string) => {
    setAmenities((prev) =>
      prev.includes(name) ? prev.filter((a) => a !== name) : [...prev, name]
    );
  };

  const handleRemovePhoto = (index: number) => {
    setPhotos((prev) => prev.filter((_, i) => i !== index));
  };

  const handleAddPhoto = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.7,
    });
    if (result.canceled) return;
    const asset = result.assets?.[0];
    if (!asset) return;

    setUploadingPhoto(true);
    try {
      const url = await uploadToCloudinary(asset.uri);
      setPhotos((prev) => [...prev, url]);
    } catch (err) {
      console.log('Photo upload failed:', err);
    } finally {
      setUploadingPhoto(false);
    }
  };

  const handleAddOnChange = (index: number, field: keyof AddOnItem, value: string) => {
    setAddOns((prev) => prev.map((item, i) => (i === index ? { ...item, [field]: value } : item)));
  };

  const handleRemoveAddOn = (index: number) => {
    setAddOns((prev) => prev.filter((_, i) => i !== index));
  };

  const handleAddAddOnItem = () => {
    setAddOns((prev) => [...prev, { name: '', unitPrice: '', available: '' }]);
  };

  const currentSnapshot = JSON.stringify({
    spaceName, spaceType, addressLine, area, description, photos, amenities,
    spacePrice, spaceCapacity, addOns, hostRules, parkingInstruction,
  });
  const hasChanges = currentSnapshot !== initialSnapshot;
  const canSave = spaceName.trim().length > 0 && hasChanges;

  const handleSave = async () => {
    if (!canSave || !token) return;
    setSaving(true);
    try {
      await listingsAPI.update(token, id, {
        spaceName,
        spaceCategory: spaceType,
        addressLine,
        area,
        description,
        photos,
        amenities,
        spacePrice,
        spaceCapacity,
        addOns,
        hostRules,
        parkingInstruction,
      });
      setInitialSnapshot(currentSnapshot);
      setToast(true);
      setTimeout(() => {
        setToast(false);
        router.back();
      }, 1500);
    } catch (err: any) {
      console.log('Failed to save changes:', err?.response?.data?.message ?? err);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={s.center}>
        <ActivityIndicator color="#6200EE" />
      </SafeAreaView>
    );
  }

  return (
    <View style={s.root}>
      <SafeAreaView edges={['top']} style={s.safeTop} />

      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()} style={s.backBtn}>
          <Feather name="arrow-left" size={20} color="#020203" />
        </TouchableOpacity>
      </View>

      {toast && (
        <View style={s.toast}>
          <Feather name="check-circle" size={15} color="#16A34A" />
          <Text style={s.toastText}>Space updated successfully</Text>
        </View>
      )}

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={s.scroll} keyboardShouldPersistTaps="handled">
          <Text style={s.title}>Edit your space</Text>
          <Text style={s.subtitle}>
            Update your listing details to keep everything accurate and up to date.
          </Text>

          {/* SPACE DETAILS */}
          <View style={s.sectionCard}>
            <TouchableOpacity style={s.sectionHeader} onPress={() => toggleSection('spaceDetails')}>
              <Text style={s.sectionLabel}>Space Details</Text>
              <Feather name={openSections.spaceDetails ? 'chevron-up' : 'chevron-down'} size={18} color="#6A7181" />
            </TouchableOpacity>
            {openSections.spaceDetails && (
              <View style={s.sectionBody}>
                <View style={s.field}>
                  <Text style={s.label}>Space Name</Text>
                  <TextInput style={s.input} value={spaceName} onChangeText={setSpaceName} />
                </View>
                <View style={s.field}>
                  <Text style={s.label}>Space Type</Text>
                  <TouchableOpacity style={[s.input, s.dropdown]} onPress={() => setTypeDropdownOpen(!typeDropdownOpen)}>
                    <Text style={s.dropdownValue}>{spaceType || 'Select type'}</Text>
                    <Feather name={typeDropdownOpen ? 'chevron-up' : 'chevron-down'} size={16} color="#6A7181" />
                  </TouchableOpacity>
                  {typeDropdownOpen && (
                    <View style={s.dropdownList}>
                      {SPACE_TYPES.map((type) => (
                        <TouchableOpacity key={type} style={s.dropdownItem} onPress={() => { setSpaceType(type); setTypeDropdownOpen(false); }}>
                          <Text style={s.dropdownItemText}>{type}</Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  )}
                </View>
                <View style={s.field}>
                  <Text style={s.label}>Space Location</Text>
                  <TextInput style={[s.input, { marginBottom: 8 }]} value={addressLine} onChangeText={setAddressLine} placeholder="Street address" placeholderTextColor="#C0C0C0" />
                  <TextInput style={s.input} value={area} onChangeText={setArea} placeholder="Area, City" placeholderTextColor="#C0C0C0" />
                </View>
                <View style={s.field}>
                  <Text style={s.label}>Description</Text>
                  <TextInput
                    style={[s.input, s.textArea]}
                    value={description}
                    onChangeText={setDescription}
                    multiline
                    numberOfLines={4}
                    textAlignVertical="top"
                  />
                </View>
              </View>
            )}
          </View>

          {/* SPACE PHOTOS */}
          <View style={s.sectionCard}>
            <TouchableOpacity style={s.sectionHeader} onPress={() => toggleSection('spacePhotos')}>
              <Text style={s.sectionLabel}>Space Photos</Text>
              <Feather name={openSections.spacePhotos ? 'chevron-up' : 'chevron-down'} size={18} color="#6A7181" />
            </TouchableOpacity>
            {openSections.spacePhotos && (
              <View style={s.sectionBody}>
                <View style={s.photoGrid}>
                  {photos.map((uri, i) => (
                    <View key={i} style={s.photoWrap}>
                      <Image source={{ uri }} style={s.photoThumb} />
                      <TouchableOpacity style={s.photoRemove} onPress={() => handleRemovePhoto(i)}>
                        <Feather name="x" size={12} color="#FFFFFF" />
                      </TouchableOpacity>
                    </View>
                  ))}
                  <TouchableOpacity style={s.photoAdd} onPress={handleAddPhoto} disabled={uploadingPhoto}>
                    {uploadingPhoto ? (
                      <ActivityIndicator size="small" color="#6200EE" />
                    ) : (
                      <Feather name="plus" size={20} color="#6200EE" />
                    )}
                  </TouchableOpacity>
                </View>
              </View>
            )}
          </View>

          {/* AMENITIES */}
          <View style={s.sectionCard}>
            <TouchableOpacity style={s.sectionHeader} onPress={() => toggleSection('amenities')}>
              <Text style={s.sectionLabel}>Amenities</Text>
              <Feather name={openSections.amenities ? 'chevron-up' : 'chevron-down'} size={18} color="#6A7181" />
            </TouchableOpacity>
            {openSections.amenities && (
              <View style={s.sectionBody}>
                <View style={s.chipWrap}>
                  {DEFAULT_AMENITIES.map((item) => {
                    const isSelected = amenities.includes(item);
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
                </View>
              </View>
            )}
          </View>

          {/* PRICING */}
          <View style={s.sectionCard}>
            <TouchableOpacity style={s.sectionHeader} onPress={() => toggleSection('pricing')}>
              <Text style={s.sectionLabel}>Pricing</Text>
              <Feather name={openSections.pricing ? 'chevron-up' : 'chevron-down'} size={18} color="#6A7181" />
            </TouchableOpacity>
            {openSections.pricing && (
              <View style={s.sectionBody}>
                <View style={s.field}>
                  <Text style={s.label}>Space Price (₦)</Text>
                  <TextInput style={s.input} value={spacePrice} onChangeText={setSpacePrice} keyboardType="number-pad" />
                </View>
                <View style={s.field}>
                  <Text style={s.label}>Guest Capacity</Text>
                  <TextInput style={s.input} value={spaceCapacity} onChangeText={setSpaceCapacity} keyboardType="number-pad" />
                </View>
              </View>
            )}
          </View>

          {/* ADD-ON */}
          <View style={s.sectionCard}>
            <TouchableOpacity style={s.sectionHeader} onPress={() => toggleSection('addOn')}>
              <Text style={s.sectionLabel}>Add-On</Text>
              <Feather name={openSections.addOn ? 'chevron-up' : 'chevron-down'} size={18} color="#6A7181" />
            </TouchableOpacity>
            {openSections.addOn && (
              <View style={s.sectionBody}>
                {addOns.map((item, i) => (
                  <View key={i} style={s.addOnCard}>
                    <TouchableOpacity style={s.addOnDelete} onPress={() => handleRemoveAddOn(i)} hitSlop={8}>
                      <Feather name="trash-2" size={16} color="#EF4444" />
                    </TouchableOpacity>
                    <View style={s.field}>
                      <Text style={s.label}>Name</Text>
                      <TextInput style={s.input} value={item.name} onChangeText={(t) => handleAddOnChange(i, 'name', t)} />
                    </View>
                    <View style={s.rowFields}>
                      <View style={s.rowCol}>
                        <Text style={s.label}>Unit Price (₦)</Text>
                        <TextInput style={s.input} value={item.unitPrice} onChangeText={(t) => handleAddOnChange(i, 'unitPrice', t)} keyboardType="number-pad" />
                      </View>
                      <View style={s.rowCol}>
                        <Text style={s.label}>Available</Text>
                        <TextInput style={s.input} value={item.available} onChangeText={(t) => handleAddOnChange(i, 'available', t)} keyboardType="number-pad" />
                      </View>
                    </View>
                  </View>
                ))}
                <TouchableOpacity style={s.addItemBtn} onPress={handleAddAddOnItem}>
                  <Feather name="plus" size={14} color="#6200EE" />
                  <Text style={s.addItemText}>Add another item</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>

          {/* HOUSE RULES */}
          <View style={s.sectionCard}>
            <TouchableOpacity style={s.sectionHeader} onPress={() => toggleSection('houseRules')}>
              <Text style={s.sectionLabel}>House Rules</Text>
              <Feather name={openSections.houseRules ? 'chevron-up' : 'chevron-down'} size={18} color="#6A7181" />
            </TouchableOpacity>
            {openSections.houseRules && (
              <View style={s.sectionBody}>
                <Text style={s.label}>Host rules</Text>
                <TextInput
                  style={[s.input, s.textArea]}
                  value={hostRules}
                  onChangeText={setHostRules}
                  multiline
                  numberOfLines={4}
                  textAlignVertical="top"
                />
                <Text style={s.hintText}>Use commas to separate your house rules</Text>
              </View>
            )}
          </View>

          {/* PARKING INSTRUCTIONS */}
          <View style={s.sectionCard}>
            <TouchableOpacity style={s.sectionHeader} onPress={() => toggleSection('parkingInstructions')}>
              <Text style={s.sectionLabel}>Parking Instructions</Text>
              <Feather name={openSections.parkingInstructions ? 'chevron-up' : 'chevron-down'} size={18} color="#6A7181" />
            </TouchableOpacity>
            {openSections.parkingInstructions && (
              <View style={s.sectionBody}>
                <Text style={s.label}>Parking Instruction</Text>
                <TextInput
                  style={[s.input, s.textArea]}
                  value={parkingInstruction}
                  onChangeText={setParkingInstruction}
                  multiline
                  numberOfLines={5}
                  textAlignVertical="top"
                />
              </View>
            )}
          </View>

          <View style={{ height: 100 }} />
        </ScrollView>
      </KeyboardAvoidingView>

      <View style={s.footer}>
        <TouchableOpacity style={s.cancelBtn} onPress={() => router.back()}>
          <Text style={s.cancelBtnText}>Cancel</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[s.saveBtn, (!canSave || saving) && s.saveBtnDisabled]}
          onPress={handleSave}
          disabled={!canSave || saving}
        >
          {saving ? <ActivityIndicator color="#FFFFFF" /> : <Text style={s.saveBtnText}>Save Changes</Text>}
        </TouchableOpacity>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#FFFFFF' },
  safeTop: { backgroundColor: '#FFFFFF' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#FFFFFF' },

  header: { paddingHorizontal: 16, paddingVertical: 12 },
  backBtn: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: '#F2F4F7', alignItems: 'center', justifyContent: 'center',
  },

  toast: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: '#DCFCE7', marginHorizontal: 16, marginBottom: 8,
    borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10,
  },
  toastText: { fontFamily: 'Inter-Regular', fontSize: 12, color: '#16A34A', flex: 1 },

  scroll: { paddingHorizontal: 16 },
  title: { fontFamily: 'MonaSans-Bold', fontSize: 20, color: '#020203', marginTop: 8 },
  subtitle: { fontFamily: 'Inter-Regular', fontSize: 13, color: '#6A7181', marginTop: 6, marginBottom: 20, lineHeight: 19 },

  sectionCard: {
    borderWidth: 1, borderColor: '#F2F4F7', borderRadius: 14, marginBottom: 12, overflow: 'hidden',
  },
  sectionHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 16,
  },
  sectionLabel: { fontFamily: 'Inter-Regular', fontWeight: '600', fontSize: 14, color: '#020203' },
  sectionBody: { paddingHorizontal: 16, paddingBottom: 16, gap: 14 },

  field: { gap: 6 },
  label: { fontFamily: 'Inter-Regular', fontSize: 13, color: '#3A414E' },
  input: {
    borderWidth: 1, borderColor: '#E4E7EC', borderRadius: 10,
    paddingHorizontal: 12, paddingVertical: 12,
    fontFamily: 'Inter-Regular', fontSize: 14, color: '#020203',
  },
  textArea: { minHeight: 90 },
  hintText: { fontFamily: 'Inter-Regular', fontSize: 11, color: '#98A2B3', marginTop: 2 },

  dropdown: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  dropdownValue: { fontFamily: 'Inter-Regular', fontSize: 14, color: '#020203' },
  dropdownList: {
    borderWidth: 1, borderColor: '#E4E7EC', borderRadius: 10, marginTop: 6, overflow: 'hidden',
  },
  dropdownItem: { paddingHorizontal: 14, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#F2F4F7' },
  dropdownItemText: { fontFamily: 'Inter-Regular', fontSize: 14, color: '#020203' },

  photoGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  photoWrap: { width: 72, height: 72, position: 'relative' },
  photoThumb: { width: '100%', height: '100%', borderRadius: 10, backgroundColor: '#F2F4F7' },
  photoRemove: {
    position: 'absolute', top: -6, right: -6, width: 20, height: 20, borderRadius: 10,
    backgroundColor: '#EF4444', alignItems: 'center', justifyContent: 'center',
  },
  photoAdd: {
    width: 72, height: 72, borderRadius: 10, borderWidth: 1, borderColor: '#E4E7EC', borderStyle: 'dashed',
    alignItems: 'center', justifyContent: 'center',
  },

  chipWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  chip: {
    borderWidth: 1, borderColor: '#E4E7EC', borderRadius: 99, paddingHorizontal: 14, paddingVertical: 8,
  },
  chipSelected: { backgroundColor: '#6200EE', borderColor: '#6200EE' },
  chipText: { fontFamily: 'Inter-Regular', fontSize: 13, color: '#3A414E' },
  chipTextSelected: { color: '#FFFFFF', fontWeight: '600' },

  rowFields: { flexDirection: 'row', gap: 12 },
  rowCol: { flex: 1, gap: 6 },

  addOnCard: {
    borderWidth: 1, borderColor: '#F2F4F7', borderRadius: 12, padding: 12, gap: 12, position: 'relative',
  },
  addOnDelete: { position: 'absolute', top: 10, right: 10, zIndex: 1 },

  addItemBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 10,
  },
  addItemText: { fontFamily: 'Inter-Regular', fontSize: 13, color: '#6200EE', fontWeight: '600' },

  footer: {
    flexDirection: 'row', gap: 12, paddingHorizontal: 16, paddingBottom: 36, paddingTop: 12,
    borderTopWidth: 1, borderTopColor: '#F2F4F7', backgroundColor: '#FFFFFF',
  },
  cancelBtn: {
    flex: 1, backgroundColor: '#EDE9FF', borderRadius: 99, height: 52,
    alignItems: 'center', justifyContent: 'center',
  },
  cancelBtnText: { fontFamily: 'Inter-Regular', fontWeight: '600', fontSize: 15, color: '#6200EE' },
  saveBtn: {
    flex: 1, backgroundColor: '#6200EE', borderRadius: 99, height: 52,
    alignItems: 'center', justifyContent: 'center',
  },
  saveBtnDisabled: { backgroundColor: '#C4B5FD' },
  saveBtnText: { fontFamily: 'Inter-Regular', fontWeight: '600', fontSize: 15, color: '#FFFFFF' },
});
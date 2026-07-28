import { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Image,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useSelector, useDispatch } from 'react-redux';
import * as ImagePicker from 'expo-image-picker';
import { RootState } from '@/store';
import { setStep, updateListingData } from '@/store/slices/createListingSlice';

const CLOUDINARY_CLOUD_NAME = 'hodfwf8j';
const CLOUDINARY_UPLOAD_PRESET = 'spaceshare';
const MIN_PHOTOS = 3;

export default function CreateListingPhotos() {
  const dispatch = useDispatch();
  const listing = useSelector((state: RootState) => state.createListing);

  const [photos, setPhotos] = useState<string[]>(listing.photos);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');

  const canContinue = photos.length >= MIN_PHOTOS;

  const uploadToCloudinary = async (uri: string): Promise<string> => {
    const formData = new FormData();
    formData.append('file', {
      uri,
      type: 'image/jpeg',
      name: 'upload.jpg',
    } as any);
    formData.append('upload_preset', CLOUDINARY_UPLOAD_PRESET);

    const response = await fetch(
      `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`,
      { method: 'POST', body: formData }
    );

    const data = await response.json();

    if (!response.ok || !data.secure_url) {
      throw new Error(data?.error?.message || 'Upload failed. Check your connection and try again.');
    }

    return data.secure_url;
  };

  const handlePickImage = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) return;

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.8,
      allowsMultipleSelection: true,
      selectionLimit: 10 - photos.length,
    });

    if (result.canceled || result.assets.length === 0) return;

    setUploading(true);
    setUploadError('');
    try {
      const uploadedUrls = await Promise.all(
        result.assets.map((asset) => uploadToCloudinary(asset.uri))
      );
      setPhotos((prev) => [...prev, ...uploadedUrls]);
    } catch (err: any) {
      console.log('Upload error:', err);
      setUploadError(err.message || 'Upload failed. Check your connection and try again.');
    } finally {
      setUploading(false);
    }
  };

  const handleRemovePhoto = (url: string) => {
    setPhotos((prev) => prev.filter((p) => p !== url));
  };

 const handleContinue = () => {
    if (!canContinue) return;
    dispatch(updateListingData({ photos }));
    dispatch(setStep(3));
    router.push('/host/create-listing/amenities');
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

        <Text style={s.title}>Add space photos</Text>
        <Text style={s.subtitle}>
          Upload clear photos that showcase your space, lighting, setup, and amenities.
        </Text>

        {photos.length === 0 ? (
          <TouchableOpacity style={s.uploadBox} onPress={handlePickImage} disabled={uploading}>
            {uploading ? (
              <ActivityIndicator color="#6200EE" />
            ) : (
              <>
                <Feather name="camera" size={28} color="#6200EE" />
                <Text style={s.uploadBoxTitle}>Tap to upload photo</Text>
                <Text style={s.uploadBoxSubtitle}>Add at least 3 photos (JPG, PNG)</Text>
              </>
            )}
          </TouchableOpacity>
        ) : (
          <View style={s.photoGrid}>
            {photos.map((url) => (
              <View key={url} style={s.photoTile}>
                <Image source={{ uri: url }} style={s.photoImage} />
                <TouchableOpacity style={s.removeBtn} onPress={() => handleRemovePhoto(url)}>
                  <Feather name="x" size={12} color="#FFFFFF" />
                </TouchableOpacity>
              </View>
            ))}
            {photos.length < 10 && (
              <TouchableOpacity style={s.addMoreTile} onPress={handlePickImage} disabled={uploading}>
                {uploading ? (
                  <ActivityIndicator color="#6200EE" />
                ) : (
                  <>
                    <Feather name="plus" size={20} color="#6200EE" />
                    <Text style={s.addMoreText}>Add more</Text>
                  </>
                )}
              </TouchableOpacity>
            )}
          </View>
        )}

        <Text style={s.hintText}>Add at least 3 photos. Click the X button to remove.</Text>

        {uploadError ? (
          <View style={s.errorBox}>
            <Feather name="alert-triangle" size={13} color="#EF4444" />
            <Text style={s.errorText}>{uploadError}</Text>
          </View>
        ) : null}

        <View style={s.tipBanner}>
          <Feather name="info" size={14} color="#B54708" />
          <Text style={s.tipText}>Listings with quality photos receive more booking requests.</Text>
        </View>

        <View style={{ height: 100 }} />
      </ScrollView>

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
  subtitle: { fontFamily: 'Inter-Regular', fontSize: 13, color: '#6A7181', marginTop: 4 },
  hintText: { fontFamily: 'Inter-Regular', fontSize: 12, color: '#98A2B3', marginTop: 12 },

  uploadBox: {
    marginTop: 20,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: '#D0B8F5',
    borderRadius: 16,
    paddingVertical: 48,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#FBF9FF',
  },
  uploadBoxTitle: { fontFamily: 'Inter-Regular', fontSize: 14, color: '#020203', fontWeight: '600' },
  uploadBoxSubtitle: { fontFamily: 'Inter-Regular', fontSize: 12, color: '#98A2B3' },

  photoGrid: {
    marginTop: 20,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  photoTile: {
    width: '31%',
    aspectRatio: 1,
    borderRadius: 12,
    overflow: 'hidden',
    position: 'relative',
  },
  photoImage: { width: '100%', height: '100%' },
  removeBtn: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: 'rgba(2,2,3,0.6)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  addMoreTile: {
    width: '31%',
    aspectRatio: 1,
    borderRadius: 12,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: '#D0B8F5',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    backgroundColor: '#FBF9FF',
  },
  addMoreText: { fontFamily: 'Inter-Regular', fontSize: 11, color: '#6200EE', fontWeight: '600' },

  errorBox: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    marginTop: 12, paddingHorizontal: 4,
  },
  errorText: { flex: 1, fontFamily: 'Inter-Regular', fontSize: 12, color: '#EF4444' },

  tipBanner: {
    marginTop: 20,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    backgroundColor: '#FFFAEB',
    borderWidth: 1,
    borderColor: '#FEDF89',
    borderRadius: 12,
    padding: 12,
  },
  tipText: { flex: 1, fontFamily: 'Inter-Regular', fontSize: 12, color: '#B54708', lineHeight: 17 },

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
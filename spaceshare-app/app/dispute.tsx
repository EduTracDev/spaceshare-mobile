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
  Keyboard,
  TouchableWithoutFeedback,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { router } from 'expo-router';
import * as DocumentPicker from 'expo-document-picker';

type PickedFile = {
  name: string;
  sizeLabel: string;
};

export default function RaiseDispute() {
  const [bookingId, setBookingId] = useState('');
  const [issueDetail, setIssueDetail] = useState('');
  const [file, setFile] = useState<PickedFile | null>(null);
  const [submitted, setSubmitted] = useState(false);

  const canSubmit = bookingId.trim().length > 0 && issueDetail.trim().length > 0;

  const formatSize = (bytes?: number) => {
    if (!bytes) return '';
    const kb = bytes / 1024;
    if (kb < 1024) return `${Math.round(kb)} KB`;
    return `${(kb / 1024).toFixed(1)} MB`;
  };

  const handlePickFile = async () => {
    const result = await DocumentPicker.getDocumentAsync({
      type: ['image/*', 'application/pdf'],
      copyToCacheDirectory: true,
    });
    if (result.canceled) return;
    const asset = result.assets?.[0];
    if (!asset) return;
    setFile({
      name: asset.name,
      sizeLabel: formatSize(asset.size),
    });
  };

  const handleRemoveFile = () => setFile(null);

  const handleSubmit = () => {
    if (!canSubmit) return;
    // TODO: send bookingId, issueDetail, and file to backend once dispute API exists
    Keyboard.dismiss();
    setSubmitted(true);
  };

  if (submitted) {
    return (
      <SafeAreaView style={s.root}>
        <View style={s.header}>
          <TouchableOpacity onPress={() => router.back()}>
            <Feather name="arrow-left" size={20} color="#020203" />
          </TouchableOpacity>
          <Text style={s.headerTitle}>Raise a Dispute</Text>
          <View style={{ width: 20 }} />
        </View>

        <View style={s.successBox}>
          <Feather name="check-circle" size={16} color="#16A34A" />
          <Text style={s.successText}>
            Your report has been received. Our team will review and get back to you shortly.
          </Text>
        </View>

        <View style={s.successCenter}>
          <View style={s.successIconCircle}>
            <Feather name="check" size={30} color="#FFFFFF" />
          </View>
          <Text style={s.successTitle}>Dispute Submitted</Text>
          <Text style={s.successBody}>
            We've received your report and will get back to you within 24–48 hours.
          </Text>
          <TouchableOpacity style={s.doneBtn} onPress={() => router.back()}>
            <Text style={s.doneBtnText}>Back to Profile</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={s.root}>
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={{ flex: 1 }}
        >
          <View style={s.header}>
            <TouchableOpacity onPress={() => router.back()}>
              <Feather name="arrow-left" size={20} color="#020203" />
            </TouchableOpacity>
            <Text style={s.headerTitle}>Raise a Dispute</Text>
            <View style={{ width: 20 }} />
          </View>

          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={s.content}
            keyboardShouldPersistTaps="handled"
          >
            <View style={s.infoBox}>
              <Feather name="info" size={14} color="#B45309" />
              <Text style={s.infoText}>
                Make sure you enter the correct booking ID for the space you are disputing. You can find and copy it from your booking details.
              </Text>
            </View>

            <View style={s.field}>
              <Text style={s.label}>Booking ID</Text>
              <TextInput
                style={s.input}
                placeholder="Enter your booking ID"
                placeholderTextColor="#C0C0C0"
                value={bookingId}
                onChangeText={setBookingId}
                autoCapitalize="characters"
                returnKeyType="done"
                onSubmitEditing={Keyboard.dismiss}
              />
            </View>

            <View style={s.field}>
              <Text style={s.label}>Describe the issue in detail</Text>
              <TextInput
                style={s.textarea}
                placeholder="Explain what happened from your point of view..."
                placeholderTextColor="#C0C0C0"
                multiline
                numberOfLines={5}
                textAlignVertical="top"
                value={issueDetail}
                onChangeText={setIssueDetail}
                returnKeyType="done"
                blurOnSubmit
                onSubmitEditing={Keyboard.dismiss}
              />
            </View>

            <View style={s.field}>
              <Text style={s.label}>Upload evidence (optional)</Text>

              {file ? (
                <View style={s.filePreview}>
                  <View style={s.fileIconWrap}>
                    <Feather name="file-text" size={18} color="#6200EE" />
                  </View>
                  <View style={s.fileInfo}>
                    <Text style={s.fileName} numberOfLines={1}>{file.name}</Text>
                    {!!file.sizeLabel && <Text style={s.fileSize}>{file.sizeLabel}</Text>}
                  </View>
                  <TouchableOpacity onPress={handleRemoveFile}>
                    <Feather name="x" size={18} color="#6A7181" />
                  </TouchableOpacity>
                </View>
              ) : (
                <TouchableOpacity style={s.uploadBox} onPress={handlePickFile} activeOpacity={0.7}>
                  <View style={s.uploadIconCircle}>
                    <Feather name="file-plus" size={18} color="#6200EE" />
                  </View>
                  <Text style={s.uploadTitle}>Select a file</Text>
                  <Text style={s.uploadHint}>
                    Add photos, chat screenshots, or receipts to support your case (JPG, PNG, PDF)
                  </Text>
                  <Text style={s.uploadMax}>Max 5 MB</Text>
                </TouchableOpacity>
              )}
            </View>
          </ScrollView>

          <View style={s.footer}>
            <TouchableOpacity
              style={[s.submitBtn, !canSubmit && s.submitBtnDisabled]}
              onPress={handleSubmit}
              disabled={!canSubmit}
            >
              <Text style={s.submitBtnText}>Submit Dispute</Text>
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </TouchableWithoutFeedback>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#FFFFFF' },

  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 14,
    borderBottomWidth: 1, borderBottomColor: '#F2F4F7',
  },
  headerTitle: { fontFamily: 'MonaSans-Bold', fontSize: 16, color: '#020203' },

  content: { paddingHorizontal: 16, paddingTop: 16, paddingBottom: 32, gap: 20 },

  infoBox: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 8,
    backgroundColor: '#FFF7E5', borderRadius: 12, padding: 14,
  },
  infoText: { flex: 1, fontFamily: 'Inter-Regular', fontSize: 12, color: '#B45309', lineHeight: 18 },

  field: { gap: 8 },
  label: { fontFamily: 'Inter-Regular', fontSize: 13, color: '#3A414E' },
  input: {
    borderWidth: 1, borderColor: '#E4E7EC', borderRadius: 12,
    paddingHorizontal: 16, paddingVertical: 14,
    fontFamily: 'Inter-Regular', fontSize: 15, color: '#020203',
  },
  textarea: {
    borderWidth: 1, borderColor: '#E4E7EC', borderRadius: 12,
    paddingHorizontal: 16, paddingVertical: 14, minHeight: 110,
    fontFamily: 'Inter-Regular', fontSize: 15, color: '#020203',
  },

  uploadBox: {
    borderWidth: 1, borderColor: '#E4E7EC', borderStyle: 'dashed', borderRadius: 14,
    alignItems: 'center', justifyContent: 'center',
    paddingVertical: 32, paddingHorizontal: 20, gap: 6,
  },
  uploadIconCircle: {
    width: 44, height: 44, borderRadius: 22, backgroundColor: '#EDE9FF',
    alignItems: 'center', justifyContent: 'center', marginBottom: 4,
  },
  uploadTitle: { fontFamily: 'Inter-Regular', fontWeight: '600', fontSize: 14, color: '#020203' },
  uploadHint: {
    fontFamily: 'Inter-Regular', fontSize: 12, color: '#6A7181',
    textAlign: 'center', lineHeight: 17, marginTop: 2,
  },
  uploadMax: { fontFamily: 'Inter-Regular', fontSize: 11, color: '#B7BEC9', marginTop: 4 },

  filePreview: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    borderWidth: 1, borderColor: '#E4E7EC', borderRadius: 12, padding: 12,
  },
  fileIconWrap: {
    width: 36, height: 36, borderRadius: 10, backgroundColor: '#EDE9FF',
    alignItems: 'center', justifyContent: 'center',
  },
  fileInfo: { flex: 1, gap: 1 },
  fileName: { fontFamily: 'Inter-Regular', fontWeight: '600', fontSize: 13, color: '#020203' },
  fileSize: { fontFamily: 'Inter-Regular', fontSize: 11, color: '#6A7181' },

  footer: { padding: 16, borderTopWidth: 1, borderTopColor: '#F2F4F7' },
  submitBtn: {
    backgroundColor: '#6200EE', borderRadius: 99, height: 52,
    alignItems: 'center', justifyContent: 'center',
  },
  submitBtnDisabled: { backgroundColor: '#C4B5FD' },
  submitBtnText: { color: '#FFFFFF', fontFamily: 'Inter-Regular', fontWeight: '600', fontSize: 15 },

  successBox: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: '#DCFCE7', marginHorizontal: 16, marginTop: 12,
    borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10,
  },
  successText: { flex: 1, fontFamily: 'Inter-Regular', fontSize: 12, color: '#16A34A' },
  successCenter: {
    flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 40, gap: 8,
  },
  successIconCircle: {
    width: 64, height: 64, borderRadius: 32, backgroundColor: '#16A34A',
    alignItems: 'center', justifyContent: 'center', marginBottom: 8,
  },
  successTitle: { fontFamily: 'MonaSans-Bold', fontSize: 18, color: '#020203' },
  successBody: {
    fontFamily: 'Inter-Regular', fontSize: 13, color: '#6A7181',
    textAlign: 'center', lineHeight: 20, marginBottom: 12,
  },
  doneBtn: {
    backgroundColor: '#6200EE', borderRadius: 99, height: 52, width: '100%',
    alignItems: 'center', justifyContent: 'center', marginTop: 8,
  },
  doneBtnText: { color: '#FFFFFF', fontFamily: 'Inter-Regular', fontWeight: '600', fontSize: 15 },
});
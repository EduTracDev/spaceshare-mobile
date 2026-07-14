import { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Linking } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { router } from 'expo-router';
import * as Clipboard from 'expo-clipboard';

const SUPPORT_EMAIL = 'support@spaceshare.com';
const SUPPORT_PHONE = '+2349023445566';

const SOCIALS = [
  { label: 'Instagram', icon: 'instagram', url: 'https://instagram.com/spaceshare' },
  { label: 'X (Twitter)', icon: 'twitter', url: 'https://x.com/spaceshare' },
  { label: 'Tiktok', icon: 'music', url: 'https://tiktok.com/@spaceshare' },
  { label: 'Facebook', icon: 'facebook', url: 'https://facebook.com/spaceshare' },
];

export default function ContactUs() {
  const [toast, setToast] = useState<string | null>(null);

  const showToast = (message: string) => {
    setToast(message);
    setTimeout(() => setToast(null), 2000);
  };

  const handleCopy = async (value: string) => {
    await Clipboard.setStringAsync(value);
    showToast('Copied to clipboard');
  };

  return (
    <SafeAreaView style={s.root}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Feather name="arrow-left" size={20} color="#020203" />
        </TouchableOpacity>
        <Text style={s.headerTitle}>Contact Us</Text>
        <View style={{ width: 20 }} />
      </View>

      {toast && (
        <View style={s.toast}>
          <Feather name="check-circle" size={15} color="#16A34A" />
          <Text style={s.toastText}>{toast}</Text>
        </View>
      )}

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={s.content}>

        {/* Support */}
        <View style={s.section}>
          <Text style={s.sectionTitle}>Support</Text>
          <Text style={s.sectionSubtitle}>Send us your questions, complaints, or feedback.</Text>

          <View style={s.card}>
            <TouchableOpacity
              style={[s.row, s.rowBorder]}
              onPress={() => Linking.openURL(`mailto:${SUPPORT_EMAIL}`)}
            >
              <View style={s.rowLeft}>
                <Feather name="mail" size={16} color="#6A7181" />
                <Text style={s.rowText}>{SUPPORT_EMAIL}</Text>
              </View>
              <Feather name="external-link" size={15} color="#6A7181" />
            </TouchableOpacity>

            <TouchableOpacity
              style={s.row}
              onPress={() => Linking.openURL(`tel:${SUPPORT_PHONE}`)}
            >
              <View style={s.rowLeft}>
                <Feather name="phone" size={16} color="#6A7181" />
                <Text style={s.rowText}>{SUPPORT_PHONE}</Text>
              </View>
              <TouchableOpacity onPress={() => handleCopy(SUPPORT_PHONE)} hitSlop={8}>
                <Feather name="copy" size={15} color="#6200EE" />
              </TouchableOpacity>
            </TouchableOpacity>
          </View>
        </View>

        {/* Social Media */}
        <View style={s.section}>
          <Text style={s.sectionTitle}>Social Media</Text>
          <Text style={s.sectionSubtitle}>Follow us and reach to us on our page</Text>

          <View style={s.card}>
            {SOCIALS.map((item, i) => (
              <TouchableOpacity
                key={item.label}
                style={[s.row, i < SOCIALS.length - 1 && s.rowBorder]}
                onPress={() => Linking.openURL(item.url)}
              >
                <View style={s.rowLeft}>
                  <Feather name={item.icon as any} size={16} color="#6A7181" />
                  <Text style={s.rowText}>{item.label}</Text>
                </View>
                <Feather name="external-link" size={15} color="#6A7181" />
              </TouchableOpacity>
            ))}
          </View>
        </View>

      </ScrollView>
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

  toast: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: '#DCFCE7', marginHorizontal: 16, marginTop: 12,
    borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10,
  },
  toastText: { fontFamily: 'Inter-Regular', fontSize: 12, color: '#16A34A', flex: 1 },

  content: { paddingHorizontal: 16, paddingTop: 16, paddingBottom: 32, gap: 24 },

  section: { gap: 4 },
  sectionTitle: { fontFamily: 'MonaSans-Bold', fontSize: 15, color: '#020203' },
  sectionSubtitle: { fontFamily: 'Inter-Regular', fontSize: 13, color: '#6A7181', marginBottom: 10 },

  card: {
    borderWidth: 1, borderColor: '#F2F4F7',
    borderRadius: 14, overflow: 'hidden',
  },
  row: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingVertical: 14, paddingHorizontal: 14,
  },
  rowBorder: { borderBottomWidth: 1, borderBottomColor: '#F2F4F7' },
  rowLeft: { flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 },
  rowText: { fontFamily: 'Inter-Regular', fontSize: 14, color: '#020203' },
});
import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { router } from 'expo-router';
import * as Notifications from 'expo-notifications';

export default function NotificationsScreen() {
  const [permissionGranted, setPermissionGranted] = useState(true);
  const [bannerDismissed, setBannerDismissed] = useState(false);

  useEffect(() => {
    checkPermission();
  }, []);

  const checkPermission = async () => {
    const { status } = await Notifications.getPermissionsAsync();
    setPermissionGranted(status === 'granted');
  };

  const handleTurnOn = async () => {
    const { status } = await Notifications.requestPermissionsAsync();
    setPermissionGranted(status === 'granted');
  };

  const showBanner = !permissionGranted && !bannerDismissed;

  return (
    <SafeAreaView style={s.root}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Feather name="arrow-left" size={20} color="#020203" />
        </TouchableOpacity>
        <Text style={s.headerTitle}>Notifications</Text>
        <TouchableOpacity>
          <Feather name="settings" size={20} color="#020203" />
        </TouchableOpacity>
      </View>

      {showBanner && (
        <View style={s.banner}>
          <Feather name="bell" size={16} color="#F97316" style={{ marginTop: 1 }} />
          <Text style={s.bannerText}>Enable notification to get the notifications</Text>
          <TouchableOpacity style={s.turnOnBtn} onPress={handleTurnOn}>
            <Text style={s.turnOnText}>Turn On</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => setBannerDismissed(true)} hitSlop={8}>
            <Feather name="x" size={16} color="#6A7181" />
          </TouchableOpacity>
        </View>
      )}

      <View style={s.emptyState}>
        <Feather name="bell" size={48} color="#D0D5DD" />
        <Text style={s.emptyText}>Relax! Your notifications will appear once you have any</Text>
      </View>
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

  banner: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: '#FFF7E5', marginHorizontal: 16, marginTop: 12,
    borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10,
  },
  bannerText: { flex: 1, fontFamily: 'Inter-Regular', fontSize: 13, color: '#B45309', lineHeight: 18 },
  turnOnBtn: {
    backgroundColor: '#6200EE', borderRadius: 99,
    paddingHorizontal: 12, paddingVertical: 6,
  },
  turnOnText: { fontFamily: 'Inter-Regular', fontWeight: '600', fontSize: 12, color: '#FFFFFF' },

  emptyState: {
    flex: 1, alignItems: 'center', justifyContent: 'center',
    paddingHorizontal: 40, gap: 12,
  },
  emptyText: {
    fontFamily: 'Inter-Regular', fontSize: 14, color: '#6A7181',
    textAlign: 'center', lineHeight: 20,
  },
});
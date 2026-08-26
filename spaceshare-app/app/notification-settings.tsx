import { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Switch, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useSelector } from 'react-redux';
import { RootState } from '@/store';
import { userAPI } from '@/services/api';

type Settings = {
  emailNotifications: boolean;
  smsNotifications: boolean;
  pushNotifications: boolean;
};

export default function NotificationSettings() {
  const token = useSelector((state: RootState) => state.auth.token);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState(false);
  const [settings, setSettings] = useState<Settings>({
    emailNotifications: true,
    smsNotifications: true,
    pushNotifications: true,
  });
  const [initialSettings, setInitialSettings] = useState<Settings>(settings);

  const fetchSettings = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      const res = await userAPI.getNotificationSettings(token);
      setSettings(res.data.settings);
      setInitialSettings(res.data.settings);
    } catch (err) {
      console.log('Failed to fetch notification settings:', err);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  const toggle = (key: keyof Settings) => {
    setSettings((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const hasChanges = JSON.stringify(settings) !== JSON.stringify(initialSettings);

  const handleSave = async () => {
    if (!token || !hasChanges) return;
    setSaving(true);
    try {
      await userAPI.updateNotificationSettings(token, settings);
      setInitialSettings(settings);
      setToast(true);
      setTimeout(() => setToast(false), 2000);
    } catch (err) {
      console.log('Failed to update notification settings:', err);
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
    <SafeAreaView style={s.root}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Feather name="arrow-left" size={20} color="#020203" />
        </TouchableOpacity>
        <Text style={s.headerTitle}>Notifications Settings</Text>
        <View style={{ width: 20 }} />
      </View>

      {toast && (
        <View style={s.toast}>
          <Feather name="check-circle" size={15} color="#16A34A" />
          <Text style={s.toastText}>Notification settings updated successfully.</Text>
        </View>
      )}

      <View style={s.content}>
        <Text style={s.sectionTitle}>Alerts & updates</Text>
        <Text style={s.sectionSubtitle}>
          Manage how you receive booking, payment, and account updates.
        </Text>

        <View style={s.row}>
          <Text style={s.rowLabel}>Email Notifications</Text>
          <Switch
            value={settings.emailNotifications}
            onValueChange={() => toggle('emailNotifications')}
            trackColor={{ false: '#E4E7EC', true: '#6200EE' }}
            thumbColor="#FFFFFF"
          />
        </View>

        <View style={s.row}>
          <Text style={s.rowLabel}>SMS</Text>
          <Switch
            value={settings.smsNotifications}
            onValueChange={() => toggle('smsNotifications')}
            trackColor={{ false: '#E4E7EC', true: '#6200EE' }}
            thumbColor="#FFFFFF"
          />
        </View>

        <View style={s.row}>
          <Text style={s.rowLabel}>Push notifications</Text>
          <Switch
            value={settings.pushNotifications}
            onValueChange={() => toggle('pushNotifications')}
            trackColor={{ false: '#E4E7EC', true: '#6200EE' }}
            thumbColor="#FFFFFF"
          />
        </View>
      </View>

      <View style={s.footer}>
        <TouchableOpacity
          style={[s.saveBtn, (!hasChanges || saving) && s.saveBtnDisabled]}
          onPress={handleSave}
          disabled={!hasChanges || saving}
        >
          {saving ? <ActivityIndicator color="#FFFFFF" /> : <Text style={s.saveBtnText}>Save</Text>}
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#FFFFFF' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#FFFFFF' },

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

  content: { paddingHorizontal: 16, paddingTop: 20 },
  sectionTitle: { fontFamily: 'MonaSans-Bold', fontSize: 16, color: '#020203', marginBottom: 6 },
  sectionSubtitle: {
    fontFamily: 'Inter-Regular', fontSize: 13, color: '#6A7181',
    lineHeight: 19, marginBottom: 20,
  },

  row: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: '#F2F4F7',
  },
  rowLabel: { fontFamily: 'Inter-Regular', fontSize: 14, color: '#020203' },

  footer: {
    paddingHorizontal: 16, paddingBottom: 36, paddingTop: 12,
    borderTopWidth: 1, borderTopColor: '#F2F4F7', backgroundColor: '#FFFFFF',
  },
  saveBtn: {
    backgroundColor: '#6200EE', borderRadius: 99, height: 52,
    alignItems: 'center', justifyContent: 'center',
  },
  saveBtnDisabled: { backgroundColor: '#C4B5FD' },
  saveBtnText: { color: '#FFFFFF', fontFamily: 'Inter-Regular', fontWeight: '600', fontSize: 15 },
});
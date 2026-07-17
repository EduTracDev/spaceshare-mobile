import { useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  ScrollView, Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { useSelector, useDispatch } from 'react-redux';
import { RootState } from '@/store';
import { logout } from '@/store/slices/authSlice';
import { router } from 'expo-router';
import BottomNav from '@/components/BottomNav';

const SETTINGS = [
  { label: 'Raise a Dispute', icon: 'alert-octagon', color: '#F97316', route: '/dispute' },
  { label: 'Bank Account', icon: 'credit-card', color: '#8B5CF6', route: '/bank-account' },
  { label: 'Notifications', icon: 'bell', color: '#EF4444', route: '/notifications' },
  { label: 'Change Password', icon: 'lock', color: '#F59E0B', route: '/change-password' },
  { label: 'Contact Us', icon: 'headphones', color: '#06B6D4', route: '/contact' },
];

const RESOURCES = [
  { label: 'Term of Use', icon: 'book-open', color: '#F97316', route: '/terms' },
  { label: 'Privacy Policy', icon: 'shield', color: '#8B5CF6', route: '/privacy' },
];
export default function ProfileScreen() {
  const dispatch = useDispatch();
  const user = useSelector((state: RootState) => state.auth.user);

  const initials = `${user?.firstName?.[0] ?? ''}${user?.lastName?.[0] ?? ''}`.toUpperCase() || 'U';
  const fullName = [user?.firstName, user?.lastName].filter(Boolean).join(' ') || 'User';

  const handleLogout = () => {
    dispatch(logout());
    router.replace('/login');
  };

  return (
    <View style={s.root}>
      <SafeAreaView edges={['top']} style={s.safeTop} />
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={s.scroll}>

        {/* Header */}
        <View style={s.header}>
          <Text style={s.headerTitle}>Profile</Text>
        </View>

        {/* Avatar Row */}
        <View style={s.avatarRow}>
          <View style={s.avatarWrap}>
            {user?.avatarUrl ? (
              <Image source={{ uri: user.avatarUrl }} style={s.avatar} />
            ) : (
              <View style={s.avatarFallback}>
                <Text style={s.avatarInitials}>{initials}</Text>
              </View>
            )}
          </View>

          <View style={s.nameWrap}>
            <Text style={s.fullName}>{fullName}</Text>
            <View style={s.roleBadge}>
              <Text style={s.roleText}>{user?.role ?? 'Guest'}</Text>
            </View>
          </View>

          <TouchableOpacity style={s.editBtn} onPress={() => router.push('/edit-profile')}>
            <Feather name="edit-2" size={16} color="#6A7181" />
          </TouchableOpacity>
        </View>

        {/* Settings */}
        <Text style={s.sectionLabel}>Settings</Text>
        <View style={s.card}>
          {SETTINGS.map((item, i) => (
            <TouchableOpacity
              key={item.label}
              style={[s.row, i < SETTINGS.length - 1 && s.rowBorder]}
              onPress={() => router.push(item.route as any)}
            >
              <View style={[s.iconWrap, { backgroundColor: item.color + '20' }]}>
                <Feather name={item.icon as any} size={16} color={item.color} />
              </View>
              <Text style={s.rowLabel}>{item.label}</Text>
              <Feather name="chevron-right" size={16} color="#C0C0C0" />
            </TouchableOpacity>
          ))}
        </View>

        {/* Resources */}
        <Text style={s.sectionLabel}>Resources</Text>
        <View style={s.card}>
          {RESOURCES.map((item, i) => (
            <TouchableOpacity
              key={item.label}
              style={[s.row, i < RESOURCES.length - 1 && s.rowBorder]}
              onPress={() => router.push(item.route as any)}
            >
              <View style={[s.iconWrap, { backgroundColor: item.color + '20' }]}>
                <Feather name={item.icon as any} size={16} color={item.color} />
              </View>
              <Text style={s.rowLabel}>{item.label}</Text>
              <Feather name="chevron-right" size={16} color="#C0C0C0" />
            </TouchableOpacity>
          ))}
        </View>

        {/* Logout */}
        <TouchableOpacity style={s.logoutRow} onPress={handleLogout}>
          <View style={[s.iconWrap, { backgroundColor: '#FEE2E2' }]}>
            <Feather name="log-out" size={16} color="#EF4444" />
          </View>
          <Text style={s.logoutLabel}>Logout</Text>
        </TouchableOpacity>

        <View style={{ height: 32 }} />
      </ScrollView>

      <BottomNav />
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#FFFFFF' },
  safeTop: { backgroundColor: '#FFFFFF' },
  scroll: { paddingHorizontal: 16, paddingBottom: 16 },

  header: { paddingVertical: 16 },
  headerTitle: { fontFamily: 'MonaSans-Bold', fontSize: 22, color: '#020203' },

  avatarRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: '#F2F4F7', marginBottom: 24,
  },
  avatarWrap: { position: 'relative' },
  avatar: { width: 56, height: 56, borderRadius: 28 },
  avatarFallback: {
    width: 56, height: 56, borderRadius: 28,
    backgroundColor: '#6200EE', alignItems: 'center', justifyContent: 'center',
  },
  avatarInitials: { fontFamily: 'MonaSans-Bold', fontSize: 20, color: '#FFFFFF' },
  nameWrap: { flex: 1, gap: 4 },
  fullName: { fontFamily: 'MonaSans-Bold', fontSize: 16, color: '#020203' },
  emailText: { fontFamily: 'Inter-Regular', fontSize: 13, color: '#6A7181' },
  roleBadge: {
    alignSelf: 'flex-start', backgroundColor: '#EDE9FF',
    borderRadius: 99, paddingHorizontal: 10, paddingVertical: 3,
  },
  roleText: { fontFamily: 'Inter-Regular', fontSize: 12, color: '#6200EE', fontWeight: '600' },
  editBtn: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: '#F2F4F7', alignItems: 'center', justifyContent: 'center',
  },

  sectionLabel: {
    fontFamily: 'Inter-Regular', fontSize: 13, color: '#6A7181',
    marginBottom: 8, marginTop: 4,
  },
  card: {
    borderWidth: 1, borderColor: '#F2F4F7',
    borderRadius: 16, overflow: 'hidden', marginBottom: 20,
  },
  row: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingVertical: 14, paddingHorizontal: 14,
  },
  rowBorder: { borderBottomWidth: 1, borderBottomColor: '#F2F4F7' },
  iconWrap: {
    width: 34, height: 34, borderRadius: 10,
    alignItems: 'center', justifyContent: 'center',
  },
  rowLabel: { flex: 1, fontFamily: 'Inter-Regular', fontSize: 14, color: '#020203' },

  logoutRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingVertical: 14, paddingHorizontal: 14,
    borderWidth: 1, borderColor: '#F2F4F7', borderRadius: 16,
  },
  logoutLabel: { fontFamily: 'Inter-Regular', fontSize: 14, color: '#EF4444', fontWeight: '600' },
});
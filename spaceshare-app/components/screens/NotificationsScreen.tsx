import { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { router, useFocusEffect } from 'expo-router';
import { useSelector } from 'react-redux';
import { RootState } from '@/store';
import * as Notifications from 'expo-notifications';
import { notificationsAPI } from '@/services/api';

type NotificationType =
  | 'BOOKING_REQUEST_SENT' | 'BOOKING_APPROVED' | 'BOOKING_DECLINED' | 'BOOKING_CANCELLED'
  | 'PAYMENT_SUCCESSFUL' | 'PAYMENT_FAILED' | 'REVIEW_REMINDER' | 'DISPUTE_SUBMITTED' | 'REFUND_PROCESSED'
  | 'NEW_BOOKING_REQUEST' | 'LISTING_APPROVED' | 'LISTING_REJECTED' | 'REVIEW_RECEIVED' | 'PAYOUT_SENT';

type ApiNotification = {
  id: string;
  type: NotificationType;
  title: string;
  body: string;
  bookingId: string | null;
  read: boolean;
  createdAt: string;
};

const TYPE_ICON: Record<NotificationType, keyof typeof Feather.glyphMap> = {
  BOOKING_REQUEST_SENT: 'send',
  BOOKING_APPROVED: 'check-circle',
  BOOKING_DECLINED: 'x-circle',
  BOOKING_CANCELLED: 'slash',
  PAYMENT_SUCCESSFUL: 'credit-card',
  PAYMENT_FAILED: 'alert-triangle',
  REVIEW_REMINDER: 'star',
  DISPUTE_SUBMITTED: 'flag',
  REFUND_PROCESSED: 'rotate-ccw',
  NEW_BOOKING_REQUEST: 'inbox',
  LISTING_APPROVED: 'check-circle',
  LISTING_REJECTED: 'x-circle',
  REVIEW_RECEIVED: 'star',
  PAYOUT_SENT: 'dollar-sign',
};

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleString('en-GB', {
    day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
  });
}

type Props = {
  basePath: string;
};

export default function NotificationsScreen({ basePath }: Props) {
  const token = useSelector((state: RootState) => state.auth.token);
  const [permissionGranted, setPermissionGranted] = useState(true);
  const [bannerDismissed, setBannerDismissed] = useState(false);
  const [notifications, setNotifications] = useState<ApiNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState(false);

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

  const fetchNotifications = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      const res = await notificationsAPI.getMine(token);
      setNotifications(res.data.notifications ?? []);
    } catch (err) {
      console.log('Failed to fetch notifications:', err);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useFocusEffect(
    useCallback(() => {
      fetchNotifications();
    }, [fetchNotifications])
  );

  const unreadCount = notifications.filter((n) => !n.read).length;

  const handleMarkAllRead = async () => {
    if (!token) return;
    try {
      await notificationsAPI.markAllRead(token);
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
      setToast(true);
      setTimeout(() => setToast(false), 2000);
    } catch (err) {
      console.log('Failed to mark all as read:', err);
    }
  };

  const handleTapNotification = async (notif: ApiNotification) => {
    if (token && !notif.read) {
      try {
        await notificationsAPI.markRead(token, notif.id);
        setNotifications((prev) => prev.map((n) => (n.id === notif.id ? { ...n, read: true } : n)));
      } catch (err) {
        console.log('Failed to mark as read:', err);
      }
    }

    if (notif.bookingId) {
      router.push(`/booking-details/${notif.bookingId}`);
    }
  };

  const showBanner = !permissionGranted && !bannerDismissed;

  return (
    <SafeAreaView style={s.root}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Feather name="arrow-left" size={20} color="#020203" />
        </TouchableOpacity>
        <Text style={s.headerTitle}>Notifications</Text>
       <View style={{ width: 20 }} />
      </View>

      {toast && (
        <View style={s.toast}>
          <Feather name="check-circle" size={15} color="#16A34A" />
          <Text style={s.toastText}>Notifications marked as read.</Text>
        </View>
      )}

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

      {notifications.length > 0 && (
        <View style={s.listHeader}>
          <View style={s.unreadPill}>
            <Text style={s.unreadPillText}>Unread {unreadCount}</Text>
          </View>
          <TouchableOpacity onPress={handleMarkAllRead}>
            <View style={s.markAllRow}>
              <Text style={s.markAllText}>Mark all as read</Text>
              <Feather name="check" size={12} color="#6200EE" />
            </View>
          </TouchableOpacity>
        </View>
      )}

      {loading ? (
        <View style={s.emptyState}>
          <ActivityIndicator color="#6200EE" />
        </View>
      ) : notifications.length === 0 ? (
        <View style={s.emptyState}>
          <Feather name="bell" size={48} color="#D0D5DD" />
          <Text style={s.emptyText}>Relax! Your notifications will appear once you have any</Text>
        </View>
      ) : (
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={s.list}>
          {notifications.map((notif) => (
            <TouchableOpacity
              key={notif.id}
              style={s.notifRow}
              onPress={() => handleTapNotification(notif)}
              activeOpacity={0.7}
            >
              <View style={s.notifIconWrap}>
                <Feather name={TYPE_ICON[notif.type] ?? 'bell'} size={16} color="#6200EE" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={s.notifTitle}>{notif.title}</Text>
                <Text style={s.notifBody}>{notif.body}</Text>
                <Text style={s.notifDate}>{formatDate(notif.createdAt)}</Text>
              </View>
              {!notif.read && <View style={s.unreadDot} />}
            </TouchableOpacity>
          ))}
          <View style={{ height: 20 }} />
        </ScrollView>
      )}
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

  listHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 12,
  },
  unreadPill: {
    backgroundColor: '#FEE2E2', borderRadius: 99, paddingHorizontal: 10, paddingVertical: 4,
  },
  unreadPillText: { fontFamily: 'Inter-Regular', fontSize: 11, fontWeight: '600', color: '#EF4444' },
  markAllRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  markAllText: { fontFamily: 'Inter-Regular', fontSize: 12, fontWeight: '600', color: '#6200EE' },

  list: { paddingHorizontal: 16, gap: 4 },
  notifRow: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 10,
    paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#F2F4F7',
  },
  notifIconWrap: {
    width: 32, height: 32, borderRadius: 16, backgroundColor: '#EDE9FF',
    alignItems: 'center', justifyContent: 'center', marginTop: 2,
  },
  notifTitle: { fontFamily: 'Inter-Regular', fontWeight: '600', fontSize: 14, color: '#020203' },
  notifBody: { fontFamily: 'Inter-Regular', fontSize: 13, color: '#6A7181', marginTop: 2, lineHeight: 18 },
  notifDate: { fontFamily: 'Inter-Regular', fontSize: 11, color: '#98A2B3', marginTop: 4 },
  unreadDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#6200EE', marginTop: 6 },

  emptyState: {
    flex: 1, alignItems: 'center', justifyContent: 'center',
    paddingHorizontal: 40, gap: 12,
  },
  emptyText: {
    fontFamily: 'Inter-Regular', fontSize: 14, color: '#6A7181',
    textAlign: 'center', lineHeight: 20,
  },
});
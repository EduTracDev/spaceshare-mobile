import { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, Image, ScrollView,
  Linking, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { useLocalSearchParams, router, useFocusEffect } from 'expo-router';
import { useSelector } from 'react-redux';
import { RootState } from '@/store';
import { bookingsAPI } from '@/services/api';

type BookingStatus = 'PENDING' | 'APPROVED' | 'DECLINED' | 'PAID' | 'COMPLETED' | 'CANCELLED';

type AddOnBreakdownItem = { name: string; total: number };

type ApiBooking = {
  id: string;
  spaceName: string;
  spaceLocation: string;
  spacePrice: number;
  totalPrice: number;
  startDate: string;
  endDate: string;
  startTime: string;
  endTime: string;
  guests: number;
  status: BookingStatus;
  cautionFee: number;
  serviceFee: number;
  addOnsBreakdown: AddOnBreakdownItem[] | null;
  createdAt: string;
  listing?: { photos: string[] };
  guest?: {
    firstName: string | null;
    lastName: string | null;
    email: string;
    phone: string | null;
    avatarUrl: string | null;
  };
};

const STATUS_BADGE: Record<BookingStatus, { bg: string; text: string }> = {
  PENDING: { bg: '#FFEDD5', text: '#F97316' },
  APPROVED: { bg: '#DCFCE7', text: '#16A34A' },
  DECLINED: { bg: '#FEE2E2', text: '#EF4444' },
  PAID: { bg: '#DBEAFE', text: '#2563EB' },
  COMPLETED: { bg: '#EDE9FE', text: '#6200EE' },
  CANCELLED: { bg: '#F2F4F7', text: '#6A7181' },
};

const STATUS_LABEL: Record<BookingStatus, string> = {
  PENDING: 'Pending',
  APPROVED: 'Approved',
  DECLINED: 'Declined',
  PAID: 'Paid',
  COMPLETED: 'Completed',
  CANCELLED: 'Cancelled',
};

export default function HostBookingDetails() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const token = useSelector((state: RootState) => state.auth.token);

  const [booking, setBooking] = useState<ApiBooking | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  const fetchBooking = useCallback(async () => {
    if (!token || !id) return;
    setLoading(true);
    try {
      const res = await bookingsAPI.getById(token, id);
      setBooking(res.data.booking);
    } catch (err) {
      console.log('Failed to fetch booking:', err);
      setBooking(null);
    } finally {
      setLoading(false);
    }
  }, [token, id]);

  useFocusEffect(
    useCallback(() => {
      fetchBooking();
    }, [fetchBooking])
  );

  const updateStatus = async (status: 'APPROVED' | 'DECLINED') => {
    if (!token || !booking) return;
    setActionLoading(true);
    try {
      const res = await bookingsAPI.updateStatus(token, booking.id, status);
      setBooking(res.data.booking);
    } catch (err) {
      console.log('Failed to update booking status:', err);
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={s.center}>
        <ActivityIndicator color="#6200EE" />
      </SafeAreaView>
    );
  }

  if (!booking) {
    return (
      <SafeAreaView style={s.root}>
        <TouchableOpacity onPress={() => router.back()} style={s.backBtnAlone}>
          <Feather name="arrow-left" size={20} color="#020203" />
        </TouchableOpacity>
        <View style={s.notFound}>
          <Text style={s.notFoundText}>Booking not found</Text>
        </View>
      </SafeAreaView>
    );
  }

  const isPending = booking.status === 'PENDING';
  const bookingCode = `#BK-${booking.id.slice(-4).toUpperCase()}`;
  const eventDate = new Date(booking.startDate).toLocaleDateString('en-GB', {
    day: 'numeric', month: 'short', year: 'numeric',
  });
  const total = booking.totalPrice ?? booking.spacePrice;
  const spaceImage = booking.listing?.photos?.[0];
  const guestName = [booking.guest?.firstName, booking.guest?.lastName].filter(Boolean).join(' ') || booking.guest?.email || 'Guest';
  const badge = STATUS_BADGE[booking.status];

  return (
    <SafeAreaView style={s.root}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Feather name="arrow-left" size={20} color="#020203" />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>
        <Image
          source={spaceImage ? { uri: spaceImage } : undefined}
          style={s.image}
          resizeMode="cover"
        />

        <View style={s.nameRow}>
          <Text style={s.name}>{booking.spaceName}</Text>
          <View style={[s.statusBadge, { backgroundColor: badge.bg }]}>
            <Text style={[s.statusBadgeText, { color: badge.text }]}>{STATUS_LABEL[booking.status]}</Text>
          </View>
        </View>

        <View style={s.metaRow}>
          <Feather name="map-pin" size={13} color="#6A7181" />
          <Text style={s.metaText}>{booking.spaceLocation}</Text>
        </View>
        <View style={s.metaRow}>
          <Feather name="calendar" size={13} color="#6A7181" />
          <Text style={s.metaText}>Event Date  {eventDate}</Text>
        </View>
        <View style={s.metaRow}>
          <Feather name="clock" size={13} color="#6A7181" />
          <Text style={s.metaText}>Event Time  {booking.startTime} - {booking.endTime}</Text>
        </View>
        <View style={s.metaRow}>
          <Feather name="users" size={13} color="#6A7181" />
          <Text style={s.metaText}>{booking.guests} Guests</Text>
        </View>

        <View style={s.idRow}>
          <Text style={s.idLabel}>Booking ID</Text>
          <Text style={s.idValue}>{bookingCode}</Text>
        </View>

        <View style={s.guestCard}>
          <Text style={s.guestLabel}>Guest Details</Text>
          <View style={s.guestRow}>
            <Text style={s.guestName}>{guestName}</Text>
            <View style={s.guestIcons}>
              {booking.guest?.email && (
                <TouchableOpacity
                  style={s.guestIconBtn}
                  onPress={() => Linking.openURL(`mailto:${booking.guest?.email}`)}
                >
                  <Feather name="mail" size={15} color="#6200EE" />
                </TouchableOpacity>
              )}
              {booking.guest?.phone && (
                <TouchableOpacity
                  style={s.guestIconBtn}
                  onPress={() => Linking.openURL(`tel:${booking.guest?.phone}`)}
                >
                  <Feather name="phone" size={15} color="#6200EE" />
                </TouchableOpacity>
              )}
            </View>
          </View>
        </View>

        <View style={s.breakdownCard}>
          <Text style={s.breakdownTitle}>Breakdown</Text>
          <View style={s.row}>
            <Text style={s.rowLabel}>Space Fee</Text>
            <Text style={s.rowValue}>₦{booking.spacePrice.toLocaleString()}</Text>
          </View>
          {(booking.addOnsBreakdown ?? []).map((a) => (
            <View key={a.name} style={s.row}>
              <Text style={s.rowLabel}>{a.name}</Text>
              <Text style={s.rowValue}>₦{a.total.toLocaleString()}</Text>
            </View>
          ))}
          {booking.cautionFee ? (
            <View style={s.row}>
              <Text style={s.rowLabel}>Refundable Caution Fee</Text>
              <Text style={s.rowValue}>₦{booking.cautionFee.toLocaleString()}</Text>
            </View>
          ) : null}
          {booking.serviceFee ? (
            <View style={s.row}>
              <Text style={s.rowLabel}>Service Fee</Text>
              <Text style={s.rowValue}>₦{booking.serviceFee.toLocaleString()}</Text>
            </View>
          ) : null}

          <View style={s.divider} />

          <View style={s.row}>
            <Text style={s.rowLabelBold}>Total</Text>
            <Text style={s.rowValueBold}>₦{total.toLocaleString()}</Text>
          </View>
        </View>

        <View style={{ height: 100 }} />
      </ScrollView>

      {isPending && (
        <View style={s.footer}>
          <TouchableOpacity
            style={s.declineBtnFull}
            onPress={() => updateStatus('DECLINED')}
            disabled={actionLoading}
          >
            {actionLoading ? <ActivityIndicator color="#EF4444" /> : (
              <Text style={s.declineBtnText}>Decline</Text>
            )}
          </TouchableOpacity>
          <TouchableOpacity
            style={s.approveBtnFull}
            onPress={() => updateStatus('APPROVED')}
            disabled={actionLoading}
          >
            {actionLoading ? <ActivityIndicator color="#FFFFFF" /> : (
              <Text style={s.approveBtnText}>Approve</Text>
            )}
          </TouchableOpacity>
        </View>
      )}
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#FFFFFF' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#FFFFFF' },
  header: { paddingHorizontal: 16, paddingVertical: 12 },
  backBtnAlone: { padding: 16 },
  notFound: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  notFoundText: { fontFamily: 'Inter-Regular', fontSize: 14, color: '#6A7181' },

  content: { paddingHorizontal: 16, gap: 6 },
  image: { width: '100%', height: 190, borderRadius: 14, marginBottom: 10, backgroundColor: '#F2F4F7' },

  nameRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  name: { flex: 1, fontFamily: 'MonaSans-Bold', fontSize: 19, color: '#020203' },
  statusBadge: { borderRadius: 99, paddingHorizontal: 10, paddingVertical: 4 },
  statusBadgeText: { fontFamily: 'Inter-Regular', fontSize: 11, fontWeight: '700' },

  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 2 },
  metaText: { fontFamily: 'Inter-Regular', fontSize: 13, color: '#6A7181' },

  idRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    marginTop: 14, paddingVertical: 12, borderTopWidth: 1, borderBottomWidth: 1,
    borderColor: '#F2F4F7',
  },
  idLabel: { fontFamily: 'Inter-Regular', fontSize: 13, color: '#6A7181' },
  idValue: { fontFamily: 'MonaSans-Bold', fontSize: 14, color: '#020203' },

  guestCard: { marginTop: 14, gap: 8 },
  guestLabel: { fontFamily: 'Inter-Regular', fontSize: 12, color: '#6A7181' },
  guestRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  guestName: { fontFamily: 'MonaSans-Bold', fontSize: 15, color: '#6200EE' },
  guestIcons: { flexDirection: 'row', gap: 8 },
  guestIconBtn: {
    width: 32, height: 32, borderRadius: 16, backgroundColor: '#F2F4F7',
    alignItems: 'center', justifyContent: 'center',
  },

  breakdownCard: {
    marginTop: 20, gap: 8,
    borderWidth: 1, borderColor: '#F2F4F7', borderRadius: 12,
    paddingHorizontal: 14, paddingVertical: 14,
  },
  breakdownTitle: { fontFamily: 'MonaSans-Bold', fontSize: 15, color: '#020203', marginBottom: 4 },
  row: { flexDirection: 'row', justifyContent: 'space-between' },
  rowLabel: { fontFamily: 'Inter-Regular', fontSize: 13, color: '#6A7181' },
  rowValue: { fontFamily: 'Inter-Regular', fontSize: 13, color: '#020203' },
  divider: { height: 1, backgroundColor: '#F2F4F7', marginVertical: 6 },
  rowLabelBold: { fontFamily: 'Inter-Regular', fontWeight: '700', fontSize: 14, color: '#020203' },
  rowValueBold: { fontFamily: 'Inter-Regular', fontWeight: '700', fontSize: 14, color: '#020203' },

  footer: {
    flexDirection: 'row', gap: 12, padding: 16,
    borderTopWidth: 1, borderTopColor: '#F2F4F7', backgroundColor: '#FFFFFF',
  },
  declineBtnFull: {
    flex: 1, backgroundColor: '#FFDCDB', borderRadius: 99, height: 52,
    alignItems: 'center', justifyContent: 'center',
  },
  declineBtnText: { color: '#EF4444', fontFamily: 'Inter-Regular', fontWeight: '600', fontSize: 15 },
  approveBtnFull: {
    flex: 1, backgroundColor: '#6200EE', borderRadius: 99, height: 52,
    alignItems: 'center', justifyContent: 'center',
  },
  approveBtnText: { color: '#FFFFFF', fontFamily: 'Inter-Regular', fontWeight: '600', fontSize: 15 },
});
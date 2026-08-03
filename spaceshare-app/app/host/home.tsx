import { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Modal,
  ActivityIndicator,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { router, useFocusEffect } from 'expo-router';
import { useSelector, useDispatch } from 'react-redux';
import { RootState } from '@/store';
import { updateUser } from '@/store/slices/authSlice';
import { userAPI, listingsAPI, bookingsAPI } from '@/services/api';

type BookingStatus = 'PENDING' | 'APPROVED' | 'DECLINED' | 'PAID' | 'COMPLETED' | 'CANCELLED';

type ApiListing = { id: string; status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'SUSPENDED' };

type ApiBooking = {
  id: string;
  spaceName: string;
  startDate: string;
  status: BookingStatus;
  guest?: { firstName: string | null; lastName: string | null; email: string };
};

const SHORT_MONTHS = ['JAN','FEB','MAR','APR','MAY','JUN','JUL','AUG','SEP','OCT','NOV','DEC'];

function daysUntil(dateStr: string) {
  const target = new Date(dateStr);
  target.setHours(0, 0, 0, 0);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const diff = Math.round((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  if (diff === 0) return 'today';
  if (diff === 1) return '1 day';
  return `${diff} days`;
}

export default function HostHome() {
  const dispatch = useDispatch();
  const firstName = useSelector((state: RootState) => state.auth.user?.firstName);
  const token = useSelector((state: RootState) => state.auth.token);
  const isFirstLogin = useSelector((state: RootState) => state.auth.user?.isFirstLogin ?? false);

  const [loading, setLoading] = useState(true);
  const [listings, setListings] = useState<ApiListing[]>([]);
  const [bookings, setBookings] = useState<ApiBooking[]>([]);

  const fetchData = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      const [listingsRes, bookingsRes] = await Promise.all([
        listingsAPI.getMine(token),
        bookingsAPI.getHostBookings(token),
      ]);
      setListings(listingsRes.data.listings ?? []);
      setBookings(bookingsRes.data.bookings ?? []);
    } catch (err) {
      console.log('Failed to fetch host home data:', err);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useFocusEffect(
    useCallback(() => {
      fetchData();
    }, [fetchData])
  );

  const activeListings = listings.filter((l) => l.status === 'APPROVED').length;
  const totalBookings = bookings.length;

  const pendingRequests = bookings
    .filter((b) => b.status === 'PENDING')
    .slice(0, 5)
    .map((b) => ({
      id: b.id,
      name: [b.guest?.firstName, b.guest?.lastName].filter(Boolean).join(' ') || b.guest?.email || 'Guest',
      listing: b.spaceName,
      date: new Date(b.startDate).toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' }),
    }));

  const upcomingEvents = bookings
    .filter((b) => (b.status === 'APPROVED' || b.status === 'PAID') && new Date(b.startDate) >= new Date())
    .sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime())
    .slice(0, 5)
    .map((b) => {
      const d = new Date(b.startDate);
      return {
        id: b.id,
        month: SHORT_MONTHS[d.getMonth()],
        day: String(d.getDate()),
        title: b.spaceName,
        guest: [b.guest?.firstName, b.guest?.lastName].filter(Boolean).join(' ') || b.guest?.email || 'Guest',
        when: daysUntil(b.startDate),
      };
    });

  const handleListFirstSpace = async () => {
    try {
      if (token) await userAPI.completeFirstLogin(token);
      dispatch(updateUser({ isFirstLogin: false }));
    } catch (err) {
      console.log('Failed to mark first login complete:', err);
    }
    router.push('/host/create-listing');
  };

  return (
    <View style={s.root}>
      <SafeAreaView edges={['top']} style={s.safeTop}>
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={s.scroll}>
          {/* Header */}
          <View style={s.headerRow}>
            <View style={s.avatarCircle}>
              <Text style={s.avatarText}>
                {firstName ? firstName.charAt(0).toUpperCase() : 'H'}
              </Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={s.greetingSmall}>Hello,</Text>
              <Text style={s.greetingName}>{firstName || 'Host'}</Text>
            </View>
            <TouchableOpacity style={s.bellBtn}>
              <Feather name="bell" size={20} color="#020203" />
            </TouchableOpacity>
          </View>

          {loading ? (
            <View style={s.loadingWrap}>
              <ActivityIndicator color="#6200EE" />
            </View>
          ) : (
            <>
              {/* Stats */}
              <View style={s.statsRow}>
                <View style={[s.statCard, s.statCardPink]}>
                  <View style={s.statLabelRow}>
                    <Image source={require('../../assets/icons/active.png')} style={s.statIcon} resizeMode="contain" />
                    <Text style={s.statLabel}>Active Listing</Text>
                  </View>
                  <Text style={s.statValue}>{activeListings}</Text>
                </View>
                <View style={[s.statCard, s.statCardBlue]}>
                  <View style={s.statLabelRow}>
                    <Image source={require('../../assets/icons/notebook.png')} style={s.statIcon} resizeMode="contain" />
                    <Text style={s.statLabel}>Total Bookings</Text>
                  </View>
                  <Text style={s.statValue}>{totalBookings}</Text>
                </View>
              </View>

              {/* Pending Requests */}
              <View style={s.sectionHeaderRow}>
                <View style={s.sectionHeaderLeft}>
                  <Image source={require('../../assets/icons/pending.png')} style={s.sectionIcon} resizeMode="contain" />
                  <Text style={s.sectionTitle}>Pending requests</Text>
                </View>
                {pendingRequests.length > 0 && (
                  <TouchableOpacity onPress={() => router.push('/host/requests')}>
                    <Text style={s.viewAll}>View all</Text>
                  </TouchableOpacity>
                )}
              </View>

              {listings.length === 0 ? (
                <View style={s.emptyCard}>
                  <Text style={s.emptyCardTitle}>Ready to host?</Text>
                  <Text style={s.emptyCardSubtitle}>Add your first space and start receiving requests.</Text>
                </View>
              ) : pendingRequests.length === 0 ? (
                <View style={s.emptyCard}>
                  <Text style={s.emptyCardTitle}>No bookings yet</Text>
                  <Text style={s.emptyCardSubtitle}>New guest bookings will appear here.</Text>
                </View>
              ) : (
                <View style={s.listWrap}>
                  {pendingRequests.map((req) => (
                    <View key={req.id} style={s.requestRow}>
                      <View style={{ flex: 1 }}>
                        <Text style={s.requestName}>{req.name}</Text>
                        <Text style={s.requestMeta}>{req.listing} • {req.date}</Text>
                      </View>
                      <TouchableOpacity
                        style={s.reviewBtn}
                        onPress={() => router.push('/host/requests')}
                      >
                        <Text style={s.reviewBtnText}>Review</Text>
                      </TouchableOpacity>
                    </View>
                  ))}
                </View>
              )}

              {/* Upcoming Events */}
              <View style={[s.sectionHeaderRow, { marginTop: 24 }]}>
                <View style={s.sectionHeaderLeft}>
                  <Image source={require('../../assets/icons/upcoming.png')} style={s.sectionIcon} resizeMode="contain" />
                  <Text style={s.sectionTitle}>Upcoming Events</Text>
                </View>
              </View>

              {upcomingEvents.length === 0 ? (
                <View style={s.emptyCard}>
                  <Text style={s.emptyCardTitle}>No upcoming events yet.</Text>
                  <Text style={s.emptyCardSubtitle}>Confirmed bookings will appear here.</Text>
                </View>
              ) : (
                <View style={s.listWrap}>
                  {upcomingEvents.map((ev) => (
                    <TouchableOpacity
                      key={ev.id}
                      style={s.eventRow}
                      onPress={() => router.push('/host/requests')}
                    >
                      <View style={s.eventDateBox}>
                        <Text style={s.eventMonth}>{ev.month}</Text>
                        <Text style={s.eventDay}>{ev.day}</Text>
                      </View>
                      <View style={{ flex: 1 }}>
                        <View style={s.eventTitleRow}>
                          <Text style={s.eventTitle}>{ev.title}</Text>
                          <Feather name="user" size={11} color="#98A2B3" />
                          <Text style={s.eventGuestName}>{ev.guest}</Text>
                        </View>
                        <Text style={s.eventMeta}>Happening in {ev.when}</Text>
                      </View>
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            </>
          )}

          <View style={{ height: 40 }} />
        </ScrollView>
      </SafeAreaView>

      {/* First-time login modal */}
      <Modal
        visible={isFirstLogin}
        transparent
        animationType="slide"
        onRequestClose={() => dispatch(updateUser({ isFirstLogin: false }))}
      >
        <View style={s.modalOverlay}>
          <View style={s.modalCard}>
            <Text style={s.modalEmoji}>🎉</Text>
            <Text style={s.modalTitle}>Welcome aboard!</Text>
            <Text style={s.modalSubtitle}>
              Your profile is ready. Let's list your space and start welcoming guests.
            </Text>
            <TouchableOpacity style={s.modalBtn} onPress={handleListFirstSpace} activeOpacity={0.85}>
              <Text style={s.modalBtnText}>List Your First Space</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#FFFFFF' },
  safeTop: { flex: 1, backgroundColor: '#FFFFFF' },
  scroll: { paddingHorizontal: 16, paddingTop: 8 },

  headerRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 20 },
  avatarCircle: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: '#6200EE', alignItems: 'center', justifyContent: 'center',
  },
  avatarText: { color: '#FFFFFF', fontFamily: 'MonaSans-Bold', fontSize: 14 },
  greetingSmall: { fontFamily: 'Inter-Regular', fontSize: 12, color: '#6A7181' },
  greetingName: { fontFamily: 'MonaSans-Bold', fontSize: 16, color: '#020203' },
  bellBtn: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: '#F2F4F7', alignItems: 'center', justifyContent: 'center',
  },

  loadingWrap: { paddingVertical: 60, alignItems: 'center' },

  statsRow: { flexDirection: 'row', gap: 12, marginBottom: 24 },
  statCard: {
    flex: 1, backgroundColor: 'transparent', borderRadius: 12,
    padding: 12, borderWidth: 1,
  },
  statCardPink: { borderColor: '#ED39A2' },
  statCardBlue: { borderColor: '#0072CC' },
  statLabelRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8 },
  statIcon: { width: 13, height: 13 },
  statLabel: { fontFamily: 'Inter-Regular', fontSize: 12, color: '#6A7181' },
  statValue: { fontFamily: 'MonaSans-Bold', fontSize: 20, color: '#020203' },

  sectionHeaderRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10,
  },
  sectionHeaderLeft: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  sectionIcon: { width: 14, height: 14 },
  sectionTitle: { fontFamily: 'MonaSans-Bold', fontSize: 14, color: '#020203' },
  viewAll: { fontFamily: 'Inter-Regular', fontSize: 12, color: '#6200EE', fontWeight: '600' },

  emptyCard: {
    borderWidth: 1, borderColor: '#F2F4F7', borderRadius: 12,
    paddingVertical: 48, alignItems: 'center', justifyContent: 'center', gap: 6, minHeight: 200,
  },
  emptyCardTitle: { fontFamily: 'Inter-Regular', fontSize: 13, color: '#3A414E', fontWeight: '600' },
  emptyCardSubtitle: { fontFamily: 'Inter-Regular', fontSize: 12, color: '#98A2B3' },

  listWrap: { gap: 10 },
  requestRow: {
    flexDirection: 'row', alignItems: 'center',
    borderWidth: 1, borderColor: '#F2F4F7', borderRadius: 12, padding: 12,
  },
  requestName: { fontFamily: 'Inter-Regular', fontSize: 14, color: '#020203', fontWeight: '600' },
  requestMeta: { fontFamily: 'Inter-Regular', fontSize: 12, color: '#98A2B3', marginTop: 2 },
  reviewBtn: {
    backgroundColor: '#6200EE', borderRadius: 99, paddingHorizontal: 14, paddingVertical: 7,
  },
  reviewBtnText: { color: '#FFFFFF', fontFamily: 'Inter-Regular', fontSize: 12, fontWeight: '600' },

  eventRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    borderWidth: 1, borderColor: '#F2F4F7', borderRadius: 12, padding: 12,
  },
  eventDateBox: {
    width: 44, alignItems: 'center', backgroundColor: '#F9F7FF',
    borderRadius: 8, paddingVertical: 6,
  },
  eventMonth: { fontFamily: 'Inter-Regular', fontSize: 10, color: '#6200EE', fontWeight: '600' },
  eventDay: { fontFamily: 'MonaSans-Bold', fontSize: 15, color: '#020203' },
  eventTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  eventTitle: { fontFamily: 'Inter-Regular', fontSize: 14, color: '#020203', fontWeight: '600' },
  eventGuestName: { fontFamily: 'Inter-Regular', fontSize: 12, color: '#98A2B3' },
  eventMeta: { fontFamily: 'Inter-Regular', fontSize: 12, color: '#FF3B30', marginTop: 2 },

  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(2,2,3,0.5)',
  },
  modalCard: {
    width: '100%',
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingVertical: 32,
    paddingHorizontal: 24,
    paddingBottom: 40,
    alignItems: 'center',
    gap: 8,
  },
  modalEmoji: { fontSize: 48, marginBottom: 8 },
  modalTitle: { fontFamily: 'MonaSans-Bold', fontSize: 18, color: '#020203', textAlign: 'center' },
  modalSubtitle: {
    fontFamily: 'Inter-Regular', fontSize: 14, color: '#6A7181',
    textAlign: 'center', lineHeight: 20, marginBottom: 16,
  },
  modalBtn: {
    backgroundColor: '#6200EE', borderRadius: 99, height: 52,
    paddingHorizontal: 32, alignItems: 'center', justifyContent: 'center', width: '100%',
  },
  modalBtnText: { color: '#FFFFFF', fontFamily: 'Inter-Regular', fontWeight: '600', fontSize: 15 },
});
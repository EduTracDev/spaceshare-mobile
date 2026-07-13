import { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Modal,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useSelector, useDispatch } from 'react-redux';
import { RootState } from '@/store';
import { setFirstLoginDone } from '@/store/slices/authSlice';
import { BlurView } from 'expo-blur';

const { width } = Dimensions.get('window');

// TODO: replace with real data once host stats/requests/events endpoints exist
type PendingRequest = { id: string; name: string; listing: string; date: string };
type UpcomingEvent = { id: string; month: string; day: string; title: string; guest: string; when: string };

export default function HostHome() {
  const dispatch = useDispatch();
  const firstName = useSelector((state: RootState) => state.auth.user?.firstName);
  const isFirstLogin = useSelector((state: RootState) => state.auth.isFirstLogin);

  // TODO: replace mocks with real fetched data
  const activeListings = 0;
  const totalBookings = 0;
  const pendingRequests: PendingRequest[] = [];
  const upcomingEvents: UpcomingEvent[] = [];

  const hasActivity = pendingRequests.length > 0 || upcomingEvents.length > 0;

  const handleListFirstSpace = () => {
    dispatch(setFirstLoginDone());
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

          {/* Stats */}
          <View style={s.statsRow}>
  <View style={[s.statCard, s.statCardPink]}>
    <View style={s.statLabelRow}>
      <Feather name="tag" size={13} color="#ED39A2" />
      <Text style={s.statLabel}>Active Listing</Text>
    </View>
    <Text style={s.statValue}>{activeListings}</Text>
  </View>
  <View style={[s.statCard, s.statCardBlue]}>
    <View style={s.statLabelRow}>
      <Feather name="book" size={13} color="#0072CC" />
      <Text style={s.statLabel}>Total Bookings</Text>
    </View>
    <Text style={s.statValue}>{totalBookings}</Text>
  </View>
</View>

          {/* Pending Requests */}
          <View style={s.sectionHeaderRow}>
            <View style={s.sectionHeaderLeft}>
              <Feather name="inbox" size={14} color="#020203" />
              <Text style={s.sectionTitle}>Pending requests</Text>
            </View>
            {pendingRequests.length > 0 && (
              <TouchableOpacity onPress={() => router.push('/host/requests')}>
                <Text style={s.viewAll}>View all</Text>
              </TouchableOpacity>
            )}
          </View>

          {pendingRequests.length === 0 ? (
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
                  <TouchableOpacity style={s.reviewBtn}>
                    <Text style={s.reviewBtnText}>Review</Text>
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          )}

          {/* Upcoming Events */}
          <View style={[s.sectionHeaderRow, { marginTop: 24 }]}>
            <View style={s.sectionHeaderLeft}>
              <Feather name="calendar" size={14} color="#020203" />
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
                <View key={ev.id} style={s.eventRow}>
                  <View style={s.eventDateBox}>
                    <Text style={s.eventMonth}>{ev.month}</Text>
                    <Text style={s.eventDay}>{ev.day}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={s.eventTitle}>{ev.title}</Text>
                    <Text style={s.eventMeta}>
                      <Feather name="user" size={11} /> {ev.guest} · Happening in {ev.when}
                    </Text>
                  </View>
                </View>
              ))}
            </View>
          )}

          <View style={{ height: 40 }} />
        </ScrollView>
      </SafeAreaView>

      {/* First-time login modal */}
      {/* First-time login modal */}
<Modal
  visible={isFirstLogin}
  transparent
  animationType="slide"
  onRequestClose={() => dispatch(setFirstLoginDone())}
>
  <BlurView intensity={40} tint="dark" style={s.modalOverlay}>
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
  </BlurView>
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

  statsRow: { flexDirection: 'row', gap: 12, marginBottom: 24 },
 statCard: {
  flex: 1, backgroundColor: 'transparent', borderRadius: 12,
  padding: 12, borderWidth: 1,
},
statCardPink: {
  borderColor: '#ED39A2',
},
statCardBlue: {
  borderColor: '#0072CC',
},
  statLabelRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8 },
  statLabel: { fontFamily: 'Inter-Regular', fontSize: 12, color: '#6A7181' },
  statValue: { fontFamily: 'MonaSans-Bold', fontSize: 20, color: '#020203' },

  sectionHeaderRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10,
  },
  sectionHeaderLeft: { flexDirection: 'row', alignItems: 'center', gap: 6 },
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
  eventTitle: { fontFamily: 'Inter-Regular', fontSize: 14, color: '#020203', fontWeight: '600' },
  eventMeta: { fontFamily: 'Inter-Regular', fontSize: 12, color: '#98A2B3', marginTop: 2 },

modalOverlay: {
  flex: 1,
  justifyContent: 'flex-end',
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
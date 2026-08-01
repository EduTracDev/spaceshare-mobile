import { useState, useCallback } from 'react';
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
import BottomNav from '@/components/BottomNav';
import { useSelector } from 'react-redux';
import { RootState } from '@/store';
import { router, useFocusEffect } from 'expo-router';
import { bookingsAPI } from '@/services/api';

type BookingStatus = 'PENDING' | 'APPROVED' | 'DECLINED' | 'PAID' | 'COMPLETED' | 'CANCELLED';

type ApiBooking = {
  id: string;
  spaceName: string;
  spaceLocation: string;
  spacePrice: number;
  totalPrice: number;
  startDate: string;
  status: BookingStatus;
  listing?: { photos: string[] };
};

type Booking = {
  id: string;
  name: string;
  location: string;
  date: string;
  price: number;
  status: BookingStatus;
  image: string | null;
  category: 'upcoming' | 'completed';
};

const STATUS_COLORS: Record<BookingStatus, { bg: string; text: string }> = {
  APPROVED: { bg: '#DCFCE7', text: '#16A34A' },
  PENDING: { bg: '#FFEDD5', text: '#F97316' },
  PAID: { bg: '#DBEAFE', text: '#2563EB' },
  COMPLETED: { bg: '#EDE9FE', text: '#6200EE' },
  DECLINED: { bg: '#FEE2E2', text: '#EF4444' },
  CANCELLED: { bg: '#F2F4F7', text: '#6A7181' },
};

const STATUS_LABEL: Record<BookingStatus, string> = {
  APPROVED: 'Approved',
  PENDING: 'Pending',
  PAID: 'Paid',
  COMPLETED: 'Completed',
  DECLINED: 'Declined',
  CANCELLED: 'Cancelled',
};

type TabKey = 'all' | 'upcoming' | 'completed';

function categoryFor(status: BookingStatus): 'upcoming' | 'completed' {
  return status === 'COMPLETED' ? 'completed' : 'upcoming';
}

export default function MyBookings() {
  const [activeTab, setActiveTab] = useState<TabKey>('all');
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const token = useSelector((state: RootState) => state.auth.token);

  const fetchBookings = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      const res = await bookingsAPI.getMine(token);
      const apiBookings: ApiBooking[] = res.data.bookings ?? [];
      const mapped: Booking[] = apiBookings.map((b) => ({
        id: b.id,
        name: b.spaceName,
        location: b.spaceLocation,
        date: new Date(b.startDate).toDateString(),
        price: b.totalPrice ?? b.spacePrice,
        status: b.status,
        image: b.listing?.photos?.[0] ?? null,
        category: categoryFor(b.status),
      }));
      setBookings(mapped);
    } catch (err) {
      console.log('Failed to fetch bookings:', err);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useFocusEffect(
    useCallback(() => {
      fetchBookings();
    }, [fetchBookings])
  );

  const filteredBookings =
    activeTab === 'all'
      ? bookings
      : bookings.filter((b) => b.category === activeTab);

  return (
    <View style={s.root}>
      <SafeAreaView edges={['top']} style={s.safeTop}>
        <View style={s.header}>
          <Text style={s.headerTitle}>My Bookings</Text>
        </View>

        <View style={s.tabsRow}>
          <TouchableOpacity
            style={[s.tab, activeTab === 'all' && s.tabActive]}
            onPress={() => setActiveTab('all')}
          >
            <Text style={[s.tabText, activeTab === 'all' && s.tabTextActive]}>All</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[s.tab, activeTab === 'upcoming' && s.tabActive]}
            onPress={() => setActiveTab('upcoming')}
          >
            <Text style={[s.tabText, activeTab === 'upcoming' && s.tabTextActive]}>Upcoming</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[s.tab, activeTab === 'completed' && s.tabActive]}
            onPress={() => setActiveTab('completed')}
          >
            <Text style={[s.tabText, activeTab === 'completed' && s.tabTextActive]}>Completed</Text>
          </TouchableOpacity>
        </View>

        {loading ? (
          <View style={s.emptyState}>
            <ActivityIndicator color="#6200EE" />
          </View>
        ) : filteredBookings.length === 0 ? (
          <View style={s.emptyState}>
            <View style={s.emptyIconCircle}>
              <Feather name="calendar" size={32} color="#D0D5DD" />
            </View>
            <Text style={s.emptyText}>
              Your upcoming stays and reservations will appear here once you make a booking.
            </Text>
          </View>
        ) : (
          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={s.list}>
            {filteredBookings.map((booking) => (
              <TouchableOpacity
                key={booking.id}
                style={s.card}
                activeOpacity={0.85}
                onPress={() => router.push(`/booking-details/${booking.id}`)}
              >
                <Image
                  source={booking.image ? { uri: booking.image } : undefined}
                  style={s.cardImage}
                  resizeMode="cover"
                />
                <View style={s.cardInfo}>
                  <View style={s.cardTopRow}>
                    <Text style={s.cardName}>{booking.name}</Text>
                    <View style={[s.statusBadge, { backgroundColor: STATUS_COLORS[booking.status].bg }]}>
                      <Text style={[s.statusText, { color: STATUS_COLORS[booking.status].text }]}>
                        {STATUS_LABEL[booking.status]}
                      </Text>
                    </View>
                  </View>
                  <View style={s.cardMetaRow}>
                    <Feather name="map-pin" size={11} color="#6A7181" />
                    <Text style={s.cardMetaText}>{booking.location}</Text>
                  </View>
                  <View style={s.cardMetaRow}>
                    <Feather name="calendar" size={11} color="#6A7181" />
                    <Text style={s.cardMetaText}>{booking.date}</Text>
                  </View>
                  <Text style={s.cardPrice}>₦{booking.price.toLocaleString()}</Text>
                </View>
              </TouchableOpacity>
            ))}
            <View style={{ height: 20 }} />
          </ScrollView>
        )}
      </SafeAreaView>

      <BottomNav />
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#FFFFFF' },
  safeTop: { flex: 1, backgroundColor: '#FFFFFF' },

  header: { paddingHorizontal: 16, paddingVertical: 16 },
  headerTitle: { fontFamily: 'MonaSans-Bold', fontSize: 20, color: '#020203' },

  tabsRow: {
    flexDirection: 'row',
    marginHorizontal: 16,
    backgroundColor: '#F2F4F7',
    borderRadius: 99,
    padding: 4,
    marginBottom: 12,
  },
  tab: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 99,
    alignItems: 'center',
  },
  tabActive: {
    backgroundColor: '#6200EE',
  },
  tabText: { fontFamily: 'Inter-Regular', fontSize: 13, color: '#6A7181' },
  tabTextActive: { color: '#FFFFFF', fontWeight: '600' },

  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 40,
    gap: 12,
  },
  emptyIconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#F2F4F7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    fontFamily: 'Inter-Regular',
    fontSize: 13,
    color: '#6A7181',
    textAlign: 'center',
    lineHeight: 19,
  },

  list: { paddingHorizontal: 16, gap: 12 },
  card: {
    flexDirection: 'row',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#F2F4F7',
    overflow: 'hidden',
  },
  cardImage: { width: 90, height: 90, backgroundColor: '#F2F4F7' },
  cardInfo: { flex: 1, padding: 10, gap: 3 },
  cardTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 6,
  },
  cardName: { flex: 1, fontFamily: 'Inter-Regular', fontSize: 14, fontWeight: '600', color: '#020203' },
  statusBadge: { borderRadius: 99, paddingHorizontal: 8, paddingVertical: 3 },
  statusText: { fontFamily: 'Inter-Regular', fontSize: 10, fontWeight: '600' },
  cardMetaRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  cardMetaText: { fontFamily: 'Inter-Regular', fontSize: 11, color: '#6A7181' },
  cardPrice: { fontFamily: 'Inter-Regular', fontSize: 13, fontWeight: '700', color: '#020203', marginTop: 2 },
});
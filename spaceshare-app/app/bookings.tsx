import { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Image,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import BottomNav from '@/components/BottomNav';
import { useSelector } from 'react-redux';
import { RootState } from '@/store';
import { router } from 'expo-router';
import { BookingStatus } from '@/store/slices/bookingsSlice';

const { width } = Dimensions.get('window');

type Booking = {
  id: string;
  name: string;
  location: string;
  date: string;
  price: number;
  status: BookingStatus;
  image: any;
  category: 'upcoming' | 'completed';
};

const STATUS_COLORS: Record<BookingStatus, { bg: string; text: string }> = {
  Approved: { bg: '#DCFCE7', text: '#16A34A' },
  Pending: { bg: '#FFEDD5', text: '#F97316' },
  Paid: { bg: '#DBEAFE', text: '#2563EB' },
  Completed: { bg: '#EDE9FE', text: '#6200EE' },
  Declined: { bg: '#FEE2E2', text: '#EF4444' },
  Cancelled: { bg: '#F2F4F7', text: '#6A7181' },
};

type TabKey = 'all' | 'upcoming' | 'completed';

export default function MyBookings() {
  const [activeTab, setActiveTab] = useState<TabKey>('all');

  const reduxBookings = useSelector((state: RootState) => state.bookings.bookings);

  const allBookings: Booking[] = reduxBookings.map((b) => ({
    id: b.id,
    name: b.spaceName,
    location: b.spaceLocation,
    date: new Date(b.startDate).toDateString(),
    price: b.totalPrice ?? b.spacePrice,
    status: b.status,
    image: b.spaceImage,
    category: b.category,
  }));

  const filteredBookings =
    activeTab === 'all'
      ? allBookings
      : allBookings.filter((b) => b.category === activeTab);

  return (
    <View style={s.root}>
      <SafeAreaView edges={['top']} style={s.safeTop}>
        <View style={s.header}>
          <Text style={s.headerTitle}>My Bookings</Text>
        </View>

        {/* Tabs */}
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

        {filteredBookings.length === 0 ? (
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
                <Image source={booking.image} style={s.cardImage} resizeMode="cover" />
                <View style={s.cardInfo}>
                  <View style={s.cardTopRow}>
                    <Text style={s.cardName}>{booking.name}</Text>
                    <View style={[s.statusBadge, { backgroundColor: STATUS_COLORS[booking.status].bg }]}>
                      <Text style={[s.statusText, { color: STATUS_COLORS[booking.status].text }]}>
                        {booking.status}
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
  cardImage: { width: 90, height: 90 },
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
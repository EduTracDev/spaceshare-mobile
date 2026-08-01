import { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { router, useFocusEffect } from 'expo-router';
import { useSelector } from 'react-redux';
import { RootState } from '@/store';
import { bookingsAPI } from '@/services/api';

type BookingStatus = 'PENDING' | 'APPROVED' | 'DECLINED' | 'PAID' | 'COMPLETED' | 'CANCELLED';

type ApiBooking = {
  id: string;
  spaceName: string;
  totalPrice: number;
  spacePrice: number;
  startDate: string;
  status: BookingStatus;
  guest: { firstName: string | null; lastName: string | null; email: string };
};

type RequestItem = {
  id: string;
  guestName: string;
  spaceName: string;
  date: string;
  price: number;
  status: BookingStatus;
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

type TabKey = 'new' | 'all' | 'completed';

export default function HostRequests() {
  const token = useSelector((state: RootState) => state.auth.token);
  const [activeTab, setActiveTab] = useState<TabKey>('new');
  const [requests, setRequests] = useState<RequestItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);

  const fetchRequests = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      const res = await bookingsAPI.getHostBookings(token);
      const apiBookings: ApiBooking[] = res.data.bookings ?? [];
      const mapped: RequestItem[] = apiBookings.map((b) => ({
        id: b.id,
        guestName: [b.guest?.firstName, b.guest?.lastName].filter(Boolean).join(' ') || b.guest?.email || 'Guest',
        spaceName: b.spaceName,
        date: new Date(b.startDate).toLocaleDateString('en-GB', {
          day: '2-digit', month: '2-digit', year: 'numeric',
        }),
        price: b.totalPrice ?? b.spacePrice,
        status: b.status,
      }));
      setRequests(mapped);
    } catch (err) {
      console.log('Failed to fetch requests:', err);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useFocusEffect(
    useCallback(() => {
      fetchRequests();
    }, [fetchRequests])
  );

  const handleApprove = async (id: string) => {
    if (!token) return;
    setActionLoadingId(id);
    try {
      const res = await bookingsAPI.updateStatus(token, id, 'APPROVED');
      setRequests((prev) => prev.map((r) => (r.id === id ? { ...r, status: res.data.booking.status } : r)));
    } catch (err) {
      console.log('Failed to approve booking:', err);
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleDecline = async (id: string) => {
    if (!token) return;
    setActionLoadingId(id);
    try {
      const res = await bookingsAPI.updateStatus(token, id, 'DECLINED');
      setRequests((prev) => prev.map((r) => (r.id === id ? { ...r, status: res.data.booking.status } : r)));
    } catch (err) {
      console.log('Failed to decline booking:', err);
    } finally {
      setActionLoadingId(null);
    }
  };

  const filteredRequests =
    activeTab === 'new'
      ? requests.filter((r) => r.status === 'PENDING')
      : activeTab === 'completed'
      ? requests.filter((r) => r.status === 'COMPLETED')
      : requests;

  return (
    <View style={s.root}>
      <SafeAreaView edges={['top']} style={s.safeTop}>
        <View style={s.header}>
          <Text style={s.headerTitle}>Requests</Text>
        </View>

        <View style={s.tabsRow}>
          <TouchableOpacity
            style={[s.tab, activeTab === 'new' && s.tabActive]}
            onPress={() => setActiveTab('new')}
          >
            <Text style={[s.tabText, activeTab === 'new' && s.tabTextActive]}>New</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[s.tab, activeTab === 'all' && s.tabActive]}
            onPress={() => setActiveTab('all')}
          >
            <Text style={[s.tabText, activeTab === 'all' && s.tabTextActive]}>All</Text>
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
        ) : filteredRequests.length === 0 ? (
          <View style={s.emptyState}>
            <View style={s.emptyIconWrap}>
              <Feather name="inbox" size={32} color="#C4B5FD" />
            </View>
            <Text style={s.emptySubtitle}>
              {activeTab === 'new'
                ? 'No pending requests... Booking requests from guests will appear here.'
                : 'No requests found in this category.'}
            </Text>
          </View>
        ) : (
          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={s.list}>
            {filteredRequests.map((req) => (
              <TouchableOpacity
                key={req.id}
                style={s.card}
                activeOpacity={0.85}
                onPress={() => router.push(`/host/booking-details/${req.id}`)}
              >
                <View style={s.cardTopRow}>
                  <Text style={s.guestName}>{req.guestName}</Text>
                  <Text style={s.price}>₦{req.price.toLocaleString()}</Text>
                </View>
                <View style={s.cardBottomRow}>
                  <Text style={s.metaText}>{req.spaceName} • {req.date}</Text>
                  <View style={[s.statusBadge, { backgroundColor: STATUS_BADGE[req.status].bg }]}>
                    <Text style={[s.statusText, { color: STATUS_BADGE[req.status].text }]}>
                      {STATUS_LABEL[req.status]}
                    </Text>
                  </View>
                </View>

                {req.status === 'PENDING' && (
                  <View style={s.actionsRow}>
                    <TouchableOpacity
                      style={s.declineBtn}
                      onPress={() => handleDecline(req.id)}
                      disabled={actionLoadingId === req.id}
                    >
                      {actionLoadingId === req.id ? (
                        <ActivityIndicator color="#EF4444" size="small" />
                      ) : (
                        <Text style={s.declineBtnText}>Decline</Text>
                      )}
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={s.approveBtn}
                      onPress={() => handleApprove(req.id)}
                      disabled={actionLoadingId === req.id}
                    >
                      {actionLoadingId === req.id ? (
                        <ActivityIndicator color="#FFFFFF" size="small" />
                      ) : (
                        <Text style={s.approveBtnText}>Approve</Text>
                      )}
                    </TouchableOpacity>
                  </View>
                )}
              </TouchableOpacity>
            ))}
            <View style={{ height: 20 }} />
          </ScrollView>
        )}
      </SafeAreaView>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#FFFFFF' },
  safeTop: { flex: 1, backgroundColor: '#FFFFFF' },

  header: { paddingHorizontal: 16, paddingVertical: 16 },
  headerTitle: { fontFamily: 'MonaSans-Bold', fontSize: 20, color: '#020203' },

  tabsRow: {
    flexDirection: 'row', marginHorizontal: 16, backgroundColor: '#F2F4F7',
    borderRadius: 99, padding: 4, marginBottom: 12,
  },
  tab: { flex: 1, paddingVertical: 8, borderRadius: 99, alignItems: 'center' },
  tabActive: { backgroundColor: '#6200EE' },
  tabText: { fontFamily: 'Inter-Regular', fontSize: 13, color: '#6A7181' },
  tabTextActive: { color: '#FFFFFF', fontWeight: '600' },

  emptyState: {
    flex: 1, alignItems: 'center', justifyContent: 'center',
    paddingHorizontal: 32, gap: 8,
  },
  emptyIconWrap: {
    width: 72, height: 72, borderRadius: 36, backgroundColor: '#F3EAFF',
    alignItems: 'center', justifyContent: 'center', marginBottom: 8,
  },
  emptySubtitle: { fontFamily: 'Inter-Regular', fontSize: 13, color: '#6A7181', textAlign: 'center' },

  list: { paddingHorizontal: 16, gap: 12 },
  card: {
    borderWidth: 1, borderColor: '#F2F4F7', borderRadius: 14,
    padding: 14, gap: 8,
  },
  cardTopRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  guestName: { fontFamily: 'Inter-Regular', fontWeight: '600', fontSize: 14, color: '#020203' },
  price: { fontFamily: 'Inter-Regular', fontWeight: '600', fontSize: 14, color: '#020203' },
  cardBottomRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  metaText: { fontFamily: 'Inter-Regular', fontSize: 12, color: '#6A7181', flex: 1 },
  statusBadge: { borderRadius: 99, paddingHorizontal: 8, paddingVertical: 3 },
  statusText: { fontFamily: 'Inter-Regular', fontSize: 10, fontWeight: '600' },

  actionsRow: { flexDirection: 'row', gap: 10, marginTop: 4 },
  declineBtn: {
    flex: 1, height: 40, borderRadius: 99, borderWidth: 1, borderColor: '#FEE2E2',
    alignItems: 'center', justifyContent: 'center',
  },
  declineBtnText: { color: '#EF4444', fontFamily: 'Inter-Regular', fontWeight: '600', fontSize: 13 },
  approveBtn: {
    flex: 1, height: 40, borderRadius: 99, backgroundColor: '#6200EE',
    alignItems: 'center', justifyContent: 'center',
  },
  approveBtnText: { color: '#FFFFFF', fontFamily: 'Inter-Regular', fontWeight: '600', fontSize: 13 },
});
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
import { router, useFocusEffect } from 'expo-router';
import { useSelector } from 'react-redux';
import { RootState } from '@/store';
import { listingsAPI } from '@/services/api';

type Listing = {
  id: string;
  spaceName: string;
  area: string;
  addressLine: string;
  spacePrice: number;
  photos: string[];
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  createdAt: string;
};

type TabKey = 'All' | 'Pending' | 'Approved' | 'Rejected';
const TABS: TabKey[] = ['All', 'Pending', 'Approved', 'Rejected'];

const STATUS_BADGE: Record<string, { bg: string; text: string }> = {
  PENDING: { bg: '#FFEDD5', text: '#F97316' },
  APPROVED: { bg: '#DCFCE7', text: '#16A34A' },
  REJECTED: { bg: '#FEE2E2', text: '#EF4444' },
};

function formatPrice(listing: Listing) {
  return `₦${listing.spacePrice.toLocaleString()}`;
}

export default function MyListingsScreen() {
  const token = useSelector((state: RootState) => state.auth.token);
  const [activeTab, setActiveTab] = useState<TabKey>('All');
  const [listings, setListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);
  const [menuOpenFor, setMenuOpenFor] = useState<string | null>(null);

  const fetchListings = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      const res = await listingsAPI.getMine(token);
      setListings(res.data.listings ?? []);
    } catch (err) {
      console.log('Failed to fetch listings:', err);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useFocusEffect(
    useCallback(() => {
      fetchListings();
    }, [fetchListings])
  );

  const filteredListings =
    activeTab === 'All'
      ? listings
      : listings.filter((l) => l.status === activeTab.toUpperCase());

  return (
    <View style={s.root}>
      <SafeAreaView edges={['top']} style={s.safeTop}>
        <View style={s.header}>
          <Text style={s.headerTitle}>My Listings</Text>
        </View>

        {listings.length > 0 && (
          <View style={s.tabsRow}>
            {TABS.map((tab) => (
              <TouchableOpacity
                key={tab}
                style={[s.tab, activeTab === tab && s.tabActive]}
                onPress={() => setActiveTab(tab)}
              >
                <Text style={[s.tabText, activeTab === tab && s.tabTextActive]}>{tab}</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {loading ? (
          <View style={s.center}>
            <ActivityIndicator color="#6200EE" />
          </View>
        ) : listings.length === 0 ? (
          <View style={s.emptyState}>
            <View style={s.emptyIconWrap}>
              <Feather name="file-plus" size={32} color="#C4B5FD" />
            </View>
            <Text style={s.emptyTitle}>Ready to host?</Text>
            <Text style={s.emptySubtitle}>
              Add your first space and start receiving requests.
            </Text>
          </View>
        ) : filteredListings.length === 0 ? (
          <View style={s.emptyState}>
            <View style={s.emptyIconWrap}>
              <Feather name="inbox" size={32} color="#C4B5FD" />
            </View>
            <Text style={s.emptySubtitle}>Listings in this category will appear here once available.</Text>
          </View>
        ) : (
          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={s.list}>
            {filteredListings.map((listing) => (
              <TouchableOpacity
                key={listing.id}
                style={s.card}
                activeOpacity={0.85}
                onPress={() => router.push(`/host/my-listings/${listing.id}`)}
              >
                <Image
                  source={listing.photos[0] ? { uri: listing.photos[0] } : undefined}
                  style={s.cardImage}
                  resizeMode="cover"
                />
                <View style={s.cardInfo}>
                  <View style={s.cardTopRow}>
                    <Text style={s.cardName} numberOfLines={1}>{listing.spaceName}</Text>
                    <TouchableOpacity
                      hitSlop={8}
                      onPress={() => setMenuOpenFor(menuOpenFor === listing.id ? null : listing.id)}
                    >
                      <Feather name="more-vertical" size={16} color="#98A2B3" />
                    </TouchableOpacity>

                    {menuOpenFor === listing.id && (
                      <View style={s.dropdownMenu}>
                        <TouchableOpacity
                          style={s.dropdownItem}
                          onPress={() => {
                            setMenuOpenFor(null);
                            router.push(`/host/my-listings/${listing.id}/edit`);
                          }}
                        >
                          <Feather name="edit-2" size={14} color="#3A414E" />
                          <Text style={s.dropdownText}>Edit Space</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={s.dropdownItem}
                          onPress={() => {
                            setMenuOpenFor(null);
                            router.push(`/host/my-listings/${listing.id}/availability`);
                          }}
                        >
                          <Feather name="calendar" size={14} color="#3A414E" />
                          <Text style={s.dropdownText}>Edit availability</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={[s.dropdownItem, s.dropdownItemLast]}
                          onPress={() => setMenuOpenFor(null)}
                        >
                          <Feather name="trash-2" size={14} color="#EF4444" />
                          <Text style={[s.dropdownText, s.dropdownTextDanger]}>Delete Space</Text>
                        </TouchableOpacity>
                      </View>
                    )}
                  </View>

                  <View style={s.cardMetaRow}>
                    <Text style={s.cardMetaText} numberOfLines={1}>{listing.area}</Text>
                  </View>

                  <Text style={s.cardPrice}>{formatPrice(listing)}</Text>

                  <View style={s.cardBottomRow}>
                    <View style={s.cardDateRow}>
                      <Feather name="calendar" size={11} color="#6A7181" />
                      <Text style={s.cardMetaText}>
                        {new Date(listing.createdAt).toLocaleDateString()}
                      </Text>
                    </View>
                    <View style={[s.statusBadge, { backgroundColor: STATUS_BADGE[listing.status].bg }]}>
                      <Text style={[s.statusText, { color: STATUS_BADGE[listing.status].text }]}>
                        {listing.status}
                      </Text>
                    </View>
                  </View>
                </View>
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

  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },

  emptyState: {
    flex: 1, alignItems: 'center', justifyContent: 'center',
    paddingHorizontal: 32, gap: 8,
  },
  emptyIconWrap: {
    width: 72, height: 72, borderRadius: 36, backgroundColor: '#F3EAFF',
    alignItems: 'center', justifyContent: 'center', marginBottom: 8,
  },
  emptyTitle: { fontFamily: 'MonaSans-Bold', fontSize: 16, color: '#020203' },
  emptySubtitle: { fontFamily: 'Inter-Regular', fontSize: 13, color: '#6A7181', textAlign: 'center' },

  list: { paddingHorizontal: 16, gap: 12 },
  card: {
    flexDirection: 'row', borderRadius: 14, borderWidth: 1, borderColor: '#F2F4F7', overflow: 'hidden',
  },
  cardImage: { width: 90, height: 90, backgroundColor: '#F2F4F7' },
  cardInfo: { flex: 1, padding: 10, gap: 3 },
  cardTopRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 6, position: 'relative' },
  dropdownMenu: {
    position: 'absolute', top: 22, right: 0, zIndex: 10,
    backgroundColor: '#FFFFFF', borderRadius: 12, borderWidth: 1, borderColor: '#F2F4F7',
    paddingVertical: 4, minWidth: 160,
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 10, elevation: 8,
  },
  dropdownItem: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingHorizontal: 12, paddingVertical: 10,
    borderBottomWidth: 1, borderBottomColor: '#F2F4F7',
  },
  dropdownItemLast: { borderBottomWidth: 0 },
  dropdownText: { fontFamily: 'Inter-Regular', fontSize: 13, color: '#3A414E' },
  dropdownTextDanger: { color: '#EF4444' },
  cardName: { flex: 1, fontFamily: 'Inter-Regular', fontSize: 14, fontWeight: '600', color: '#020203' },
  cardMetaRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  cardMetaText: { fontFamily: 'Inter-Regular', fontSize: 11, color: '#6A7181' },
  cardPrice: { fontFamily: 'Inter-Regular', fontSize: 13, fontWeight: '700', color: '#020203', marginTop: 2 },
  cardBottomRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 4,
  },
  cardDateRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  statusBadge: { borderRadius: 99, paddingHorizontal: 8, paddingVertical: 3 },
  statusText: { fontFamily: 'Inter-Regular', fontSize: 10, fontWeight: '600' },
});
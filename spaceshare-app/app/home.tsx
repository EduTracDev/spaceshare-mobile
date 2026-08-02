import { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  TouchableOpacity,
  ScrollView,
  Image,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useFocusEffect } from 'expo-router';
import { useSelector, useDispatch } from 'react-redux';
import { RootState } from '@/store';

import WelcomeModal from '@/components/WelcomeModal';
import NotificationModal from '@/components/NotificationModal';
import FilterModal, { FilterValues } from '@/components/FilterModal';
import BottomNav from '@/components/BottomNav';
import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import NetInfo from '@react-native-community/netinfo';
import { updateUser } from '@/store/slices/authSlice';
import { userAPI, listingsAPI } from '@/services/api';
import { toggleWishlist } from '@/store/slices/wishlistSlice';

const { width } = Dimensions.get('window');

const CATEGORIES = [
  { label: 'All', icon: null },
  { label: 'Rooftop', icon: 'city' },
  { label: 'Gardens', icon: 'flower' },
  { label: 'Studio', icon: 'camera' },
  { label: 'Open Space', icon: 'tree' },
];

type PublicListing = {
  id: string;
  spaceName: string;
  spaceCategory: string;
  addressLine: string;
  area: string;
  spaceCapacity: number;
  spacePrice: number;
  photos: string[];
};

function formatPrice(listing: PublicListing) {
  return listing.spacePrice;
}

export default function Home() {
  const dispatch = useDispatch();
  const user = useSelector((state: RootState) => state.auth.user);
  const token = useSelector((state: RootState) => state.auth.token);
  const isFirstLogin = useSelector((state: RootState) => state.auth.user?.isFirstLogin ?? false);

  const [showWelcome, setShowWelcome] = useState(false);
  const [showNotification, setShowNotification] = useState(false);
  const [activeCategory, setActiveCategory] = useState('All');
  const [isOffline, setIsOffline] = useState(false);
  const [filterVisible, setFilterVisible] = useState(false);
  const [filters, setFilters] = useState<FilterValues | null>(null);
  const [listings, setListings] = useState<PublicListing[]>([]);
  const [loading, setLoading] = useState(true);
  const wishlistIds = useSelector((state: RootState) => state.wishlist.items.map((i) => i.id));

  useEffect(() => {
    if (isFirstLogin) {
      setShowWelcome(true);
    }
  }, [isFirstLogin]);

  const fetchListings = useCallback(async () => {
    setLoading(true);
    try {
      const res = await listingsAPI.getPublic();
      setListings(res.data.listings ?? []);
    } catch (err) {
      console.log('Failed to fetch listings:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      fetchListings();
    }, [fetchListings])
  );

  const handleToggleWishlist = (listing: PublicListing) => {
    dispatch(toggleWishlist({
      id: listing.id,
      name: listing.spaceName,
      location: listing.area,
      rating: 0,
      guests: listing.spaceCapacity,
      price: formatPrice(listing),
      image: listing.photos[0] ?? null,
    }));
  };

  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener((state) => {
      setIsOffline(!state.isConnected);
    });
    return () => unsubscribe();
  }, []);

  const handleExplore = () => {
    setShowWelcome(false);
    setShowNotification(true);
  };

  const handleDismissNotification = async () => {
    setShowNotification(false);
    try {
      if (token) await userAPI.completeFirstLogin(token);
      dispatch(updateUser({ isFirstLogin: false }));
    } catch (err) {
      console.log('Failed to mark first login complete:', err);
    }
  };

  let filteredListings = activeCategory === 'All'
    ? listings
    : listings.filter((l) => l.spaceCategory === activeCategory);

  if (filters) {
    filteredListings = filteredListings.filter((l) => {
      const matchesLocation = filters.location.trim().length === 0
        || l.area.toLowerCase().includes(filters.location.toLowerCase());
      const price = formatPrice(l);
      const matchesPrice = price >= filters.minPrice && price <= filters.maxPrice;
      const matchesCapacity = l.spaceCapacity >= filters.capacity;
      return matchesLocation && matchesPrice && matchesCapacity;
    });
  }

  const hasActiveFilters = filters !== null;

  return (
    <View style={styles.root}>

      {isOffline && (
        <View style={styles.offlineBanner}>
          <Feather name="wifi-off" size={14} color="#FFFFFF" />
          <Text style={styles.offlineText}>
            You're offline. Some features may be limited
          </Text>
        </View>
      )}

      <SafeAreaView style={styles.purpleHeader} edges={['top']}>
        <View style={styles.greetingRow}>
          <View style={styles.greetingLeft}>
            <Text style={styles.greetingText}>Welcome 👋</Text>
            <Text style={styles.greetingName}>
              {user?.firstName ?? 'Oloruntomi'}
            </Text>
          </View>
          <TouchableOpacity style={styles.bellButton}>
            <Feather name="bell" size={20} color="#6200EE" />
          </TouchableOpacity>
        </View>
        <View style={{ height: 28 }} />
      </SafeAreaView>

      <View style={styles.searchWrapper}>
        <View style={styles.searchBar}>
          <TouchableOpacity
            style={styles.searchTapArea}
            activeOpacity={0.85}
            onPress={() => router.push('/search')}
          >
            <Feather name="search" size={18} color="#98A2B3" />
            <Text style={styles.searchPlaceholder}>Search rooftops, lounges...</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => setFilterVisible(true)}>
            <Feather name="sliders" size={18} color="#98A2B3" />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.categoriesRow}
        style={styles.categoriesScroll}
      >
        {CATEGORIES.map((cat) => (
          <TouchableOpacity
            key={cat.label}
            style={[styles.chip, activeCategory === cat.label && styles.chipActive]}
            onPress={() => setActiveCategory(cat.label)}
            activeOpacity={0.85}
          >
            {cat.icon && (
              <MaterialCommunityIcons
                name={cat.icon as any}
                size={13}
                color={activeCategory === cat.label ? '#FFFFFF' : '#6A7181'}
              />
            )}
            <Text style={[
              styles.chipText,
              activeCategory === cat.label && styles.chipTextActive,
            ]}>
              {cat.label}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <ScrollView
        style={styles.body}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.bodyContent}
      >

        {!isOffline && filteredListings.length > 0 && (
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>
              {hasActiveFilters ? 'Filtered Results' : 'Space Nearby'}
            </Text>
            {hasActiveFilters ? (
              <TouchableOpacity onPress={() => setFilters(null)}>
                <Text style={styles.viewAll}>Clear filters</Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity onPress={() => router.push('/space-nearby')}>
                <Text style={styles.viewAll}>View all</Text>
              </TouchableOpacity>
            )}
          </View>
        )}

        {loading ? (
          <View style={styles.emptyState}>
            <ActivityIndicator color="#6200EE" />
          </View>
        ) : filteredListings.length === 0 ? (
          <View style={styles.emptyState}>
            <View style={styles.emptyIconCircle}>
              <Feather name="search" size={32} color="#D0D5DD" />
            </View>
            <Text style={styles.emptyText}>
              {hasActiveFilters
                ? 'No space matches your filters... try adjusting them'
                : 'No space found... please try another category'}
            </Text>
            {hasActiveFilters && (
              <TouchableOpacity onPress={() => setFilters(null)} style={styles.clearFiltersBtn}>
                <Text style={styles.clearFiltersText}>Clear Filters</Text>
              </TouchableOpacity>
            )}
          </View>
        ) : (
          filteredListings.map((listing) => (
            <TouchableOpacity
              key={listing.id}
              style={styles.card}
              activeOpacity={0.9}
              onPress={() => router.push(`/space-details/${listing.id}`)}
            >
              <View style={styles.imageWrapper}>
                <Image
                  source={listing.photos[0] ? { uri: listing.photos[0] } : undefined}
                  style={styles.cardImage}
                  resizeMode="cover"
                />

                <View style={styles.tagBadge}>
                  <Text style={styles.tagText}>{listing.spaceCategory}</Text>
                </View>

                <TouchableOpacity
                  style={styles.heartButton}
                  onPress={() => handleToggleWishlist(listing)}
                >
                  <Feather
                    name="heart"
                    size={16}
                    color={wishlistIds.includes(listing.id) ? '#E11D48' : '#FFFFFF'}
                  />
                </TouchableOpacity>
              </View>

              <View style={styles.cardInfo}>
                <View style={styles.cardRow}>
                  <Text style={styles.cardName}>{listing.spaceName}</Text>
                </View>
                <View style={styles.cardRow}>
                  <View style={styles.locationRow}>
                    <Feather name="map-pin" size={12} color="#6A7181" />
                    <Text style={styles.locationText}>
                      {listing.area} • {listing.spaceCapacity} Guests
                    </Text>
                  </View>
                 <Text style={styles.priceText}>
                    ₦{formatPrice(listing).toLocaleString()}/day
                  </Text>
                </View>
              </View>

            </TouchableOpacity>
          ))
        )}

      </ScrollView>

      <BottomNav />

      <WelcomeModal visible={showWelcome} onExplore={handleExplore} />
      <NotificationModal
        visible={showNotification}
        onTurnOn={handleDismissNotification}
        onMaybeLater={handleDismissNotification}
      />
      <FilterModal
        visible={filterVisible}
        onClose={() => setFilterVisible(false)}
        initialFilters={filters ?? undefined}
        onApply={(f) => {
          setFilters(f);
          setFilterVisible(false);
        }}
      />

    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#FFFFFF' },
  offlineBanner: {
    position: 'absolute', top: 52, left: width * 0.04, right: width * 0.04,
    backgroundColor: '#F04438', borderRadius: 12, paddingHorizontal: 14, paddingVertical: 10,
    flexDirection: 'row', alignItems: 'center', gap: 8, zIndex: 9999, elevation: 9999,
  },
  offlineText: { fontFamily: 'Inter-Regular', fontSize: 13, color: '#FFFFFF', flex: 1 },
  purpleHeader: {
    backgroundColor: '#6200EE', borderBottomLeftRadius: 24, borderBottomRightRadius: 24,
    overflow: 'hidden', shadowColor: '#6200EE', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3, shadowRadius: 8, elevation: 8, zIndex: 1,
  },
  greetingRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingTop: 12, paddingBottom: 16,
  },
  greetingLeft: { gap: 2 },
  greetingText: { fontFamily: 'Inter-Regular', fontSize: 14, lineHeight: 21, letterSpacing: -0.5, color: '#FFFFFF' },
  greetingName: { fontFamily: 'Inter-Regular', fontWeight: '600', fontSize: 18, lineHeight: 27, letterSpacing: -1, color: '#FFFFFF' },
  bellButton: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center' },
  searchWrapper: { paddingHorizontal: 16, marginTop: -24, zIndex: 2 },
  searchBar: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFFFFF', borderRadius: 12,
    paddingHorizontal: 12, height: 48, gap: 8, shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08, shadowRadius: 6, elevation: 4,
  },
  searchTapArea: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8, height: '100%' },
  searchPlaceholder: { flex: 1, fontSize: 14, color: '#98A2B3' },
  categoriesScroll: { marginTop: 16, flexGrow: 0 },
  categoriesRow: { paddingHorizontal: 16, gap: 8, flexDirection: 'row' },
  chip: {
    flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 12,
    paddingVertical: 4, borderRadius: 99, backgroundColor: '#F2F4F7',
  },
  chipActive: { backgroundColor: '#6200EE' },
  chipText: { fontFamily: 'Inter-Regular', fontSize: 14, letterSpacing: -0.5, color: '#6A7181' },
  chipTextActive: { color: '#FFFFFF' },
  body: { flex: 1, marginTop: 8 },
  bodyContent: { paddingHorizontal: 16, paddingTop: 16, paddingBottom: 32, gap: 16 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  sectionTitle: { fontFamily: 'Inter-Regular', fontWeight: '600', fontSize: 18, lineHeight: 27, letterSpacing: -1, color: '#020203' },
  viewAll: { fontFamily: 'Inter-Regular', fontSize: 14, lineHeight: 21, letterSpacing: -0.5, color: '#6200EE' },
  emptyState: { alignItems: 'center', justifyContent: 'center', paddingTop: 60, gap: 16 },
  emptyIconCircle: { width: 80, height: 80, borderRadius: 40, backgroundColor: '#F2F4F7', alignItems: 'center', justifyContent: 'center' },
  emptyText: { fontFamily: 'Inter-Regular', fontSize: 14, color: '#6A7181', textAlign: 'center', letterSpacing: -0.5, paddingHorizontal: 24 },
  clearFiltersBtn: { backgroundColor: '#6200EE', borderRadius: 99, paddingHorizontal: 24, paddingVertical: 12 },
  clearFiltersText: { color: '#FFFFFF', fontFamily: 'Inter-Regular', fontWeight: '600', fontSize: 14 },
  card: {
    borderRadius: 16, backgroundColor: '#FFFFFF', shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06, shadowRadius: 8, elevation: 3, overflow: 'hidden',
  },
  imageWrapper: { width: '100%', height: 180, position: 'relative', backgroundColor: '#F2F4F7' },
  cardImage: { width: '100%', height: '100%' },
  tagBadge: { position: 'absolute', top: 12, left: 12, backgroundColor: '#6200EE', borderRadius: 99, paddingHorizontal: 10, paddingVertical: 3 },
  tagText: { fontFamily: 'Inter-Regular', fontSize: 12, color: '#FFFFFF' },
  heartButton: {
    position: 'absolute', top: 12, right: 12, width: 32, height: 32, borderRadius: 16,
    backgroundColor: 'rgba(0,0,0,0.3)', alignItems: 'center', justifyContent: 'center',
  },
  cardInfo: { padding: 12, gap: 6 },
  cardRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  cardName: { fontFamily: 'Inter-Regular', fontWeight: '600', fontSize: 15, color: '#020203', flex: 1 },
  locationRow: { flexDirection: 'row', alignItems: 'center', gap: 4, flex: 1 },
  locationText: { fontFamily: 'Inter-Regular', fontSize: 12, color: '#6A7181' },
  priceText: { fontFamily: 'Inter-Regular', fontWeight: '600', fontSize: 13, color: '#020203' },
});
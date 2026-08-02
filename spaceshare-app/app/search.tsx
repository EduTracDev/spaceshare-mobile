import { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
  Image,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import FilterModal, { FilterValues } from '@/components/FilterModal';
import { listingsAPI } from '@/services/api';

type PublicListing = {
  id: string;
  spaceName: string;
  spaceCategory: string;
  addressLine: string;
  area: string;
  spaceCapacity: number;
  spacePrice: number;
  amenities: string[];
  photos: string[];
};

function formatPrice(listing: PublicListing) {
  return listing.spacePrice;
}

export default function Search() {
  const [query, setQuery] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [filterVisible, setFilterVisible] = useState(false);
  const [filters, setFilters] = useState<FilterValues | null>(null);
  const [listings, setListings] = useState<PublicListing[]>([]);
  const [loading, setLoading] = useState(true);

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

  useEffect(() => {
    fetchListings();
  }, [fetchListings]);

  // Text search match
  let results = listings.filter((l) =>
    l.spaceName.toLowerCase().includes(query.toLowerCase()) ||
    l.area.toLowerCase().includes(query.toLowerCase())
  );

  // Advanced filters on top of text search
  if (filters) {
    results = results.filter((l) => {
      const matchesLocation = filters.location.trim().length === 0
        || l.area.toLowerCase().includes(filters.location.toLowerCase());
      const price = formatPrice(l);
      const matchesPrice = price >= filters.minPrice && price <= filters.maxPrice;
      const matchesCapacity = l.spaceCapacity >= filters.capacity;
      const matchesAmenities = filters.amenities.length === 0
        || filters.amenities.every((a) => l.amenities?.includes(a));
      return matchesLocation && matchesPrice && matchesCapacity && matchesAmenities;
    });
  }

  const hasActiveFilters = filters !== null;
  const showResults = submitted || hasActiveFilters;

  const handleClear = () => {
    setQuery('');
    setSubmitted(false);
  };

  const handleClearFilters = () => {
    setFilters(null);
  };

  const handleSubmit = () => {
    if (query.trim().length > 0) setSubmitted(true);
  };

  return (
    <View style={styles.root}>
      <SafeAreaView style={styles.header} edges={['top']}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Feather name="arrow-left" size={20} color="#020203" />
        </TouchableOpacity>

        <View style={styles.searchBar}>
          <Feather name="search" size={18} color="#98A2B3" />
          <TextInput
            style={styles.searchInput}
            placeholder="Search rooftops, lounges..."
            placeholderTextColor="#98A2B3"
            value={query}
            onChangeText={(t) => { setQuery(t); if (submitted) setSubmitted(false); }}
            onSubmitEditing={handleSubmit}
            returnKeyType="search"
            autoFocus
          />
          {query.length > 0 && (
            <TouchableOpacity onPress={handleClear}>
              <Feather name="x" size={18} color="#98A2B3" />
            </TouchableOpacity>
          )}
          <TouchableOpacity onPress={() => setFilterVisible(true)}>
            <Feather
              name="sliders"
              size={18}
              color={hasActiveFilters ? '#6200EE' : '#98A2B3'}
            />
          </TouchableOpacity>
        </View>
      </SafeAreaView>

      {showResults && results.length > 0 && (
        <View style={styles.resultsHeader}>
          <Text style={styles.resultsCount}>
            {results.length} results{query.length > 0 ? ` for "${query}"` : ''}
          </Text>
          <TouchableOpacity onPress={hasActiveFilters ? handleClearFilters : handleClear}>
            <Text style={styles.clearText}>
              {hasActiveFilters ? 'Clear filters' : 'Clear search'}
            </Text>
          </TouchableOpacity>
        </View>
      )}

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.body}
      >
        {loading && (
          <View style={styles.loadingWrap}>
            <ActivityIndicator color="#6200EE" />
          </View>
        )}

        {!loading && showResults && results.length === 0 && (
          <View style={styles.emptyState}>
            <View style={styles.emptyIconCircle}>
              <Feather name="search" size={28} color="#B0B7C3" />
            </View>
            <Text style={styles.emptyText}>
              {hasActiveFilters
                ? 'No result found... try adjusting your filters'
                : 'No result found... please try another search term'}
            </Text>
            {hasActiveFilters && (
              <TouchableOpacity onPress={handleClearFilters} style={styles.clearFiltersBtn}>
                <Text style={styles.clearFiltersBtnText}>Clear Filters</Text>
              </TouchableOpacity>
            )}
          </View>
        )}

        {!loading && showResults && results.map((listing) => (
          <TouchableOpacity
            key={listing.id}
            style={styles.card}
            activeOpacity={0.85}
            onPress={() => router.push(`/space-details/${listing.id}`)}
          >
            <Image
              source={listing.photos[0] ? { uri: listing.photos[0] } : undefined}
              style={styles.cardImage}
              resizeMode="cover"
            />
            <View style={styles.cardInfo}>
              <View style={styles.cardTopRow}>
                <Text style={styles.cardName} numberOfLines={1}>{listing.spaceName}</Text>
                <TouchableOpacity>
                  <Feather name="heart" size={16} color="#98A2B3" />
                </TouchableOpacity>
              </View>
              <View style={styles.cardMetaRow}>
                <Feather name="map-pin" size={11} color="#6A7181" />
                <Text style={styles.cardMeta}>
                  {listing.area} • {listing.spaceCapacity} Guests
                </Text>
              </View>
             <Text style={styles.cardPrice}>
                ₦{formatPrice(listing).toLocaleString()}
              </Text>
            </View>
          </TouchableOpacity>
        ))}
      </ScrollView>

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
  header: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingHorizontal: 16, paddingBottom: 12,
  },
  backBtn: {
    width: 36, height: 36, borderRadius: 18, backgroundColor: '#F2F4F7',
    alignItems: 'center', justifyContent: 'center',
  },
  searchBar: {
    flex: 1, flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#F2F4F7', borderRadius: 12,
    paddingHorizontal: 12, height: 44, gap: 8,
  },
  searchInput: { flex: 1, fontSize: 14, color: '#020203', height: '100%' },

  resultsHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 10,
    borderBottomWidth: 1, borderBottomColor: '#F2F4F7',
  },
  resultsCount: { fontFamily: 'Inter-Regular', fontSize: 13, color: '#3A414E' },
  clearText: { fontFamily: 'Inter-Regular', fontSize: 13, fontWeight: '600', color: '#6200EE' },

  body: { paddingHorizontal: 16, paddingTop: 12, paddingBottom: 32, gap: 14 },

  loadingWrap: { paddingTop: 60, alignItems: 'center' },

  emptyState: { alignItems: 'center', justifyContent: 'center', paddingTop: 100, gap: 14 },
  emptyIconCircle: {
    width: 72, height: 72, borderRadius: 20, backgroundColor: '#F2F4F7',
    alignItems: 'center', justifyContent: 'center',
  },
  emptyText: {
    fontFamily: 'Inter-Regular', fontSize: 13, color: '#98A2B3',
    textAlign: 'center', paddingHorizontal: 40,
  },
  clearFiltersBtn: {
    backgroundColor: '#6200EE',
    borderRadius: 99,
    paddingHorizontal: 24,
    paddingVertical: 12,
  },
  clearFiltersBtnText: {
    color: '#FFFFFF',
    fontFamily: 'Inter-Regular',
    fontWeight: '600',
    fontSize: 14,
  },

  card: {
    flexDirection: 'row', gap: 10,
    borderRadius: 14, backgroundColor: '#FFFFFF',
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05, shadowRadius: 6, elevation: 2,
    padding: 8,
  },
  cardImage: { width: 64, height: 64, borderRadius: 10, backgroundColor: '#F2F4F7' },
  cardInfo: { flex: 1, justifyContent: 'center', gap: 4 },
  cardTopRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  cardName: { fontFamily: 'Inter-Regular', fontWeight: '600', fontSize: 14, color: '#020203', flex: 1 },
  cardMetaRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  cardMeta: { fontFamily: 'Inter-Regular', fontSize: 11, color: '#6A7181' },
  cardDot: { fontSize: 11, color: '#D0D5DD' },
  star: { fontSize: 10 },
  cardPrice: { fontFamily: 'Inter-Regular', fontWeight: '600', fontSize: 13, color: '#020203' },
});
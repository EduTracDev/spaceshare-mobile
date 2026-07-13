import { useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  TextInput, ScrollView, Image, Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import FilterModal, { FilterValues } from '@/components/FilterModal';

const { width } = Dimensions.get('window');

// Same shape as Home's SPACES — swap for a real fetch/search API later
const SPACES = [
  {
    id: '1',
    name: 'Mini boutique Hall',
    location: 'Allen Avenue Ikeja',
    guests: 50,
    price: 25000,
    rating: 4.5,
    amenities: ['Wi-Fi', 'Parking'],
    image: require('../assets/images/space1.jpg'),
  },
  {
    id: '2',
    name: 'Urban Garden Cafe',
    location: 'Victoria Island Lagos',
    guests: 70,
    price: 40000,
    rating: 4.7,
    amenities: ['Wi-Fi', 'Security', 'Sound System'],
    image: require('../assets/images/space2.jpg'),
  },
  {
    id: '3',
    name: 'Mini boutique Hall',
    location: 'Allen Avenue Ikeja',
    guests: 50,
    price: 25000,
    fromPrice: true,
    rating: 4.5,
    amenities: ['Wi-Fi', 'AC'],
    image: require('../assets/images/space1.jpg'),
  },
  {
    id: '4',
    name: 'Sunset Pavilion',
    location: 'Victoria Island',
    guests: 200,
    price: 75000,
    rating: 4.6,
    amenities: ['Parking', 'Security', 'Generator'],
    image: require('../assets/images/space3.jpg'),
  },
  {
    id: '5',
    name: 'Garden Terrace',
    location: 'Ikoyi',
    guests: 150,
    price: 65000,
    rating: 4.9,
    amenities: ['Light', 'AC', 'Wi-Fi'],
    image: require('../assets/images/space2.jpg'),
  },
];

export default function Search() {
  const [query, setQuery] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [filterVisible, setFilterVisible] = useState(false);
  const [filters, setFilters] = useState<FilterValues | null>(null);

  // Text search match
  let results = SPACES.filter(s =>
    s.name.toLowerCase().includes(query.toLowerCase()) ||
    s.location.toLowerCase().includes(query.toLowerCase())
  );

  // Advanced filters on top of text search
  if (filters) {
    results = results.filter((s) => {
      const matchesLocation = filters.location.trim().length === 0
        || s.location.toLowerCase().includes(filters.location.toLowerCase());
      const matchesPrice = s.price >= filters.minPrice && s.price <= filters.maxPrice;
      const matchesCapacity = s.guests >= filters.capacity;
      const matchesAmenities = filters.amenities.length === 0
        || filters.amenities.every((a) => s.amenities?.includes(a));
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
        {showResults && results.length === 0 && (
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

        {showResults && results.map((space) => (
          <TouchableOpacity
            key={space.id}
            style={styles.card}
            activeOpacity={0.85}
            onPress={() => router.push('/space-details')}
          >
            <Image source={space.image} style={styles.cardImage} resizeMode="cover" />
            <View style={styles.cardInfo}>
              <View style={styles.cardTopRow}>
                <Text style={styles.cardName} numberOfLines={1}>{space.name}</Text>
                <TouchableOpacity>
                  <Feather name="heart" size={16} color="#98A2B3" />
                </TouchableOpacity>
              </View>
              <View style={styles.cardMetaRow}>
                <Feather name="map-pin" size={11} color="#6A7181" />
                <Text style={styles.cardMeta}>
                  {space.location} • {space.guests} Guests
                </Text>
                <Text style={styles.cardDot}>•</Text>
                <Text style={styles.star}>⭐</Text>
                <Text style={styles.cardMeta}>{space.rating}</Text>
              </View>
              <Text style={styles.cardPrice}>
                {space.fromPrice ? 'from ' : ''}₦{space.price.toLocaleString()}
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
  cardImage: { width: 64, height: 64, borderRadius: 10 },
  cardInfo: { flex: 1, justifyContent: 'center', gap: 4 },
  cardTopRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  cardName: { fontFamily: 'Inter-Regular', fontWeight: '600', fontSize: 14, color: '#020203', flex: 1 },
  cardMetaRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  cardMeta: { fontFamily: 'Inter-Regular', fontSize: 11, color: '#6A7181' },
  cardDot: { fontSize: 11, color: '#D0D5DD' },
  star: { fontSize: 10 },
  cardPrice: { fontFamily: 'Inter-Regular', fontWeight: '600', fontSize: 13, color: '#020203' },
});
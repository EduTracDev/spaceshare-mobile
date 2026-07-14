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
import { router } from 'expo-router';
import { useSelector, useDispatch } from 'react-redux';
import { RootState } from '@/store';
import { removeFromWishlist } from '@/store/slices/wishlistSlice';
import BottomNav from '@/components/BottomNav';

const { width } = Dimensions.get('window');

export default function Wishlist() {
  const dispatch = useDispatch();
  const items = useSelector((state: RootState) => state.wishlist.items);
  const [toast, setToast] = useState<string | null>(null);

  const handleRemove = (id: string) => {
    dispatch(removeFromWishlist(id));
    setToast('Removed from your wishlist.');
    setTimeout(() => setToast(null), 2000);
  };

  return (
    <View style={s.root}>
      <SafeAreaView edges={['top']} style={s.safeTop}>
        <View style={s.header}>
          <Text style={s.headerTitle}>Wishlist</Text>
        </View>

        {toast && (
          <View style={s.toast}>
            <Feather name="check-circle" size={15} color="#16A34A" />
            <Text style={s.toastText}>{toast}</Text>
          </View>
        )}

        {items.length === 0 ? (
          <View style={s.emptyState}>
            <View style={s.emptyIconCircle}>
              <Feather name="heart" size={32} color="#D0D5DD" />
            </View>
            <Text style={s.emptyText}>
              Spaces you save to your wishlist will appear here for easy access later.
            </Text>
            <TouchableOpacity
              style={s.exploreBtn}
              onPress={() => router.push('/')}
              activeOpacity={0.85}
            >
              <Text style={s.exploreBtnText}>Explore Spaces</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={s.list}
          >
            {items.map((space) => (
              <TouchableOpacity
                key={space.id}
                style={s.card}
                activeOpacity={0.9}
                onPress={() => router.push(`/space-details/${space.id}`)}
              >
                <View style={s.imageWrapper}>
                  <Image source={space.image} style={s.cardImage} resizeMode="cover" />
                  <TouchableOpacity
                    style={s.heartButton}
                    onPress={() => handleRemove(space.id)}
                  >
                    <Feather name="heart" size={12} color="#16A34A" />
                  </TouchableOpacity>
                </View>

                <View style={s.cardInfo}>
                  <Text style={s.cardName} numberOfLines={1}>{space.name}</Text>
                  <View style={s.ratingRow}>
                    <Text style={s.star}>⭐</Text>
                    <Text style={s.ratingText}>{space.rating}</Text>
                  </View>
                  <View style={s.locationRow}>
                    <Feather name="map-pin" size={11} color="#6A7181" />
                    <Text style={s.locationText} numberOfLines={1}>{space.location}</Text>
                  </View>
                  <View style={s.guestsRow}>
                    <Feather name="users" size={11} color="#6A7181" />
                    <Text style={s.guestsText}>{space.guests} Guests</Text>
                  </View>
                  <Text style={s.priceText}>₦{space.price.toLocaleString()}/day</Text>
                </View>
              </TouchableOpacity>
            ))}
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

  toast: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: '#DCFCE7', marginHorizontal: 16, marginBottom: 12,
    borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10,
  },
  toastText: { fontFamily: 'Inter-Regular', fontSize: 12, color: '#16A34A', flex: 1 },

  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 40,
    gap: 16,
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
  exploreBtn: {
    backgroundColor: '#6200EE',
    borderRadius: 99,
    paddingHorizontal: 28,
    paddingVertical: 14,
    marginTop: 4,
  },
  exploreBtnText: {
    color: '#FFFFFF',
    fontFamily: 'Inter-Regular',
    fontWeight: '600',
    fontSize: 15,
  },

  list: {
    flexGrow: 0,
    paddingHorizontal: 16,
    paddingBottom: 20,
    gap: 12,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'stretch',
    alignSelf: 'stretch',
    borderRadius: 14,
    backgroundColor: '#FAFAFB',
    overflow: 'hidden',
    height: 96,
  },
  imageWrapper: { width: 96, height: 96, position: 'relative' },
  cardImage: { width: '100%', height: '100%' },
  heartButton: {
    position: 'absolute',
    top: 8,
    left: 8,
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
 cardInfo: { flex: 1, paddingVertical: 8, paddingHorizontal: 12, justifyContent: 'center', gap: 2 },
  cardName: { fontFamily: 'Inter-Regular', fontWeight: '600', fontSize: 15, color: '#020203' },
  ratingRow: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  star: { fontSize: 11 },
  ratingText: { fontFamily: 'Inter-Regular', fontSize: 12, color: '#020203', fontWeight: '600' },
  locationRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  locationText: { fontFamily: 'Inter-Regular', fontSize: 12, color: '#6A7181', flex: 1 },
  guestsRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  guestsText: { fontFamily: 'Inter-Regular', fontSize: 12, color: '#6A7181' },
  priceText: { fontFamily: 'Inter-Regular', fontWeight: '600', fontSize: 13, color: '#020203', marginTop: 1 },
});
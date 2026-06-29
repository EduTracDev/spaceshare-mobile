import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  TouchableOpacity,
  FlatList,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Feather } from '@expo/vector-icons';

const { width } = Dimensions.get('window');

const SPACES = [
  {
    id: '1',
    name: 'Mini boutique Hall',
    location: 'Allen Avenue Ikeja',
    guests: 50,
    price: 25000,
    rating: 4.5,
    image: require('../assets/images/space1.jpg'),
  },
  {
    id: '2',
    name: 'Mini boutique Hall',
    location: 'Allen Avenue Ikeja',
    guests: 50,
    price: 25000,
    rating: 4.5,
    image: require('../assets/images/space2.jpg'),
  },
  {
    id: '3',
    name: 'Mini boutique Hall',
    location: 'Allen Avenue Ikeja',
    guests: 50,
    price: 25000,
    rating: 4.5,
    image: require('../assets/images/space3.jpg'),
  },
  {
    id: '4',
    name: 'Mini boutique Hall',
    location: 'Allen Avenue Ikeja',
    guests: 50,
    price: 25000,
    rating: 4.5,
    image: require('../assets/images/space1.jpg'),
  },
  {
    id: '5',
    name: 'Mini boutique Hall',
    location: 'Allen Avenue Ikeja',
    guests: 50,
    price: 25000,
    rating: 4.5,
    image: require('../assets/images/space2.jpg'),
  },
];

export default function SpaceNearby() {
  return (
    <SafeAreaView style={styles.screen} edges={['top']}>

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Text style={styles.backText}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Space Nearby</Text>
      </View>

      {/* Space list */}
      <FlatList
        data={SPACES}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        renderItem={({ item }) => (
          <TouchableOpacity style={styles.card} activeOpacity={0.9} onPress={() => router.push('/space-details')}>

            {/* Left — image with heart overlay on top left */}
            <View style={styles.imageWrapper}>
              <Image
                source={item.image}
                style={styles.cardImage}
                resizeMode="cover"
              />
              <TouchableOpacity style={styles.heartButton}>
                <Feather name="heart" size={14} color="#FFFFFF" />
              </TouchableOpacity>
            </View>

            {/* Right — info */}
            <View style={styles.cardInfo}>
              <Text style={styles.cardName} numberOfLines={1}>
                {item.name}
              </Text>
              <View style={styles.ratingRow}>
                <Text style={styles.star}>⭐</Text>
                <Text style={styles.ratingText}>{item.rating}</Text>
              </View>
              <View style={styles.locationRow}>
                <Feather name="map-pin" size={11} color="#6A7181" />
                <Text style={styles.locationText} numberOfLines={1}>
                  {item.location}
                </Text>
              </View>
              <View style={styles.locationRow}>
                <Feather name="users" size={11} color="#6A7181" />
                <Text style={styles.locationText}>{item.guests} Guests</Text>
              </View>
              <Text style={styles.priceText}>
                ₦{item.price.toLocaleString()}/day
              </Text>
            </View>

          </TouchableOpacity>
        )}
      />

    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 16,
    gap: 12,
  },
  backButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backText: {
    fontSize: 22,
    color: '#020203',
  },
  headerTitle: {
    fontFamily: 'MonaSans-Bold',
    fontSize: 20,
    lineHeight: 20 * 1.2,
    letterSpacing: -0.5,
    color: '#020203',
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 32,
    gap: 12,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
    padding: 10,
    gap: 12,
  },
  imageWrapper: {
    width: width * 0.28,
    height: 90,
    borderRadius: 12,
    overflow: 'hidden',
    flexShrink: 0,
  },
  cardImage: {
    width: '100%',
    height: '100%',
  },
  heartButton: {
    position: 'absolute',
    top: 6,
    left: 6,
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: 'rgba(0,0,0,0.3)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardInfo: {
    flex: 1,
    gap: 4,
  },
  cardName: {
    fontFamily: 'Inter-Regular',
    fontWeight: '600',
    fontSize: 14,
    color: '#020203',
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  star: {
    fontSize: 11,
  },
  ratingText: {
    fontFamily: 'Inter-Regular',
    fontWeight: '600',
    fontSize: 12,
    color: '#020203',
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  locationText: {
    fontFamily: 'Inter-Regular',
    fontSize: 12,
    color: '#6A7181',
    flex: 1,
  },
  priceText: {
    fontFamily: 'Inter-Regular',
    fontWeight: '600',
    fontSize: 13,
    color: '#020203',
  },
});
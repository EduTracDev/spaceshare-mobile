import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  Image,
} from 'react-native';
import { router, usePathname } from 'expo-router';

const { width } = Dimensions.get('window');

const TABS = [
  { label: 'Explore', icon: require('../assets/icons/explore.png'), route: '/home' },
  { label: 'Wishlist', icon: require('../assets/icons/heart.png'), route: '/wishlist' },
  { label: 'Bookings', icon: require('../assets/icons/booking.png'), route: '/bookings' },
  { label: 'Profile', icon: require('../assets/icons/profile.png'), route: '/profile' },
];

export default function BottomNav() {
  const pathname = usePathname();

  return (
    <View style={styles.container}>
      {TABS.map((tab) => {
        const isActive = pathname === tab.route;
        return (
          <TouchableOpacity
            key={tab.label}
            style={styles.tab}
            onPress={() => router.push(tab.route as any)}
            activeOpacity={0.7}
          >
            <Image
              source={tab.icon}
              style={[styles.icon, { tintColor: isActive ? '#6200EE' : '#98A2B3' }]}
              resizeMode="contain"
            />
            <Text style={[styles.label, isActive && styles.labelActive]}>
              {tab.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#F2F4F7',
    paddingBottom: 24,
    paddingTop: 12,
    paddingHorizontal: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 10,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  icon: {
    width: 22,
    height: 22,
  },
  label: {
    fontFamily: 'Inter-Regular',
    fontSize: 12,
    color: '#98A2B3',
    letterSpacing: -0.3,
  },
  labelActive: {
    color: '#6200EE',
    fontWeight: '600',
  },
});
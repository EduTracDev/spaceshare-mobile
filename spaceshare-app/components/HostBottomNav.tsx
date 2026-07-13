import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { router, usePathname } from 'expo-router';
import { Feather } from '@expo/vector-icons';

const TABS = [
  { label: 'Home', icon: 'home', route: '/host/home' },
  { label: 'Requests', icon: 'inbox', route: '/host/requests' },
  { label: 'My Listings', icon: 'grid', route: '/host/my-listings' },
  { label: 'Profile', icon: 'user', route: '/host/profile' },
];

export default function HostBottomNav() {
  const pathname = usePathname();

  return (
    <View style={styles.container}>
      {/* First 2 tabs */}
      {TABS.slice(0, 2).map((tab) => {
        const isActive = pathname === tab.route;
        return (
          <TouchableOpacity
            key={tab.label}
            style={styles.tab}
            onPress={() => router.push(tab.route as any)}
            activeOpacity={0.7}
          >
            <Feather
              name={tab.icon as any}
              size={22}
              color={isActive ? '#6200EE' : '#98A2B3'}
            />
            <Text style={[styles.label, isActive && styles.labelActive]}>
              {tab.label}
            </Text>
          </TouchableOpacity>
        );
      })}

      {/* Center elevated + button */}
      <View style={styles.centerSlot}>
        <TouchableOpacity
          style={styles.addBtn}
          onPress={() => router.push('/host/create-listing')}
          activeOpacity={0.85}
        >
          <Feather name="plus" size={26} color="#FFFFFF" />
        </TouchableOpacity>
      </View>

      {/* Last 2 tabs */}
      {TABS.slice(2).map((tab) => {
        const isActive = pathname === tab.route;
        return (
          <TouchableOpacity
            key={tab.label}
            style={styles.tab}
            onPress={() => router.push(tab.route as any)}
            activeOpacity={0.7}
          >
            <Feather
              name={tab.icon as any}
              size={22}
              color={isActive ? '#6200EE' : '#98A2B3'}
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
    alignItems: 'center',
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
  centerSlot: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addBtn: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: '#6200EE',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: -28,
    shadowColor: '#6200EE',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
});
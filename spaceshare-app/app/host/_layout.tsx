import { Slot } from 'expo-router';
import { View, StyleSheet } from 'react-native';
import HostBottomNav from '@/components/HostBottomNav';

export default function HostLayout() {
  return (
    <View style={styles.root}>
      <View style={styles.content}>
        <Slot />
      </View>
      <HostBottomNav />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  content: { flex: 1 },
});
import { useEffect } from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import { router } from 'expo-router';

const { width, height } = Dimensions.get('window');

export default function SplashScreen() {
  useEffect(() => {
    const timer = setTimeout(() => {
      router.replace('/welcome');
    }, 5000);
    return () => clearTimeout(timer);
  }, []);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>SpaceShare</Text>
      <Text style={styles.tagline}>Find your perfect venue</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#6200EE',
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    height: '100%',
  },
  title: {
    fontSize: width * 0.1,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: 1.5,
  },
  tagline: {
    fontSize: width * 0.04,
    color: 'rgba(255,255,255,0.75)',
    marginTop: 8,
    letterSpacing: 0.5,
  },
});
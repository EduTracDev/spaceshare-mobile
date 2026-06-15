import { useState, useRef, useEffect } from 'react';
import {
  View,
  FlatList,
  StyleSheet,
  Dimensions,
} from 'react-native';
import { router } from 'expo-router';
import OnboardingSlide from '@/components/OnboardingSlide';

const { width } = Dimensions.get('window');

const slides = [
  {
    id: '1',
    title: 'Find the perfect space',
    description:
      'Browse affordable spaces for your events. Filter by location, budget, size, and amenities.',
    image: require('../assets/images/onboard1.jpg'),
  },
  {
    id: '2',
    title: 'Simple booking process',
    description:
      'Choose your preferred date, add extra services, and send booking requests in minutes.',
    image: require('../assets/images/onboard2.jpg'),
  },
  {
    id: '3',
    title: 'List or book spaces',
    description:
      'Discover unique event spaces nearby or list your property and start earning easily.',
    image: require('../assets/images/onboard3.jpg'),
  },
];

export default function Welcome() {
  const [currentIndex, setCurrentIndex] = useState(0);
  const flatListRef = useRef<FlatList>(null);

  useEffect(() => {
    const timer = setInterval(() => {
      const nextIndex = currentIndex === slides.length - 1 ? 0 : currentIndex + 1;
      flatListRef.current?.scrollToIndex({ index: nextIndex, animated: true });
      setCurrentIndex(nextIndex);
    }, 3000);

    return () => clearInterval(timer);
  }, [currentIndex]);

  const handleCreateAccount = () => {
    router.push('/user-type');
  };

  const handleLogin = () => {
    router.push('/login');
  };

  return (
    <View style={styles.container}>
      <FlatList
        ref={flatListRef}
        data={slides}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        scrollEnabled={true}
        keyExtractor={(item) => item.id}
        onMomentumScrollEnd={(e) => {
          const index = Math.round(
            e.nativeEvent.contentOffset.x / width
          );
          setCurrentIndex(index);
        }}
        renderItem={({ item }) => (
          <OnboardingSlide
            title={item.title}
            description={item.description}
            image={item.image}
            currentIndex={currentIndex}
            total={slides.length}
            onCreateAccount={handleCreateAccount}
            onLogin={handleLogin}
          />
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
});
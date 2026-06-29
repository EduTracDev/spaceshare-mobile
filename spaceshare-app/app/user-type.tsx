import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  SafeAreaView,
} from 'react-native';
import { router } from 'expo-router';
import { useState } from 'react';
import { useDispatch } from 'react-redux';
import { setRole } from '@/store/slices/authSlice';

const { width, height } = Dimensions.get('window');

export default function UserType() {
  const dispatch = useDispatch();
  const [selected, setSelected] = useState<'GUEST' | 'HOST' | null>(null);

  const handleContinue = () => {
    if (!selected) return;

    // Save role to Redux before navigating to register
    dispatch(setRole(selected));
    router.push('/register');
  };

  return (
    <SafeAreaView style={styles.screen}>

      {/* Back Button */}
      <TouchableOpacity onPress={() => router.back()} style={styles.back}>
        <Text style={styles.backText}>←</Text>
      </TouchableOpacity>

      {/* Main Container */}
      <View style={styles.container}>

        {/* Title */}
        <Text style={styles.title}>Choose how you want to use the platform.</Text>

        {/* Cards */}
        <View style={styles.cards}>

          {/* Guest Card */}
          <TouchableOpacity
            style={[styles.card, selected === 'GUEST' && styles.cardSelected]}
            onPress={() => setSelected('GUEST')}
            activeOpacity={0.85}
          >
            <View style={styles.cardTop}>
              <View style={styles.iconWrapper}>
                <Text style={styles.icon}>👤</Text>
              </View>
              <View style={[styles.radio, selected === 'GUEST' && styles.radioSelected]}>
                {selected === 'GUEST' && <View style={styles.radioDot} />}
              </View>
            </View>
            <View style={styles.cardText}>
              <Text style={[styles.cardTitle, selected === 'GUEST' && styles.cardTitleSelected]}>
                Guest
              </Text>
              <Text style={styles.cardDescription}>
                Find and book spaces for birthdays, hangouts, meetings, and small events.
              </Text>
            </View>
          </TouchableOpacity>

          {/* Host Card */}
          <TouchableOpacity
            style={[styles.card, selected === 'HOST' && styles.cardSelected]}
            onPress={() => setSelected('HOST')}
            activeOpacity={0.85}
          >
            <View style={styles.cardTop}>
              <View style={styles.iconWrapper}>
                <Text style={styles.icon}>🏠</Text>
              </View>
              <View style={[styles.radio, selected === 'HOST' && styles.radioSelected]}>
                {selected === 'HOST' && <View style={styles.radioDot} />}
              </View>
            </View>
            <View style={styles.cardText}>
              <Text style={[styles.cardTitle, selected === 'HOST' && styles.cardTitleSelected]}>
                Host
              </Text>
              <Text style={styles.cardDescription}>
                List your space, manage bookings, and earn from your property.
              </Text>
            </View>
          </TouchableOpacity>

        </View>

        {/* Continue Button */}
        <TouchableOpacity
          style={[styles.continueButton, !selected && styles.continueButtonDisabled]}
          onPress={handleContinue}
          activeOpacity={0.85}
          disabled={!selected}
        >
          <Text style={styles.continueButtonText}>Continue</Text>
        </TouchableOpacity>

      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  back: {
    paddingHorizontal: width * 0.05,
    paddingTop: height * 0.02,
    paddingBottom: 8,
  },
  backText: {
    fontSize: 22,
    color: '#020203',
  },
  container: {
    flex: 1,
    paddingHorizontal: width * 0.05,
    paddingTop: 16,
    gap: 24,
  },
  title: {
    fontFamily: 'MonaSans-Bold',
    fontSize: width * 0.055,
    lineHeight: width * 0.055 * 1.2,
    letterSpacing: -0.5,
    color: '#020203',
  },
  cards: {
    gap: 24,
  },
  card: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    padding: 16,
    gap: 8,
    backgroundColor: '#FFFFFF',
  },
  cardSelected: {
    borderColor: '#6200EE',
    backgroundColor: '#F3EAFF',
  },
  cardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  iconWrapper: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#EDE7F6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  icon: {
    fontSize: 18,
  },
  radio: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#C0C0C0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioSelected: {
    borderColor: '#6200EE',
  },
  radioDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#6200EE',
  },
  cardText: {
    gap: 4,
  },
  cardTitle: {
    fontFamily: 'MonaSans-Bold',
    fontSize: width * 0.045,
    color: '#020203',
  },
  cardTitleSelected: {
    color: '#6200EE',
  },
  cardDescription: {
    fontFamily: 'Inter-Regular',
    fontSize: width * 0.035,
    color: '#3A414E',
    lineHeight: width * 0.05,
  },
  continueButton: {
    backgroundColor: '#6200EE',
    borderRadius: 99,
    height: 56,
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
  },
  continueButtonDisabled: {
    backgroundColor: '#CEB0FA',
  },
  continueButtonText: {
    color: '#FFFFFF',
    fontFamily: 'Inter-Regular',
    fontSize: width * 0.04,
    fontWeight: '600',
  },
});
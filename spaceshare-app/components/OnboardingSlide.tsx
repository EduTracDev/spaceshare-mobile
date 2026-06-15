import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  StatusBar,
  Image,
} from 'react-native';

const { width, height } = Dimensions.get('window');

type OnboardingSlideProps = {
  title: string;
  description: string;
  image: any;
  currentIndex: number;
  total: number;
  onCreateAccount: () => void;
  onLogin: () => void;
};

export default function OnboardingSlide({
  title,
  description,
  image,
  currentIndex,
  total,
  onCreateAccount,
  onLogin,
}: OnboardingSlideProps) {
  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />

      {/* Image Section */}
      <Image
        source={image}
        style={styles.imageSection}
        resizeMode="cover"
      />

      {/* Bottom Card */}
      <View style={styles.card}>

        {/* Dot Indicators */}
        <View style={styles.dots}>
          {Array.from({ length: total }).map((_, i) => (
            <View
              key={i}
              style={[
                styles.dot,
                i === currentIndex ? styles.dotActive : styles.dotInactive,
              ]}
            />
          ))}
        </View>

        {/* Text */}
        <View style={styles.textBlock}>
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.description}>{description}</Text>
        </View>

        {/* Buttons */}
        <View style={styles.buttons}>
          <TouchableOpacity
            style={styles.primaryButton}
            onPress={onCreateAccount}
            activeOpacity={0.85}
          >
            <Text style={styles.primaryButtonText}>Create account</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.secondaryButton}
            onPress={onLogin}
            activeOpacity={0.85}
          >
            <Text style={styles.secondaryButtonText}>Login</Text>
          </TouchableOpacity>
        </View>

      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width,
    height,
    backgroundColor: '#FFFFFF',
    borderRadius: 32,
    overflow: 'hidden',
  },
  imageSection: {
    width: '100%',
    height: height * 0.62,
  },
  card: {
    position: 'absolute',
    bottom: 0,
    width: '100%',
    minHeight: height * 0.42,
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    paddingTop: 24,
    paddingHorizontal: width * 0.06,
    paddingBottom: 36,
    gap: 16,
  },
  dots: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 6,
  },
  dot: {
    height: 6,
    borderRadius: 3,
  },
  dotActive: {
    width: 24,
    backgroundColor: '#6200EE',
  },
  dotInactive: {
    width: 8,
    backgroundColor: '#D1C4E9',
  },
  textBlock: {
    gap: 10,
  },
title: {
  fontFamily: 'MonaSans-Bold',
  fontWeight: '600',
  fontSize: 24,
  lineHeight: 24 * 1.2,
  letterSpacing: 0,
  textAlign: 'center',
  color: '#020203',
},
description: {
  fontFamily: 'Inter-Regular',
  fontSize: 16,
  fontWeight: '400',
  lineHeight: 24,
  letterSpacing: -0.5,
  textAlign: 'center',
  color: '#3A414E',
},
  buttons: {
    gap: 12,
    marginTop: 8,
  },
 primaryButton: {
  backgroundColor: '#6200EE',
  borderRadius: 99,
  height: 56,
  paddingVertical: 16,
  paddingHorizontal: 24,
  alignItems: 'center',
  justifyContent: 'center',
  width: '100%',
},
primaryButtonText: {
  color: '#FFFFFF',
  fontSize: width * 0.04,
  fontWeight: '600',
  fontFamily: 'Inter-Regular',
},
secondaryButton: {
  backgroundColor: '#EDE7F6',
  borderRadius: 99,
  height: 56,
  paddingVertical: 16,
  paddingHorizontal: 24,
  alignItems: 'center',
  justifyContent: 'center',
  width: '100%',
},
secondaryButtonText: {
  color: '#6200EE',
  fontSize: width * 0.04,
  fontWeight: '600',
  fontFamily: 'Inter-Regular',
},
});
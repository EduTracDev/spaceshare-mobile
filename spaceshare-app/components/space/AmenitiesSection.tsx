import { View, Text, StyleSheet } from 'react-native';
import { Feather } from '@expo/vector-icons';

type Props = {
  amenities: string[];
};

export default function AmenitiesSection({ amenities }: Props) {
  return (
    <View style={styles.section}>
      <Text style={styles.title}>Amenities</Text>
      <View style={styles.grid}>
        {amenities.map((a) => (
          <View key={a} style={styles.item}>
            <Feather name="check" size={14} color="#6200EE" />
            <Text style={styles.text}>{a}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  section: { gap: 10 },
  title: {
    fontFamily: 'MonaSans-Bold',
    fontSize: 16,
    color: '#020203',
    letterSpacing: -0.3,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    width: '45%',
  },
  text: {
    fontFamily: 'Inter-Regular',
    fontSize: 13,
    color: '#3A414E',
  },
});
import { View, Text, StyleSheet } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';

type Tier = {
  range: string;
  price: number;
};

type Props = {
  tiers: Tier[];
};

export default function AttendeePricing({ tiers }: Props) {
  return (
    <View style={styles.section}>
      <View style={styles.headerRow}>
        <MaterialCommunityIcons name="account-group" size={16} color="#6200EE" />
        <Text style={styles.title}>Attendee-based pricing</Text>
      </View>
      <Text style={styles.subtitle}>Total is calculated from your guest count.</Text>
      <View style={styles.tiersBox}>
        {tiers.map((tier, i) => (
          <View key={i} style={styles.tierRow}>
            <Text style={styles.tierRange}>{tier.range}</Text>
            <Text style={styles.tierPrice}>₦{tier.price.toLocaleString()}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    backgroundColor: '#F1F4FF',
    borderRadius: 12,
    padding: 14,
    gap: 10,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  title: {
    fontFamily: 'MonaSans-Bold',
    fontSize: 16,
    color: '#020203',
    letterSpacing: -0.3,
  },
  subtitle: {
    fontFamily: 'Inter-Regular',
    fontSize: 13,
    color: '#6A7181',
  },
  tiersBox: { gap: 8 },
  tierRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 4,
    borderBottomWidth: 1,
    borderBottomColor: '#E4E7EC',
  },
  tierRange: {
    fontFamily: 'Inter-Regular',
    fontSize: 14,
    color: '#3A414E',
  },
  tierPrice: {
    fontFamily: 'Inter-Regular',
    fontWeight: '600',
    fontSize: 14,
    color: '#020203',
  },
});
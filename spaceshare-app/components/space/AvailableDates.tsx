import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';

type Props = {
  dates: string[];
};

export default function AvailableDates({ dates }: Props) {
  return (
    <View style={styles.section}>
      <Text style={styles.title}>Available Dates</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <View style={styles.datesRow}>
          {dates.map((date, i) => (
            <TouchableOpacity key={i} style={styles.dateChip}>
              <Text style={styles.dateText}>{date}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>
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
  datesRow: {
    flexDirection: 'row',
    gap: 8,
  },
  dateChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 12,
    backgroundColor: '#F2F4F7',
    borderWidth: 1,
    borderColor: '#E4E7EC',
  },
  dateText: {
    fontFamily: 'Inter-Regular',
    fontSize: 12,
    color: '#3A414E',
  },
});
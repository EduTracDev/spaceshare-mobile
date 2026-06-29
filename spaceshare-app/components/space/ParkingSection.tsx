import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useState } from 'react';

type Props = {
  instruction: string;
};

export default function ParkingSection({ instruction }: Props) {
  const [expanded, setExpanded] = useState(false);

  return (
    <View style={styles.section}>
      <TouchableOpacity
        style={styles.header}
        onPress={() => setExpanded(!expanded)}
        activeOpacity={0.7}
      >
        <Text style={styles.title}>Parking Instruction</Text>
        <Feather
          name={expanded ? 'chevron-up' : 'chevron-down'}
          size={18}
          color="#6A7181"
        />
      </TouchableOpacity>
      {expanded && (
        <Text style={styles.body}>{instruction}</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    borderTopWidth: 1,
    borderTopColor: '#F2F4F7',
    paddingTop: 4,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
  },
  title: {
    fontFamily: 'MonaSans-Bold',
    fontSize: 16,
    color: '#020203',
    letterSpacing: -0.3,
  },
  body: {
    fontFamily: 'Inter-Regular',
    fontSize: 14,
    color: '#3A414E',
    lineHeight: 22,
    letterSpacing: -0.3,
    paddingBottom: 14,
  },
});
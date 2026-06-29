import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useState } from 'react';

type Props = {
  rules: string[];
};

export default function HostRulesSection({ rules }: Props) {
  const [expanded, setExpanded] = useState(false);

  return (
    <View style={styles.box}>
      <TouchableOpacity
        style={styles.header}
        onPress={() => setExpanded(!expanded)}
        activeOpacity={0.7}
      >
        {/* Title in red */}
        <Text style={styles.title}>Host Rules</Text>
        <Feather
          name={expanded ? 'chevron-up' : 'chevron-down'}
          size={18}
          color="#6A7181"
        />
      </TouchableOpacity>

      {expanded && (
        <View style={styles.content}>
          {rules.map((rule, i) => (
            <View key={i} style={styles.ruleItem}>
              <Text style={styles.ruleDot}>•</Text>
              <Text style={styles.ruleText}>{rule}</Text>
            </View>
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  box: {
    backgroundColor: '#FFEDED',
    borderRadius: 12,
    padding: 14,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  title: {
    fontFamily: 'MonaSans-Bold',
    fontSize: 16,
    color: '#FF3B30',
    letterSpacing: -0.3,
  },
  content: {
    marginTop: 12,
    gap: 8,
  },
  ruleItem: {
    flexDirection: 'row',
    gap: 6,
  },
  ruleDot: {
    color: '#FF3B30',
    fontSize: 14,
  },
  ruleText: {
    fontFamily: 'Inter-Regular',
    fontSize: 14,
    color: '#3A414E',
    flex: 1,
  },
});
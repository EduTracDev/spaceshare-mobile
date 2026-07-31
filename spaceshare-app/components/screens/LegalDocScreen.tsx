import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { router } from 'expo-router';

type Props = {
  title: string;
  updatedDate: string;
  paragraphs: string[];
};

export default function LegalDocScreen({ title, updatedDate, paragraphs }: Props) {
  return (
    <SafeAreaView style={s.root}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Feather name="arrow-left" size={20} color="#020203" />
        </TouchableOpacity>
        <Text style={s.headerTitle}>{title}</Text>
        <View style={{ width: 20 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={s.content}>
        <Text style={s.updated}>Updated - {updatedDate}</Text>
        {paragraphs.map((p, i) => (
          <Text key={i} style={s.paragraph}>{p}</Text>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#FFFFFF' },

  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 14,
    borderBottomWidth: 1, borderBottomColor: '#F2F4F7',
  },
  headerTitle: { fontFamily: 'MonaSans-Bold', fontSize: 16, color: '#020203' },

  content: { paddingHorizontal: 16, paddingTop: 16, paddingBottom: 32, gap: 16 },
  updated: { fontFamily: 'Inter-Regular', fontWeight: '600', fontSize: 13, color: '#020203', marginBottom: 4 },
  paragraph: {
    fontFamily: 'Inter-Regular', fontSize: 14, color: '#3A414E',
    lineHeight: 22, letterSpacing: -0.2,
  },
});
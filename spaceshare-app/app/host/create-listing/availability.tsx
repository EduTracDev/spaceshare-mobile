import { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
  FlatList,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useSelector, useDispatch } from 'react-redux';
import { RootState } from '@/store';
import { setStep, updateListingData } from '@/store/slices/createListingSlice';

const { width } = Dimensions.get('window');
const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];
const DAYS = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
const CELL = (width - 32 - 12) / 7;

type DayCell = { date: Date | null };

function formatKey(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function buildMonth(year: number, month: number): DayCell[] {
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells: DayCell[] = [];
  for (let i = 0; i < firstDay; i++) cells.push({ date: null });
  for (let d = 1; d <= daysInMonth; d++) cells.push({ date: new Date(year, month, d) });
  return cells;
}

export default function CreateListingAvailability() {
  const dispatch = useDispatch();
  const listing = useSelector((state: RootState) => state.createListing);

  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth());
  const [startTime, setStartTime] = useState(listing.startTime);
  const [endTime, setEndTime] = useState(listing.endTime);
  const [unavailableDates, setUnavailableDates] = useState<string[]>(listing.unavailableDates);

  const cells = buildMonth(year, month);

  const prevMonth = () => {
    if (month === 0) { setMonth(11); setYear((y) => y - 1); } else setMonth((m) => m - 1);
  };
  const nextMonth = () => {
    if (month === 11) { setMonth(0); setYear((y) => y + 1); } else setMonth((m) => m + 1);
  };

  const handleToggleDate = (date: Date) => {
    const past = new Date();
    past.setHours(0, 0, 0, 0);
    if (date < past) return;

    const key = formatKey(date);
    setUnavailableDates((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]
    );
  };

  const canContinue = startTime.trim().length > 0 && endTime.trim().length > 0;

  const handleContinue = () => {
    if (!canContinue) return;
    dispatch(updateListingData({ startTime, endTime, unavailableDates }));
    dispatch(setStep(8));
    router.push('/host/create-listing/review');
  };

  return (
    <View style={s.root}>
      <SafeAreaView edges={['top']} style={s.safeTop} />

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={s.scroll}>
        <View style={s.headerRow}>
          <TouchableOpacity onPress={() => router.back()} style={s.backBtn}>
            <Feather name="arrow-left" size={20} color="#020203" />
          </TouchableOpacity>
          <View style={s.progressTrack}>
            <View style={[s.progressFill, { width: `${(listing.step / listing.totalSteps) * 100}%` }]} />
          </View>
          <Text style={s.progressLabel}>{listing.step}/{listing.totalSteps}</Text>
        </View>

        <Text style={s.title}>Set your availability</Text>
        <Text style={s.subtitle}>Select the days and time your space is available for bookings.</Text>

        <View style={s.timeRow}>
          <View style={s.timeCol}>
            <Text style={s.label}>Start Time</Text>
            <View style={s.timeInputWrap}>
              <TextInput
                style={s.timeInput}
                value={startTime}
                onChangeText={setStartTime}
                placeholder="10:00AM"
                placeholderTextColor="#C0C0C0"
              />
              <Feather name="clock" size={16} color="#98A2B3" />
            </View>
          </View>
          <View style={s.timeCol}>
            <Text style={s.label}>End Time</Text>
            <View style={s.timeInputWrap}>
              <TextInput
                style={s.timeInput}
                value={endTime}
                onChangeText={setEndTime}
                placeholder="06:00PM"
                placeholderTextColor="#C0C0C0"
              />
              <Feather name="clock" size={16} color="#98A2B3" />
            </View>
          </View>
        </View>

        <View style={s.monthNav}>
          <TouchableOpacity onPress={() => {}} style={s.monthPicker}>
            <Text style={s.monthLabel}>{MONTHS[month]} {year}</Text>
            <Feather name="chevron-down" size={14} color="#6A7181" />
          </TouchableOpacity>
          <View style={s.monthArrows}>
            <TouchableOpacity onPress={prevMonth}>
              <Feather name="chevron-left" size={18} color="#020203" />
            </TouchableOpacity>
            <TouchableOpacity onPress={nextMonth}>
              <Feather name="chevron-right" size={18} color="#020203" />
            </TouchableOpacity>
          </View>
        </View>

        <View style={s.dayHeaders}>
          {DAYS.map((d) => <Text key={d} style={s.dayHeader}>{d}</Text>)}
        </View>

        <FlatList
          data={cells}
          keyExtractor={(_, i) => i.toString()}
          numColumns={7}
          scrollEnabled={false}
          renderItem={({ item }) => {
            if (!item.date) return <View style={s.dayCell} />;
            const past = new Date();
            past.setHours(0, 0, 0, 0);
            const isPast = item.date < past;
            const key = formatKey(item.date);
            const isUnavailable = unavailableDates.includes(key);

            return (
              <TouchableOpacity
                style={[
                  s.dayCell,
                  !isPast && !isUnavailable && s.dayCellAvailable,
                  isUnavailable && s.dayCellUnavailable,
                ]}
                onPress={() => handleToggleDate(item.date!)}
                disabled={isPast}
              >
                <Text
                  style={[
                    s.dayNumber,
                    isPast && s.dayNumberPast,
                    !isPast && !isUnavailable && s.dayNumberAvailable,
                  ]}
                >
                  {item.date.getDate()}
                </Text>
              </TouchableOpacity>
            );
          }}
        />

        <Text style={s.hintText}>Tap to toggle unavailable dates</Text>

        <View style={{ height: 100 }} />
      </ScrollView>

      <View style={s.footer}>
        <TouchableOpacity
          style={[s.continueBtn, !canContinue && s.continueBtnDisabled]}
          onPress={handleContinue}
          disabled={!canContinue}
        >
          <Text style={s.continueBtnText}>Continue</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#FFFFFF' },
  safeTop: { backgroundColor: '#FFFFFF' },
  scroll: { paddingHorizontal: 16 },

  headerRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 16 },
  backBtn: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: '#F2F4F7', alignItems: 'center', justifyContent: 'center',
  },
  progressTrack: {
    flex: 1, height: 4, borderRadius: 2, backgroundColor: '#EDE7F6', overflow: 'hidden',
  },
  progressFill: { height: 4, backgroundColor: '#6200EE', borderRadius: 2 },
  progressLabel: { fontFamily: 'Inter-Regular', fontSize: 12, color: '#98A2B3' },

  title: { fontFamily: 'MonaSans-Bold', fontSize: 18, color: '#020203', marginTop: 8 },
  subtitle: { fontFamily: 'Inter-Regular', fontSize: 13, color: '#6A7181', marginTop: 4, marginBottom: 20 },

  timeRow: { flexDirection: 'row', gap: 12, marginBottom: 20 },
  timeCol: { flex: 1, gap: 6 },
  label: { fontFamily: 'Inter-Regular', fontSize: 13, color: '#3A414E' },
  timeInputWrap: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    borderWidth: 1, borderColor: '#E4E7EC', borderRadius: 12,
    paddingHorizontal: 14, paddingVertical: 12,
  },
  timeInput: { flex: 1, fontFamily: 'Inter-Regular', fontSize: 14, color: '#020203' },

  monthNav: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  monthPicker: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  monthLabel: { fontFamily: 'MonaSans-Bold', fontSize: 15, color: '#020203' },
  monthArrows: { flexDirection: 'row', gap: 16 },

  dayHeaders: { flexDirection: 'row', marginBottom: 4 },
  dayHeader: { width: CELL, textAlign: 'center', fontSize: 12, color: '#6A7181', fontFamily: 'Inter-Regular' },
  dayCell: {
    width: CELL, height: CELL, alignItems: 'center', justifyContent: 'center',
    marginVertical: 2, borderRadius: 8,
  },
  dayCellAvailable: { backgroundColor: '#6200EE' },
  dayCellUnavailable: { backgroundColor: '#F2F4F7' },
  dayNumber: { fontFamily: 'Inter-Regular', fontSize: 13, color: '#020203' },
  dayNumberAvailable: { color: '#FFFFFF', fontWeight: '600' },
  dayNumberPast: { color: '#D0D5DD' },

  hintText: { fontFamily: 'Inter-Regular', fontSize: 12, color: '#98A2B3', marginTop: 12, textAlign: 'center' },

  footer: {
    paddingHorizontal: 16, paddingBottom: 36, paddingTop: 12,
    borderTopWidth: 1, borderTopColor: '#F2F4F7', backgroundColor: '#FFFFFF',
  },
  continueBtn: {
    backgroundColor: '#6200EE', borderRadius: 99, height: 52,
    alignItems: 'center', justifyContent: 'center',
  },
  continueBtnDisabled: { backgroundColor: '#C4B5FD' },
  continueBtnText: { color: '#FFFFFF', fontFamily: 'Inter-Regular', fontWeight: '600', fontSize: 15 },
});
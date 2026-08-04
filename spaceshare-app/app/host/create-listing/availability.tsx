import { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  FlatList,
  Dimensions,
  NativeScrollEvent,
  NativeSyntheticEvent,
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
const ITEM_HEIGHT = 44;

const HOURS = Array.from({ length: 12 }, (_, i) => String(i + 1).padStart(2, '0'));
const MINUTES = Array.from({ length: 60 }, (_, i) => String(i).padStart(2, '0'));
const PERIODS = ['AM', 'PM'];

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

function parseTimeString(value: string): { h: number; m: number; p: number } {
  const match = value.match(/(\d{1,2}):(\d{2})\s*(AM|PM)/i);
  if (!match) return { h: 9, m: 0, p: 0 };
  const hour = parseInt(match[1], 10);
  const minute = parseInt(match[2], 10);
  const period = match[3].toUpperCase() === 'PM' ? 1 : 0;
  return { h: Math.max(0, Math.min(hour - 1, 11)), m: minute, p: period };
}

function timeLabelFrom(h: number, m: number, p: number) {
  return `${HOURS[h]}:${MINUTES[m]} ${PERIODS[p]}`;
}

function DrumPicker({ items, selectedIndex, onSelect }: {
  items: string[]; selectedIndex: number; onSelect: (i: number) => void;
}) {
  const ref = useRef<ScrollView>(null);
  const onMomentumEnd = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const i = Math.round(e.nativeEvent.contentOffset.y / ITEM_HEIGHT);
    onSelect(Math.max(0, Math.min(i, items.length - 1)));
  };
  return (
    <View style={drum.wrap}>
      <View style={drum.selector} pointerEvents="none" />
      <ScrollView
        ref={ref}
        showsVerticalScrollIndicator={false}
        snapToInterval={ITEM_HEIGHT}
        decelerationRate="fast"
        onMomentumScrollEnd={onMomentumEnd}
        contentContainerStyle={{ paddingVertical: ITEM_HEIGHT * 2 }}
        contentOffset={{ x: 0, y: selectedIndex * ITEM_HEIGHT }}
      >
        {items.map((label, i) => (
          <TouchableOpacity key={i} style={drum.item} onPress={() => {
            onSelect(i);
            ref.current?.scrollTo({ y: i * ITEM_HEIGHT, animated: true });
          }}>
            <Text style={[drum.label, i === selectedIndex && drum.labelActive]}>{label}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
}

const drum = StyleSheet.create({
  wrap: { width: 72, height: ITEM_HEIGHT * 5, overflow: 'hidden' },
  selector: {
    position: 'absolute', top: ITEM_HEIGHT * 2, left: 0, right: 0,
    height: ITEM_HEIGHT, borderTopWidth: 1, borderBottomWidth: 1, borderColor: '#6200EE', zIndex: 1,
  },
  item: { height: ITEM_HEIGHT, alignItems: 'center', justifyContent: 'center' },
  label: { fontSize: 20, color: '#C0C0C0', fontFamily: 'Inter-Regular' },
  labelActive: { color: '#020203', fontWeight: '600', fontSize: 22 },
});

export default function CreateListingAvailability() {
  const dispatch = useDispatch();
  const listing = useSelector((state: RootState) => state.createListing);

  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth());
  const [unavailableDates, setUnavailableDates] = useState<string[]>(listing.unavailableDates);

  const [pickingTime, setPickingTime] = useState<'start' | 'end' | null>(null);
  const initialStart = parseTimeString(listing.startTime);
  const initialEnd = parseTimeString(listing.endTime);
  const [startH, setStartH] = useState(initialStart.h);
  const [startM, setStartM] = useState(initialStart.m);
  const [startP, setStartP] = useState(initialStart.p);
  const [endH, setEndH] = useState(initialEnd.h);
  const [endM, setEndM] = useState(initialEnd.m);
  const [endP, setEndP] = useState(initialEnd.p);

  const startLabel = timeLabelFrom(startH, startM, startP);
  const endLabel = timeLabelFrom(endH, endM, endP);

  const cells = buildMonth(year, month);

  const prevMonth = () => {
    if (month === 0) { setMonth(11); setYear((y) => y - 1); } else setMonth((m) => m - 1);
  };
  const nextMonth = () => {
    if (month === 11) { setMonth(0); setYear((y) => y + 1); } else setMonth((m) => m + 1);
  };

  const handleToggleDate = (date: Date, isBookedOrPending: boolean) => {
    if (isBookedOrPending) return; // can't toggle booked/pending dates
    const past = new Date();
    past.setHours(0, 0, 0, 0);
    if (date < past) return;

    const key = formatKey(date);
    setUnavailableDates((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]
    );
  };

  const handleDoneTime = () => {
    if (pickingTime === 'start') setPickingTime('end');
    else if (pickingTime === 'end') setPickingTime(null);
  };

  const canContinue = true;

  const handleContinue = () => {
    dispatch(updateListingData({ startTime: startLabel, endTime: endLabel, unavailableDates }));
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
            <TouchableOpacity
              style={[s.timeBox, pickingTime === 'start' && s.timeBoxActive]}
              onPress={() => setPickingTime('start')}
            >
              <Text style={s.timeValue}>{startLabel}</Text>
              <Feather name="clock" size={14} color="#6A7181" />
            </TouchableOpacity>
          </View>
          <View style={s.timeCol}>
            <Text style={s.label}>End Time</Text>
            <TouchableOpacity
              style={[s.timeBox, pickingTime === 'end' && s.timeBoxActive]}
              onPress={() => setPickingTime('end')}
            >
              <Text style={s.timeValue}>{endLabel}</Text>
              <Feather name="clock" size={14} color="#6A7181" />
            </TouchableOpacity>
          </View>
        </View>

        {pickingTime !== null && (
          <View style={s.drumSection}>
            <View style={s.drumRow}>
              <DrumPicker
                items={HOURS}
                selectedIndex={pickingTime === 'start' ? startH : endH}
                onSelect={(i) => (pickingTime === 'start' ? setStartH(i) : setEndH(i))}
              />
              <Text style={s.drumColon}>:</Text>
              <DrumPicker
                items={MINUTES}
                selectedIndex={pickingTime === 'start' ? startM : endM}
                onSelect={(i) => (pickingTime === 'start' ? setStartM(i) : setEndM(i))}
              />
              <DrumPicker
                items={PERIODS}
                selectedIndex={pickingTime === 'start' ? startP : endP}
                onSelect={(i) => (pickingTime === 'start' ? setStartP(i) : setEndP(i))}
              />
            </View>
            <TouchableOpacity style={s.doneBtn} onPress={handleDoneTime}>
              <Text style={s.doneBtnText}>Done</Text>
            </TouchableOpacity>
          </View>
        )}

        <View style={s.monthNav}>
          <TouchableOpacity onPress={prevMonth}>
            <Feather name="chevron-left" size={20} color="#020203" />
          </TouchableOpacity>
          <Text style={s.monthLabel}>{MONTHS[month]} {year}</Text>
          <TouchableOpacity onPress={nextMonth}>
            <Feather name="chevron-right" size={20} color="#020203" />
          </TouchableOpacity>
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
            const isBookedOrPending = false;
            const isAvailable = !isPast && !isUnavailable && !isBookedOrPending;

            return (
              <TouchableOpacity
                style={[
                  s.dayCell,
                  isUnavailable && !isPast && s.dayCellUnavailable,
                  isPast && s.dayCellPast,
                ]}
                onPress={() => handleToggleDate(item.date!, isBookedOrPending)}
                disabled={isPast || isBookedOrPending}
              >
                {isAvailable && (
                  <View style={[s.statusDot, { backgroundColor: '#16A34A' }]} />
                )}
                {isBookedOrPending && !isPast && (
                  <View style={[s.statusDot, { backgroundColor: '#F97316' }]} />
                )}
                <Text
                  style={[
                    s.dayNumber,
                    isUnavailable && !isPast && s.dayNumberUnavailable,
                    isPast && s.dayNumberPast,
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

  timeRow: { flexDirection: 'row', gap: 12, marginBottom: 16 },
  timeCol: { flex: 1, gap: 6 },
  label: { fontFamily: 'Inter-Regular', fontSize: 13, color: '#3A414E' },
  timeBox: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    borderWidth: 1, borderColor: '#E4E7EC', borderRadius: 10,
    paddingHorizontal: 12, paddingVertical: 10,
  },
  timeBoxActive: { borderColor: '#6200EE' },
  timeValue: { fontFamily: 'Inter-Regular', fontSize: 14, color: '#020203' },

  drumSection: { marginBottom: 16, alignItems: 'center' },
  drumRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  drumColon: { fontSize: 24, fontWeight: '700', color: '#020203', marginBottom: 4 },
  doneBtn: {
    marginTop: 12, backgroundColor: '#6200EE', borderRadius: 99,
    paddingHorizontal: 32, paddingVertical: 10,
  },
  doneBtnText: { color: '#FFFFFF', fontFamily: 'Inter-Regular', fontWeight: '600', fontSize: 14 },

  monthNav: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  monthLabel: { fontFamily: 'MonaSans-Bold', fontSize: 15, color: '#020203' },

  dayHeaders: { flexDirection: 'row', marginBottom: 4 },
  dayHeader: { width: CELL, textAlign: 'center', fontSize: 12, color: '#6A7181', fontFamily: 'Inter-Regular' },
  dayCell: {
    width: CELL, height: CELL, alignItems: 'center', justifyContent: 'center',
    marginVertical: 2, borderRadius: 8, position: 'relative',
  },
  dayCellUnavailable: { backgroundColor: '#6200EE' },
  dayCellPast: { opacity: 0.4 },
  dayNumber: { fontFamily: 'Inter-Regular', fontSize: 13, color: '#020203' },
  dayNumberUnavailable: { color: '#FFFFFF', fontWeight: '600' },
  dayNumberPast: { color: '#D0D5DD' },
  statusDot: {
    position: 'absolute', top: 4, right: 4, width: 6, height: 6, borderRadius: 3,
  },

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
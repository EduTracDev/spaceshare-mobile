import { useState, useRef } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, Modal,
  ScrollView, FlatList, Dimensions,
  NativeScrollEvent, NativeSyntheticEvent,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import NumberOfGuests from './NumberOfGuests';

const { height, width } = Dimensions.get('window');

type DateStatus = 'available' | 'booked' | 'pending' | 'unavailable';

interface DayCell {
  date: Date | null;
  status: DateStatus;
}

interface Props {
  visible: boolean;
  onClose: () => void;
 onConfirm: (
    startDate: Date,
    endDate: Date,
    startTime: string,
    endTime: string,
    guests: number,
    viewBooking?: boolean,
    finalAddOns?: { [key: string]: number }
  ) => void;
  spaceOpenTime?: string;
  spaceCloseTime?: string;
  spaceCapacity?: number;
  hasAttendeePricing?: boolean;
  attendeeTiers?: { range: string; price: number }[];
  addOns?: { name: string; price: number; available: number }[];
  selectedAddOns?: { [key: string]: number };
  spaceName?: string;
  spaceLocation?: string;
  spacePrice?: number;
  spaceImage?: any;
}

const BOOKED_DATES: string[] = ['2026-07-05', '2026-07-12', '2026-07-19'];
const PENDING_DATES: string[] = ['2026-07-08', '2026-07-15'];

function formatKey(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function getStatus(d: Date): DateStatus {
  const key = formatKey(d);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  if (d < today) return 'unavailable';
  if (BOOKED_DATES.includes(key)) return 'booked';
  if (PENDING_DATES.includes(key)) return 'pending';
  return 'available';
}

function buildMonth(year: number, month: number): DayCell[] {
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells: DayCell[] = [];
  for (let i = 0; i < firstDay; i++) cells.push({ date: null, status: 'unavailable' });
  for (let d = 1; d <= daysInMonth; d++) {
    const date = new Date(year, month, d);
    cells.push({ date, status: getStatus(date) });
  }
  return cells;
}

function isBetween(d: Date, start: Date, end: Date) {
  return d.getTime() > start.getTime() && d.getTime() < end.getTime();
}

function isSameDay(a: Date, b: Date) {
  return a.toDateString() === b.toDateString();
}

const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];
const SHORT_MONTHS = ['JAN','FEB','MAR','APR','MAY','JUN','JUL','AUG','SEP','OCT','NOV','DEC'];
const DAYS = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
const ITEM_HEIGHT = 44;

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

const HOURS = Array.from({ length: 12 }, (_, i) => String(i + 1).padStart(2, '0'));
const MINUTES = Array.from({ length: 60 }, (_, i) => String(i).padStart(2, '0'));
const PERIODS = ['AM', 'PM'];

function timeLabelFrom(h: number, m: number, p: number) {
  return `${HOURS[h]}:${MINUTES[m]} ${PERIODS[p]}`;
}

function ProgressBar({ step }: { step: number }) {
  return (
    <View style={pb.row}>
      {[1, 2, 3, 4].map(n => (
        <View key={n} style={[pb.bar, n === step ? pb.barActive : pb.barInactive]} />
      ))}
    </View>
  );
}

const pb = StyleSheet.create({
  row: { flexDirection: 'row', gap: 6, marginBottom: 20 },
  bar: { flex: 1, height: 4, borderRadius: 99 },
  barActive: { backgroundColor: '#6200EE' },
  barInactive: { backgroundColor: '#E4E7EC' },
});

function DateChip({ date }: { date: Date }) {
  return (
    <View style={chip.wrap}>
      <Text style={chip.month}>{SHORT_MONTHS[date.getMonth()]}</Text>
      <Text style={chip.day}>{date.getDate()}</Text>
    </View>
  );
}

const chip = StyleSheet.create({
  wrap: {
    backgroundColor: '#6200EE', borderRadius: 10,
    paddingHorizontal: 14, paddingVertical: 6, alignItems: 'center',
  },
  month: { fontFamily: 'Inter-Regular', fontSize: 10, color: 'rgba(255,255,255,0.7)' },
  day: { fontFamily: 'MonaSans-Bold', fontSize: 16, color: '#FFFFFF' },
});

export default function SelectBookingDate({
  visible, onClose, onConfirm,
  spaceOpenTime = '10:00AM',
  spaceCloseTime = '06:00PM',
  spaceCapacity = 50,
  hasAttendeePricing = false,
  attendeeTiers = [],
  addOns = [],
  selectedAddOns = {},
  spaceName = '',
  spaceLocation = '',
  spacePrice = 0,
  spaceImage = null,
}: Props) {
  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth());
  const [rangeStart, setRangeStart] = useState<Date | null>(null);
  const [rangeEnd, setRangeEnd] = useState<Date | null>(null);
  const [pickingTime, setPickingTime] = useState<'start' | 'end' | null>(null);
  const [startH, setStartH] = useState(9);
  const [startM, setStartM] = useState(0);
  const [startP, setStartP] = useState(0);
  const [endH, setEndH] = useState(5);
  const [endM, setEndM] = useState(0);
  const [endP, setEndP] = useState(1);
  const [guestsVisible, setGuestsVisible] = useState(false);

  const cells = buildMonth(year, month);

  const prevMonth = () => {
    if (month === 0) { setMonth(11); setYear(y => y - 1); } else setMonth(m => m - 1);
  };
  const nextMonth = () => {
    if (month === 11) { setMonth(0); setYear(y => y + 1); } else setMonth(m => m + 1);
  };
  const handleClose = () => {
  setRangeStart(null);
  setRangeEnd(null);
  setPickingTime(null);
  setGuestsVisible(false);
  onClose();
};

  const handleDayPress = (cell: DayCell) => {
    if (!cell.date || cell.status === 'booked' || cell.status === 'unavailable') return;
    if (!rangeStart || rangeEnd) {
      setRangeStart(cell.date);
      setRangeEnd(null);
    } else {
      if (cell.date.getTime() < rangeStart.getTime()) {
        setRangeStart(cell.date);
        setRangeEnd(null);
      } else {
        setRangeEnd(cell.date);
      }
    }
  };

  const handleDone = () => {
    if (pickingTime === 'start') { setPickingTime('end'); }
    else if (pickingTime === 'end') { setPickingTime(null); }
  };

  const canContinue = rangeStart !== null;

  const handleConfirm = () => {
    if (!canContinue) return;
    setGuestsVisible(true);
  };

  const startLabel = timeLabelFrom(startH, startM, startP);
  const endLabel = timeLabelFrom(endH, endM, endP);

  const getCellStyle = (item: DayCell) => {
    if (!item.date) return null;
    const isStart = rangeStart && isSameDay(item.date, rangeStart);
    const isEnd = rangeEnd && isSameDay(item.date, rangeEnd);
    const inRange = rangeStart && rangeEnd && isBetween(item.date, rangeStart, rangeEnd);
    if (isStart || isEnd) return s.dayCellSelected;
    if (inRange) return s.dayCellInRange;
    if (item.status === 'booked') return s.dayCellBooked;
    return null;
  };

  const getTextStyle = (item: DayCell) => {
    if (!item.date) return null;
    const isStart = rangeStart && isSameDay(item.date, rangeStart);
    const isEnd = rangeEnd && isSameDay(item.date, rangeEnd);
    const inRange = rangeStart && rangeEnd && isBetween(item.date, rangeStart, rangeEnd);
    if (isStart || isEnd) return s.dayNumberSelected;
    if (inRange) return s.dayNumberInRange;
    if (item.status === 'unavailable' || item.status === 'booked') return s.dayNumberDim;
    return null;
  };

  return (
    <Modal visible={visible} transparent animationType="slide">
      <BlurView intensity={30} tint="dark" style={s.overlay}>
        <View style={s.sheet}>

          <View style={s.handle} />
          <ProgressBar step={1} />

          <View style={s.header}>
            <Text style={s.title}>Select Your Booking Date</Text>
           <TouchableOpacity onPress={handleClose}>
  <Feather name="x" size={20} color="#020203" />
</TouchableOpacity>
          </View>
          <Text style={s.subtitle}>
            Choose an available date for your event. Available dates are highlighted in green.
          </Text>

          <View style={s.timeRow}>
            <View style={s.timeCol}>
              <Text style={s.timeLabel}>Event Start Time</Text>
              <TouchableOpacity
                style={[s.timeBox, pickingTime === 'start' && s.timeBoxActive]}
                onPress={() => setPickingTime('start')}
              >
                <Text style={s.timeValue}>{startLabel}</Text>
                <Feather name="clock" size={14} color="#6A7181" />
              </TouchableOpacity>
            </View>
            <View style={s.timeCol}>
              <Text style={s.timeLabel}>Event End Time</Text>
              <TouchableOpacity
                style={[s.timeBox, pickingTime === 'end' && s.timeBoxActive]}
                onPress={() => setPickingTime('end')}
              >
                <Text style={s.timeValue}>{endLabel}</Text>
                <Feather name="clock" size={14} color="#6A7181" />
              </TouchableOpacity>
            </View>
          </View>

          <ScrollView showsVerticalScrollIndicator={false}>
            {pickingTime !== null && (
              <View style={s.drumSection}>
                <View style={s.drumRow}>
                  <DrumPicker
                    items={HOURS}
                    selectedIndex={pickingTime === 'start' ? startH : endH}
                    onSelect={i => pickingTime === 'start' ? setStartH(i) : setEndH(i)}
                  />
                  <Text style={s.drumColon}>:</Text>
                  <DrumPicker
                    items={MINUTES}
                    selectedIndex={pickingTime === 'start' ? startM : endM}
                    onSelect={i => pickingTime === 'start' ? setStartM(i) : setEndM(i)}
                  />
                  <DrumPicker
                    items={PERIODS}
                    selectedIndex={pickingTime === 'start' ? startP : endP}
                    onSelect={i => pickingTime === 'start' ? setStartP(i) : setEndP(i)}
                  />
                </View>
                <TouchableOpacity style={s.doneBtn} onPress={handleDone}>
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
              {DAYS.map(d => <Text key={d} style={s.dayHeader}>{d}</Text>)}
            </View>

            <FlatList
              data={cells}
              keyExtractor={(_, i) => i.toString()}
              numColumns={7}
              scrollEnabled={false}
              renderItem={({ item }) => {
                if (!item.date) return <View style={s.dayCell} />;
                const isStart = rangeStart && isSameDay(item.date, rangeStart);
                const isEnd = rangeEnd && isSameDay(item.date, rangeEnd);
                const isEndpoint = isStart || isEnd;
                const dotColor =
                  item.status === 'available' ? '#16A34A' :
                  item.status === 'booked' ? '#EF4444' :
                  item.status === 'pending' ? '#F97316' : null;
                return (
                  <TouchableOpacity
                    style={[s.dayCell, getCellStyle(item)]}
                    onPress={() => handleDayPress(item)}
                    disabled={item.status === 'booked' || item.status === 'unavailable'}
                  >
                    {dotColor && !isEndpoint && (
                      <View style={[s.statusDot, { backgroundColor: dotColor }]} />
                    )}
                    <Text style={[s.dayNumber, getTextStyle(item)]}>
                      {item.date.getDate()}
                    </Text>
                  </TouchableOpacity>
                );
              }}
            />

            <View style={s.legend}>
              <View style={s.legendItem}>
                <View style={[s.legendDot, { backgroundColor: '#EF4444' }]} />
                <Text style={s.legendText}>Booked dates</Text>
              </View>
              <View style={s.legendItem}>
                <View style={[s.legendDot, { backgroundColor: '#16A34A' }]} />
                <Text style={s.legendText}>Available dates</Text>
              </View>
              <View style={s.legendItem}>
                <View style={[s.legendDot, { backgroundColor: '#F97316' }]} />
                <Text style={s.legendText}>Pending Approval</Text>
              </View>
            </View>

            {rangeStart && (
              <View style={s.chipRow}>
                <DateChip date={rangeStart} />
                {rangeEnd && !isSameDay(rangeStart, rangeEnd) && (
                  <>
                    <Text style={s.chipArrow}>→</Text>
                    <DateChip date={rangeEnd} />
                  </>
                )}
              </View>
            )}

            <View style={{ height: 24 }} />
          </ScrollView>

          <TouchableOpacity
            style={[s.continueBtn, !canContinue && s.continueBtnDisabled]}
            onPress={handleConfirm}
            disabled={!canContinue}
          >
            <Text style={s.continueBtnText}>Continue</Text>
          </TouchableOpacity>

          <NumberOfGuests
            visible={guestsVisible}
            onClose={handleClose}
            onBack={() => setGuestsVisible(false)}
            spaceCapacity={spaceCapacity}
            hasAttendeePricing={hasAttendeePricing}
            attendeeTiers={attendeeTiers}
            addOns={addOns}
            selectedAddOns={selectedAddOns}
            spaceName={spaceName}
            spaceLocation={spaceLocation}
            spacePrice={spacePrice}
            spaceImage={spaceImage}
            rangeStart={rangeStart}
            rangeEnd={rangeEnd}
            startTime={startLabel}
            endTime={endLabel}
   onConfirm={(guests: number, viewBooking?: boolean, finalAddOns?: { [key: string]: number }) => {
              setGuestsVisible(false);
              setTimeout(() => {
                onConfirm(rangeStart!, rangeEnd ?? rangeStart!, startLabel, endLabel, guests, viewBooking, finalAddOns);
              }, 300);
            }}  />

        </View>
      </BlurView>
    </Modal>
  );
}

const CELL = (width - 32 - 12) / 7;

const s = StyleSheet.create({
  overlay: { flex: 1, justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: '#FFFFFF', borderTopLeftRadius: 24, borderTopRightRadius: 24,
    paddingHorizontal: 16, paddingBottom: 36, maxHeight: height * 0.92,
  },
  handle: {
    width: 40, height: 4, borderRadius: 2, backgroundColor: '#E4E7EC',
    alignSelf: 'center', marginTop: 12, marginBottom: 16,
  },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  title: { fontFamily: 'MonaSans-Bold', fontSize: 18, color: '#020203' },
  subtitle: { fontFamily: 'Inter-Regular', fontSize: 13, color: '#6A7181', lineHeight: 20, marginBottom: 16 },
  timeRow: { flexDirection: 'row', gap: 12, marginBottom: 16 },
  timeCol: { flex: 1, gap: 6 },
  timeLabel: { fontFamily: 'Inter-Regular', fontSize: 12, color: '#6A7181' },
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
  dayCellBooked: { backgroundColor: '#F2F4F7' },
  dayCellSelected: { backgroundColor: '#6200EE', borderRadius: CELL / 2 },
  dayCellInRange: { backgroundColor: '#EDE9FF', borderRadius: 0 },
  statusDot: { position: 'absolute', top: 4, right: 4, width: 5, height: 5, borderRadius: 3 },
  dayNumber: { fontFamily: 'Inter-Regular', fontSize: 13, color: '#020203' },
  dayNumberDim: { color: '#C0C0C0' },
  dayNumberSelected: { color: '#FFFFFF', fontWeight: '600' },
  dayNumberInRange: { color: '#6200EE' },
  legend: { flexDirection: 'row', justifyContent: 'center', gap: 16, marginTop: 12 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  legendDot: { width: 8, height: 8, borderRadius: 4 },
  legendText: { fontFamily: 'Inter-Regular', fontSize: 11, color: '#6A7181' },
  chipRow: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 10, marginTop: 16 },
  chipArrow: { fontSize: 16, color: '#6200EE', fontWeight: '600' },
  continueBtn: {
    backgroundColor: '#6200EE', borderRadius: 99, height: 52,
    alignItems: 'center', justifyContent: 'center', marginTop: 12,
  },
  continueBtnDisabled: { backgroundColor: '#C4B5FD' },
  continueBtnText: { color: '#FFFFFF', fontFamily: 'Inter-Regular', fontWeight: '600', fontSize: 15 },
});
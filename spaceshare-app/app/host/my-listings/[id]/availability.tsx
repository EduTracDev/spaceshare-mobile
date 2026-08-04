import { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  FlatList,
  Dimensions,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { useSelector } from 'react-redux';
import { RootState } from '@/store';
import { listingsAPI, bookingsAPI } from '@/services/api';

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

export default function EditAvailability() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const token = useSelector((state: RootState) => state.auth.token);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<'success' | 'error' | null>(null);

  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth());
  const [unavailableDates, setUnavailableDates] = useState<string[]>([]);
  const [initialDates, setInitialDates] = useState<string[]>([]);
  const [bookedDates, setBookedDates] = useState<Set<string>>(new Set());
  const [pendingDates, setPendingDates] = useState<Set<string>>(new Set());

  useEffect(() => {
    fetchListing();
    fetchBookingDates();
  }, [id]);

  const fetchListing = async () => {
    setLoading(true);
    try {
      const res = await listingsAPI.getById(id);
      const dates = res.data.listing.unavailableDates ?? [];
      setUnavailableDates(dates);
      setInitialDates(dates);
    } catch (err) {
      console.log('Failed to fetch listing:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchBookingDates = async () => {
    if (!token || !id) return;
    try {
      const res = await bookingsAPI.getListingDates(token, id);
      const booked = new Set<string>();
      const pending = new Set<string>();

      (res.data.dates ?? []).forEach((b: { startDate: string; endDate: string; status: 'PENDING' | 'BOOKED' }) => {
        const cursor = new Date(b.startDate);
        const end = new Date(b.endDate);
        while (cursor <= end) {
          const key = formatKey(cursor);
          if (b.status === 'PENDING') pending.add(key);
          else booked.add(key);
          cursor.setDate(cursor.getDate() + 1);
        }
      });

      setBookedDates(booked);
      setPendingDates(pending);
    } catch (err) {
      console.log('Failed to fetch booking dates:', err);
    }
  };

  const cells = buildMonth(year, month);

  const prevMonth = () => {
    if (month === 0) { setMonth(11); setYear((y) => y - 1); } else setMonth((m) => m - 1);
  };
  const nextMonth = () => {
    if (month === 11) { setMonth(0); setYear((y) => y + 1); } else setMonth((m) => m + 1);
  };

  const handleToggleDate = (date: Date, isBookedOrPending: boolean) => {
    if (isBookedOrPending) return;
    const past = new Date();
    past.setHours(0, 0, 0, 0);
    if (date < past) return;

    const key = formatKey(date);
    setUnavailableDates((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]
    );
  };

  const hasChanges = JSON.stringify(unavailableDates) !== JSON.stringify(initialDates);

  const handleSave = async () => {
    if (!token || !id) return;
    setSaving(true);
    setToast(null);
    try {
      await listingsAPI.update(token, id, { unavailableDates });
      setInitialDates(unavailableDates);
      setToast('success');
      setTimeout(() => {
        router.back();
      }, 1200);
    } catch (err) {
      console.log('Failed to update availability:', err);
      setToast('error');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={s.center}>
        <ActivityIndicator color="#6200EE" />
      </SafeAreaView>
    );
  }

  return (
    <View style={s.root}>
      <SafeAreaView edges={['top']} style={s.safeTop} />

      {toast && (
        <View style={[s.toast, toast === 'error' && s.toastError]}>
          <Feather
            name={toast === 'success' ? 'check-circle' : 'alert-circle'}
            size={15}
            color={toast === 'success' ? '#16A34A' : '#EF4444'}
          />
          <Text style={[s.toastText, toast === 'error' && s.toastTextError]}>
            {toast === 'success' ? 'Availability updated' : "Couldn't update availability. Try again"}
          </Text>
        </View>
      )}

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={s.scroll}>
        <Text style={s.title}>Edit availability</Text>

        <View style={s.legendRow}>
          <View style={s.legendItem}>
            <View style={[s.legendDot, { backgroundColor: '#F97316' }]} />
            <Text style={s.legendText}>Booked</Text>
          </View>
          <View style={s.legendItem}>
            <View style={[s.legendDot, { backgroundColor: '#16A34A' }]} />
            <Text style={s.legendText}>Available</Text>
          </View>
          <View style={s.legendItem}>
            <View style={[s.legendDot, { backgroundColor: '#6200EE' }]} />
            <Text style={s.legendText}>Unavailable</Text>
          </View>
          <View style={s.legendItem}>
            <View style={[s.legendDot, { backgroundColor: '#F59E0B' }]} />
            <Text style={s.legendText}>Pending Approval</Text>
          </View>
        </View>

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
            const isBooked = bookedDates.has(key);
            const isPending = pendingDates.has(key);
            const isBookedOrPending = isBooked || isPending;

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
                {isBooked && !isPast && (
                  <View style={[s.statusDot, { backgroundColor: '#F97316' }]} />
                )}
                {isPending && !isPast && (
                  <View style={[s.statusDot, { backgroundColor: '#F59E0B' }]} />
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

        <Text style={s.hintText}>Tap to block dates your space isn't available for booking</Text>

        <View style={{ height: 100 }} />
      </ScrollView>

      <View style={s.footer}>
        <TouchableOpacity style={s.cancelBtn} onPress={() => router.back()}>
          <Text style={s.cancelBtnText}>Cancel</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[s.saveBtn, (!hasChanges || saving) && s.saveBtnDisabled]}
          onPress={handleSave}
          disabled={!hasChanges || saving}
        >
          {saving ? <ActivityIndicator color="#FFFFFF" /> : <Text style={s.saveBtnText}>Save changes</Text>}
        </TouchableOpacity>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#FFFFFF' },
  safeTop: { backgroundColor: '#FFFFFF' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#FFFFFF' },
  scroll: { paddingHorizontal: 16 },

  toast: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: '#DCFCE7', marginHorizontal: 16, marginTop: 8,
    borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10,
  },
  toastError: { backgroundColor: '#FEE2E2' },
  toastText: { fontFamily: 'Inter-Regular', fontSize: 12, color: '#16A34A', flex: 1 },
  toastTextError: { color: '#EF4444' },

  title: {
    fontFamily: 'Inter-SemiBold', fontWeight: '600', fontSize: 16,
    lineHeight: 24, letterSpacing: -0.5, color: '#020203', marginTop: 12,
  },

  legendRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 14, marginTop: 16, marginBottom: 16 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  legendDot: { width: 8, height: 8, borderRadius: 4 },
  legendText: { fontFamily: 'Inter-Regular', fontSize: 12, color: '#6A7181' },

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
    flexDirection: 'row', gap: 12, paddingHorizontal: 16, paddingBottom: 36, paddingTop: 12,
    borderTopWidth: 1, borderTopColor: '#F2F4F7', backgroundColor: '#FFFFFF',
  },
  cancelBtn: {
    flex: 1, backgroundColor: '#EDE9FF', borderRadius: 99, height: 52,
    alignItems: 'center', justifyContent: 'center',
  },
  cancelBtnText: { fontFamily: 'Inter-Regular', fontWeight: '600', fontSize: 15, color: '#6200EE' },
  saveBtn: {
    flex: 1, backgroundColor: '#6200EE', borderRadius: 99, height: 52,
    alignItems: 'center', justifyContent: 'center',
  },
  saveBtnDisabled: { backgroundColor: '#C4B5FD' },
  saveBtnText: { fontFamily: 'Inter-Regular', fontWeight: '600', fontSize: 15, color: '#FFFFFF' },
});
import { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Image,
  Modal,
  ActivityIndicator,
  TextInput,
  KeyboardAvoidingView,
  TouchableWithoutFeedback,
  Keyboard,
  Platform,
  Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { useFocusEffect } from 'expo-router';
import { useSelector } from 'react-redux';
import { RootState } from '@/store';
import { bookingsAPI } from '@/services/api';

type BookingStatus = 'PENDING' | 'APPROVED' | 'DECLINED' | 'PAID' | 'COMPLETED' | 'CANCELLED';
type AddOnBreakdownItem = { name: string; total: number };

type ApiBooking = {
  id: string;
  spaceName: string;
  spaceLocation: string;
  spacePrice: number;
  totalPrice: number;
  startDate: string;
  startTime: string;
  endTime: string;
  guests: number;
  status: BookingStatus;
  addOnsBreakdown: AddOnBreakdownItem[] | null;
  listing?: { photos: string[] };
  guest?: { firstName: string | null; lastName: string | null; email: string; phone: string | null };
};

const STATUS_BADGE: Record<BookingStatus, { bg: string; text: string }> = {
  PENDING: { bg: '#FFEDD5', text: '#F97316' },
  APPROVED: { bg: '#DCFCE7', text: '#16A34A' },
  DECLINED: { bg: '#FEE2E2', text: '#EF4444' },
  PAID: { bg: '#EDE9FE', text: '#7C3AED' },
  COMPLETED: { bg: '#FCE7F3', text: '#DB2777' },
  CANCELLED: { bg: '#F2F4F7', text: '#6A7181' },
};

const STATUS_LABEL: Record<BookingStatus, string> = {
  PENDING: 'Pending',
  APPROVED: 'Approved',
  DECLINED: 'Declined',
  PAID: 'Paid',
  COMPLETED: 'Completed',
  CANCELLED: 'Cancelled',
};

const COMMISSION_RATE = 0.1;

type TabKey = 'new' | 'all' | 'completed';

export default function HostRequests() {
  const token = useSelector((state: RootState) => state.auth.token);
  const [activeTab, setActiveTab] = useState<TabKey>('new');
  const [bookings, setBookings] = useState<ApiBooking[]>([]);
  const [loading, setLoading] = useState(true);

  const [selected, setSelected] = useState<ApiBooking | null>(null);
  const [sheetView, setSheetView] = useState<'closed' | 'detail' | 'confirm' | 'declineReason' | 'cancelReason' | 'success'>('closed');
  const [pendingDecision, setPendingDecision] = useState<'approve' | 'decline' | 'cancel' | null>(null);
  const [declineReason, setDeclineReason] = useState('');
  const [declineReasonError, setDeclineReasonError] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const [cancelAcknowledged, setCancelAcknowledged] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  const fetchBookings = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      const res = await bookingsAPI.getHostBookings(token);
      setBookings(res.data.bookings ?? []);
    } catch (err) {
      console.log('Failed to fetch requests:', err);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useFocusEffect(
    useCallback(() => {
      fetchBookings();
    }, [fetchBookings])
  );

  const guestName = (b: ApiBooking) =>
    [b.guest?.firstName, b.guest?.lastName].filter(Boolean).join(' ') || b.guest?.email || 'Guest';

  const spaceFee = selected?.spacePrice ?? 0;
  const addOnsTotal = (selected?.addOnsBreakdown ?? []).reduce((sum, a) => sum + a.total, 0);
  const grossTotal = spaceFee + addOnsTotal;
  const commission = Math.round(grossTotal * COMMISSION_RATE);
  const netPayout = grossTotal - commission;
  const bookingCode = selected ? `#BK-${selected.id.slice(-4).toUpperCase()}` : '';
  const eventDate = selected
    ? new Date(selected.startDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' })
    : '';

  const handleConfirmDecision = async () => {
    if (!token || !selected || !pendingDecision) return;

    if (pendingDecision === 'decline' && !declineReason.trim()) {
      setDeclineReasonError(true);
      return;
    }
    if (pendingDecision === 'cancel' && (!cancelReason.trim() || !cancelAcknowledged)) {
      return;
    }

    setActionLoading(true);
    try {
      const status = pendingDecision === 'approve' ? 'APPROVED' : pendingDecision === 'decline' ? 'DECLINED' : 'CANCELLED';
      const res = await bookingsAPI.updateStatus(
        token,
        selected.id,
        status,
        pendingDecision === 'decline' ? declineReason.trim() : undefined,
        pendingDecision === 'cancel' ? cancelReason.trim() : undefined
      );
      const updatedStatus = res.data.booking.status;
      const bookingId = selected.id;
      setBookings((prev) => prev.map((b) => (b.id === bookingId ? { ...b, status: updatedStatus } : b)));
      setSheetView('success');
      setTimeout(() => {
        setSheetView('closed');
        setSelected(null);
        setPendingDecision(null);
        setDeclineReason('');
        setDeclineReasonError(false);
        setCancelReason('');
        setCancelAcknowledged(false);
      }, 1800);
    } catch (err: any) {
      console.log('Failed to update booking:', err?.response?.data ?? err);
      alert(err?.response?.data?.message ?? 'Failed to update booking. Please try again.');
    } finally {
      setActionLoading(false);
    }
  };

  const filteredBookings =
    activeTab === 'new'
      ? bookings.filter((b) => b.status === 'PENDING')
      : activeTab === 'completed'
      ? bookings.filter((b) => b.status === 'COMPLETED')
      : bookings;

  return (
    <View style={s.root}>
      <SafeAreaView edges={['top']} style={s.safeTop}>
        <View style={s.header}>
          <Text style={s.headerTitle}>Requests</Text>
        </View>

        <View style={s.tabsRow}>
          <TouchableOpacity style={[s.tab, activeTab === 'new' && s.tabActive]} onPress={() => setActiveTab('new')}>
            <Text style={[s.tabText, activeTab === 'new' && s.tabTextActive]}>New</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[s.tab, activeTab === 'all' && s.tabActive]} onPress={() => setActiveTab('all')}>
            <Text style={[s.tabText, activeTab === 'all' && s.tabTextActive]}>All</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[s.tab, activeTab === 'completed' && s.tabActive]} onPress={() => setActiveTab('completed')}>
            <Text style={[s.tabText, activeTab === 'completed' && s.tabTextActive]}>Completed</Text>
          </TouchableOpacity>
        </View>

        {loading ? (
          <View style={s.emptyState}>
            <ActivityIndicator color="#6200EE" />
          </View>
        ) : filteredBookings.length === 0 ? (
          <View style={s.emptyState}>
            <View style={s.emptyIconWrap}>
              <Feather name="inbox" size={32} color="#C4B5FD" />
            </View>
            <Text style={s.emptySubtitle}>
              {activeTab === 'new'
                ? "No pending requests... Booking requests from guests will appear here."
                : 'No requests found in this category.'}
            </Text>
          </View>
        ) : (
          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={s.list}>
            {filteredBookings.map((b) => (
              <TouchableOpacity
                key={b.id}
                style={s.card}
                activeOpacity={0.85}
                onPress={() => { setSelected(b); setSheetView('detail'); }}
              >
                <View style={s.cardTopRow}>
                  <Text style={s.guestName}>{guestName(b)}</Text>
                  <Text style={s.price}>₦{(b.totalPrice ?? b.spacePrice).toLocaleString()}</Text>
                </View>
                <View style={s.cardBottomRow}>
                  <Text style={s.metaText}>
                    {b.spaceName} • {new Date(b.startDate).toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' })}
                  </Text>
                  <View style={[s.statusBadge, { backgroundColor: STATUS_BADGE[b.status].bg }]}>
                    <Text style={[s.statusText, { color: STATUS_BADGE[b.status].text }]}>
                      {STATUS_LABEL[b.status]}
                    </Text>
                  </View>
                </View>
              </TouchableOpacity>
            ))}
            <View style={{ height: 20 }} />
          </ScrollView>
        )}
      </SafeAreaView>

      {/* Single modal, content switches based on view state */}
      <Modal visible={sheetView !== 'closed'} transparent animationType="slide">
        <BlurView intensity={30} tint="dark" style={s.overlay}>
          {sheetView === 'detail' && selected && (
            <View style={s.sheet}>
              <View style={s.handle} />
              <View style={s.sheetHeader}>
                <Text style={s.sheetGuestName}>{guestName(selected)}</Text>
                <View style={s.sheetHeaderIcons}>
                  {selected.guest?.email && (
                    <TouchableOpacity
                      style={s.sheetIconBtn}
                      onPress={() => Linking.openURL(`mailto:${selected.guest?.email}`)}
                    >
                      <Feather name="mail" size={15} color="#6200EE" />
                    </TouchableOpacity>
                  )}
                  {selected.guest?.phone && (
                    <TouchableOpacity
                      style={s.sheetIconBtn}
                      onPress={() => Linking.openURL(`tel:${selected.guest?.phone}`)}
                    >
                      <Feather name="phone" size={15} color="#6200EE" />
                    </TouchableOpacity>
                  )}
                  <TouchableOpacity onPress={() => setSheetView('closed')}>
                    <Feather name="x" size={20} color="#020203" />
                  </TouchableOpacity>
                </View>
              </View>

              <ScrollView showsVerticalScrollIndicator={false}>
                <View style={s.spaceRow}>
                  <Image
                    source={selected.listing?.photos?.[0] ? { uri: selected.listing.photos[0] } : undefined}
                    style={s.spaceThumb}
                  />
                  <View style={{ flex: 1 }}>
                    <View style={s.spaceNameRow}>
                      <Text style={s.spaceName}>{selected.spaceName}</Text>
                      <View style={[s.statusBadge, { backgroundColor: STATUS_BADGE[selected.status].bg }]}>
                        <Text style={[s.statusText, { color: STATUS_BADGE[selected.status].text }]}>
                          {STATUS_LABEL[selected.status]}
                        </Text>
                      </View>
                    </View>
                    <View style={s.spaceLocationRow}>
                      <Feather name="map-pin" size={11} color="#6A7181" />
                      <Text style={s.spaceLocationText}>{selected.spaceLocation}</Text>
                    </View>
                  </View>
                </View>

                <View style={s.detailGrid}>
                  <View style={s.detailRow}>
                    <Text style={s.detailLabel}>Booking ID</Text>
                    <Text style={s.detailValue}>{bookingCode}</Text>
                  </View>
                  <View style={s.detailRow}>
                    <Text style={s.detailLabel}>Event Date</Text>
                    <Text style={s.detailValue}>{eventDate}</Text>
                  </View>
                  <View style={s.detailRow}>
                    <Text style={s.detailLabel}>Event Time</Text>
                    <Text style={s.detailValue}>{selected.startTime} - {selected.endTime}</Text>
                  </View>
                  <View style={s.detailRow}>
                    <Text style={s.detailLabel}>Attendees</Text>
                    <Text style={s.detailValue}>{selected.guests} guests</Text>
                  </View>
                </View>

                {selected.addOnsBreakdown && selected.addOnsBreakdown.length > 0 && (
                  <View style={s.addOnsBox}>
                    <Text style={s.addOnsTitle}>Add-Ons Requested</Text>
                    {selected.addOnsBreakdown.map((a) => (
                      <View key={a.name} style={s.detailRow}>
                        <Text style={s.addOnLabel}>{a.name}</Text>
                        <Text style={s.addOnValue}>₦{a.total.toLocaleString()}</Text>
                      </View>
                    ))}
                  </View>
                )}

                <View style={s.payoutBox}>
                  <View style={s.detailRow}>
                    <Text style={s.spaceFeeLabel}>Space Fee</Text>
                    <Text style={s.spaceFeeValue}>₦{spaceFee.toLocaleString()}</Text>
                  </View>
                  <View style={s.detailRow}>
                    <Text style={s.commissionLabel}>Commission (10%)</Text>
                    <Text style={s.commissionValue}>-₦{commission.toLocaleString()}</Text>
                  </View>
                  <View style={s.divider} />
                  <View style={s.detailRow}>
                    <Text style={s.netLabel}>You'll receive</Text>
                    <Text style={s.netValue}>₦{netPayout.toLocaleString()}</Text>
                  </View>
                </View>

                {selected.status === 'PAID' && (
                  <View style={s.payoutInfoBanner}>
                    <Feather name="info" size={14} color="#B45309" />
                    <Text style={s.payoutInfoText}>
                      Payment will be released once the guest confirms the event is completed or a dispute is raised. Ensure your account details are added correctly and kept up to date.
                    </Text>
                  </View>
                )}

                {selected.status === 'COMPLETED' && (
                  <View style={s.paidConfirmBanner}>
                    <Feather name="check-circle" size={14} color="#16A34A" />
                    <Text style={s.paidConfirmText}>Payment has been made for this booking. Thank you</Text>
                  </View>
                )}

                <View style={{ height: 20 }} />
              </ScrollView>

              {selected.status === 'PENDING' && (
                <View style={s.sheetFooter}>
                  <TouchableOpacity
                    style={s.declineBtn}
                    onPress={() => { setPendingDecision('decline'); setDeclineReason(''); setDeclineReasonError(false); setSheetView('declineReason'); }}
                  >
                    <Text style={s.declineBtnText}>Decline</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={s.approveBtn}
                    onPress={() => { setPendingDecision('approve'); setSheetView('confirm'); }}
                  >
                    <Text style={s.approveBtnText}>Approve Booking</Text>
                  </TouchableOpacity>
                </View>
              )}

              {(selected.status === 'PAID' || selected.status === 'APPROVED') && (
                <View style={s.sheetFooter}>
                  <TouchableOpacity
                    style={s.cancelBookingBtn}
                    onPress={() => { setPendingDecision('cancel'); setCancelReason(''); setCancelAcknowledged(false); setSheetView('cancelReason'); }}
                  >
                    <Text style={s.cancelBookingBtnText}>Cancel Booking</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          )}

          {sheetView === 'confirm' && pendingDecision === 'approve' && (
            <View style={s.confirmOverlayInner}>
              <View style={s.confirmCard}>
                <View style={s.confirmIconCircle}>
                  <Feather name="check" size={24} color="#FFFFFF" />
                </View>
                <Text style={s.confirmTitle}>Approve this booking?</Text>
                <Text style={s.confirmBody}>
                  Confirm to approve this booking request and reserve the selected date for the guest.
                </Text>
                <TouchableOpacity
                  style={s.confirmApproveBtn}
                  onPress={handleConfirmDecision}
                  disabled={actionLoading}
                >
                  {actionLoading ? <ActivityIndicator color="#FFFFFF" /> : (
                    <Text style={s.confirmActionText}>Approve Booking</Text>
                  )}
                </TouchableOpacity>
                <TouchableOpacity style={s.confirmCancelBtn} onPress={() => setSheetView('detail')} disabled={actionLoading}>
                  <Text style={s.confirmCancelText}>Go back</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}

          {sheetView === 'declineReason' && (
            <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
              <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                style={s.declineSheetInner}
              >
                <View style={s.declineSheetCard}>
                  <View style={s.declineSheetHeader}>
                    <TouchableOpacity onPress={() => setSheetView('detail')}>
                      <Feather name="x" size={20} color="#020203" />
                    </TouchableOpacity>
                    <Text style={s.declineSheetTitle}>Decline booking request?</Text>
                    <View style={{ width: 20 }} />
                  </View>

                  <Text style={s.declineReasonLabel}>Reason for decline</Text>
                  <TextInput
                    style={[s.declineReasonInput, declineReasonError && s.declineReasonInputError]}
                    placeholder="Enter reason for declining this booking request"
                    placeholderTextColor="#B7BEC9"
                    multiline
                    numberOfLines={4}
                    value={declineReason}
                    onChangeText={(t) => { setDeclineReason(t); if (t.trim()) setDeclineReasonError(false); }}
                    textAlignVertical="top"
                    returnKeyType="done"
                    blurOnSubmit
                    onSubmitEditing={Keyboard.dismiss}
                  />
                  {declineReasonError && (
                    <View style={s.declineErrorRow}>
                      <Feather name="alert-triangle" size={13} color="#EF4444" />
                      <Text style={s.declineErrorText}>Please enter a reason to decline this booking request.</Text>
                    </View>
                  )}

                  <TouchableOpacity
                    style={s.confirmDeclineBtn}
                    onPress={handleConfirmDecision}
                    disabled={actionLoading}
                  >
                    {actionLoading ? <ActivityIndicator color="#FFFFFF" /> : (
                      <Text style={s.confirmActionText}>Decline Request</Text>
                    )}
                  </TouchableOpacity>
                </View>
              </KeyboardAvoidingView>
            </TouchableWithoutFeedback>
          )}

          {sheetView === 'cancelReason' && selected && (
            <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
              <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                style={s.declineSheetInner}
              >
                <View style={s.declineSheetCard}>
                  <View style={s.declineSheetHeader}>
                    <TouchableOpacity onPress={() => setSheetView('detail')}>
                      <Feather name="x" size={20} color="#020203" />
                    </TouchableOpacity>
                    <View style={{ width: 20 }} />
                  </View>

                  <View style={s.cancelWarningIcon}>
                    <Feather name="alert-triangle" size={28} color="#FFFFFF" />
                  </View>

                  <Text style={s.cancelWarningTitle}>Cancel Booking</Text>
                  <Text style={s.cancelWarningBody}>
                    Are you sure you want to cancel this booking? This booking has already been confirmed
                    {selected.status === 'PAID' ? ' and paid for' : ''}. Cancelling now may impact the guest's plans and could affect your host standing.
                  </Text>

                  <Text style={s.declineReasonLabel}>Reason for Cancellation</Text>
                  <TextInput
                    style={s.declineReasonInput}
                    placeholder="Enter a reason for cancellation..."
                    placeholderTextColor="#B7BEC9"
                    multiline
                    numberOfLines={4}
                    value={cancelReason}
                    onChangeText={setCancelReason}
                    textAlignVertical="top"
                    returnKeyType="done"
                    blurOnSubmit
                    onSubmitEditing={Keyboard.dismiss}
                  />

                  <TouchableOpacity
                    style={s.acknowledgeRow}
                    onPress={() => setCancelAcknowledged(!cancelAcknowledged)}
                    activeOpacity={0.7}
                  >
                    <View style={[s.checkbox, cancelAcknowledged && s.checkboxChecked]}>
                      {cancelAcknowledged && <Feather name="check" size={12} color="#FFFFFF" />}
                    </View>
                    <Text style={s.acknowledgeText}>I understand that this action cannot be undone.</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[
                      s.confirmCancelBookingBtnRed,
                      (!cancelReason.trim() || !cancelAcknowledged) && s.confirmCancelBookingBtnDisabled,
                    ]}
                    onPress={handleConfirmDecision}
                    disabled={!cancelReason.trim() || !cancelAcknowledged || actionLoading}
                  >
                    {actionLoading ? <ActivityIndicator color="#FF3B30" /> : (
                      <Text style={s.confirmCancelBookingTextRed}>Cancel Booking</Text>
                    )}
                  </TouchableOpacity>
                  <TouchableOpacity style={s.keepBookingBtn} onPress={() => setSheetView('detail')}>
                    <Text style={s.keepBookingText}>Keep Booking</Text>
                  </TouchableOpacity>
                </View>
              </KeyboardAvoidingView>
            </TouchableWithoutFeedback>
          )}

          {sheetView === 'success' && (
            <View style={s.confirmOverlayInner}>
              <View style={s.successCard}>
                <View style={s.successIconCircle}>
                  <Feather name="check" size={28} color="#FFFFFF" />
                </View>
                <Text style={s.successTitle}>
                  {pendingDecision === 'approve'
                    ? 'Booking confirmed successfully.'
                    : pendingDecision === 'decline'
                    ? 'Booking request declined successfully.'
                    : 'Booking cancelled successfully.'}
                </Text>
              </View>
            </View>
          )}
        </BlurView>
      </Modal>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#FFFFFF' },
  safeTop: { flex: 1, backgroundColor: '#FFFFFF' },

  header: { paddingHorizontal: 16, paddingVertical: 16 },
  headerTitle: { fontFamily: 'MonaSans-Bold', fontSize: 20, color: '#020203' },

  tabsRow: {
    flexDirection: 'row', marginHorizontal: 16, backgroundColor: '#F2F4F7',
    borderRadius: 99, padding: 4, marginBottom: 12,
  },
  tab: { flex: 1, paddingVertical: 8, borderRadius: 99, alignItems: 'center' },
  tabActive: { backgroundColor: '#6200EE' },
  tabText: { fontFamily: 'Inter-Regular', fontSize: 13, color: '#6A7181' },
  tabTextActive: { color: '#FFFFFF', fontWeight: '600' },

  emptyState: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32, gap: 8 },
  emptyIconWrap: {
    width: 72, height: 72, borderRadius: 36, backgroundColor: '#F3EAFF',
    alignItems: 'center', justifyContent: 'center', marginBottom: 8,
  },
  emptySubtitle: { fontFamily: 'Inter-Regular', fontSize: 13, color: '#6A7181', textAlign: 'center' },

  list: { paddingHorizontal: 16, gap: 12 },
  card: { borderWidth: 1, borderColor: '#F2F4F7', borderRadius: 14, padding: 14, gap: 8 },
  cardTopRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  guestName: { fontFamily: 'Inter-Regular', fontWeight: '600', fontSize: 14, color: '#020203' },
  price: { fontFamily: 'Inter-Regular', fontWeight: '600', fontSize: 14, color: '#020203' },
  cardBottomRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  metaText: { fontFamily: 'Inter-Regular', fontSize: 12, color: '#6A7181', flex: 1 },
  statusBadge: { borderRadius: 99, paddingHorizontal: 8, paddingVertical: 3 },
  statusText: { fontFamily: 'Inter-Regular', fontSize: 10, fontWeight: '600' },

  overlay: { flex: 1, justifyContent: 'flex-end' },
  confirmOverlayInner: { flex: 1, justifyContent: 'center', paddingHorizontal: 24 },
  declineSheetInner: { flex: 1, justifyContent: 'flex-end' },
  declineSheetCard: {
    backgroundColor: '#FFFFFF', borderTopLeftRadius: 24, borderTopRightRadius: 24,
    padding: 20, paddingBottom: 32, gap: 4,
  },
  declineSheetHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16,
  },
  declineSheetTitle: { fontFamily: 'MonaSans-Bold', fontSize: 16, color: '#020203' },
  declineReasonLabel: { fontFamily: 'Inter-Regular', fontSize: 13, color: '#3A414E', marginBottom: 8 },
  declineReasonInput: {
    borderWidth: 1, borderColor: '#E4E7EC', borderRadius: 12,
    paddingHorizontal: 14, paddingVertical: 12, minHeight: 100,
    fontFamily: 'Inter-Regular', fontSize: 14, color: '#020203', marginBottom: 8,
  },
  declineReasonInputError: { borderColor: '#EF4444' },
  declineErrorRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 16 },
  declineErrorText: { fontFamily: 'Inter-Regular', fontSize: 12, color: '#EF4444', flex: 1 },

  cancelWarningIcon: {
    width: 52, height: 52, borderRadius: 26, backgroundColor: '#EF4444',
    alignItems: 'center', justifyContent: 'center', alignSelf: 'center', marginBottom: 10,
  },
  cancelWarningTitle: { fontFamily: 'MonaSans-Bold', fontSize: 17, color: '#020203', textAlign: 'center', marginBottom: 8 },
  cancelWarningBody: {
    fontFamily: 'Inter-Regular', fontSize: 13, color: '#6A7181',
    textAlign: 'center', lineHeight: 20, marginBottom: 20,
  },
  acknowledgeRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, marginBottom: 20 },
  acknowledgeText: { flex: 1, fontFamily: 'Inter-Regular', fontSize: 13, color: '#3A414E', lineHeight: 18 },
  confirmCancelBookingBtnRed: {
    width: '100%', backgroundColor: '#FFDCDB', borderRadius: 99, height: 52,
    alignItems: 'center', justifyContent: 'center', marginBottom: 10,
  },
  confirmCancelBookingTextRed: { color: '#FF3B30', fontFamily: 'Inter-Regular', fontWeight: '600', fontSize: 15 },

  sheet: {
    backgroundColor: '#FFFFFF', borderTopLeftRadius: 24, borderTopRightRadius: 24,
    paddingHorizontal: 16, paddingBottom: 24, maxHeight: '88%',
  },
  handle: {
    width: 40, height: 4, borderRadius: 2, backgroundColor: '#E4E7EC',
    alignSelf: 'center', marginTop: 12, marginBottom: 12,
  },
  sheetHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 },
  sheetGuestName: { fontFamily: 'MonaSans-Bold', fontSize: 18, color: '#020203' },
  sheetHeaderIcons: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  sheetIconBtn: {
    width: 32, height: 32, borderRadius: 16, backgroundColor: '#F2F4F7',
    alignItems: 'center', justifyContent: 'center',
  },

  spaceRow: { flexDirection: 'row', gap: 10, marginBottom: 16 },
  spaceThumb: { width: 56, height: 56, borderRadius: 10, backgroundColor: '#F2F4F7' },
  spaceNameRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  spaceName: { flex: 1, fontFamily: 'Inter-Regular', fontWeight: '600', fontSize: 14, color: '#020203' },
  spaceLocationRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 },
  spaceLocationText: { fontFamily: 'Inter-Regular', fontSize: 12, color: '#6A7181' },

  detailGrid: { backgroundColor: '#F1F4FF', borderRadius: 12, padding: 14, gap: 10, marginBottom: 16 },
  detailRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  detailLabel: { fontFamily: 'Inter-Regular', fontSize: 13, color: '#3A414E' },
  detailValue: { fontFamily: 'Inter-Regular', fontSize: 13, fontWeight: '600', color: '#3A414E' },

  addOnsBox: {
    borderRadius: 12, padding: 14, gap: 10, marginBottom: 16,
  },
  addOnsTitle: { fontFamily: 'Inter-Regular', fontWeight: '600', fontSize: 13, color: '#020203', marginBottom: 2 },
  addOnLabel: { fontFamily: 'Inter-Regular', fontSize: 13, color: '#3A414E' },
  addOnValue: { fontFamily: 'Inter-Regular', fontSize: 13, fontWeight: '600', color: '#3A414E' },

  payoutBox: {
    borderWidth: 1, borderColor: '#F2F4F7', borderRadius: 12, padding: 14, gap: 10, marginBottom: 8,
  },
  spaceFeeLabel: { fontFamily: 'Inter-Regular', fontSize: 13, color: '#3A414E' },
  spaceFeeValue: { fontFamily: 'Inter-Regular', fontSize: 13, fontWeight: '600', color: '#020203' },
  commissionLabel: { fontFamily: 'Inter-Regular', fontSize: 13, color: '#6A7181' },
  commissionValue: { fontFamily: 'Inter-Regular', fontSize: 13, fontWeight: '600', color: '#6A7181' },
  divider: { height: 1, backgroundColor: '#F2F4F7', marginVertical: 2 },
  netLabel: { fontFamily: 'Inter-Regular', fontWeight: '700', fontSize: 14, color: '#020203' },
  netValue: { fontFamily: 'Inter-Regular', fontWeight: '700', fontSize: 15, color: '#020203' },

  payoutInfoBanner: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 8,
    backgroundColor: '#FFF7E5', borderRadius: 12, padding: 12, marginTop: 12,
  },
  payoutInfoText: { flex: 1, fontFamily: 'Inter-Regular', fontSize: 12, color: '#B45309', lineHeight: 18 },

  paidConfirmBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: '#DCFCE7', borderRadius: 12, padding: 12, marginTop: 12,
  },
  paidConfirmText: { flex: 1, fontFamily: 'Inter-Regular', fontSize: 12, color: '#16A34A' },

  sheetFooter: { flexDirection: 'row', gap: 12, marginTop: 12 },
  declineBtn: {
    flex: 1, backgroundColor: '#FFDCDB', borderRadius: 99, height: 52,
    alignItems: 'center', justifyContent: 'center',
  },
  declineBtnText: { color: '#FF3B30', fontFamily: 'Inter-Regular', fontWeight: '600', fontSize: 15 },
  approveBtn: {
    flex: 2, backgroundColor: '#6200EE', borderRadius: 99, height: 52,
    alignItems: 'center', justifyContent: 'center',
  },
  approveBtnText: { color: '#FFFFFF', fontFamily: 'Inter-Regular', fontWeight: '600', fontSize: 15 },
  cancelBookingBtn: {
    flex: 1, backgroundColor: '#FFDCDB', borderRadius: 99, height: 52,
    alignItems: 'center', justifyContent: 'center',
  },
  cancelBookingBtnText: { color: '#FF3B30', fontFamily: 'Inter-Regular', fontWeight: '600', fontSize: 15 },

  confirmCard: { backgroundColor: '#FFFFFF', borderRadius: 24, padding: 24, alignItems: 'center', gap: 4 },
  confirmIconCircle: {
    width: 56, height: 56, borderRadius: 28, backgroundColor: '#16A34A',
    alignItems: 'center', justifyContent: 'center', marginBottom: 10,
  },
  confirmIconCircleDecline: { backgroundColor: '#EF4444' },
  confirmTitle: { fontFamily: 'MonaSans-Bold', fontSize: 17, color: '#020203', textAlign: 'center' },
  confirmBody: {
    fontFamily: 'Inter-Regular', fontSize: 13, color: '#6A7181',
    textAlign: 'center', lineHeight: 20, marginTop: 6, marginBottom: 20,
  },
  confirmApproveBtn: {
    width: '100%', backgroundColor: '#6200EE', borderRadius: 99, height: 52,
    alignItems: 'center', justifyContent: 'center', marginBottom: 10,
  },
  confirmDeclineBtn: {
    width: '100%', backgroundColor: '#EF4444', borderRadius: 99, height: 52,
    alignItems: 'center', justifyContent: 'center', marginBottom: 10,
  },
  confirmActionText: { color: '#FFFFFF', fontFamily: 'Inter-Regular', fontWeight: '600', fontSize: 15 },
  confirmCancelBtn: { paddingVertical: 6 },
  confirmCancelText: { fontFamily: 'Inter-Regular', fontWeight: '600', fontSize: 14, color: '#6A7181' },
  confirmCancelBookingBtnDisabled: { opacity: 0.5 },
  keepBookingBtn: {
    width: '100%', backgroundColor: '#EDE9FF', borderRadius: 99, height: 50,
    alignItems: 'center', justifyContent: 'center',
  },
  keepBookingText: { fontFamily: 'Inter-Regular', fontWeight: '600', fontSize: 15, color: '#6200EE' },

  checkbox: {
    width: 18, height: 18, borderRadius: 4, borderWidth: 1.5, borderColor: '#C4B5FD',
    alignItems: 'center', justifyContent: 'center', marginTop: 1,
  },
  checkboxChecked: { backgroundColor: '#6200EE', borderColor: '#6200EE' },

  successCard: {
    backgroundColor: '#FFFFFF', borderRadius: 20, paddingHorizontal: 32, paddingVertical: 28,
    alignItems: 'center', gap: 12,
  },
  successIconCircle: {
    width: 56, height: 56, borderRadius: 28, backgroundColor: '#16A34A',
    alignItems: 'center', justifyContent: 'center',
  },
  successTitle: { fontFamily: 'Inter-Regular', fontWeight: '600', fontSize: 14, color: '#020203', textAlign: 'center' },
});
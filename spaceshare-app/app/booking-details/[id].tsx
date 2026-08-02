import { useState, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, ScrollView, Linking, Modal, TextInput, Dimensions, Keyboard, TouchableWithoutFeedback, KeyboardAvoidingView, Platform, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { useLocalSearchParams, router, useFocusEffect } from 'expo-router';
import { useSelector } from 'react-redux';
import { RootState } from '@/store';
import { bookingsAPI } from '@/services/api';
import ConfettiCannon from 'react-native-confetti-cannon';

const { width } = Dimensions.get('window');

type BookingStatus = 'PENDING' | 'APPROVED' | 'DECLINED' | 'PAID' | 'COMPLETED' | 'CANCELLED';

type AddOnBreakdownItem = { name: string; total: number };

type ApiBooking = {
  id: string;
  spaceName: string;
  spaceLocation: string;
  spacePrice: number;
  totalPrice: number;
  startDate: string;
  endDate: string;
  startTime: string;
  endTime: string;
  guests: number;
  status: BookingStatus;
  cautionFee: number;
  serviceFee: number;
  addOnsBreakdown: AddOnBreakdownItem[] | null;
  createdAt: string;
  listing?: {
    photos: string[];
    host?: {
      firstName: string | null;
      lastName: string | null;
      email: string;
      phone: string | null;
    };
  };
};

const STATUS_BADGE: Record<BookingStatus, { bg: string; text: string }> = {
  APPROVED: { bg: '#DCFCE7', text: '#16A34A' },
  PENDING: { bg: '#FFEDD5', text: '#F97316' },
  PAID: { bg: '#DBEAFE', text: '#2563EB' },
  COMPLETED: { bg: '#EDE9FE', text: '#6200EE' },
  DECLINED: { bg: '#FEE2E2', text: '#EF4444' },
  CANCELLED: { bg: '#F2F4F7', text: '#6A7181' },
};

const STATUS_LABEL: Record<BookingStatus, string> = {
  APPROVED: 'Approved',
  PENDING: 'Pending',
  PAID: 'Paid',
  COMPLETED: 'Completed',
  DECLINED: 'Declined',
  CANCELLED: 'Cancelled',
};



// TODO: replace with real decline reason once host actions carry a reason field
const DECLINE_REASON = 'The hall is undergoing renovations.';

// TODO: pull this from the actual space's cancellation policy once bookings store a listing reference client-side
const CANCELLATION_POLICY_TEXT =
  'Guests may cancel this booking at least 48 hours before the event start time and will receive a full refund (including all fees) of the booking price. We may use your data for various purposes, such as improving our website, sending you updates, and analyzing usage trends. We ensure that your information is stored securely and only accessible to authorized personnel. You have the right to access, modify, or delete your personal information at any time.';

function TimelineStep({
  icon,
  label,
  done,
  failed,
  dateLabel,
}: {
  icon: keyof typeof Feather.glyphMap;
  label: string;
  done: boolean;
  failed?: boolean;
  dateLabel?: string;
}) {
  return (
    <View>
      <View style={[s.stepBox, done && s.stepBoxDone, failed && s.stepBoxFailed]}>
        <View style={[s.stepIconCircle, done && s.stepIconCircleDone, failed && s.stepIconCircleFailed]}>
          <Feather
            name={failed ? 'x' : icon}
            size={14}
            color={failed ? '#EF4444' : done ? '#6200EE' : '#B7BEC9'}
          />
        </View>
        <Text style={[s.stepLabel, !done && !failed && s.stepLabelDim]}>{label}</Text>
        {done && dateLabel ? (
          <Text style={s.stepDate}>{dateLabel}</Text>
        ) : done ? (
          <Feather name="check-circle" size={16} color="#16A34A" />
        ) : null}
      </View>
      {failed && (
        <View style={s.reasonBox}>
          <Text style={s.reasonLabel}>Reason</Text>
          <View style={s.reasonRow}>
            <Feather name="alert-triangle" size={13} color="#EF4444" />
            <Text style={s.reasonText}>{DECLINE_REASON}</Text>
          </View>
        </View>
      )}
    </View>
  );
}

export default function BookingDetails() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const token = useSelector((state: RootState) => state.auth.token);

  const [booking, setBooking] = useState<ApiBooking | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  const [markDoneModal, setMarkDoneModal] = useState(false);
  const [completedToast, setCompletedToast] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);
  const [reviewModal, setReviewModal] = useState(false);
  const [reviewRating, setReviewRating] = useState(0);
  const [reviewText, setReviewText] = useState('');
  const [cancelModal, setCancelModal] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const [paidCancelModal, setPaidCancelModal] = useState(false);
  const [paidCancelReason, setPaidCancelReason] = useState('');
  const [acknowledgedPolicy, setAcknowledgedPolicy] = useState(false);
  const [policyModal, setPolicyModal] = useState(false);

  const fetchBooking = useCallback(async () => {
    if (!token || !id) return;
    setLoading(true);
    try {
      const res = await bookingsAPI.getById(token, id);
      setBooking(res.data.booking);
    } catch (err) {
      console.log('Failed to fetch booking:', err);
      setBooking(null);
    } finally {
      setLoading(false);
    }
  }, [token, id]);

  useFocusEffect(
    useCallback(() => {
      fetchBooking();
    }, [fetchBooking])
  );

 const updateStatus = async (status: Exclude<BookingStatus, 'PENDING'>) => {
    if (!token || !booking) return false;
    setActionLoading(true);
    try {
      const res = await bookingsAPI.updateStatus(token, booking.id, status);
      setBooking(res.data.booking);
      return true;
    } catch (err) {
      console.log('Failed to update booking status:', err);
      return false;
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={s.center}>
        <ActivityIndicator color="#6200EE" />
      </SafeAreaView>
    );
  }

  if (!booking) {
    return (
      <SafeAreaView style={s.root}>
        <TouchableOpacity onPress={() => router.back()} style={s.backBtnAlone}>
          <Feather name="arrow-left" size={20} color="#020203" />
        </TouchableOpacity>
        <View style={s.notFound}>
          <Text style={s.notFoundText}>Booking not found</Text>
        </View>
      </SafeAreaView>
    );
  }

  const isPending = booking.status === 'PENDING';
  const isApproved = booking.status === 'APPROVED';
  const isPaid = booking.status === 'PAID';
  const isCompleted = booking.status === 'COMPLETED';
  const isDeclined = booking.status === 'DECLINED';
  const isCancelled = booking.status === 'CANCELLED';

  const steps = {
    requestSent: true,
    hostReview: !isPending,
    payment: isPaid || isCompleted,
    eventCompleted: isCompleted,
  };

  const bookingCode = `#BK-${booking.id.slice(-4).toUpperCase()}`;
  const eventDate = new Date(booking.startDate).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
  const paidDateLabel = booking.createdAt
    ? new Date(booking.createdAt).toLocaleString('en-GB', {
        day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
      })
    : '';
  const completedDateLabel = new Date().toLocaleDateString('en-GB', {
    day: '2-digit', month: 'short', year: 'numeric',
  });

  const total = booking.totalPrice ?? booking.spacePrice;
  const spaceImage = booking.listing?.photos?.[0];

  const ENFORCE_EVENT_DATE_GATE = false;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const eventStart = new Date(booking.startDate);
  eventStart.setHours(0, 0, 0, 0);
  const canMarkAsDone = ENFORCE_EVENT_DATE_GATE ? today.getTime() >= eventStart.getTime() : true;

  const handleCancelPress = () => {
    if (isPaid) {
      setPaidCancelReason('');
      setAcknowledgedPolicy(false);
      setPaidCancelModal(true);
    } else {
      setCancelReason('');
      setCancelModal(true);
    }
  };

 const handleConfirmCancel = async () => {
    // TODO: once backend supports it, store cancelReason against the booking
    const ok = await updateStatus('CANCELLED');
    setCancelModal(false);
    if (ok) {
      setTimeout(() => router.back(), 300);
    }
  };

const handleConfirmPaidCancel = async () => {
    if (!acknowledgedPolicy) return;
    // TODO: once refund workflow exists, store paidCancelReason and trigger refund logic
    const ok = await updateStatus('CANCELLED');
    setPaidCancelModal(false);
    if (ok) {
      setTimeout(() => router.back(), 300);
    }
  };
 const handlePay = () => {
    router.push(`/payment/${booking.id}`);
  };

  const handleConfirmMarkDone = async () => {
    const ok = await updateStatus('COMPLETED');
    setMarkDoneModal(false);
    if (ok) {
      setCompletedToast(true);
      setShowConfetti(true);
      setTimeout(() => setCompletedToast(false), 3000);
      setTimeout(() => setShowConfetti(false), 3500);
    }
  };

  const handleLeaveReview = () => {
    setReviewRating(0);
    setReviewText('');
    setReviewModal(true);
  };

  const handleCancelReview = () => {
    setReviewModal(false);
  };

  const handleSubmitReview = () => {
    // TODO: dispatch review to backend once review system exists (Stage 5)
    console.log('review submitted', { bookingId: booking.id, rating: reviewRating, reviewText });
    setReviewModal(false);
  };

  const badge = STATUS_BADGE[booking.status];

  return (
    <SafeAreaView style={s.root}>
      {showConfetti && (
        <ConfettiCannon
          count={80}
          origin={{ x: width / 2, y: 0 }}
          fadeOut
          fallSpeed={2800}
          explosionSpeed={350}
        />
      )}

      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Feather name="arrow-left" size={20} color="#020203" />
        </TouchableOpacity>
      </View>

      {completedToast && (
        <View style={s.toast}>
          <Feather name="check-circle" size={15} color="#16A34A" />
          <Text style={s.toastText}>Booking marked as completed successfully.</Text>
        </View>
      )}

      <ScrollView contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>
        <Image
          source={spaceImage ? { uri: spaceImage } : undefined}
          style={s.image}
          resizeMode="cover"
        />

        <View style={s.nameRow}>
          <Text style={s.name}>{booking.spaceName}</Text>
          <View style={[s.statusBadge, { backgroundColor: badge.bg }]}>
            <Text style={[s.statusBadgeText, { color: badge.text }]}>{STATUS_LABEL[booking.status]}</Text>
          </View>
        </View>

        <View style={s.metaRow}>
          <Feather name="map-pin" size={13} color="#6A7181" />
          <Text style={s.metaText}>{booking.spaceLocation}</Text>
        </View>
        <View style={s.metaRow}>
          <Feather name="calendar" size={13} color="#6A7181" />
          <Text style={s.metaText}>Event Date  {eventDate}</Text>
        </View>
        <View style={s.metaRow}>
          <Feather name="clock" size={13} color="#6A7181" />
          <Text style={s.metaText}>Event Time  {booking.startTime} - {booking.endTime}</Text>
        </View>

        <View style={s.idRow}>
          <Text style={s.idLabel}>Booking ID</Text>
          <Text style={s.idValue}>{bookingCode}</Text>
        </View>

      {!isPending && !isDeclined && !isCancelled && booking.listing?.host && (
          <View style={s.hostCard}>
            <Text style={s.hostLabel}>Host Details</Text>
            <View style={s.hostRow}>
              <Text style={s.hostName}>
                {[booking.listing.host.firstName, booking.listing.host.lastName].filter(Boolean).join(' ') || booking.listing.host.email}
              </Text>
              <View style={s.hostIcons}>
                {booking.listing.host.email && (
                  <TouchableOpacity
                    style={s.hostIconBtn}
                    onPress={() => Linking.openURL(`mailto:${booking.listing?.host?.email}`)}
                  >
                    <Feather name="mail" size={15} color="#6200EE" />
                  </TouchableOpacity>
                )}
                {booking.listing.host.phone && (
                  <TouchableOpacity
                    style={s.hostIconBtn}
                    onPress={() => Linking.openURL(`tel:${booking.listing?.host?.phone}`)}
                  >
                    <Feather name="phone" size={15} color="#6200EE" />
                  </TouchableOpacity>
                )}
              </View>
            </View>
          </View>
        )}

        <View style={s.timeline}>
          <TimelineStep icon="send" label="Request Sent" done={steps.requestSent} />
          <TimelineStep
            icon="user-check"
            label="Host Review"
            done={steps.hostReview && !isDeclined}
            failed={isDeclined}
            dateLabel="11-June-2026"
          />
          {!isDeclined && (
            <TimelineStep
              icon="credit-card"
              label="Payment"
              done={steps.payment}
              dateLabel={steps.payment ? paidDateLabel : undefined}
            />
          )}
          {!isDeclined && (
            <TimelineStep
              icon="check-square"
              label="Event Completed"
              done={steps.eventCompleted}
              dateLabel={steps.eventCompleted ? completedDateLabel : undefined}
            />
          )}
        </View>

        {isPending && (
          <View style={s.pendingNote}>
            <Feather name="info" size={14} color="#F97316" />
            <Text style={s.pendingNoteText}>
              We've sent your request to the host. You'll hear back within 24 hours.
            </Text>
          </View>
        )}

        <View style={s.breakdownCard}>
          <Text style={s.breakdownTitle}>Breakdown</Text>
          <View style={s.row}>
            <Text style={s.rowLabel}>Space Fee</Text>
            <Text style={s.rowValue}>₦{booking.spacePrice.toLocaleString()}</Text>
          </View>
          {(booking.addOnsBreakdown ?? []).map((a) => (
            <View key={a.name} style={s.row}>
              <Text style={s.rowLabel}>{a.name}</Text>
              <Text style={s.rowValue}>₦{a.total.toLocaleString()}</Text>
            </View>
          ))}
          {booking.cautionFee ? (
            <View style={s.row}>
              <Text style={s.rowLabel}>Refundable Caution Fee</Text>
              <Text style={s.rowValue}>₦{booking.cautionFee.toLocaleString()}</Text>
            </View>
          ) : null}
          {booking.serviceFee ? (
            <View style={s.row}>
              <Text style={s.rowLabel}>Service Fee</Text>
              <Text style={s.rowValue}>₦{booking.serviceFee.toLocaleString()}</Text>
            </View>
          ) : null}

          <View style={s.divider} />

          <View style={s.row}>
            <Text style={s.rowLabelBold}>{isPaid || isCompleted ? 'Amount Paid' : 'Total'}</Text>
            <Text style={s.rowValueBold}>₦{total.toLocaleString()}</Text>
          </View>
        </View>

        <View style={{ height: 100 }} />
      </ScrollView>

      {isPending && (
        <View style={s.footer}>
          <TouchableOpacity style={s.cancelBtnFull} onPress={handleCancelPress} disabled={actionLoading}>
            <Text style={s.cancelBtnText}>Cancel Booking</Text>
          </TouchableOpacity>
        </View>
      )}

      {isApproved && (
        <View style={s.footer}>
          <TouchableOpacity style={s.cancelBtnFull} onPress={handleCancelPress} disabled={actionLoading}>
            <Text style={s.cancelBtnText}>Cancel Booking</Text>
          </TouchableOpacity>
          <TouchableOpacity style={s.payBtnFull} onPress={handlePay} disabled={actionLoading}>
            {actionLoading ? <ActivityIndicator color="#FFFFFF" /> : (
              <Text style={s.payBtnText}>Pay ₦{total.toLocaleString()}</Text>
            )}
          </TouchableOpacity>
        </View>
      )}

      {isPaid && (
        <View style={s.footer}>
          <TouchableOpacity style={s.cancelBtnFull} onPress={handleCancelPress} disabled={actionLoading}>
            <Text style={s.cancelBtnText}>Cancel Booking</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[s.payBtnFull, !canMarkAsDone && s.payBtnDisabled]}
            onPress={() => canMarkAsDone && setMarkDoneModal(true)}
            disabled={!canMarkAsDone || actionLoading}
          >
            <Text style={s.payBtnText}>Mark as Done</Text>
          </TouchableOpacity>
          {!canMarkAsDone && (
            <Text style={s.footerHint}>This action is only available on or after your booking date.</Text>
          )}
        </View>
      )}

      {isCompleted && (
        <View style={s.footer}>
          <TouchableOpacity style={s.payBtnFull} onPress={handleLeaveReview}>
            <Text style={s.payBtnText}>Leave a review</Text>
          </TouchableOpacity>
        </View>
      )}

      <Modal visible={markDoneModal} transparent animationType="fade">
        <BlurView intensity={40} tint="dark" style={s.overlay}>
          <View style={s.confirmCard}>
            <View style={s.confirmIconCircle}>
              <Feather name="check" size={24} color="#FFFFFF" />
            </View>
            <Text style={s.confirmTitle}>Mark Booking as Completed?</Text>
            <Text style={s.confirmBody}>
              This confirms your event has ended successfully. After this action, disputes can no longer be raised for this booking.
            </Text>
            <View style={s.confirmRow}>
              <TouchableOpacity style={s.confirmCancelBtn} onPress={() => setMarkDoneModal(false)}>
                <Text style={s.confirmCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={s.confirmDoneBtn} onPress={handleConfirmMarkDone} disabled={actionLoading}>
                {actionLoading ? <ActivityIndicator color="#FFFFFF" /> : (
                  <Text style={s.confirmDoneText}>Mark as Done</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </BlurView>
      </Modal>

      <Modal visible={reviewModal} transparent animationType="slide">
        <BlurView intensity={30} tint="dark" style={s.reviewOverlay}>
          <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
            <KeyboardAvoidingView
              behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
              style={{ justifyContent: 'flex-end' }}
            >
              <View style={s.reviewSheet}>
                <View style={s.reviewHandle} />
                <Text style={s.reviewTitle}>Leave a Review</Text>
                <Text style={s.reviewSubtitle}>
                  Share your experience to help other guests book with confidence.
                </Text>

                <View style={s.starsRow}>
                  {[1, 2, 3, 4, 5].map((n) => (
                    <TouchableOpacity key={n} onPress={() => setReviewRating(n)}>
                      <Feather
                        name="star"
                        size={30}
                        color={n <= reviewRating ? '#F59E0B' : '#E4E7EC'}
                      />
                    </TouchableOpacity>
                  ))}
                </View>

                <TextInput
                  style={s.reviewInput}
                  placeholder="Tell others about the space, host experience, cleanliness, or amenities."
                  placeholderTextColor="#B7BEC9"
                  multiline
                  numberOfLines={5}
                  value={reviewText}
                  onChangeText={setReviewText}
                  textAlignVertical="top"
                  returnKeyType="done"
                  blurOnSubmit
                  onSubmitEditing={Keyboard.dismiss}
                />

                <View style={s.reviewBtnRow}>
                  <TouchableOpacity style={s.reviewCancelBtn} onPress={handleCancelReview}>
                    <Text style={s.reviewCancelText}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[s.reviewSubmitBtn, reviewRating === 0 && s.reviewSubmitBtnDisabled]}
                    onPress={handleSubmitReview}
                    disabled={reviewRating === 0}
                  >
                    <Text style={s.reviewSubmitText}>Submit Review</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </KeyboardAvoidingView>
          </TouchableWithoutFeedback>
        </BlurView>
      </Modal>

      <Modal visible={cancelModal} transparent animationType="fade">
        <BlurView intensity={40} tint="dark" style={s.overlay}>
          <View style={s.cancelCard}>
            <View style={s.cancelIconCircle}>
              <Feather name="alert-triangle" size={26} color="#FFFFFF" />
            </View>
            <Text style={s.cancelTitle}>Cancel Booking Request</Text>
            <Text style={s.cancelBody}>
              This booking request will be cancelled immediately. No payment has been made.
            </Text>

            <Text style={s.cancelReasonLabel}>Why are you cancelling?</Text>
            <TextInput
              style={s.cancelReasonInput}
              placeholder="Tell us why you're cancelling this booking"
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

            <TouchableOpacity style={s.confirmCancelBookingBtn} onPress={handleConfirmCancel} disabled={actionLoading}>
              {actionLoading ? <ActivityIndicator color="#FF3B30" /> : (
                <Text style={s.confirmCancelBookingText}>Cancel Booking</Text>
              )}
            </TouchableOpacity>
          </View>
        </BlurView>
      </Modal>

      <Modal visible={paidCancelModal} transparent animationType="fade">
        <BlurView intensity={40} tint="dark" style={s.overlay}>
          <View style={s.cancelCard}>
            <View style={s.cancelIconCircle}>
              <Feather name="alert-triangle" size={26} color="#FFFFFF" />
            </View>
            <Text style={s.cancelTitle}>Cancel Paid Booking</Text>
            <Text style={s.cancelBody}>
              This booking has already been paid for. Refund eligibility depends on how close you are to your event date — see our Cancellation Policy for details.
            </Text>

            <Text style={s.cancelReasonLabel}>Why are you cancelling?</Text>
            <TextInput
              style={s.cancelReasonInput}
              placeholder="Tell us why you're cancelling this booking"
              placeholderTextColor="#B7BEC9"
              multiline
              numberOfLines={4}
              value={paidCancelReason}
              onChangeText={setPaidCancelReason}
              textAlignVertical="top"
              returnKeyType="done"
              blurOnSubmit
              onSubmitEditing={Keyboard.dismiss}
            />

            <TouchableOpacity
              style={s.policyRow}
              onPress={() => setAcknowledgedPolicy(!acknowledgedPolicy)}
              activeOpacity={0.7}
            >
              <View style={[s.checkbox, acknowledgedPolicy && s.checkboxChecked]}>
                {acknowledgedPolicy && <Feather name="check" size={12} color="#FFFFFF" />}
              </View>
              <Text style={s.policyText}>
                I understand that refund eligibility depends on my{' '}
                <Text style={s.policyLink} onPress={() => setPolicyModal(true)}>Cancellation Policy</Text>.
              </Text>
            </TouchableOpacity>

            <TouchableOpacity style={s.keepBookingBtn} onPress={() => setPaidCancelModal(false)}>
              <Text style={s.keepBookingText}>Keep Booking</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[s.confirmCancelBookingBtn, !acknowledgedPolicy && s.confirmCancelBookingBtnDisabled]}
              onPress={handleConfirmPaidCancel}
              disabled={!acknowledgedPolicy || actionLoading}
            >
              {actionLoading ? <ActivityIndicator color="#FF3B30" /> : (
                <Text style={s.confirmCancelBookingText}>Cancel Booking</Text>
              )}
            </TouchableOpacity>
          </View>
        </BlurView>
      </Modal>

      <Modal visible={policyModal} transparent animationType="slide">
        <View style={s.policyOverlay}>
          <View style={s.policyCard}>
            <View style={s.policyHeader}>
              <Text style={s.policyModalTitle}>Cancellation Policy</Text>
              <TouchableOpacity onPress={() => setPolicyModal(false)}>
                <Feather name="x" size={20} color="#020203" />
              </TouchableOpacity>
            </View>
            <Text style={s.policyModalBody}>{CANCELLATION_POLICY_TEXT}</Text>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}
const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#FFFFFF' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#FFFFFF' },
  header: { paddingHorizontal: 16, paddingVertical: 12 },
  backBtnAlone: { padding: 16 },
  notFound: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  notFoundText: { fontFamily: 'Inter-Regular', fontSize: 14, color: '#6A7181' },

  toast: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: '#DCFCE7', marginHorizontal: 16, marginBottom: 8,
    borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10,
  },
  toastText: { fontFamily: 'Inter-Regular', fontSize: 12, color: '#16A34A', flex: 1 },

  content: { paddingHorizontal: 16, gap: 6 },
  image: { width: '100%', height: 190, borderRadius: 14, marginBottom: 10, backgroundColor: '#F2F4F7' },

  nameRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  name: { flex: 1, fontFamily: 'MonaSans-Bold', fontSize: 19, color: '#020203' },
  statusBadge: { borderRadius: 99, paddingHorizontal: 10, paddingVertical: 4 },
  statusBadgeText: { fontFamily: 'Inter-Regular', fontSize: 11, fontWeight: '700' },

  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 2 },
  metaText: { fontFamily: 'Inter-Regular', fontSize: 13, color: '#6A7181' },

  idRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    marginTop: 14, paddingVertical: 12, borderTopWidth: 1, borderBottomWidth: 1,
    borderColor: '#F2F4F7',
  },
  idLabel: { fontFamily: 'Inter-Regular', fontSize: 13, color: '#6A7181' },
  idValue: { fontFamily: 'MonaSans-Bold', fontSize: 14, color: '#020203' },

  hostCard: { marginTop: 14, gap: 8 },
  hostLabel: { fontFamily: 'Inter-Regular', fontSize: 12, color: '#6A7181' },
  hostRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  hostName: { fontFamily: 'MonaSans-Bold', fontSize: 15, color: '#6200EE' },
  hostIcons: { flexDirection: 'row', gap: 8 },
  hostIconBtn: {
    width: 32, height: 32, borderRadius: 16, backgroundColor: '#F2F4F7',
    alignItems: 'center', justifyContent: 'center',
  },

  timeline: { marginTop: 18, gap: 10 },
  stepBox: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    borderWidth: 1, borderColor: '#F2F4F7', borderRadius: 12,
    paddingHorizontal: 12, paddingVertical: 10,
  },
  stepBoxDone: { borderColor: '#EDE9FF', backgroundColor: '#FBFAFF' },
  stepBoxFailed: { borderColor: '#FEE2E2', backgroundColor: '#FEF6F6' },
  stepIconCircle: {
    width: 28, height: 28, borderRadius: 14, backgroundColor: '#F2F4F7',
    alignItems: 'center', justifyContent: 'center',
  },
  stepIconCircleDone: { backgroundColor: '#EDE9FF' },
  stepIconCircleFailed: { backgroundColor: '#FEE2E2' },
  stepLabel: { flex: 1, fontFamily: 'Inter-Regular', fontSize: 14, color: '#020203' },
  stepLabelDim: { color: '#B7BEC9' },
  stepDate: { fontFamily: 'Inter-Regular', fontSize: 12, color: '#6A7181' },

  reasonBox: {
    marginTop: -2, marginBottom: 2, marginLeft: 4,
    paddingHorizontal: 12, paddingVertical: 8, gap: 4,
  },
  reasonLabel: { fontFamily: 'Inter-Regular', fontSize: 11, color: '#6A7181' },
  reasonRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  reasonText: { fontFamily: 'Inter-Regular', fontSize: 12, color: '#EF4444', flex: 1 },

  pendingNote: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: '#FFF7E5', borderRadius: 12, padding: 12, marginTop: 16,
  },
  pendingNoteText: { flex: 1, fontFamily: 'Inter-Regular', fontSize: 12, color: '#B45309' },

  breakdownCard: {
    marginTop: 20, gap: 8,
    borderWidth: 1, borderColor: '#F2F4F7', borderRadius: 12,
    paddingHorizontal: 14, paddingVertical: 14,
  },
  breakdownTitle: { fontFamily: 'MonaSans-Bold', fontSize: 15, color: '#020203', marginBottom: 4 },
  row: { flexDirection: 'row', justifyContent: 'space-between' },
  rowLabel: { fontFamily: 'Inter-Regular', fontSize: 13, color: '#6A7181' },
  rowValue: { fontFamily: 'Inter-Regular', fontSize: 13, color: '#020203' },
  divider: { height: 1, backgroundColor: '#F2F4F7', marginVertical: 6 },
  rowLabelBold: { fontFamily: 'Inter-Regular', fontWeight: '700', fontSize: 14, color: '#020203' },
  rowValueBold: { fontFamily: 'Inter-Regular', fontWeight: '700', fontSize: 14, color: '#020203' },

  footer: {
    flexDirection: 'column', gap: 10, padding: 16,
    borderTopWidth: 1, borderTopColor: '#F2F4F7', backgroundColor: '#FFFFFF',
  },
  cancelBtnFull: {
    width: '100%', backgroundColor: '#FFDCDB', borderRadius: 99, height: 52,
    alignItems: 'center', justifyContent: 'center',
  },
  cancelBtnText: { color: '#FF3B30', fontFamily: 'Inter-Regular', fontWeight: '600', fontSize: 15 },
  payBtnFull: {
    width: '100%', backgroundColor: '#6200EE', borderRadius: 99, height: 52,
    alignItems: 'center', justifyContent: 'center',
  },
  payBtnDisabled: { backgroundColor: '#C4B5FD' },
  payBtnText: { color: '#FFFFFF', fontFamily: 'Inter-Regular', fontWeight: '600', fontSize: 15 },
  footerHint: {
    fontFamily: 'Inter-Regular', fontSize: 11, color: '#6A7181',
    textAlign: 'center', marginTop: -2,
  },

  overlay: { flex: 1, justifyContent: 'center', paddingHorizontal: 24 },
  confirmCard: {
    backgroundColor: '#FFFFFF', borderRadius: 20, padding: 24,
    alignItems: 'center', gap: 4,
  },
  confirmIconCircle: {
    width: 52, height: 52, borderRadius: 26, backgroundColor: '#16A34A',
    alignItems: 'center', justifyContent: 'center', marginBottom: 8,
  },
  confirmTitle: { fontFamily: 'MonaSans-Bold', fontSize: 17, color: '#020203', textAlign: 'center' },
  confirmBody: {
    fontFamily: 'Inter-Regular', fontSize: 13, color: '#6A7181',
    textAlign: 'center', lineHeight: 20, marginTop: 6, marginBottom: 16,
  },
  confirmRow: { flexDirection: 'row', gap: 10, width: '100%' },
  confirmCancelBtn: {
    flex: 1, borderWidth: 1, borderColor: '#E4E7EC', borderRadius: 99, height: 50,
    alignItems: 'center', justifyContent: 'center',
  },
  confirmCancelText: { fontFamily: 'Inter-Regular', fontWeight: '600', fontSize: 14, color: '#020203' },
  confirmDoneBtn: {
    flex: 1, backgroundColor: '#6200EE', borderRadius: 99, height: 50,
    alignItems: 'center', justifyContent: 'center',
  },
  confirmDoneText: { fontFamily: 'Inter-Regular', fontWeight: '600', fontSize: 14, color: '#FFFFFF' },

  reviewOverlay: { flex: 1, justifyContent: 'flex-end' },
  reviewSheet: {
    backgroundColor: '#FFFFFF', borderTopLeftRadius: 24, borderTopRightRadius: 24,
    paddingHorizontal: 20, paddingTop: 12, paddingBottom: 32, gap: 4,
  },
  reviewHandle: {
    width: 40, height: 4, borderRadius: 2, backgroundColor: '#E4E7EC',
    alignSelf: 'center', marginBottom: 16,
  },
  reviewTitle: { fontFamily: 'MonaSans-Bold', fontSize: 18, color: '#020203' },
  reviewSubtitle: {
    fontFamily: 'Inter-Regular', fontSize: 13, color: '#6A7181',
    lineHeight: 19, marginTop: 4, marginBottom: 16,
  },
  starsRow: { flexDirection: 'row', gap: 10, marginBottom: 16 },
  reviewInput: {
    borderWidth: 1, borderColor: '#E4E7EC', borderRadius: 12,
    paddingHorizontal: 14, paddingVertical: 12, minHeight: 110,
    fontFamily: 'Inter-Regular', fontSize: 14, color: '#020203', marginBottom: 20,
  },
  reviewBtnRow: { flexDirection: 'row', gap: 12 },
  reviewCancelBtn: {
    flex: 1, borderWidth: 1, borderColor: '#E4E7EC', borderRadius: 99, height: 52,
    alignItems: 'center', justifyContent: 'center',
  },
  reviewCancelText: { fontFamily: 'Inter-Regular', fontWeight: '600', fontSize: 15, color: '#020203' },
  reviewSubmitBtn: {
    flex: 1, backgroundColor: '#6200EE', borderRadius: 99, height: 52,
    alignItems: 'center', justifyContent: 'center',
  },
  reviewSubmitBtnDisabled: { backgroundColor: '#C4B5FD' },
  reviewSubmitText: { fontFamily: 'Inter-Regular', fontWeight: '600', fontSize: 15, color: '#FFFFFF' },

  cancelCard: {
    backgroundColor: '#FFFFFF', borderRadius: 20, padding: 24,
    alignItems: 'center', gap: 4,
  },
  cancelIconCircle: {
    width: 52, height: 52, borderRadius: 26, backgroundColor: '#EF4444',
    alignItems: 'center', justifyContent: 'center', marginBottom: 10,
  },
  cancelTitle: { fontFamily: 'MonaSans-Bold', fontSize: 17, color: '#020203', textAlign: 'center' },
  cancelBody: {
    fontFamily: 'Inter-Regular', fontSize: 13, color: '#6A7181',
    textAlign: 'center', lineHeight: 20, marginTop: 6, marginBottom: 16,
  },
  cancelReasonLabel: {
    fontFamily: 'Inter-Regular', fontSize: 13, color: '#3A414E',
    alignSelf: 'flex-start', marginBottom: 6,
  },
  cancelReasonInput: {
    width: '100%', borderWidth: 1, borderColor: '#E4E7EC', borderRadius: 12,
    paddingHorizontal: 14, paddingVertical: 12, minHeight: 90,
    fontFamily: 'Inter-Regular', fontSize: 14, color: '#020203', marginBottom: 16,
  },
  keepBookingBtn: {
    width: '100%', backgroundColor: '#EDE9FF', borderRadius: 99, height: 50,
    alignItems: 'center', justifyContent: 'center', marginBottom: 10,
  },
  keepBookingText: { fontFamily: 'Inter-Regular', fontWeight: '600', fontSize: 15, color: '#6200EE' },
  confirmCancelBookingBtn: {
    width: '100%', backgroundColor: '#FFDCDB', borderRadius: 99, height: 50,
    alignItems: 'center', justifyContent: 'center',
  },
  confirmCancelBookingBtnDisabled: { opacity: 0.5 },
  confirmCancelBookingText: { fontFamily: 'Inter-Regular', fontWeight: '600', fontSize: 15, color: '#FF3B30' },

  policyRow: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 8,
    width: '100%', marginBottom: 16,
  },
  checkbox: {
    width: 18, height: 18, borderRadius: 4, borderWidth: 1.5, borderColor: '#C4B5FD',
    alignItems: 'center', justifyContent: 'center', marginTop: 1,
  },
  checkboxChecked: { backgroundColor: '#6200EE', borderColor: '#6200EE' },
  policyText: { flex: 1, fontFamily: 'Inter-Regular', fontSize: 12, color: '#6A7181', lineHeight: 18 },
  policyLink: { color: '#6200EE', fontWeight: '600', textDecorationLine: 'underline' },

  policyOverlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center', paddingHorizontal: 24,
  },
  policyCard: {
    backgroundColor: '#FFFFFF', borderRadius: 20, padding: 24, gap: 16,
  },
  policyHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
  },
  policyModalTitle: { fontFamily: 'MonaSans-Bold', fontSize: 18, color: '#020203' },
  policyModalBody: {
    fontFamily: 'Inter-Regular', fontSize: 14, color: '#3A414E',
    lineHeight: 22, letterSpacing: -0.3,
  },
});
import { useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  Modal, ScrollView, Dimensions, Image, Linking,
} from 'react-native';
import { BlurView } from 'expo-blur';
import { Feather } from '@expo/vector-icons';

const { height } = Dimensions.get('window');

const SHORT_MONTHS = ['JAN','FEB','MAR','APR','MAY','JUN','JUL','AUG','SEP','OCT','NOV','DEC'];

function formatDate(d: Date | null) {
  if (!d) return '';
  return `${SHORT_MONTHS[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`;
}

interface AddOn {
  name: string;
  price: number;
}

interface Props {
  visible: boolean;
  onClose: () => void;
  onBack: () => void;
  onSubmit: () => void;
  spaceName?: string;
  spaceLocation?: string;
  spaceImage?: any;
  spacePrice?: number;
  guestsLabel?: string; // e.g. "50 guests" or "50-100 guests"
  addOns?: AddOn[];
  selectedAddOns?: { [key: string]: number };
  rangeStart?: Date | null;
  cautionFee?: number;
  serviceFee?: number;
  submitting?: boolean;
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

export default function ConfirmRequest({
  visible, onClose, onBack, onSubmit,
  spaceName = '', spaceLocation = '', spaceImage = null, spacePrice = 0,
  guestsLabel = '', addOns = [], selectedAddOns = {},
  rangeStart = null, cautionFee = 50000, serviceFee = 6250,
  submitting = false,
}: Props) {
  const [agreed, setAgreed] = useState(false);
  const [feeInfoVisible, setFeeInfoVisible] = useState(false);

  const addOnTotal = Object.entries(selectedAddOns).reduce((sum, [key, qty]) => {
    const item = addOns.find(a => a.name === key);
    return sum + (item ? item.price * qty : 0);
  }, 0);

  const total = spacePrice + addOnTotal + cautionFee + serviceFee;

  const handleSubmit = () => {
    if (!agreed || submitting) return;
    onSubmit();
  };

  return (
    <Modal visible={visible} transparent animationType="slide">
      <BlurView intensity={30} tint="dark" style={s.overlay}>
        <View style={s.sheet}>

          <View style={s.handle} />
          <ProgressBar step={4} />

          <View style={s.header}>
            <TouchableOpacity style={s.backBtn} onPress={onBack}>
              <Feather name="arrow-left" size={18} color="#020203" />
            </TouchableOpacity>
            <TouchableOpacity onPress={onClose}>
              <Feather name="x" size={20} color="#020203" />
            </TouchableOpacity>
          </View>

          <Text style={s.title}>Confirm your request</Text>
          <Text style={s.subtitle}>
            Review your estimated booking total before submitting your request.
          </Text>

          <ScrollView showsVerticalScrollIndicator={false}>

            {/* Space summary card */}
            <View style={s.spaceCard}>
              {spaceImage && <Image source={spaceImage} style={s.spaceImg} />}
              <View style={{ flex: 1 }}>
                <Text style={s.spaceName}>{spaceName}</Text>
                <View style={s.spaceMetaRow}>
                  <Feather name="map-pin" size={11} color="#6A7181" />
                  <Text style={s.spaceMeta}>{spaceLocation}</Text>
                  {guestsLabel ? (
                    <>
                      <Text style={s.spaceMetaDivider}>•</Text>
                      <Feather name="users" size={11} color="#6A7181" />
                      <Text style={s.spaceMeta}>{guestsLabel}</Text>
                    </>
                  ) : null}
                </View>
              </View>
            </View>

            {/* Date */}
            <View style={s.row}>
              <View style={s.rowLeft}>
                <Feather name="calendar" size={14} color="#6A7181" />
                <Text style={s.rowLabel}>Date</Text>
              </View>
              <Text style={s.rowValue}>{formatDate(rangeStart)}</Text>
            </View>

            <View style={s.divider} />

            {/* Fee breakdown */}
            <View style={s.feeBlock}>
              <View style={s.feeRow}>
                <Text style={s.feeLabel}>Space Fee</Text>
                <Text style={s.feeValue}>₦{spacePrice.toLocaleString()}</Text>
              </View>
              <View style={s.feeRow}>
                <Text style={s.feeLabel}>Selected Add-ons</Text>
                <Text style={s.feeValue}>₦{addOnTotal.toLocaleString()}</Text>
              </View>
              <View style={s.feeRow}>
                <Text style={s.feeLabel}>Refundable Caution Fee</Text>
                <Text style={s.feeValue}>₦{cautionFee.toLocaleString()}</Text>
              </View>
              <View style={s.feeRow}>
                <TouchableOpacity style={s.feeLabelRow} onPress={() => setFeeInfoVisible(true)}>
                  <Text style={s.feeLabel}>Service Fee</Text>
                  <Feather name="info" size={12} color="#6A7181" />
                </TouchableOpacity>
                <Text style={s.feeValue}>₦{serviceFee.toLocaleString()}</Text>
              </View>
            </View>

            <View style={s.divider} />

            <View style={s.totalRow}>
              <Text style={s.totalLabel}>Total</Text>
              <Text style={s.totalValue}>₦{total.toLocaleString()}</Text>
            </View>

            {/* Notice */}
            <View style={s.notice}>
              <Feather name="alert-circle" size={14} color="#B45309" />
              <Text style={s.noticeText}>
                Your booking request will be sent to the host for approval before payment is required.
              </Text>
            </View>

            {/* Terms checkbox */}
            <TouchableOpacity style={s.agreeRow} onPress={() => setAgreed(!agreed)}>
              <View style={[s.checkbox, agreed && s.checkboxChecked]}>
                {agreed && <Feather name="check" size={12} color="#FFFFFF" />}
              </View>
              <Text style={s.agreeText}>
                I have read and agree to the{' '}
                <Text style={s.agreeLink} onPress={() => Linking.openURL('https://example.com/terms')}>
                  Terms of Use
                </Text>{' '}
                and{' '}
                <Text style={s.agreeLink} onPress={() => Linking.openURL('https://example.com/cancellation')}>
                  Cancellation Policy
                </Text>.
              </Text>
            </TouchableOpacity>

            <View style={{ height: 24 }} />
          </ScrollView>

          {/* Footer */}
          <View style={s.footer}>
            <TouchableOpacity style={s.backCircle} onPress={onBack}>
              <Feather name="arrow-left" size={18} color="#6200EE" />
            </TouchableOpacity>
            <TouchableOpacity
              style={[s.submitBtn, (!agreed || submitting) && s.submitBtnDisabled]}
              onPress={handleSubmit}
              disabled={!agreed || submitting}
            >
              <Text style={s.submitBtnText}>
                {submitting ? 'Submitting…' : 'Submit Request'}
              </Text>
            </TouchableOpacity>
          </View>

          {/* Service fee info popup */}
          <Modal visible={feeInfoVisible} transparent animationType="fade">
            <BlurView intensity={40} tint="dark" style={s.infoOverlay}>
              <View style={s.infoCard}>
                <Text style={s.infoText}>
                  The service fee covers transaction processing, booking support, and platform maintenance.
                </Text>
                <TouchableOpacity onPress={() => setFeeInfoVisible(false)}>
                  <Text style={s.infoOkay}>Okay</Text>
                </TouchableOpacity>
              </View>
            </BlurView>
          </Modal>

        </View>
      </BlurView>
    </Modal>
  );
}

const s = StyleSheet.create({
  overlay: { flex: 1, justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: '#FFFFFF', borderTopLeftRadius: 24, borderTopRightRadius: 24,
    paddingHorizontal: 16, paddingBottom: 36, height: height * 0.85,
  },
  handle: {
    width: 40, height: 4, borderRadius: 2, backgroundColor: '#E4E7EC',
    alignSelf: 'center', marginTop: 12, marginBottom: 16,
  },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  backBtn: {
    width: 36, height: 36, borderRadius: 18, backgroundColor: '#F2F4F7',
    alignItems: 'center', justifyContent: 'center',
  },
  title: { fontFamily: 'MonaSans-Bold', fontSize: 20, color: '#020203', marginBottom: 6 },
  subtitle: { fontFamily: 'Inter-Regular', fontSize: 13, color: '#6A7181', lineHeight: 20, marginBottom: 20 },

  spaceCard: {
    flexDirection: 'row', gap: 10, alignItems: 'center',
    backgroundColor: '#F9FAFB', borderRadius: 12, padding: 10, marginBottom: 16,
  },
  spaceImg: { width: 44, height: 44, borderRadius: 8 },
  spaceName: { fontFamily: 'Inter-Regular', fontWeight: '600', fontSize: 14, color: '#020203' },
  spaceMetaRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 },
  spaceMeta: { fontFamily: 'Inter-Regular', fontSize: 11, color: '#6A7181' },
  spaceMetaDivider: { fontSize: 11, color: '#D0D5DD', marginHorizontal: 2 },

  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 12 },
  rowLeft: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  rowLabel: { fontFamily: 'Inter-Regular', fontSize: 13, color: '#6A7181' },
  rowValue: { fontFamily: 'Inter-Regular', fontWeight: '600', fontSize: 13, color: '#020203' },

  divider: { height: 1, backgroundColor: '#F2F4F7' },

  feeBlock: { paddingVertical: 8 },
  feeRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 8 },
  feeLabelRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  feeLabel: { fontFamily: 'Inter-Regular', fontSize: 13, color: '#3A414E' },
  feeValue: { fontFamily: 'Inter-Regular', fontSize: 13, color: '#020203' },

  totalRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 14 },
  totalLabel: { fontFamily: 'MonaSans-Bold', fontSize: 16, color: '#020203' },
  totalValue: { fontFamily: 'MonaSans-Bold', fontSize: 18, color: '#020203' },

  notice: {
    flexDirection: 'row', gap: 8, backgroundColor: '#FFF7E5',
    borderRadius: 12, padding: 12, marginTop: 8, alignItems: 'flex-start',
  },
  noticeText: { fontFamily: 'Inter-Regular', fontSize: 12, color: '#92400E', flex: 1, lineHeight: 18 },

  agreeRow: { flexDirection: 'row', gap: 10, marginTop: 16, alignItems: 'flex-start' },
  checkbox: {
    width: 18, height: 18, borderRadius: 4, borderWidth: 1.5, borderColor: '#D0D5DD',
    alignItems: 'center', justifyContent: 'center', marginTop: 1,
  },
  checkboxChecked: { backgroundColor: '#6200EE', borderColor: '#6200EE' },
  agreeText: { fontFamily: 'Inter-Regular', fontSize: 12, color: '#3A414E', flex: 1, lineHeight: 18 },
  agreeLink: { color: '#6200EE', fontWeight: '600' },

  footer: { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 12 },
  backCircle: {
    width: 48, height: 48, borderRadius: 24,
    borderWidth: 1, borderColor: '#E4E7EC',
    alignItems: 'center', justifyContent: 'center',
  },
  submitBtn: {
    flex: 1, backgroundColor: '#6200EE', borderRadius: 99, height: 52,
    alignItems: 'center', justifyContent: 'center',
  },
  submitBtnDisabled: { backgroundColor: '#C4B5FD' },
  submitBtnText: { color: '#FFFFFF', fontFamily: 'Inter-Regular', fontWeight: '600', fontSize: 15 },

  infoOverlay: { flex: 1, justifyContent: 'center', paddingHorizontal: 40 },
  infoCard: { backgroundColor: '#FFFFFF', borderRadius: 16, padding: 20, gap: 12 },
  infoText: { fontFamily: 'Inter-Regular', fontSize: 13, color: '#3A414E', lineHeight: 20 },
  infoOkay: { fontFamily: 'Inter-Regular', fontWeight: '600', fontSize: 14, color: '#6200EE', textAlign: 'right' },
});
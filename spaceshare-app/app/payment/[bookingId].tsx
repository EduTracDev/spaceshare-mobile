import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, Linking } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { useLocalSearchParams, router } from 'expo-router';
import { useSelector } from 'react-redux';
import { RootState } from '@/store';
import { paymentsAPI } from '@/services/api';

export default function PaymentScreen() {
  const { bookingId } = useLocalSearchParams<{ bookingId: string }>();
  const token = useSelector((state: RootState) => state.auth.token);

  const [checkoutUrl, setCheckoutUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [opened, setOpened] = useState(false);

  useEffect(() => {
    const init = async () => {
      if (!token || !bookingId) return;
      try {
        const res = await paymentsAPI.initiate(token, bookingId);
        setCheckoutUrl(res.data.link);
      } catch (err: any) {
        console.log('Failed to initiate payment:', err?.response?.data ?? err);
        setError(err?.response?.data?.message ?? 'Unable to start payment. Please try again.');
      } finally {
        setLoading(false);
      }
    };
    init();
  }, [token, bookingId]);

const handleOpenCheckout = async () => {
    if (!checkoutUrl) return;
    console.log('Attempting to open:', checkoutUrl);
    try {
      const supported = await Linking.canOpenURL(checkoutUrl);
      console.log('canOpenURL result:', supported);
      setOpened(true);
      await Linking.openURL(checkoutUrl);
    } catch (err) {
      console.log('Linking.openURL error:', err);
      setError('Unable to open payment page.');
    }
  };
  const handleDoneChecking = () => {
    router.replace(`/booking-details/${bookingId}`);
  };

  return (
    <SafeAreaView style={s.root}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Feather name="arrow-left" size={20} color="#020203" />
        </TouchableOpacity>
        <Text style={s.headerTitle}>Payment</Text>
        <View style={{ width: 20 }} />
      </View>

      <View style={s.center}>
        {loading ? (
          <>
            <ActivityIndicator size="large" color="#6200EE" />
            <Text style={s.loadingText}>Please wait... while we connect you to payment securely.</Text>
          </>
        ) : error ? (
          <>
            <Feather name="alert-triangle" size={32} color="#EF4444" />
            <Text style={s.errorText}>{error}</Text>
            <TouchableOpacity style={s.retryBtn} onPress={() => router.back()}>
              <Text style={s.retryBtnText}>Go Back</Text>
            </TouchableOpacity>
          </>
        ) : !opened ? (
          <>
            <Feather name="external-link" size={32} color="#6200EE" />
            <Text style={s.infoText}>
              You'll be taken to Flutterwave's secure checkout page to complete your payment.
            </Text>
            <TouchableOpacity style={s.payBtn} onPress={handleOpenCheckout}>
              <Text style={s.payBtnText}>Continue to Payment</Text>
            </TouchableOpacity>
          </>
        ) : (
          <>
            <Feather name="check-circle" size={32} color="#16A34A" />
            <Text style={s.infoText}>
              Complete your payment in the browser, then come back here.
            </Text>
            <TouchableOpacity style={s.payBtn} onPress={handleOpenCheckout}>
              <Text style={s.payBtnText}>Reopen Payment Page</Text>
            </TouchableOpacity>
            <TouchableOpacity style={s.doneBtn} onPress={handleDoneChecking}>
              <Text style={s.doneBtnText}>I've completed payment</Text>
            </TouchableOpacity>
          </>
        )}
      </View>
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
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 40, gap: 14 },
  loadingText: { fontFamily: 'Inter-Regular', fontSize: 13, color: '#6A7181', textAlign: 'center' },
  errorText: { fontFamily: 'Inter-Regular', fontSize: 13, color: '#EF4444', textAlign: 'center' },
  infoText: { fontFamily: 'Inter-Regular', fontSize: 14, color: '#3A414E', textAlign: 'center', lineHeight: 20 },
  retryBtn: {
    backgroundColor: '#6200EE', borderRadius: 99,
    paddingHorizontal: 24, paddingVertical: 12, marginTop: 8,
  },
  retryBtnText: { color: '#FFFFFF', fontFamily: 'Inter-Regular', fontWeight: '600', fontSize: 14 },
  payBtn: {
    backgroundColor: '#6200EE', borderRadius: 99,
    paddingHorizontal: 32, paddingVertical: 14, marginTop: 8, width: '100%', alignItems: 'center',
  },
  payBtnText: { color: '#FFFFFF', fontFamily: 'Inter-Regular', fontWeight: '600', fontSize: 15 },
  doneBtn: {
    borderRadius: 99, borderWidth: 1, borderColor: '#E4E7EC',
    paddingHorizontal: 32, paddingVertical: 14, marginTop: 4, width: '100%', alignItems: 'center',
  },
  doneBtnText: { color: '#020203', fontFamily: 'Inter-Regular', fontWeight: '600', fontSize: 15 },
});
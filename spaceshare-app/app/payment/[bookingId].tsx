import { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { WebView } from 'react-native-webview';
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
  const handled = useRef(false);

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

  const handleNavigationChange = (navState: { url: string }) => {
    if (handled.current) return;

    if (navState.url.startsWith('spaceshare://payment-success')) {
      handled.current = true;
      router.replace(`/booking-details/${bookingId}`);
    } else if (navState.url.startsWith('spaceshare://payment-failed')) {
      handled.current = true;
      router.back();
    }
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

      {loading ? (
        <View style={s.center}>
          <ActivityIndicator size="large" color="#6200EE" />
          <Text style={s.loadingText}>Please wait... while we connect you to payment securely.</Text>
        </View>
      ) : error ? (
        <View style={s.center}>
          <Feather name="alert-triangle" size={32} color="#EF4444" />
          <Text style={s.errorText}>{error}</Text>
          <TouchableOpacity style={s.retryBtn} onPress={() => router.back()}>
            <Text style={s.retryBtnText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      ) : checkoutUrl ? (
        <WebView
          source={{ uri: checkoutUrl }}
          onNavigationStateChange={handleNavigationChange}
          startInLoadingState
          renderLoading={() => (
            <View style={s.center}>
              <ActivityIndicator size="large" color="#6200EE" />
            </View>
          )}
        />
      ) : null}
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
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 40, gap: 12 },
  loadingText: { fontFamily: 'Inter-Regular', fontSize: 13, color: '#6A7181', textAlign: 'center' },
  errorText: { fontFamily: 'Inter-Regular', fontSize: 13, color: '#EF4444', textAlign: 'center' },
  retryBtn: {
    backgroundColor: '#6200EE', borderRadius: 99,
    paddingHorizontal: 24, paddingVertical: 12, marginTop: 8,
  },
  retryBtnText: { color: '#FFFFFF', fontFamily: 'Inter-Regular', fontWeight: '600', fontSize: 14 },
});
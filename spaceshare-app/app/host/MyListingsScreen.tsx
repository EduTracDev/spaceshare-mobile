import { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { router } from 'expo-router';


const { width } = Dimensions.get('window');

export default function MyListingsScreen() {
  // TODO: replace with real check from user/host profile once backend field exists
  const [hasBankDetails, setHasBankDetails] = useState(false);
  const [showBankModal, setShowBankModal] = useState(!hasBankDetails);

  // TODO: replace with real listings fetch
  const listings: any[] = [];

  const handleBankModalOkay = () => {
    setShowBankModal(false);
    router.push('/profile/bank-details'); // adjust to your actual route
  };

  return (
    <View style={s.root}>
      <SafeAreaView edges={['top']} style={s.safeTop}>
        <View style={s.header}>
          <Text style={s.headerTitle}>My Listings</Text>
        </View>

        {listings.length === 0 ? (
          <View style={s.emptyState}>
            <View style={s.emptyIconWrap}>
              <Feather name="file-plus" size={32} color="#C4B5FD" />
            </View>
            <Text style={s.emptyTitle}>Ready to host?</Text>
            <Text style={s.emptySubtitle}>
              Add your first space and start receiving requests.
            </Text>
          </View>
        ) : (
          <View style={s.listWrap}>
            {/* map real listings here later */}
          </View>
        )}
      </SafeAreaView>

      

      {/* Add Bank Details Modal */}
      <Modal
        visible={showBankModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowBankModal(false)}
      >
        <View style={s.modalOverlay}>
          <View style={s.modalCard}>
            <Text style={s.modalTitle}>Add Your Bank Details</Text>
            <Text style={s.modalBody}>
              Set up your payout account in the Profile section to receive
              payments for completed bookings without delays.
            </Text>
            <TouchableOpacity style={s.modalBtn} onPress={handleBankModalOkay}>
              <Text style={s.modalBtnText}>Okay</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#FFFFFF' },
  safeTop: { flex: 1, backgroundColor: '#FFFFFF' },

  header: {
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  headerTitle: {
    fontFamily: 'MonaSans-Bold',
    fontSize: 20,
    color: '#020203',
  },

  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
    gap: 8,
  },
  emptyIconWrap: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#F3EAFF',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  emptyTitle: {
    fontFamily: 'MonaSans-Bold',
    fontSize: 16,
    color: '#020203',
  },
  emptySubtitle: {
    fontFamily: 'Inter-Regular',
    fontSize: 13,
    color: '#6A7181',
    textAlign: 'center',
  },

  listWrap: {
    flex: 1,
    paddingHorizontal: 16,
  },

  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(2,2,3,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  modalCard: {
    width: width - 48,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    gap: 12,
  },
  modalTitle: {
    fontFamily: 'MonaSans-Bold',
    fontSize: 16,
    color: '#020203',
  },
  modalBody: {
    fontFamily: 'Inter-Regular',
    fontSize: 13,
    color: '#3A414E',
    lineHeight: 19,
  },
  modalBtn: {
    alignSelf: 'flex-start',
    backgroundColor: '#6200EE',
    borderRadius: 99,
    paddingHorizontal: 24,
    paddingVertical: 10,
    marginTop: 4,
  },
  modalBtnText: {
    color: '#FFFFFF',
    fontFamily: 'Inter-Regular',
    fontWeight: '600',
    fontSize: 14,
  },
});
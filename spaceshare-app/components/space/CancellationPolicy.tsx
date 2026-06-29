import { View, Text, StyleSheet, TouchableOpacity, Modal } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useState } from 'react';

type Props = {
  policy: string;
};

export default function CancellationPolicy({ policy }: Props) {
  const [modalVisible, setModalVisible] = useState(false);

  // Show first 120 chars then read more immediately after
  const preview = policy.length > 120 ? policy.substring(0, 120) : policy;
  const needsMore = policy.length > 120;

  return (
    <View style={styles.section}>
      <Text style={styles.title}>Cancellation Policy</Text>
      <Text style={styles.body}>
        {preview}
        {needsMore && (
          <Text style={styles.readMore} onPress={() => setModalVisible(true)}>
            ...read more
          </Text>
        )}
      </Text>

      <Modal visible={modalVisible} transparent animationType="slide">
        <View style={styles.overlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Cancellation Policy</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <Feather name="x" size={20} color="#020203" />
              </TouchableOpacity>
            </View>
            <Text style={styles.modalBody}>{policy}</Text>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  section: { gap: 10 },
  title: {
    fontFamily: 'MonaSans-Bold',
    fontSize: 16,
    color: '#020203',
    letterSpacing: -0.3,
  },
  body: {
    fontFamily: 'Inter-Regular',
    fontSize: 14,
    color: '#3A414E',
    lineHeight: 22,
    letterSpacing: -0.3,
  },
  readMore: {
    color: '#6200EE',
    fontWeight: '600',
    fontFamily: 'Inter-Regular',
    fontSize: 14,
  },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  modalCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 24,
    gap: 16,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  modalTitle: {
    fontFamily: 'MonaSans-Bold',
    fontSize: 18,
    color: '#020203',
  },
  modalBody: {
    fontFamily: 'Inter-Regular',
    fontSize: 14,
    color: '#3A414E',
    lineHeight: 22,
    letterSpacing: -0.3,
  },
});
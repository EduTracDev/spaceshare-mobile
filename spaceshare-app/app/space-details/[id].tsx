import { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Image,
  FlatList,
  Dimensions,
  ActivityIndicator,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { BlurView } from 'expo-blur';
import { router, useLocalSearchParams } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import AmenitiesSection from '@/components/space/AmenitiesSection';
import HostRulesSection from '@/components/space/HostRulesSection';
import ParkingSection from '@/components/space/ParkingSection';
import AddOnSection from '@/components/space/AddOnSection';
import AvailableDates from '@/components/space/AvailableDates';
import CancellationPolicy from '@/components/space/CancellationPolicy';

import ReviewSection from '@/components/space/ReviewSection';
import SelectBookingDate from '@/components/space/SelectBookingDate';
import { useDispatch, useSelector } from 'react-redux';
import { toggleWishlist } from '@/store/slices/wishlistSlice';
import { listingsAPI, bookingsAPI } from '@/services/api';
import { RootState } from '@/store';

const { width, height } = Dimensions.get('window');

const CANCELLATION_POLICY_TEXT =
  'Guests may cancel this booking at least 48 hours before the event start time and will receive a full refund (including all fees) of the booking price. We may use your data for various purposes, such as improving our website, sending you updates, and analyzing usage trends. We ensure that your information is stored securely and only accessible to authorized personnel. You have the right to access, modify, or delete your personal information at any time.';

type AddOnItem = { name: string; unitPrice: string; available: string };

type ListingDetail = {
  id: string;
  spaceName: string;
  spaceCategory: string;
  addressLine: string;
  area: string;
  description: string;
  photos: string[];
  amenities: string[];
  spaceCapacity: number;
  spacePrice: number;
  addOns: AddOnItem[] | null;
  hostRules: string;
  parkingInstruction: string | null;
  startTime: string;
  endTime: string;
  unavailableDates: string[];
};

function formatPrice(listing: ListingDetail) {
  return listing.spacePrice;
}

export default function SpaceDetails() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const dispatch = useDispatch();
  const token = useSelector((state: RootState) => state.auth.token);

  const [listing, setListing] = useState<ListingDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'overview' | 'review'>('overview');
  const [activeImage, setActiveImage] = useState(0);
  const wishlistIds = useSelector((state: RootState) => state.wishlist.items.map((i) => i.id));
  const wishlisted = listing ? wishlistIds.includes(listing.id) : false;
 const [addOnTotal, setAddOnTotal] = useState(0);
  const [selectedAddOns, setSelectedAddOns] = useState<{ [key: string]: number }>({});
  const [cautionModal, setCautionModal] = useState(false);
  const [bookingModal, setBookingModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [bookedOrPendingDates, setBookedOrPendingDates] = useState<Set<string>>(new Set());

  const fetchListing = useCallback(async () => {
    setLoading(true);
    try {
      const res = await listingsAPI.getPublicById(id);
      setListing(res.data.listing);
    } catch (err) {
      console.log('Failed to fetch listing:', err);
    } finally {
      setLoading(false);
    }
  }, [id]);

  const fetchBookedDates = useCallback(async () => {
    if (!token || !id) return;
    try {
      const res = await bookingsAPI.getListingDates(token, id);
      const dates = new Set<string>();
      (res.data.dates ?? []).forEach((b: { startDate: string; endDate: string }) => {
        const cursor = new Date(b.startDate);
        const end = new Date(b.endDate);
        while (cursor <= end) {
          const key = `${cursor.getFullYear()}-${String(cursor.getMonth() + 1).padStart(2, '0')}-${String(cursor.getDate()).padStart(2, '0')}`;
          dates.add(key);
          cursor.setDate(cursor.getDate() + 1);
        }
      });
      setBookedOrPendingDates(dates);
    } catch (err) {
      console.log('Failed to fetch listing booking dates:', err);
    }
  }, [token, id]);

  useEffect(() => {
    fetchListing();
    fetchBookedDates();
  }, [fetchListing, fetchBookedDates]);

  if (loading || !listing) {
    return (
      <SafeAreaView style={styles.centerRoot}>
        <ActivityIndicator color="#6200EE" />
      </SafeAreaView>
    );
  }

  const basePrice = formatPrice(listing);
  const totalPrice = basePrice + addOnTotal;

  const hostRulesList = listing.hostRules
    .split(',')
    .map((r) => r.trim())
    .filter(Boolean);

  const addOnsForPicker = (listing.addOns ?? []).map((a) => ({
    name: a.name,
    price: Number(a.unitPrice),
    available: Number(a.available),
  }));
  // Build upcoming available dates, excluding host-blocked, booked, and pending dates
  const unavailableSet = new Set(listing.unavailableDates ?? []);
  const upcomingAvailableDates: string[] = [];
  const cursor = new Date();
  cursor.setHours(0, 0, 0, 0);
  const SHORT_MONTHS = ['JAN','FEB','MAR','APR','MAY','JUN','JUL','AUG','SEP','OCT','NOV','DEC'];
  let safety = 0;
  while (upcomingAvailableDates.length < 7 && safety < 365) {
    const key = `${cursor.getFullYear()}-${String(cursor.getMonth() + 1).padStart(2, '0')}-${String(cursor.getDate()).padStart(2, '0')}`;
    if (!unavailableSet.has(key) && !bookedOrPendingDates.has(key)) {
      upcomingAvailableDates.push(`${SHORT_MONTHS[cursor.getMonth()]} ${cursor.getDate()}`);
    }
    cursor.setDate(cursor.getDate() + 1);
    safety++;
  }

  const handleWishlist = () => {
    dispatch(toggleWishlist({
      id: listing.id,
      name: listing.spaceName,
      location: listing.area,
      rating: 0,
      guests: listing.spaceCapacity,
      price: basePrice,
      image: listing.photos[0] ?? null,
    }));
  };

  return (
    <View style={styles.root}>

      <ScrollView showsVerticalScrollIndicator={false} stickyHeaderIndices={[1]}>

        {/* Image Carousel */}
        <View style={styles.imageContainer}>
          <FlatList
            data={listing.photos}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            keyExtractor={(_, i) => i.toString()}
            onMomentumScrollEnd={(e) => {
              setActiveImage(Math.round(e.nativeEvent.contentOffset.x / width));
            }}
            renderItem={({ item }) => (
              <Image source={{ uri: item }} style={styles.carouselImage} resizeMode="cover" />
            )}
          />

          <SafeAreaView style={styles.imageOverlay} edges={['top']}>
            <TouchableOpacity style={styles.overlayButton} onPress={() => router.back()}>
              <Feather name="arrow-left" size={18} color="#020203" />
            </TouchableOpacity>
            <TouchableOpacity style={styles.overlayButton} onPress={handleWishlist}>
              <Feather name="heart" size={18} color={wishlisted ? '#E11D48' : '#020203'} />
            </TouchableOpacity>
          </SafeAreaView>

          {listing.photos.length > 0 && (
            <View style={styles.imageCounter}>
              <Text style={styles.imageCounterText}>
                {activeImage + 1}/{listing.photos.length}
              </Text>
            </View>
          )}

          <View style={styles.imageDots}>
            {listing.photos.map((_, i) => (
              <View key={i} style={[styles.dot, i === activeImage && styles.dotActive]} />
            ))}
          </View>
        </View>

        {/* Sticky Tabs */}
        <View style={styles.tabsWrapper}>
          <View style={styles.tabs}>
            <TouchableOpacity
              style={[styles.tab, activeTab === 'overview' && styles.tabActive]}
              onPress={() => setActiveTab('overview')}
            >
              <Text style={[styles.tabText, activeTab === 'overview' && styles.tabTextActive]}>
                Overview
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.tab, activeTab === 'review' && styles.tabActive]}
              onPress={() => setActiveTab('review')}
            >
              <Text style={[styles.tabText, activeTab === 'review' && styles.tabTextActive]}>
                Review
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {activeTab === 'overview' ? (
          <View style={styles.content}>

            <View style={styles.nameSection}>
              <Text style={styles.spaceName}>{listing.spaceName}</Text>
              <View style={styles.badgesRow}>
                <View style={styles.tagBadge}>
                  <Text style={styles.tagText}>{listing.spaceCategory}</Text>
                </View>
              </View>
            </View>

            <View style={styles.metaSection}>
              <View style={styles.metaRow}>
                <Feather name="map-pin" size={13} color="#6A7181" />
                <Text style={styles.metaText}>
                  {listing.addressLine}, {listing.area} • {listing.spaceCapacity} Guest(s) Capacity
                </Text>
              </View>
              <View style={styles.metaRow}>
                <Text style={styles.priceText}>₦{basePrice.toLocaleString()}/day</Text>
                <Text style={styles.metaDivider}>  •  </Text>
                <Feather name="clock" size={13} color="#6A7181" />
                <Text style={styles.metaText}>{listing.startTime} - {listing.endTime}</Text>
              </View>
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>About the Space</Text>
              <Text style={styles.sectionBody}>{listing.description}</Text>
            </View>

           <AmenitiesSection amenities={listing.amenities} />
            {hostRulesList.length > 0 && <HostRulesSection rules={hostRulesList} />}
            {listing.parkingInstruction && (
              <ParkingSection instruction={listing.parkingInstruction} />
            )}
            {addOnsForPicker.length > 0 && (
              <AddOnSection
                addOns={addOnsForPicker}
                onTotalChange={setAddOnTotal}
                selected={selectedAddOns}
                onSelectedChange={setSelectedAddOns}
              />
            )}
            <AvailableDates dates={upcomingAvailableDates} />
            <CancellationPolicy policy={CANCELLATION_POLICY_TEXT} />

            <View style={{ height: 100 }} />
          </View>
        ) : (
          <ReviewSection
            rating={0}
            reviewCount={0}
            reviews={[]}
          />
        )}

      </ScrollView>

      {/* Fixed bottom booking bar */}
      <View style={styles.bookingBar}>
        <View style={styles.bookingLeft}>
          <Text style={styles.bookingPrice}>₦{totalPrice.toLocaleString()}</Text>
          <View style={styles.refundRow}>
            <Text style={styles.bookingRefund}>+₦50,000 refundable caution fee</Text>
            <TouchableOpacity onPress={() => setCautionModal(true)}>
              <Feather name="info" size={14} color="#6A7181" />
            </TouchableOpacity>
          </View>
        </View>
        <TouchableOpacity
          style={[styles.bookButton, submitting && { opacity: 0.6 }]}
          onPress={() => setBookingModal(true)}
          disabled={submitting}
        >
          <Text style={styles.bookButtonText}>Book Now</Text>
        </TouchableOpacity>
      </View>

      {/* Caution Fee Modal */}
      <Modal visible={cautionModal} transparent animationType="fade">
        <BlurView intensity={40} tint="dark" style={styles.overlay}>
          <View style={styles.cautionCard}>
            <View style={styles.cautionHeader}>
              <Text style={styles.cautionTitle}>Refundable Caution Fee</Text>
              <TouchableOpacity onPress={() => setCautionModal(false)}>
                <Feather name="x" size={20} color="#020203" />
              </TouchableOpacity>
            </View>
            <Text style={styles.cautionBody}>
              A refundable caution fee of ₦50,000 will be added to your booking total. This fee covers damages or rule violations during your stay.
            </Text>
            <TouchableOpacity style={styles.cautionButton} onPress={() => setCautionModal(false)}>
              <Text style={styles.cautionButtonText}>Okay</Text>
            </TouchableOpacity>
          </View>
        </BlurView>
      </Modal>

  <SelectBookingDate
        visible={bookingModal}
        onClose={() => setBookingModal(false)}
        listingId={listing.id}
        spaceOpenTime={listing.startTime}
        spaceCloseTime={listing.endTime}
        spaceCapacity={listing.spaceCapacity}
        addOns={addOnsForPicker}
        selectedAddOns={selectedAddOns}
        spaceName={listing.spaceName}
        spaceLocation={listing.area}
        spacePrice={basePrice}
        spaceImage={listing.photos[0]}
        unavailableDates={listing.unavailableDates}
        onConfirm={async (startDate, endDate, startTime, endTime, guests, viewBooking, finalAddOns) => {
          if (!token) {
            setBookingModal(false);
            return;
          }
          setBookingModal(false);
          setSubmitting(true);

          const confirmedAddOns = finalAddOns ?? selectedAddOns;
          const addOnsBreakdown = Object.entries(confirmedAddOns)
            .filter(([, qty]) => qty > 0)
            .map(([name, qty]) => {
              const addOn = addOnsForPicker.find((a) => a.name === name);
              return { name: `${name} × ${qty}`, total: (addOn?.price ?? 0) * qty };
            });

          const confirmedAddOnTotal = addOnsBreakdown.reduce((sum, a) => sum + a.total, 0);
          const cautionFee = 50000;
          const serviceFee = 6250;
          const confirmedTotalPrice = basePrice + confirmedAddOnTotal + cautionFee + serviceFee;

          try {
            const res = await bookingsAPI.create(token, {
              listingId: listing.id,
              spaceName: listing.spaceName,
              spaceLocation: listing.area,
              spacePrice: basePrice,
              startDate: startDate.toISOString(),
              endDate: endDate.toISOString(),
              startTime,
              endTime,
              guests,
              addOnsBreakdown,
              cautionFee,
              serviceFee,
              totalPrice: confirmedTotalPrice,
            });

            const newBookingId = res.data.booking.id;

            if (viewBooking) {
              setTimeout(() => {
                router.push(`/booking-details/${newBookingId}`);
              }, 350);
            }
          } catch (err) {
            console.log('Failed to create booking:', err);
          } finally {
            setSubmitting(false);
          }
        }}
      />

    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#FFFFFF' },
  centerRoot: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#FFFFFF' },
  imageContainer: { width, height: height * 0.38, position: 'relative' },
  carouselImage: { width, height: height * 0.38, backgroundColor: '#F2F4F7' },
  imageOverlay: {
    position: 'absolute', top: 0, left: 0, right: 0,
    flexDirection: 'row', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingTop: 8,
  },
  overlayButton: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1, shadowRadius: 4, elevation: 3,
  },
  imageCounter: {
    position: 'absolute', bottom: 36, right: 16,
    backgroundColor: 'rgba(0,0,0,0.5)', borderRadius: 99,
    paddingHorizontal: 10, paddingVertical: 3,
  },
  imageCounterText: { color: '#FFFFFF', fontSize: 12, fontFamily: 'Inter-Regular' },
  imageDots: {
    position: 'absolute', bottom: 12, left: 0, right: 0,
    flexDirection: 'row', justifyContent: 'center', gap: 6,
  },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: 'rgba(255,255,255,0.5)' },
  dotActive: { backgroundColor: '#FFFFFF', width: 16 },
  tabsWrapper: {
    backgroundColor: '#FFFFFF', paddingHorizontal: 16,
    paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#F2F4F7',
  },
  tabs: {
    flexDirection: 'row', backgroundColor: '#F2F4F7',
    borderRadius: 99, padding: 4, gap: 4,
  },
  tab: { flex: 1, height: 38, borderRadius: 99, alignItems: 'center', justifyContent: 'center' },
  tabActive: { backgroundColor: '#6200EE' },
  tabText: { fontFamily: 'Inter-Regular', fontSize: 14, color: '#6A7181' },
  tabTextActive: { color: '#FFFFFF', fontWeight: '600' },
  content: { paddingHorizontal: 16, paddingTop: 16, gap: 20 },
  nameSection: { gap: 8 },
  spaceName: { fontFamily: 'MonaSans-Bold', fontSize: 22, color: '#020203', letterSpacing: -0.5 },
  badgesRow: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
  tagBadge: { backgroundColor: '#6200EE', borderRadius: 99, paddingHorizontal: 10, paddingVertical: 4 },
  tagText: { fontFamily: 'Inter-Regular', fontSize: 12, color: '#FFFFFF' },
  metaSection: { gap: 6 },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  metaText: { fontFamily: 'Inter-Regular', fontSize: 13, color: '#6A7181' },
  metaDivider: { color: '#D0D5DD' },
  priceText: { fontFamily: 'Inter-Regular', fontWeight: '600', fontSize: 15, color: '#020203' },
  section: { gap: 10 },
  sectionTitle: { fontFamily: 'MonaSans-Bold', fontSize: 16, color: '#020203', letterSpacing: -0.3 },
  sectionBody: { fontFamily: 'Inter-Regular', fontSize: 14, color: '#3A414E', lineHeight: 22, letterSpacing: -0.3 },
  bookingBar: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 16, borderTopWidth: 1,
    borderTopColor: '#F2F4F7', backgroundColor: '#FFFFFF',
    shadowColor: '#000', shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.06, shadowRadius: 8, elevation: 10,
  },
  bookingLeft: { gap: 2 },
  bookingPrice: { fontFamily: 'MonaSans-Bold', fontSize: 20, color: '#020203', letterSpacing: -0.5 },
  refundRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  bookingRefund: { fontFamily: 'Inter-Regular', fontSize: 11, color: '#6A7181' },
  bookButton: {
    backgroundColor: '#6200EE', borderRadius: 99,
    paddingHorizontal: 28, paddingVertical: 14,
    alignItems: 'center', justifyContent: 'center',
  },
  bookButtonText: { color: '#FFFFFF', fontFamily: 'Inter-Regular', fontWeight: '600', fontSize: 15 },
  overlay: { flex: 1, justifyContent: 'center', paddingHorizontal: 24 },
  cautionCard: { backgroundColor: '#FFFFFF', borderRadius: 20, padding: 24, gap: 16 },
  cautionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  cautionTitle: { fontFamily: 'MonaSans-Bold', fontSize: 18, color: '#020203' },
  cautionBody: { fontFamily: 'Inter-Regular', fontSize: 14, color: '#3A414E', lineHeight: 22 },
  cautionButton: {
    backgroundColor: '#6200EE', borderRadius: 99,
    height: 52, alignItems: 'center', justifyContent: 'center',
  },
  cautionButtonText: { color: '#FFFFFF', fontFamily: 'Inter-Regular', fontWeight: '600', fontSize: 15 },
});
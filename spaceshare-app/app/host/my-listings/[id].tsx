import { useState, useEffect } from 'react';
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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { useSelector } from 'react-redux';
import { RootState } from '@/store';
import { listingsAPI } from '@/services/api';

const { width } = Dimensions.get('window');

type AddOnItem = { name: string; unitPrice: string; available: string };
type PricingTier = { minGuests: string; maxGuests: string; price: string };

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
  pricingModel: 'FIXED' | 'ATTENDEE_TIER';
  spacePrice: number | null;
  attendeeTiers: PricingTier[] | null;
  addOns: AddOnItem[] | null;
  hostRules: string;
  parkingInstruction: string | null;
  startTime: string;
  endTime: string;
  unavailableDates: string[];
   status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'SUSPENDED';
  rejectionReason: string | null;
};

const STATUS_BADGE: Record<string, { bg: string; text: string }> = {
  PENDING: { bg: '#FFEDD5', text: '#F97316' },
  APPROVED: { bg: '#DCFCE7', text: '#16A34A' },
  REJECTED: { bg: '#FEE2E2', text: '#EF4444' },
  SUSPENDED: { bg: '#F3E8FF', text: '#9333EA' },
};

export default function HostListingDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const token = useSelector((state: RootState) => state.auth.token);

  const [listing, setListing] = useState<ListingDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'overview' | 'review'>('overview');
  const [activeImage, setActiveImage] = useState(0);
  const [rulesExpanded, setRulesExpanded] = useState(false);
  const [addOnsExpanded, setAddOnsExpanded] = useState(true);

  useEffect(() => {
    fetchListing();
  }, [id]);

  const fetchListing = async () => {
    setLoading(true);
    try {
      const res = await listingsAPI.getById(id);
      setListing(res.data.listing);
    } catch (err) {
      console.log('Failed to fetch listing:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={s.center}>
        <ActivityIndicator color="#6200EE" />
      </SafeAreaView>
    );
  }

  if (!listing) {
    return (
      <SafeAreaView style={s.center}>
        <Text style={s.notFoundText}>Listing not found</Text>
      </SafeAreaView>
    );
  }

  const badge = STATUS_BADGE[listing.status];
  const hostRulesList = listing.hostRules
    .split(',')
    .map((r) => r.trim())
    .filter(Boolean);
  const visibleRules = rulesExpanded ? hostRulesList : hostRulesList.slice(0, 3);

  // Build the next 7 upcoming days, excluding any the host marked unavailable
  const unavailableSet = new Set(listing.unavailableDates ?? []);
  const upcomingAvailableDates: Date[] = [];
  const cursor = new Date();
  cursor.setHours(0, 0, 0, 0);
  while (upcomingAvailableDates.length < 7) {
    const key = `${cursor.getFullYear()}-${String(cursor.getMonth() + 1).padStart(2, '0')}-${String(cursor.getDate()).padStart(2, '0')}`;
    if (!unavailableSet.has(key)) {
      upcomingAvailableDates.push(new Date(cursor));
    }
    cursor.setDate(cursor.getDate() + 1);
  }
  const SHORT_MONTHS = ['JAN','FEB','MAR','APR','MAY','JUN','JUL','AUG','SEP','OCT','NOV','DEC'];

  return (
    <View style={s.root}>
      <ScrollView showsVerticalScrollIndicator={false}>

        {/* Image Carousel */}
        <View style={s.imageContainer}>
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
              <Image source={{ uri: item }} style={s.carouselImage} resizeMode="cover" />
            )}
          />

          <SafeAreaView style={s.imageOverlay} edges={['top']}>
            <TouchableOpacity style={s.overlayButton} onPress={() => router.back()}>
              <Feather name="arrow-left" size={18} color="#020203" />
            </TouchableOpacity>
          </SafeAreaView>

          {listing.photos.length > 0 && (
            <View style={s.imageCounter}>
              <Text style={s.imageCounterText}>
                {activeImage + 1}/{listing.photos.length}
              </Text>
            </View>
          )}

          <View style={s.imageDots}>
            {listing.photos.map((_, i) => (
              <View key={i} style={[s.dot, i === activeImage && s.dotActive]} />
            ))}
          </View>
      </View>

        {listing.status === 'PENDING' && (
          <View style={s.pendingBanner}>
            <Feather name="alert-circle" size={14} color="#B45309" style={{ marginTop: 1 }} />
            <Text style={s.pendingBannerText}>
              Your space is currently under review by the admin team. You'll receive a status update within 24 hours of submission.
            </Text>
          </View>
        )}

       {listing.status === 'REJECTED' && (
          <View style={s.rejectedBanner}>
            <Feather name="alert-triangle" size={14} color="#EF4444" style={{ marginTop: 1 }} />
            <View style={{ flex: 1 }}>
              <Text style={s.rejectedBannerTitle}>Rejection Message</Text>
              <Text style={s.rejectedBannerText}>
                {listing.rejectionReason ?? 'Your listing did not meet the approval requirements. Review the feedback below, make updates, and resubmit for review.'}
              </Text>
            </View>
          </View>
        )}

        {listing.status === 'SUSPENDED' && (
          <View style={s.rejectedBanner}>
            <Feather name="alert-triangle" size={14} color="#FF3B30" style={{ marginTop: 1 }} />
            <Text style={s.rejectedBannerText}>
              {listing.rejectionReason ?? 'This space has been suspended due to constant report from guest about the treatment and the space being unsafe.'}
            </Text>
          </View>
        )}

        {/* Tabs */}
        <View style={s.tabsWrapper}>
          <View style={s.tabs}>
            <TouchableOpacity
              style={[s.tab, activeTab === 'overview' && s.tabActive]}
              onPress={() => setActiveTab('overview')}
            >
              <Text style={[s.tabText, activeTab === 'overview' && s.tabTextActive]}>Overview</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[s.tab, activeTab === 'review' && s.tabActive]}
              onPress={() => setActiveTab('review')}
            >
              <Text style={[s.tabText, activeTab === 'review' && s.tabTextActive]}>Review</Text>
            </TouchableOpacity>
          </View>
        </View>

        {activeTab === 'overview' ? (
          <View style={s.content}>

            <View style={s.nameRow}>
              <View style={{ flex: 1 }}>
                <View style={s.nameTopRow}>
                  <Text style={s.spaceName}>{listing.spaceName}</Text>
                  <View style={[s.statusBadge, { backgroundColor: badge.bg }]}>
                    <Text style={[s.statusBadgeText, { color: badge.text }]}>
                      {listing.status.charAt(0) + listing.status.slice(1).toLowerCase()}
                    </Text>
                  </View>
                </View>
                <View style={s.badgesRow}>
                  <View style={s.tagBadge}>
                    <Text style={s.tagText}>{listing.spaceCategory}</Text>
                  </View>
                  <View style={s.statBadge}>
                    <Feather name="heart" size={11} color="#6A7181" />
                    <Text style={s.statBadgeText}>0 saves</Text>
                  </View>
                  <View style={s.statBadge}>
                    <Feather name="star" size={11} color="#6A7181" />
                    <Text style={s.statBadgeText}>(0)</Text>
                  </View>
                </View>
              </View>
            </View>

            <View style={s.metaSection}>
              <View style={s.metaRow}>
                <Feather name="map-pin" size={13} color="#6A7181" />
                <Text style={s.metaText}>{listing.addressLine}, {listing.area}</Text>
              </View>
              <View style={s.metaRow}>
                <Feather name="users" size={13} color="#6A7181" />
                <Text style={s.metaText}>{listing.spaceCapacity} Capacity</Text>
              </View>
              <View style={s.metaRow}>
                <Text style={s.priceText}>₦{(listing.spacePrice ?? 0).toLocaleString()}/day</Text>
                <Text style={s.metaDivider}>  •  </Text>
                <Feather name="clock" size={13} color="#6A7181" />
                <Text style={s.metaText}>{listing.startTime} - {listing.endTime}</Text>
              </View>
            </View>

            <View style={s.section}>
              <Text style={s.sectionTitle}>About the Space</Text>
              <Text style={s.sectionBody}>{listing.description}</Text>
            </View>

            {listing.amenities.length > 0 && (
              <View style={s.section}>
                <Text style={s.sectionTitle}>Amenities</Text>
                <View style={s.amenitiesGrid}>
                  {listing.amenities.map((item) => (
                    <View key={item} style={s.amenityRow}>
                      <Feather name="check" size={13} color="#16A34A" />
                      <Text style={s.amenityText}>{item}</Text>
                    </View>
                  ))}
                </View>
              </View>
            )}

            {hostRulesList.length > 0 && (
              <View style={s.rulesCard}>
                <Text style={s.rulesTitle}>Host Rules</Text>
                {visibleRules.map((rule, i) => (
                  <Text key={i} style={s.ruleItem}>• {rule}</Text>
                ))}
                {hostRulesList.length > 3 && (
                  <TouchableOpacity onPress={() => setRulesExpanded(!rulesExpanded)}>
                    <Text style={s.readMore}>{rulesExpanded ? 'show less' : 'read more...'}</Text>
                  </TouchableOpacity>
                )}
              </View>
            )}

            {listing.parkingInstruction ? (
              <View style={s.section}>
                <TouchableOpacity style={s.sectionHeaderRow}>
                  <Text style={s.sectionTitle}>Parking Instruction</Text>
                  <Feather name="chevron-up" size={16} color="#020203" />
                </TouchableOpacity>
                <Text style={s.sectionBody}>{listing.parkingInstruction}</Text>
              </View>
            ) : null}

            {listing.addOns && listing.addOns.length > 0 && (
              <View>
                <TouchableOpacity
                  style={s.addOnHeaderRow}
                  onPress={() => setAddOnsExpanded(!addOnsExpanded)}
                  activeOpacity={0.7}
                >
                  <View style={s.addOnHeaderLeft}>
                    <Image
                      source={require('../../../assets/icons/add.png')}
                      style={s.addOnIcon}
                      resizeMode="contain"
                    />
                    <Text style={s.addOnTitle}>Add-On</Text>
                  </View>
                  <Feather name={addOnsExpanded ? 'chevron-up' : 'chevron-down'} size={18} color="#6A7181" />
                </TouchableOpacity>

                {addOnsExpanded && (
                  <View style={s.addOnBox}>
                    {listing.addOns.map((item, i) => (
                      <View key={i} style={s.addOnItem}>
                        <Text style={s.addOnName}>{item.name}</Text>
                        <Text style={s.addOnMeta}>
                          ₦{Number(item.unitPrice).toLocaleString()} · {item.available} available
                        </Text>
                      </View>
                    ))}
                  </View>
                )}
              </View>
            )}

            <View style={s.section}>
              <Text style={s.sectionTitle}>Available Dates</Text>
              <View style={s.datesRow}>
                {upcomingAvailableDates.map((date, i) => (
                  <View key={i} style={s.dateChip}>
                    <Text style={s.dateChipMonth}>{SHORT_MONTHS[date.getMonth()]}</Text>
                    <Text style={s.dateChipDay}>{date.getDate()}</Text>
                  </View>
                ))}
              </View>
            </View>

            {listing.status === 'REJECTED' && (
              <TouchableOpacity
                style={s.editSpaceBtn}
                onPress={() => router.push(`/host/my-listings/${listing.id}/edit`)}
              >
                <Text style={s.editSpaceBtnText}>Edit Space</Text>
              </TouchableOpacity>
            )}

            <View style={{ height: 40 }} />
          </View>
        ) : (
          <View style={s.reviewSection}>
            <View style={s.reviewSummary}>
              <Text style={s.reviewAvg}>0.0</Text>
              <View style={s.starsRow}>
                {[1, 2, 3, 4, 5].map((n) => (
                  <Feather key={n} name="star" size={16} color="#E4E7EC" />
                ))}
              </View>
              <Text style={s.reviewCount}>(0 Reviews)</Text>
            </View>

            <View style={s.emptyReviews}>
              <Feather name="star" size={36} color="#E4E7EC" />
              <Text style={s.emptyReviewsText}>Your space hasn't received any reviews yet.</Text>
            </View>
          </View>
        )}

      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#FFFFFF' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#FFFFFF' },
  notFoundText: { fontFamily: 'Inter-Regular', fontSize: 14, color: '#6A7181' },

  imageContainer: { width, height: 260, position: 'relative' },
  pendingBanner: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 8,
    backgroundColor: '#FFF7E5', marginHorizontal: 16, marginTop: 12,
    borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12,
  },
  pendingBannerText: {
    flex: 1, fontFamily: 'Inter-Regular', fontSize: 12, color: '#B45309', lineHeight: 18,
  },
 rejectedBanner: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 8,
    backgroundColor: '#FFEDED', marginHorizontal: 16, marginTop: 12,
    borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12,
  },
  rejectedBannerTitle: {
    fontFamily: 'Inter-SemiBold',
    fontWeight: '600',
    fontSize: 12,
    lineHeight: 18,
    letterSpacing: -0.5,
    color: '#020203',
    marginBottom: 2,
  },
  rejectedBannerText: {
    fontFamily: 'Inter-Regular',
    fontWeight: '400',
    fontSize: 14,
    lineHeight: 21,
    letterSpacing: -0.5,
    color: '#FF3B30',
  },
  carouselImage: { width, height: 260, backgroundColor: '#F2F4F7' },
  imageOverlay: {
    position: 'absolute', top: 0, left: 0, right: 0,
    paddingHorizontal: 16, paddingTop: 8,
  },
  overlayButton: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1, shadowRadius: 4, elevation: 3,
  },
  imageCounter: {
    position: 'absolute', bottom: 12, right: 16,
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
  tabs: { flexDirection: 'row', backgroundColor: '#F2F4F7', borderRadius: 99, padding: 4, gap: 4 },
  tab: { flex: 1, height: 38, borderRadius: 99, alignItems: 'center', justifyContent: 'center' },
  tabActive: { backgroundColor: '#6200EE' },
  tabText: { fontFamily: 'Inter-Regular', fontSize: 14, color: '#6A7181' },
  tabTextActive: { color: '#FFFFFF', fontWeight: '600' },

  content: { paddingHorizontal: 16, paddingTop: 16, gap: 16 },
  nameRow: { flexDirection: 'row' },
  nameTopRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  spaceName: { flex: 1, fontFamily: 'MonaSans-Bold', fontSize: 20, color: '#020203', letterSpacing: -0.5 },
  statusBadge: { borderRadius: 99, paddingHorizontal: 10, paddingVertical: 4 },
  statusBadgeText: { fontFamily: 'Inter-Regular', fontSize: 11, fontWeight: '700' },

  badgesRow: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginTop: 8 },
  tagBadge: { backgroundColor: '#6200EE', borderRadius: 99, paddingHorizontal: 10, paddingVertical: 4 },
  tagText: { fontFamily: 'Inter-Regular', fontSize: 12, color: '#FFFFFF' },
  statBadge: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  statBadgeText: { fontFamily: 'Inter-Regular', fontSize: 12, color: '#6A7181' },

  metaSection: { gap: 6 },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  metaText: { fontFamily: 'Inter-Regular', fontSize: 13, color: '#6A7181' },
  metaDivider: { color: '#D0D5DD' },
  priceText: { fontFamily: 'Inter-Regular', fontWeight: '600', fontSize: 15, color: '#020203' },

  section: { gap: 10 },
  sectionHeaderRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  sectionTitle: { fontFamily: 'MonaSans-Bold', fontSize: 16, color: '#020203', letterSpacing: -0.3 },
  sectionBody: { fontFamily: 'Inter-Regular', fontSize: 14, color: '#3A414E', lineHeight: 22, letterSpacing: -0.3 },

  amenitiesGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  amenityRow: {
    flexDirection: 'row', alignItems: 'center', gap: 6, width: '48%',
  },
  amenityText: { fontFamily: 'Inter-Regular', fontSize: 13, color: '#3A414E' },

  rulesCard: {
    backgroundColor: '#FFEDED', borderRadius: 12, padding: 14, gap: 6,
  },
  rulesTitle: { fontFamily: 'MonaSans-Bold', fontSize: 14, color: '#FF3B30' },
  ruleItem: { fontFamily: 'Inter-Regular', fontSize: 13, color: '#3A414E', lineHeight: 19 },
  readMore: { fontFamily: 'Inter-Regular', fontSize: 12, color: '#6200EE', fontWeight: '600', marginTop: 2 },

  addOnHeaderRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingVertical: 4,
  },
  addOnHeaderLeft: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  addOnIcon: { width: 16, height: 16 },
  addOnTitle: { fontFamily: 'MonaSans-Bold', fontSize: 16, color: '#3A414E' },
  addOnBox: {
    backgroundColor: '#F3F4F6', borderRadius: 12, padding: 12, gap: 10, marginTop: 10,
  },
  addOnItem: {
    backgroundColor: '#FFFFFF', borderRadius: 10, padding: 12, gap: 2,
  },
  addOnName: { fontFamily: 'Inter-Regular', fontSize: 14, fontWeight: '600', color: '#020203' },
  addOnMeta: { fontFamily: 'Inter-Regular', fontSize: 12, color: '#6A7181' },

  datesRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  dateChip: {
    backgroundColor: '#F3F4F6', borderRadius: 10,
    paddingHorizontal: 12, paddingVertical: 8, alignItems: 'center', minWidth: 52,
  },
  dateChipMonth: { fontFamily: 'Inter-Regular', fontSize: 10, color: '#6A7181', fontWeight: '600' },
  dateChipDay: { fontFamily: 'MonaSans-Bold', fontSize: 15, color: '#020203' },

  editSpaceBtn: {
    backgroundColor: '#6200EE', borderRadius: 99, height: 52,
    alignItems: 'center', justifyContent: 'center', marginTop: 20,
  },
  editSpaceBtnText: { color: '#FFFFFF', fontFamily: 'Inter-Regular', fontWeight: '600', fontSize: 15 },

  reviewSection: { paddingHorizontal: 16, paddingTop: 24, alignItems: 'center', gap: 8 },
  reviewSummary: { alignItems: 'center', gap: 4 },
  reviewAvg: { fontFamily: 'MonaSans-Bold', fontSize: 28, color: '#020203' },
  starsRow: { flexDirection: 'row', gap: 2 },
  reviewCount: { fontFamily: 'Inter-Regular', fontSize: 13, color: '#6A7181' },
  emptyReviews: {
    alignItems: 'center', justifyContent: 'center', paddingVertical: 60, gap: 12,
  },
  emptyReviewsText: { fontFamily: 'Inter-Regular', fontSize: 13, color: '#98A2B3', textAlign: 'center' },
});
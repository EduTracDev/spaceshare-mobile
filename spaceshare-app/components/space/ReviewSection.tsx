import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useState } from 'react';

type Review = {
  id: string;
  name: string;
  date: string;
  rating: number;
  comment: string;
};

type Props = {
  rating: number;
  reviewCount: number;
  reviews: Review[];
};

export default function ReviewSection({ rating, reviewCount, reviews }: Props) {
  const [userRating, setUserRating] = useState(0);

  return (
    <View style={styles.container}>

      {reviews.length === 0 ? (
        // Empty state
        <View style={styles.emptyState}>
          <Feather name="star" size={48} color="#D0D5DD" />
          <Text style={styles.emptyText}>
            This space hasn't received any reviews yet.
          </Text>
        </View>
      ) : (
        <>
          {/* Overall rating */}
          <View style={styles.overallRating}>
            <Text style={styles.overallScore}>{rating}</Text>
            <View style={styles.starsRow}>
              {[1, 2, 3, 4, 5].map((star) => (
                <Feather
                  key={star}
                  name="star"
                  size={18}
                  color={star <= Math.round(rating) ? '#F79009' : '#D0D5DD'}
                />
              ))}
            </View>
            <Text style={styles.reviewCount}>({reviewCount} Reviews)</Text>
          </View>

          <Text style={styles.reviewsLabel}>Reviews</Text>

          {/* Reviews list */}
          <View style={styles.reviewsList}>
            {reviews.map((review) => (
              <View key={review.id} style={styles.reviewCard}>
                <View style={styles.reviewHeader}>
                  <View style={styles.reviewerInfo}>
                    <Text style={styles.reviewDate}>{review.date}</Text>
                    <Text style={styles.reviewComment}>{review.comment}</Text>
                    <Text style={styles.reviewerName}>{review.name}</Text>
                  </View>
                  <View style={styles.reviewRating}>
                    <Feather name="star" size={14} color="#F79009" />
                    <Text style={styles.reviewRatingText}>{review.rating}</Text>
                  </View>
                </View>
              </View>
            ))}
          </View>
        </>
      )}

      {/* User star rating */}
      <View style={styles.userRatingSection}>
        <Text style={styles.userRatingTitle}>Rate this space</Text>
        <View style={styles.userStarsRow}>
          {[1, 2, 3, 4, 5].map((star) => (
            <TouchableOpacity key={star} onPress={() => setUserRating(star)}>
              <Feather
                name="star"
                size={32}
                color={star <= userRating ? '#F79009' : '#D0D5DD'}
              />
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <View style={{ height: 100 }} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
    paddingTop: 24,
    gap: 20,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 40,
    gap: 12,
    paddingHorizontal: 32,
  },
  emptyText: {
    fontFamily: 'Inter-Regular',
    fontSize: 14,
    color: '#6A7181',
    textAlign: 'center',
    lineHeight: 22,
  },
  overallRating: {
    alignItems: 'center',
    gap: 8,
  },
  overallScore: {
    fontFamily: 'MonaSans-Bold',
    fontSize: 48,
    color: '#020203',
  },
  starsRow: {
    flexDirection: 'row',
    gap: 4,
  },
  reviewCount: {
    fontFamily: 'Inter-Regular',
    fontSize: 14,
    color: '#6A7181',
  },
  reviewsLabel: {
    fontFamily: 'MonaSans-Bold',
    fontSize: 18,
    color: '#020203',
  },
  reviewsList: {
    gap: 16,
  },
  reviewCard: {
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F2F4F7',
  },
  reviewHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  reviewerInfo: {
    flex: 1,
    gap: 4,
  },
  reviewDate: {
    fontFamily: 'Inter-Regular',
    fontSize: 12,
    color: '#6A7181',
  },
  reviewComment: {
    fontFamily: 'Inter-Regular',
    fontSize: 14,
    color: '#3A414E',
    lineHeight: 21,
  },
  reviewerName: {
    fontFamily: 'Inter-Regular',
    fontWeight: '600',
    fontSize: 14,
    color: '#020203',
  },
  reviewRating: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  reviewRatingText: {
    fontFamily: 'Inter-Regular',
    fontWeight: '600',
    fontSize: 14,
    color: '#020203',
  },
  userRatingSection: {
    alignItems: 'center',
    gap: 12,
    paddingTop: 8,
  },
  userRatingTitle: {
    fontFamily: 'MonaSans-Bold',
    fontSize: 16,
    color: '#020203',
  },
  userStarsRow: {
    flexDirection: 'row',
    gap: 8,
  },
});
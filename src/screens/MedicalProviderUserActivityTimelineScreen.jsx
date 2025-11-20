// Medical Provider User Activity Timeline Screen - PostgreSQL adapted

import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import MedicalGlassCard from '../components/MedicalGlassCard';
import { medicalProviderTheme } from '../styles/medicalProviderTheme';
import { apiRequest } from '../config/api';

const MedicalProviderUserActivityTimelineScreen = ({ 
  user, 
  targetUserId, 
  onBack 
}) => {
  const [activities, setActivities] = useState([]);
  const [targetUser, setTargetUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [isFetching, setIsFetching] = useState(false);
  const lastRequestedPageRef = useRef(1);
  const pendingPageRef = useRef(null);
  const failedPageRef = useRef(null);

  useEffect(() => {
    loadUserTimeline(page);
  }, [page]);

  const loadUserTimeline = async (currentPage) => {
    try {
      setIsFetching(true);

      if (currentPage === 1) {
        setLoading(true);
      }

      const response = await apiRequest(
        `/api/medicalprovider/activity/user/${targetUserId}/timeline?page=${currentPage}&limit=20`,
        {
          method: 'GET',
        }
      );

      const newActivities = response.activities || [];

      if (currentPage === 1) {
        setActivities(newActivities);
        setTargetUser(response.user);
      } else {
        setActivities(prev => [...prev, ...newActivities]);
      }

      // Update hasMore - trust backend pagination metadata when available
      if (response.pagination?.totalPages !== undefined) {
        setHasMore(response.pagination.currentPage < response.pagination.totalPages);
      } else {
        // Fallback: if no pagination metadata, check if we got a full page
        setHasMore(newActivities.length >= 20);
      }

      // Success - clear pending, failed state, and mark as successfully loaded
      pendingPageRef.current = null;
      failedPageRef.current = null;
      lastRequestedPageRef.current = currentPage;
    } catch (error) {
      console.error('[MedicalUserTimeline] Load error:', error);
      // Error - clear pending and mark page as failed for retry
      pendingPageRef.current = null;
      failedPageRef.current = currentPage; // Track failed page for direct retry
    } finally {
      setLoading(false);
      setRefreshing(false);
      setIsFetching(false);
    }
  };

  const onRefresh = () => {
    if (isFetching || pendingPageRef.current !== null) return; // Prevent refresh during active fetch or pending page
    setRefreshing(true);
    setHasMore(true);
    lastRequestedPageRef.current = 1;
    pendingPageRef.current = null; // Clear any pending page
    failedPageRef.current = null; // Clear any failed page
    if (page === 1) {
      // Already on page 1, manually reload
      loadUserTimeline(1);
    } else {
      // Reset to page 1, let effect handle reload
      setPage(1);
    }
  };

  const loadMore = () => {
    // Prevent loadMore during active fetch or if no more data
    if (loading || isFetching || !hasMore) return;
    
    // Check if we already have a pending page request (set synchronously before setPage)
    if (pendingPageRef.current !== null) return; // Already requesting next page
    
    // If current page failed, retry it directly without changing state
    if (failedPageRef.current === page) {
      pendingPageRef.current = page;
      loadUserTimeline(page); // Direct retry of failed page
      return;
    }
    
    // Only load next page if we've successfully loaded current page
    if (page > lastRequestedPageRef.current) return;
    
    const nextPage = page + 1;
    pendingPageRef.current = nextPage; // Set immediately, synchronously
    setPage(nextPage);
  };

  const groupActivitiesByDate = (activities) => {
    const groups = {};
    
    activities.forEach(activity => {
      const timestamp = activity.timestamp ? new Date(activity.timestamp) : null;
      if (!timestamp || isNaN(timestamp.getTime())) return;
      
      const dateKey = timestamp.toLocaleDateString('en-US', { 
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });

      if (!groups[dateKey]) {
        groups[dateKey] = [];
      }
      groups[dateKey].push(activity);
    });

    return groups;
  };

  const groupedActivities = groupActivitiesByDate(activities);

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={[
          medicalProviderTheme.colors.clinicalWhite,
          medicalProviderTheme.colors.lightGray,
        ]}
        style={styles.background}
      />

      <LinearGradient
        colors={[
          medicalProviderTheme.colors.deepTeal,
          medicalProviderTheme.colors.clinicalTeal,
        ]}
        style={styles.headerGradient}
      >
        <BlurView intensity={10} style={styles.header}>
          <View style={styles.headerContent}>
            <TouchableOpacity onPress={onBack}>
              <Text style={styles.backText}>← Back</Text>
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Activity Timeline</Text>
            <View style={{ width: 60 }} />
          </View>
        </BlurView>
      </LinearGradient>

      {targetUser && (
        <MedicalGlassCard variant="white" style={styles.userInfoCard}>
          <View style={styles.userInfoContent}>
            <View style={styles.userAvatar}>
              <LinearGradient
                colors={[
                  medicalProviderTheme.colors.accentTeal,
                  medicalProviderTheme.colors.clinicalTeal,
                ]}
                style={styles.avatarGradient}
              >
                <Text style={styles.userInitials}>
                  {targetUser.name ? targetUser.name.split(' ').map(n => n[0]).join('') : '?'}
                </Text>
              </LinearGradient>
            </View>
            <View style={styles.userInfo}>
              <View style={styles.userNameRow}>
                <Text style={styles.userName}>{targetUser.name || 'Unknown User'}</Text>
              </View>
              <Text style={styles.userEmail}>{targetUser.email || 'No email'}</Text>
              <View style={styles.userMeta}>
                <View style={styles.userBadge}>
                  <Text style={styles.userBadgeText}>
                    {(targetUser.role || 'staff').replace(/_/g, ' ').toUpperCase()}
                  </Text>
                </View>
                {targetUser.status && (
                  <View style={[
                    styles.statusBadge,
                    { backgroundColor: targetUser.status === 'active' 
                      ? medicalProviderTheme.colors.healthy + '30' 
                      : medicalProviderTheme.colors.mediumGray + '30' 
                    }
                  ]}>
                    <Text style={[
                      styles.statusBadgeText,
                      { color: targetUser.status === 'active' 
                        ? medicalProviderTheme.colors.healthy 
                        : medicalProviderTheme.colors.mediumGray 
                      }
                    ]}>
                      {targetUser.status.toUpperCase()}
                    </Text>
                  </View>
                )}
              </View>
            </View>
          </View>
        </MedicalGlassCard>
      )}

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={medicalProviderTheme.colors.accentTeal}
          />
        }
        onScroll={({ nativeEvent }) => {
          const { layoutMeasurement, contentOffset, contentSize } = nativeEvent;
          const isCloseToBottom = layoutMeasurement.height + contentOffset.y >= contentSize.height - 100;
          
          if (isCloseToBottom) {
            loadMore();
          }
        }}
        scrollEventThrottle={400}
      >
        {Object.entries(groupedActivities).map(([date, dayActivities]) => (
          <View key={date} style={styles.dateGroup}>
            <View style={styles.dateHeader}>
              <View style={styles.dateLine} />
              <Text style={styles.dateText}>{date}</Text>
              <View style={styles.dateLine} />
            </View>

            {dayActivities.map((activity, index) => (
              <TimelineActivityCard 
                key={activity.id || index}
                activity={activity}
                isLast={index === dayActivities.length - 1}
              />
            ))}
          </View>
        ))}

        {activities.length === 0 && !loading && (
          <MedicalGlassCard variant="mint" style={styles.emptyCard}>
            <Text style={styles.emptyText}>No activity recorded yet</Text>
          </MedicalGlassCard>
        )}

        {loading && page === 1 && (
          <Text style={styles.loadingText}>Loading timeline...</Text>
        )}

        {loading && page > 1 && (
          <Text style={styles.loadingMoreText}>Loading more...</Text>
        )}

        {!hasMore && activities.length > 0 && (
          <Text style={styles.endText}>— End of timeline —</Text>
        )}

        <View style={{ height: 100 }} />
      </ScrollView>
    </View>
  );
};

const TimelineActivityCard = ({ activity, isLast }) => {
  const actionIcons = {
    user_created: '➕',
    user_updated: '✏️',
    user_deactivated: '🚫',
    user_reactivated: '✅',
    user_login: '🔓',
    user_logout: '🔒',
    patient_viewed: '👁️',
    patient_updated: '✏️',
    patient_created: '➕',
    patient_phi_accessed: '🔐',
    medical_record_viewed: '📋',
    medical_record_updated: '✏️',
    medical_record_created: '📝',
    document_uploaded: '📤',
    document_downloaded: '📥',
    document_deleted: '🗑️',
    notification_sent: '📨',
    settings_updated: '⚙️',
    password_changed: '🔑',
  };

  const actionColors = {
    user: medicalProviderTheme.colors.accentTeal,
    patient: medicalProviderTheme.colors.medicalTeal,
    document: medicalProviderTheme.colors.prescriptionGreen,
    financial: medicalProviderTheme.colors.healthy,
    communication: medicalProviderTheme.colors.accentTeal,
    case: medicalProviderTheme.colors.medicalBlue,
    settings: medicalProviderTheme.colors.darkGray,
    security: medicalProviderTheme.colors.emergencyRed,
  };

  const sensitivityColors = {
    low: medicalProviderTheme.colors.healthy,
    medium: medicalProviderTheme.colors.stable,
    high: medicalProviderTheme.colors.warning,
    critical: medicalProviderTheme.colors.critical,
  };

  const formatTime = (timestamp) => {
    const date = timestamp ? new Date(timestamp) : null;
    if (!date || isNaN(date.getTime())) return 'Invalid time';
    
    return date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  };

  const action = activity.action || 'unknown_action';
  const actionCategory = activity.action_category || 'user';
  const sensitivityLevel = activity.sensitivity_level || null;
  const targetName = activity.target_name || null;
  const metadata = activity.metadata || {};
  const ipAddress = activity.ip_address || null;
  const auditRequired = activity.audit_required || false;

  return (
    <View style={styles.timelineItem}>
      <View style={styles.timelineLeft}>
        <View
          style={[
            styles.timelineDot,
            { backgroundColor: actionColors[actionCategory] || medicalProviderTheme.colors.accentTeal }
          ]}
        >
          {sensitivityLevel && (
            <View
              style={[
                styles.sensitivityRing,
                { borderColor: sensitivityColors[sensitivityLevel] || medicalProviderTheme.colors.darkGray },
              ]}
            />
          )}
        </View>
        {!isLast && <View style={styles.timelineLine} />}
      </View>

      <MedicalGlassCard variant="white" style={styles.activityCard}>
        <View style={styles.activityHeader}>
          <Text style={styles.activityIcon}>
            {actionIcons[action] || '📊'}
          </Text>
          <View style={styles.activityHeaderRight}>
            <Text style={styles.activityTime}>{formatTime(activity.timestamp)}</Text>
            {sensitivityLevel && (
              <View
                style={[
                  styles.sensitivityBadge,
                  { backgroundColor: (sensitivityColors[sensitivityLevel] || medicalProviderTheme.colors.darkGray) + '30' },
                ]}
              >
                <Text
                  style={[
                    styles.sensitivityText,
                    { color: sensitivityColors[sensitivityLevel] || medicalProviderTheme.colors.darkGray },
                  ]}
                >
                  {sensitivityLevel.toUpperCase()}
                </Text>
              </View>
            )}
          </View>
        </View>

        <Text style={styles.activityAction}>
          {action.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
        </Text>

        {targetName && (
          <View style={styles.activityTarget}>
            <Text style={styles.activityTargetLabel}>Target:</Text>
            <Text style={styles.activityTargetValue}>{targetName}</Text>
          </View>
        )}

        {metadata && Object.keys(metadata).length > 0 && (
          <View style={styles.activityMetadata}>
            <Text style={styles.metadataLabel}>Details:</Text>
            {metadata.method && (
              <Text style={styles.metadataText}>Method: {metadata.method}</Text>
            )}
            {metadata.path && (
              <Text style={styles.metadataText}>Path: {metadata.path}</Text>
            )}
            {metadata.changes && typeof metadata.changes === 'object' && (
              <Text style={styles.metadataText}>
                Changes: {Object.keys(metadata.changes).join(', ')}
              </Text>
            )}
          </View>
        )}

        <View style={styles.activityFooter}>
          <View
            style={[
              styles.categoryBadge,
              { backgroundColor: (actionColors[actionCategory] || medicalProviderTheme.colors.accentTeal) + '20' }
            ]}
          >
            <Text
              style={[
                styles.categoryText,
                { color: actionColors[actionCategory] || medicalProviderTheme.colors.accentTeal }
              ]}
            >
              {actionCategory.replace(/_/g, ' ').toUpperCase()}
            </Text>
          </View>

          {auditRequired && (
            <View style={styles.auditBadge}>
              <Text style={styles.auditText}>⚠️ AUDIT REQUIRED</Text>
            </View>
          )}
        </View>

        {ipAddress && (
          <Text style={styles.ipAddress}>IP: {ipAddress}</Text>
        )}

        {activity.status === 'failed' && activity.error_message && (
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>❌ Error: {activity.error_message}</Text>
          </View>
        )}
      </MedicalGlassCard>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: medicalProviderTheme.colors.clinicalWhite,
  },
  background: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
  },
  headerGradient: {
    paddingTop: 60,
  },
  header: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  backText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  userInfoCard: {
    margin: 20,
    padding: 16,
  },
  userInfoContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  userAvatar: {
    marginRight: 15,
  },
  avatarGradient: {
    width: 70,
    height: 70,
    borderRadius: 35,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: medicalProviderTheme.colors.mintGreen,
  },
  userInitials: {
    color: '#FFFFFF',
    fontSize: 28,
    fontWeight: '700',
  },
  userInfo: {
    flex: 1,
  },
  userNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  userName: {
    color: medicalProviderTheme.colors.deepTeal,
    fontSize: 22,
    fontWeight: '700',
  },
  userEmail: {
    color: medicalProviderTheme.colors.mediumGray,
    fontSize: 14,
    marginBottom: 8,
  },
  userMeta: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  userBadge: {
    backgroundColor: medicalProviderTheme.colors.accentTeal + '30',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    marginRight: 10,
  },
  userBadgeText: {
    color: medicalProviderTheme.colors.accentTeal,
    fontSize: 11,
    fontWeight: '700',
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  statusBadgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: 20,
    paddingTop: 0,
  },
  dateGroup: {
    marginBottom: 30,
  },
  dateHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  dateLine: {
    flex: 1,
    height: 1,
    backgroundColor: medicalProviderTheme.colors.lightGray,
  },
  dateText: {
    color: medicalProviderTheme.colors.darkGray,
    fontSize: 13,
    fontWeight: '700',
    marginHorizontal: 15,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  timelineItem: {
    flexDirection: 'row',
    marginBottom: 15,
  },
  timelineLeft: {
    width: 30,
    alignItems: 'center',
    marginRight: 15,
  },
  timelineDot: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 3,
    borderColor: medicalProviderTheme.colors.clinicalWhite,
    position: 'relative',
  },
  sensitivityRing: {
    position: 'absolute',
    top: -4,
    left: -4,
    right: -4,
    bottom: -4,
    borderRadius: 14,
    borderWidth: 2,
  },
  timelineLine: {
    width: 2,
    flex: 1,
    backgroundColor: medicalProviderTheme.colors.lightGray,
    marginTop: 8,
  },
  activityCard: {
    flex: 1,
    padding: 16,
  },
  activityHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  activityIcon: {
    fontSize: 28,
  },
  activityHeaderRight: {
    alignItems: 'flex-end',
  },
  activityTime: {
    color: medicalProviderTheme.colors.mediumGray,
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 6,
  },
  sensitivityBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  sensitivityText: {
    fontSize: 9,
    fontWeight: '700',
  },
  activityAction: {
    color: medicalProviderTheme.colors.deepTeal,
    fontSize: 17,
    fontWeight: '700',
    marginBottom: 10,
  },
  activityTarget: {
    flexDirection: 'row',
    marginBottom: 6,
  },
  activityTargetLabel: {
    color: medicalProviderTheme.colors.mediumGray,
    fontSize: 13,
    marginRight: 6,
  },
  activityTargetValue: {
    color: medicalProviderTheme.colors.accentTeal,
    fontSize: 13,
    fontWeight: '600',
  },
  activityMetadata: {
    backgroundColor: medicalProviderTheme.colors.lightGray,
    padding: 10,
    borderRadius: 8,
    marginBottom: 10,
  },
  metadataLabel: {
    color: medicalProviderTheme.colors.darkGray,
    fontSize: 11,
    fontWeight: '700',
    marginBottom: 6,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  metadataText: {
    color: medicalProviderTheme.colors.mediumGray,
    fontSize: 12,
    fontFamily: 'monospace',
    marginBottom: 2,
  },
  activityFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
  },
  categoryBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  categoryText: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  auditBadge: {
    backgroundColor: medicalProviderTheme.colors.warning + '30',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  auditText: {
    color: medicalProviderTheme.colors.warning,
    fontSize: 10,
    fontWeight: '700',
  },
  ipAddress: {
    color: medicalProviderTheme.colors.mediumGray,
    fontSize: 10,
    fontFamily: 'monospace',
    marginTop: 8,
  },
  errorContainer: {
    backgroundColor: medicalProviderTheme.colors.emergencyRed + '20',
    padding: 10,
    borderRadius: 8,
    marginTop: 10,
    borderLeftWidth: 3,
    borderLeftColor: medicalProviderTheme.colors.emergencyRed,
  },
  errorText: {
    color: medicalProviderTheme.colors.emergencyRed,
    fontSize: 12,
    fontWeight: '600',
  },
  emptyCard: {
    padding: 40,
    alignItems: 'center',
  },
  emptyText: {
    color: medicalProviderTheme.colors.darkGray,
    fontSize: 16,
  },
  loadingText: {
    color: medicalProviderTheme.colors.accentTeal,
    fontSize: 16,
    textAlign: 'center',
    marginTop: 20,
  },
  loadingMoreText: {
    color: medicalProviderTheme.colors.mediumGray,
    fontSize: 14,
    textAlign: 'center',
    marginVertical: 20,
  },
  endText: {
    color: medicalProviderTheme.colors.mediumGray,
    fontSize: 14,
    textAlign: 'center',
    marginVertical: 30,
    fontStyle: 'italic',
  },
});

export default MedicalProviderUserActivityTimelineScreen;

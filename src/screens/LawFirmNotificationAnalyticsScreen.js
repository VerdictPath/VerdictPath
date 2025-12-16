import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, RefreshControl, FlatList } from 'react-native';
import { theme } from '../styles/theme';
import { apiRequest, API_ENDPOINTS } from '../config/api';

const formatDate = (dateString) => {
  if (!dateString) return '-';
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
};

const getStatusColor = (status) => {
  switch (status) {
    case 'clicked': return '#9b59b6';
    case 'read': return '#3498db';
    case 'delivered': return '#27ae60';
    default: return '#95a5a6';
  }
};

const getStatusIcon = (status) => {
  switch (status) {
    case 'clicked': return '🖱';
    case 'read': return '👁';
    case 'delivered': return '✓';
    default: return '📤';
  }
};

const getTypeIcon = (type) => {
  switch (type) {
    case 'deadline_reminder': return '⏰';
    case 'task_reminder': return '📋';
    case 'task_assigned': return '📌';
    case 'document_request': return '📄';
    case 'appointment_reminder': return '📅';
    default: return '📢';
  }
};

const LawFirmNotificationAnalyticsScreen = ({ user, onBack }) => {
  const [analytics, setAnalytics] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [timeRange, setTimeRange] = useState('7days');
  const [clients, setClients] = useState([]);
  const [selectedClientId, setSelectedClientId] = useState(null);
  const [showClientPicker, setShowClientPicker] = useState(false);

  // Determine if this is a medical provider user
  const isMedicalProvider = user?.userType === 'medical_provider' || user?.type === 'medicalprovider';

  useEffect(() => {
    fetchClients();
  }, []);

  useEffect(() => {
    fetchAnalytics();
  }, [timeRange, selectedClientId]);

  const fetchClients = async () => {
    try {
      // Use appropriate endpoint based on user type
      const endpoint = isMedicalProvider 
        ? API_ENDPOINTS.MEDICALPROVIDER.PATIENTS 
        : API_ENDPOINTS.LAWFIRM.CLIENTS;
      
      const response = await apiRequest(endpoint, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${user.token}`,
        },
      });

      // Handle both response formats (clients for law firms, patients for medical providers)
      const clientList = response.clients || response.patients || [];
      setClients(clientList);
    } catch (error) {
      console.error('Error fetching clients/patients:', error);
    }
  };

  const fetchAnalytics = async () => {
    try {
      setIsLoading(true);
      let url = `${API_ENDPOINTS.NOTIFICATIONS.ANALYTICS}?timeRange=${timeRange}`;
      if (selectedClientId) {
        url += `&clientId=${selectedClientId}`;
      }
      
      const response = await apiRequest(url, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${user.token}`,
        },
      });

      if (response.success) {
        setAnalytics(response.analytics);
      }
    } catch (error) {
      console.error('Error fetching analytics:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchAnalytics();
    setRefreshing(false);
  };

  const calculatePercentage = (value, total) => {
    if (!total || total === 0) return 0;
    return Math.round((value / total) * 100);
  };

  if (isLoading && !analytics) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={onBack}>
            <Text style={styles.backButtonText}>← Back</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Analytics</Text>
          <View style={styles.placeholder} />
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <Text style={styles.loadingText}>Loading analytics...</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={onBack}>
          <Text style={styles.backButtonText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>📊 Analytics</Text>
        <View style={styles.placeholder} />
      </View>

      {/* Client Filter */}
      <View style={styles.filterContainer}>
        <Text style={styles.filterLabel}>Filter by {isMedicalProvider ? 'Patient' : 'Client'}:</Text>
        <TouchableOpacity
          style={styles.clientPickerButton}
          onPress={() => setShowClientPicker(!showClientPicker)}
        >
          <Text style={styles.clientPickerText}>
            {selectedClientId 
              ? (() => {
                  const selected = clients.find(c => c.id === selectedClientId);
                  if (!selected) return isMedicalProvider ? 'All Patients' : 'All Clients';
                  return selected.displayName || `${selected.firstName || selected.first_name || ''} ${selected.lastName || selected.last_name || ''}`.trim();
                })()
              : isMedicalProvider ? 'All Patients' : 'All Clients'}
          </Text>
          <Text style={styles.dropdownIcon}>{showClientPicker ? '▲' : '▼'}</Text>
        </TouchableOpacity>
        
        {showClientPicker && (
          <>
            <TouchableOpacity 
              style={styles.dropdownBackdrop} 
              activeOpacity={1}
              onPress={() => setShowClientPicker(false)}
            />
            <ScrollView style={styles.clientPickerDropdown} nestedScrollEnabled>
              <TouchableOpacity
                style={[styles.clientOption, !selectedClientId && styles.clientOptionSelected]}
                onPress={() => {
                  setSelectedClientId(null);
                  setShowClientPicker(false);
                }}
              >
                <Text style={[styles.clientOptionText, !selectedClientId && styles.clientOptionTextSelected]}>
                  {isMedicalProvider ? 'All Patients' : 'All Clients'}
                </Text>
              </TouchableOpacity>
              {clients.map(client => {
                const displayName = client.displayName || 
                  `${client.firstName || client.first_name || ''} ${client.lastName || client.last_name || ''}`.trim();
                return (
                  <TouchableOpacity
                    key={client.id}
                    style={[styles.clientOption, selectedClientId === client.id && styles.clientOptionSelected]}
                    onPress={() => {
                      setSelectedClientId(client.id);
                      setShowClientPicker(false);
                    }}
                  >
                    <Text style={[styles.clientOptionText, selectedClientId === client.id && styles.clientOptionTextSelected]}>
                      {displayName || 'Unknown'}
                    </Text>
                    {client.email && <Text style={styles.clientEmailText}>{client.email}</Text>}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </>
        )}
      </View>

      {/* Time Range Selector */}
      <View style={styles.timeRangeContainer}>
        <TouchableOpacity
          style={[styles.timeRangeButton, timeRange === '7days' && styles.timeRangeButtonActive]}
          onPress={() => setTimeRange('7days')}
        >
          <Text style={[styles.timeRangeText, timeRange === '7days' && styles.timeRangeTextActive]}>
            7 Days
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.timeRangeButton, timeRange === '30days' && styles.timeRangeButtonActive]}
          onPress={() => setTimeRange('30days')}
        >
          <Text style={[styles.timeRangeText, timeRange === '30days' && styles.timeRangeTextActive]}>
            30 Days
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.timeRangeButton, timeRange === '90days' && styles.timeRangeButtonActive]}
          onPress={() => setTimeRange('90days')}
        >
          <Text style={[styles.timeRangeText, timeRange === '90days' && styles.timeRangeTextActive]}>
            90 Days
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scrollContent}
        contentContainerStyle={styles.contentContainer}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            colors={[theme.colors.primary]}
          />
        }
      >
        {/* Overview Stats */}
        <View style={styles.overviewSection}>
          <Text style={styles.sectionTitle}>Overview</Text>
          <View style={styles.statsGrid}>
            <View style={styles.statCard}>
              <Text style={styles.statValue}>{analytics?.totalSent || 0}</Text>
              <Text style={styles.statLabel}>Total Sent</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={[styles.statValue, { color: '#9b59b6' }]}>
                {analytics?.totalClicked || 0}
              </Text>
              <Text style={styles.statLabel}>Clicked</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={[styles.statValue, { color: '#3498db' }]}>
                {analytics?.totalRead || 0}
              </Text>
              <Text style={styles.statLabel}>Read</Text>
            </View>
          </View>
        </View>

        {/* Engagement Rates */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Engagement Rates</Text>
          
          <View style={styles.rateCard}>
            <View style={styles.rateHeader}>
              <Text style={styles.rateLabel}>Click Rate</Text>
              <Text style={styles.ratePercentage}>
                {calculatePercentage(analytics?.totalClicked, analytics?.totalSent)}%
              </Text>
            </View>
            <View style={styles.progressBar}>
              <View
                style={[
                  styles.progressFill,
                  {
                    width: `${calculatePercentage(analytics?.totalClicked, analytics?.totalSent)}%`,
                    backgroundColor: '#9b59b6'
                  }
                ]}
              />
            </View>
          </View>

          <View style={styles.rateCard}>
            <View style={styles.rateHeader}>
              <Text style={styles.rateLabel}>Read Rate</Text>
              <Text style={styles.ratePercentage}>
                {calculatePercentage(analytics?.totalRead, analytics?.totalClicked)}%
              </Text>
            </View>
            <View style={styles.progressBar}>
              <View
                style={[
                  styles.progressFill,
                  {
                    width: `${calculatePercentage(analytics?.totalRead, analytics?.totalClicked)}%`,
                    backgroundColor: '#3498db'
                  }
                ]}
              />
            </View>
          </View>

          {/* Individual Notification Items */}
          {analytics?.recentNotifications && analytics.recentNotifications.length > 0 && (
            <View style={styles.notificationItemsSection}>
              <Text style={styles.itemsSectionTitle}>Individual Notifications</Text>
              <View style={styles.statusLegend}>
                <View style={styles.legendItem}>
                  <View style={[styles.legendDot, { backgroundColor: '#95a5a6' }]} />
                  <Text style={styles.legendText}>Sent</Text>
                </View>
                <View style={styles.legendItem}>
                  <View style={[styles.legendDot, { backgroundColor: '#9b59b6' }]} />
                  <Text style={styles.legendText}>Clicked</Text>
                </View>
                <View style={styles.legendItem}>
                  <View style={[styles.legendDot, { backgroundColor: '#3498db' }]} />
                  <Text style={styles.legendText}>Read</Text>
                </View>
              </View>
              
              {analytics.recentNotifications.map((notification) => (
                <View key={notification.id} style={styles.notificationItemCard}>
                  <View style={styles.notificationItemHeader}>
                    <View style={styles.notificationTypeIcon}>
                      <Text style={styles.notificationTypeEmoji}>{getTypeIcon(notification.type)}</Text>
                    </View>
                    <View style={styles.notificationItemInfo}>
                      <Text style={styles.notificationItemTitle} numberOfLines={1}>
                        {notification.title}
                      </Text>
                      <Text style={styles.notificationItemRecipient}>
                        To: {notification.recipientName}
                      </Text>
                    </View>
                    <View style={[styles.statusBadge, { backgroundColor: getStatusColor(notification.status) }]}>
                      <Text style={styles.statusBadgeText}>
                        {getStatusIcon(notification.status)} {notification.status.charAt(0).toUpperCase() + notification.status.slice(1)}
                      </Text>
                    </View>
                  </View>
                  
                  <View style={styles.notificationTimeline}>
                    <View style={styles.timelineItem}>
                      <View style={[styles.timelineDot, { backgroundColor: '#95a5a6' }]} />
                      <View style={styles.timelineContent}>
                        <Text style={styles.timelineLabel}>Sent</Text>
                        <Text style={styles.timelineTime}>{formatDate(notification.createdAt)}</Text>
                      </View>
                    </View>
                    <View style={[styles.timelineConnector, { backgroundColor: notification.clickedAt ? '#9b59b6' : '#e0e0e0' }]} />
                    <View style={styles.timelineItem}>
                      <View style={[styles.timelineDot, { backgroundColor: notification.clickedAt ? '#9b59b6' : '#e0e0e0' }]} />
                      <View style={styles.timelineContent}>
                        <Text style={[styles.timelineLabel, !notification.clickedAt && styles.timelineLabelInactive]}>Clicked</Text>
                        <Text style={[styles.timelineTime, !notification.clickedAt && styles.timelineTimeInactive]}>
                          {formatDate(notification.clickedAt)}
                        </Text>
                      </View>
                    </View>
                    <View style={[styles.timelineConnector, { backgroundColor: notification.readAt ? '#3498db' : '#e0e0e0' }]} />
                    <View style={styles.timelineItem}>
                      <View style={[styles.timelineDot, { backgroundColor: notification.readAt ? '#3498db' : '#e0e0e0' }]} />
                      <View style={styles.timelineContent}>
                        <Text style={[styles.timelineLabel, !notification.readAt && styles.timelineLabelInactive]}>Read</Text>
                        <Text style={[styles.timelineTime, !notification.readAt && styles.timelineTimeInactive]}>
                          {formatDate(notification.readAt)}
                        </Text>
                      </View>
                    </View>
                  </View>
                </View>
              ))}
            </View>
          )}
        </View>

        {/* By Type */}
        {analytics?.byType && analytics.byType.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>By Notification Type</Text>
            {analytics.byType.map((item, index) => (
              <View key={index} style={styles.typeCard}>
                <View style={styles.typeHeader}>
                  <Text style={styles.typeLabel}>
                    {item.notification_type === 'deadline_reminder' ? '⏰ Deadline' :
                     item.notification_type === 'task_reminder' ? '📋 Task' :
                     item.notification_type === 'document_request' ? '📄 Document' :
                     item.notification_type === 'appointment_reminder' ? '📅 Appointment' :
                     '📢 General'}
                  </Text>
                  <Text style={styles.typeCount}>{item.count} sent</Text>
                </View>
                <View style={styles.typeStats}>
                  <Text style={styles.typeStat}>
                    ✓ {item.delivered || 0} delivered
                  </Text>
                  <Text style={styles.typeStat}>
                    👁 {item.read || 0} read
                  </Text>
                  <Text style={styles.typeStat}>
                    🖱 {item.clicked || 0} clicked
                  </Text>
                </View>
              </View>
            ))}
          </View>
        )}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.lawFirm.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    paddingTop: 50,
    backgroundColor: theme.lawFirm.primary,
    borderBottomWidth: 2,
    borderBottomColor: theme.lawFirm.accent,
  },
  backButton: {
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  backButtonText: {
    fontSize: 16,
    color: theme.lawFirm.surface,
    fontWeight: '600',
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: theme.lawFirm.surface,
  },
  placeholder: {
    width: 60,
  },
  filterContainer: {
    backgroundColor: theme.lawFirm.surface,
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: theme.lawFirm.border,
    position: 'relative',
    zIndex: 1000,
  },
  filterLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.lawFirm.text,
    marginBottom: 8,
  },
  clientPickerButton: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: theme.lawFirm.surfaceAlt,
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: theme.lawFirm.border,
  },
  clientPickerText: {
    fontSize: 16,
    color: theme.lawFirm.text,
    fontWeight: '500',
  },
  dropdownIcon: {
    fontSize: 12,
    color: theme.lawFirm.textSecondary,
  },
  dropdownBackdrop: {
    position: 'absolute',
    top: 80,
    left: 0,
    right: 0,
    bottom: -1000,
    backgroundColor: 'rgba(0, 0, 0, 0.05)',
    zIndex: 1000,
  },
  clientPickerDropdown: {
    position: 'absolute',
    top: 80,
    left: 20,
    right: 20,
    backgroundColor: theme.lawFirm.surface,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: theme.lawFirm.accent,
    maxHeight: 300,
    shadowColor: theme.lawFirm.primaryDark,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 8,
    zIndex: 1001,
    opacity: 1,
  },
  clientOption: {
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: theme.lawFirm.border,
    backgroundColor: theme.lawFirm.surface,
  },
  clientOptionSelected: {
    backgroundColor: theme.lawFirm.surfaceAlt,
  },
  clientOptionText: {
    fontSize: 16,
    color: theme.lawFirm.text,
    fontWeight: '500',
  },
  clientOptionTextSelected: {
    color: theme.lawFirm.primary,
    fontWeight: '700',
  },
  clientEmailText: {
    fontSize: 13,
    color: theme.lawFirm.textSecondary,
    marginTop: 4,
  },
  timeRangeContainer: {
    flexDirection: 'row',
    backgroundColor: theme.lawFirm.surface,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: theme.lawFirm.border,
    gap: 10,
  },
  timeRangeButton: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
    backgroundColor: theme.lawFirm.surfaceAlt,
  },
  timeRangeButtonActive: {
    backgroundColor: theme.lawFirm.primary,
  },
  timeRangeText: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.lawFirm.textSecondary,
  },
  timeRangeTextActive: {
    color: theme.lawFirm.surface,
  },
  scrollContent: {
    flex: 1,
    backgroundColor: theme.lawFirm.background,
  },
  contentContainer: {
    padding: 20,
    paddingBottom: 40,
  },
  overviewSection: {
    marginBottom: 30,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: theme.lawFirm.primary,
    marginBottom: 16,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  statCard: {
    width: '48%',
    backgroundColor: theme.lawFirm.surface,
    borderRadius: 12,
    padding: 20,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: theme.lawFirm.border,
  },
  statValue: {
    fontSize: 32,
    fontWeight: 'bold',
    color: theme.lawFirm.primary,
    marginBottom: 8,
  },
  statLabel: {
    fontSize: 14,
    color: theme.lawFirm.textSecondary,
    textAlign: 'center',
  },
  section: {
    marginBottom: 30,
  },
  rateCard: {
    backgroundColor: theme.lawFirm.surface,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: theme.lawFirm.border,
  },
  rateHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  rateLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.lawFirm.text,
  },
  ratePercentage: {
    fontSize: 18,
    fontWeight: 'bold',
    color: theme.lawFirm.primary,
  },
  progressBar: {
    height: 8,
    backgroundColor: theme.lawFirm.surfaceAlt,
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 4,
  },
  typeCard: {
    backgroundColor: theme.lawFirm.surface,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: theme.lawFirm.border,
  },
  typeHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  typeLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.lawFirm.text,
  },
  typeCount: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.lawFirm.primary,
  },
  typeStats: {
    flexDirection: 'row',
    gap: 16,
  },
  typeStat: {
    fontSize: 13,
    color: theme.lawFirm.textSecondary,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: theme.lawFirm.background,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: theme.lawFirm.textSecondary,
  },
  notificationItemsSection: {
    marginTop: 24,
  },
  itemsSectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: theme.lawFirm.text,
    marginBottom: 12,
  },
  statusLegend: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
    marginBottom: 16,
    padding: 12,
    backgroundColor: theme.lawFirm.surfaceAlt,
    borderRadius: 8,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  legendDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  legendText: {
    fontSize: 12,
    color: theme.lawFirm.textSecondary,
  },
  notificationItemCard: {
    backgroundColor: theme.lawFirm.surface,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: theme.lawFirm.border,
  },
  notificationItemHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  notificationTypeIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: theme.lawFirm.surfaceAlt,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  notificationTypeEmoji: {
    fontSize: 20,
  },
  notificationItemInfo: {
    flex: 1,
  },
  notificationItemTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.lawFirm.text,
    marginBottom: 2,
  },
  notificationItemRecipient: {
    fontSize: 12,
    color: theme.lawFirm.textSecondary,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusBadgeText: {
    color: theme.lawFirm.surface,
    fontSize: 11,
    fontWeight: '600',
  },
  notificationTimeline: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: theme.lawFirm.border,
  },
  timelineItem: {
    alignItems: 'center',
    flex: 1,
  },
  timelineDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginBottom: 4,
  },
  timelineContent: {
    alignItems: 'center',
  },
  timelineLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: theme.lawFirm.text,
    marginBottom: 2,
  },
  timelineLabelInactive: {
    color: theme.lawFirm.border,
  },
  timelineTime: {
    fontSize: 9,
    color: theme.lawFirm.textSecondary,
    textAlign: 'center',
  },
  timelineTimeInactive: {
    color: theme.lawFirm.border,
  },
  timelineConnector: {
    height: 2,
    flex: 0.5,
    marginBottom: 20,
  },
});

export default LawFirmNotificationAnalyticsScreen;

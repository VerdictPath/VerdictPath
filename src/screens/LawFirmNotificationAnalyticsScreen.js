import React, { useState, useEffect, useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, RefreshControl, FlatList, TextInput } from 'react-native';
import { theme } from '../styles/theme';
import { medicalProviderTheme } from '../styles/medicalProviderTheme';
import { apiRequest, API_ENDPOINTS } from '../config/api';

const getThemeForUserType = (isMedicalProvider) => {
  if (isMedicalProvider) {
    return {
      primary: medicalProviderTheme.colors.primary,
      primaryDark: medicalProviderTheme.colors.primaryDark,
      background: medicalProviderTheme.colors.background,
      surface: '#FFFFFF',
      surfaceAlt: medicalProviderTheme.colors.background,
      text: medicalProviderTheme.colors.textPrimary,
      textSecondary: medicalProviderTheme.colors.textSecondary,
      border: '#E2E8F0',
      accent: medicalProviderTheme.colors.primaryLight,
      headerBg: medicalProviderTheme.colors.primary,
      headerText: '#FFFFFF',
      backButtonText: '#A8A8A8',
      activeText: '#FFFFFF',
    };
  }
  return {
    primary: theme.lawFirm.primary,
    primaryDark: theme.lawFirm.primaryDark,
    background: theme.lawFirm.background,
    surface: theme.lawFirm.surface,
    surfaceAlt: theme.lawFirm.surfaceAlt,
    text: theme.lawFirm.text,
    textSecondary: theme.lawFirm.textSecondary,
    border: theme.lawFirm.border,
    accent: theme.lawFirm.accent,
    headerBg: theme.lawFirm.primary,
    headerText: '#FFFFFF',
    backButtonText: '#C0C0C0',
    activeText: '#FFFFFF',
  };
};

const formatDate = (dateString) => {
  if (!dateString) return '-';
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
};

const getNotificationStatusColor = (status) => {
  switch (status) {
    case 'responded': return '#27ae60';
    case 'read': return '#3498db';
    case 'delivered': return '#95a5a6';
    default: return '#bdc3c7';
  }
};

const getNotificationStatusIcon = (status) => {
  switch (status) {
    case 'responded': return '💬';
    case 'read': return '👁';
    case 'delivered': return '✓';
    default: return '📤';
  }
};

const getTaskStatusColor = (status) => {
  switch (status) {
    case 'completed': return '#27ae60';
    case 'in_progress': return '#3498db';
    case 'pending': return '#e67e22';
    case 'cancelled': return '#95a5a6';
    default: return '#bdc3c7';
  }
};

const getTaskStatusIcon = (status) => {
  switch (status) {
    case 'completed': return '✅';
    case 'in_progress': return '🔄';
    case 'pending': return '⏳';
    case 'cancelled': return '❌';
    default: return '📋';
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

const getPriorityConfig = (priority) => {
  switch (priority) {
    case 'urgent': return { color: '#e74c3c', label: 'Urgent' };
    case 'high': return { color: '#e67e22', label: 'High' };
    case 'medium': return { color: '#3498db', label: 'Medium' };
    case 'low': return { color: '#95a5a6', label: 'Low' };
    default: return { color: '#bdc3c7', label: 'Normal' };
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
  const [clientSearchQuery, setClientSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState('notifications');

  // Determine if this is a medical provider user
  const isMedicalProvider = user?.userType === 'medical_provider' || user?.type === 'medicalprovider';
  
  // Get theme colors based on user type
  const themeColors = useMemo(() => getThemeForUserType(isMedicalProvider), [isMedicalProvider]);
  const styles = useMemo(() => createStyles(themeColors), [themeColors]);

  const filteredClients = useMemo(() => {
    if (!clientSearchQuery.trim()) return clients;
    const query = clientSearchQuery.toLowerCase().trim();
    return clients.filter(client => {
      const displayName = (client.displayName || 
        `${client.firstName || client.first_name || ''} ${client.lastName || client.last_name || ''}`.trim()).toLowerCase();
      const email = (client.email || '').toLowerCase();
      return displayName.includes(query) || email.includes(query);
    });
  }, [clients, clientSearchQuery]);

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
          <Text style={styles.headerTitle}>{isMedicalProvider ? 'Patient Tracking' : 'Client Tracking'}</Text>
          <View style={styles.placeholder} />
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={themeColors.primary} />
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
        <Text style={styles.headerTitle}>📊 {isMedicalProvider ? 'Patient Tracking' : 'Client Tracking'}</Text>
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
            <View style={styles.clientPickerDropdown}>
              <View style={styles.searchInputContainer}>
                <Text style={styles.searchIcon}>🔍</Text>
                <TextInput
                  style={styles.searchInput}
                  placeholder={isMedicalProvider ? "Search patients..." : "Search clients..."}
                  placeholderTextColor="#999"
                  value={clientSearchQuery}
                  onChangeText={setClientSearchQuery}
                  autoCapitalize="none"
                  autoCorrect={false}
                />
                {clientSearchQuery.length > 0 && (
                  <TouchableOpacity onPress={() => setClientSearchQuery('')} style={styles.clearSearchButton}>
                    <Text style={styles.clearSearchText}>✕</Text>
                  </TouchableOpacity>
                )}
              </View>
              <ScrollView style={styles.clientListScroll} nestedScrollEnabled>
              <TouchableOpacity
                style={[styles.clientOption, !selectedClientId && styles.clientOptionSelected]}
                onPress={() => {
                  setSelectedClientId(null);
                  setShowClientPicker(false);
                  setClientSearchQuery('');
                }}
              >
                <Text style={[styles.clientOptionText, !selectedClientId && styles.clientOptionTextSelected]}>
                  {isMedicalProvider ? 'All Patients' : 'All Clients'}
                </Text>
              </TouchableOpacity>
              {filteredClients.map(client => {
                const displayName = client.displayName || 
                  `${client.firstName || client.first_name || ''} ${client.lastName || client.last_name || ''}`.trim();
                return (
                  <TouchableOpacity
                    key={client.id}
                    style={[styles.clientOption, selectedClientId === client.id && styles.clientOptionSelected]}
                    onPress={() => {
                      setSelectedClientId(client.id);
                      setShowClientPicker(false);
                      setClientSearchQuery('');
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
            </View>
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

      {/* Tab Selector */}
      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[styles.tabButton, activeTab === 'notifications' && styles.tabButtonActive]}
          onPress={() => setActiveTab('notifications')}
        >
          <Text style={[styles.tabButtonText, activeTab === 'notifications' && styles.tabButtonTextActive]}>
            📨 Notifications
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tabButton, activeTab === 'tasks' && styles.tabButtonActive]}
          onPress={() => setActiveTab('tasks')}
        >
          <Text style={[styles.tabButtonText, activeTab === 'tasks' && styles.tabButtonTextActive]}>
            📋 Tasks
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
            colors={[themeColors.primary]}
          />
        }
      >
        {activeTab === 'notifications' ? (
          <>
            {/* Notification Overview Stats */}
            <View style={styles.overviewSection}>
              <Text style={styles.sectionTitle}>Notification Overview</Text>
              <View style={styles.statsGrid}>
                <View style={styles.statCard}>
                  <Text style={styles.statValue}>{analytics?.totalSent || 0}</Text>
                  <Text style={styles.statLabel}>Total Sent</Text>
                </View>
                <View style={styles.statCard}>
                  <Text style={[styles.statValue, { color: '#3498db' }]}>
                    {analytics?.totalRead || 0}
                  </Text>
                  <Text style={styles.statLabel}>Read</Text>
                </View>
                <View style={styles.statCard}>
                  <Text style={[styles.statValue, { color: '#27ae60' }]}>
                    {analytics?.totalResponded || 0}
                  </Text>
                  <Text style={styles.statLabel}>Responded</Text>
                </View>
              </View>
            </View>

            {/* Notification Engagement Rates */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Engagement Rates</Text>
              
              <View style={styles.rateCard}>
                <View style={styles.rateHeader}>
                  <Text style={styles.rateLabel}>Read Rate</Text>
                  <Text style={styles.ratePercentage}>
                    {analytics?.readRate || 0}%
                  </Text>
                </View>
                <View style={styles.progressBar}>
                  <View
                    style={[
                      styles.progressFill,
                      {
                        width: `${analytics?.readRate || 0}%`,
                        backgroundColor: '#3498db'
                      }
                    ]}
                  />
                </View>
              </View>

              <View style={styles.rateCard}>
                <View style={styles.rateHeader}>
                  <Text style={styles.rateLabel}>Response Rate</Text>
                  <Text style={styles.ratePercentage}>
                    {analytics?.respondedRate || 0}%
                  </Text>
                </View>
                <View style={styles.progressBar}>
                  <View
                    style={[
                      styles.progressFill,
                      {
                        width: `${analytics?.respondedRate || 0}%`,
                        backgroundColor: '#27ae60'
                      }
                    ]}
                  />
                </View>
              </View>
            </View>

            {/* Recent Notifications */}
            {analytics?.recentNotifications && analytics.recentNotifications.length > 0 && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Recent Notifications</Text>
                <View style={styles.statusLegend}>
                  <View style={styles.legendItem}>
                    <View style={[styles.legendDot, { backgroundColor: '#bdc3c7' }]} />
                    <Text style={styles.legendText}>Sent</Text>
                  </View>
                  <View style={styles.legendItem}>
                    <View style={[styles.legendDot, { backgroundColor: '#3498db' }]} />
                    <Text style={styles.legendText}>Read</Text>
                  </View>
                  <View style={styles.legendItem}>
                    <View style={[styles.legendDot, { backgroundColor: '#27ae60' }]} />
                    <Text style={styles.legendText}>Responded</Text>
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
                      <View style={[styles.statusBadge, { backgroundColor: getNotificationStatusColor(notification.status) }]}>
                        <Text style={styles.statusBadgeText}>
                          {getNotificationStatusIcon(notification.status)} {notification.status.charAt(0).toUpperCase() + notification.status.slice(1)}
                        </Text>
                      </View>
                    </View>
                    
                    <View style={styles.notificationTimeline}>
                      <View style={styles.timelineItem}>
                        <View style={[styles.timelineDot, { backgroundColor: '#bdc3c7' }]} />
                        <View style={styles.timelineContent}>
                          <Text style={styles.timelineLabel}>Sent</Text>
                          <Text style={styles.timelineTime}>{formatDate(notification.createdAt)}</Text>
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
                      <View style={[styles.timelineConnector, { backgroundColor: notification.respondedAt ? '#27ae60' : '#e0e0e0' }]} />
                      <View style={styles.timelineItem}>
                        <View style={[styles.timelineDot, { backgroundColor: notification.respondedAt ? '#27ae60' : '#e0e0e0' }]} />
                        <View style={styles.timelineContent}>
                          <Text style={[styles.timelineLabel, !notification.respondedAt && styles.timelineLabelInactive]}>Responded</Text>
                          <Text style={[styles.timelineTime, !notification.respondedAt && styles.timelineTimeInactive]}>
                            {formatDate(notification.respondedAt)}
                          </Text>
                        </View>
                      </View>
                    </View>
                  </View>
                ))}
              </View>
            )}

            {(!analytics?.recentNotifications || analytics.recentNotifications.length === 0) && (
              <View style={styles.emptySection}>
                <Text style={styles.emptyIcon}>📨</Text>
                <Text style={styles.emptyTitle}>No Notifications Yet</Text>
                <Text style={styles.emptyText}>Notifications you send to {isMedicalProvider ? 'patients' : 'clients'} will appear here with tracking info.</Text>
              </View>
            )}
          </>
        ) : (
          <>
            {/* Task Overview Stats */}
            <View style={styles.overviewSection}>
              <Text style={styles.sectionTitle}>Task Overview</Text>
              <View style={styles.statsGrid}>
                <View style={styles.statCard}>
                  <Text style={styles.statValue}>{analytics?.taskAnalytics?.totalTasks || 0}</Text>
                  <Text style={styles.statLabel}>Total Assigned</Text>
                </View>
                <View style={styles.statCard}>
                  <Text style={[styles.statValue, { color: '#27ae60' }]}>
                    {analytics?.taskAnalytics?.totalCompleted || 0}
                  </Text>
                  <Text style={styles.statLabel}>Completed</Text>
                </View>
                <View style={styles.statCard}>
                  <Text style={[styles.statValue, { color: '#e67e22' }]}>
                    {analytics?.taskAnalytics?.totalPending || 0}
                  </Text>
                  <Text style={styles.statLabel}>Pending</Text>
                </View>
              </View>
              {(analytics?.taskAnalytics?.totalOverdue || 0) > 0 && (
                <View style={styles.overdueAlert}>
                  <Text style={styles.overdueAlertText}>
                    ⚠️ {analytics.taskAnalytics.totalOverdue} overdue task{analytics.taskAnalytics.totalOverdue !== 1 ? 's' : ''}
                  </Text>
                </View>
              )}
            </View>

            {/* Task Completion Rate */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Completion Rate</Text>
              <View style={styles.rateCard}>
                <View style={styles.rateHeader}>
                  <Text style={styles.rateLabel}>Tasks Completed</Text>
                  <Text style={styles.ratePercentage}>
                    {analytics?.taskAnalytics?.completionRate || 0}%
                  </Text>
                </View>
                <View style={styles.progressBar}>
                  <View
                    style={[
                      styles.progressFill,
                      {
                        width: `${analytics?.taskAnalytics?.completionRate || 0}%`,
                        backgroundColor: '#27ae60'
                      }
                    ]}
                  />
                </View>
              </View>

              <View style={styles.taskStatusBreakdown}>
                <View style={styles.taskStatusItem}>
                  <View style={[styles.taskStatusDot, { backgroundColor: '#e67e22' }]} />
                  <Text style={styles.taskStatusLabel}>Pending</Text>
                  <Text style={styles.taskStatusCount}>{analytics?.taskAnalytics?.totalPending || 0}</Text>
                </View>
                <View style={styles.taskStatusItem}>
                  <View style={[styles.taskStatusDot, { backgroundColor: '#3498db' }]} />
                  <Text style={styles.taskStatusLabel}>In Progress</Text>
                  <Text style={styles.taskStatusCount}>{analytics?.taskAnalytics?.totalInProgress || 0}</Text>
                </View>
                <View style={styles.taskStatusItem}>
                  <View style={[styles.taskStatusDot, { backgroundColor: '#27ae60' }]} />
                  <Text style={styles.taskStatusLabel}>Completed</Text>
                  <Text style={styles.taskStatusCount}>{analytics?.taskAnalytics?.totalCompleted || 0}</Text>
                </View>
                <View style={styles.taskStatusItem}>
                  <View style={[styles.taskStatusDot, { backgroundColor: '#95a5a6' }]} />
                  <Text style={styles.taskStatusLabel}>Cancelled</Text>
                  <Text style={styles.taskStatusCount}>{analytics?.taskAnalytics?.totalCancelled || 0}</Text>
                </View>
              </View>
            </View>

            {/* Recent Tasks */}
            {analytics?.recentTasks && analytics.recentTasks.length > 0 && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Recent Tasks</Text>
                {analytics.recentTasks.map((task) => {
                  const priorityConfig = getPriorityConfig(task.priority);
                  const isOverdue = task.status !== 'completed' && task.status !== 'cancelled' && task.dueDate && new Date(task.dueDate) < new Date();
                  return (
                    <View key={task.id} style={[styles.taskItemCard, isOverdue && styles.taskItemOverdue]}>
                      <View style={styles.taskItemHeader}>
                        <View style={styles.taskItemLeft}>
                          <Text style={styles.taskItemIcon}>{getTaskStatusIcon(task.status)}</Text>
                          <View style={styles.taskItemInfo}>
                            <Text style={styles.taskItemTitle} numberOfLines={1}>{task.title}</Text>
                            <Text style={styles.taskItemRecipient}>Assigned to: {task.recipientName}</Text>
                          </View>
                        </View>
                        <View style={[styles.statusBadge, { backgroundColor: getTaskStatusColor(task.status) }]}>
                          <Text style={styles.statusBadgeText}>
                            {task.status === 'in_progress' ? 'In Progress' : task.status.charAt(0).toUpperCase() + task.status.slice(1)}
                          </Text>
                        </View>
                      </View>
                      <View style={styles.taskItemMeta}>
                        <View style={[styles.priorityBadge, { borderColor: priorityConfig.color }]}>
                          <Text style={[styles.priorityBadgeText, { color: priorityConfig.color }]}>{priorityConfig.label}</Text>
                        </View>
                        {task.dueDate && (
                          <Text style={[styles.taskDueDate, isOverdue && styles.taskDueDateOverdue]}>
                            {isOverdue ? '⚠️ ' : '📅 '}Due: {new Date(task.dueDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                          </Text>
                        )}
                        <Text style={styles.taskCreatedDate}>
                          Created: {formatDate(task.createdAt)}
                        </Text>
                      </View>
                      {task.completedAt && (
                        <Text style={styles.taskCompletedDate}>Completed: {formatDate(task.completedAt)}</Text>
                      )}
                    </View>
                  );
                })}
              </View>
            )}

            {(!analytics?.recentTasks || analytics.recentTasks.length === 0) && (
              <View style={styles.emptySection}>
                <Text style={styles.emptyIcon}>📋</Text>
                <Text style={styles.emptyTitle}>No Tasks Yet</Text>
                <Text style={styles.emptyText}>Tasks you assign to {isMedicalProvider ? 'patients' : 'clients'} will appear here with completion tracking.</Text>
              </View>
            )}
          </>
        )}
      </ScrollView>
    </View>
  );
};

const createStyles = (colors) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    paddingTop: 50,
    backgroundColor: colors.headerBg,
    borderBottomWidth: 2,
    borderBottomColor: colors.primary,
  },
  backButton: {
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  backButtonText: {
    fontSize: 16,
    color: colors.backButtonText,
    fontWeight: '600',
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: colors.headerText,
  },
  placeholder: {
    width: 60,
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    paddingHorizontal: 16,
    paddingVertical: 8,
    gap: 8,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  tabButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
    backgroundColor: colors.surfaceAlt,
    borderWidth: 1,
    borderColor: colors.border,
  },
  tabButtonActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  tabButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  tabButtonTextActive: {
    color: colors.activeText,
  },
  filterContainer: {
    backgroundColor: colors.surface,
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    position: 'relative',
    zIndex: 1000,
  },
  filterLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 8,
  },
  clientPickerButton: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: colors.surfaceAlt,
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: colors.border,
  },
  clientPickerText: {
    fontSize: 16,
    color: colors.text,
    fontWeight: '500',
  },
  dropdownIcon: {
    fontSize: 12,
    color: colors.textSecondary,
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
    backgroundColor: colors.surface,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: colors.accent,
    maxHeight: 300,
    shadowColor: colors.primaryDark,
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
    borderBottomColor: colors.border,
    backgroundColor: colors.surface,
  },
  clientOptionSelected: {
    backgroundColor: colors.surfaceAlt,
  },
  clientOptionText: {
    fontSize: 16,
    color: colors.text,
    fontWeight: '500',
  },
  clientOptionTextSelected: {
    color: colors.primary,
    fontWeight: '700',
  },
  clientEmailText: {
    fontSize: 13,
    color: colors.textSecondary,
    marginTop: 4,
  },
  searchInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    backgroundColor: colors.surfaceAlt,
  },
  searchIcon: {
    fontSize: 16,
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: colors.text,
    paddingVertical: 6,
  },
  clearSearchButton: {
    padding: 4,
  },
  clearSearchText: {
    fontSize: 16,
    color: colors.textSecondary,
  },
  clientListScroll: {
    maxHeight: 240,
  },
  timeRangeContainer: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    gap: 10,
  },
  timeRangeButton: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
    backgroundColor: colors.surfaceAlt,
  },
  timeRangeButtonActive: {
    backgroundColor: colors.primary,
  },
  timeRangeText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  timeRangeTextActive: {
    color: colors.activeText,
  },
  scrollContent: {
    flex: 1,
    backgroundColor: colors.background,
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
    color: colors.primary,
    marginBottom: 16,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  statCard: {
    width: '48%',
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: 20,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  statValue: {
    fontSize: 32,
    fontWeight: 'bold',
    color: colors.primary,
    marginBottom: 8,
  },
  statLabel: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  section: {
    marginBottom: 30,
  },
  rateCard: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.border,
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
    color: colors.text,
  },
  ratePercentage: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.primary,
  },
  progressBar: {
    height: 8,
    backgroundColor: colors.surfaceAlt,
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 4,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: colors.textSecondary,
  },
  notificationItemsSection: {
    marginTop: 24,
  },
  itemsSectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 12,
  },
  statusLegend: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
    marginBottom: 16,
    padding: 12,
    backgroundColor: colors.surfaceAlt,
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
    color: colors.textSecondary,
  },
  notificationItemCard: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.border,
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
    backgroundColor: colors.surfaceAlt,
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
    color: colors.text,
    marginBottom: 2,
  },
  notificationItemRecipient: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusBadgeText: {
    color: colors.surface,
    fontSize: 11,
    fontWeight: '600',
  },
  notificationTimeline: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: colors.border,
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
    color: colors.text,
    marginBottom: 2,
  },
  timelineLabelInactive: {
    color: colors.border,
  },
  timelineTime: {
    fontSize: 9,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  timelineTimeInactive: {
    color: colors.border,
  },
  timelineConnector: {
    height: 2,
    flex: 0.5,
    marginBottom: 20,
  },
  emptySection: {
    alignItems: 'center',
    paddingVertical: 40,
    paddingHorizontal: 20,
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: 12,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
  },
  overdueAlert: {
    backgroundColor: '#FEF2F2',
    borderRadius: 8,
    padding: 10,
    marginTop: 10,
    borderWidth: 1,
    borderColor: '#FECACA',
    alignItems: 'center',
  },
  overdueAlertText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#DC2626',
  },
  taskStatusBreakdown: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 12,
  },
  taskStatusItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.surfaceAlt,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
  },
  taskStatusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  taskStatusLabel: {
    fontSize: 13,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  taskStatusCount: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.text,
  },
  taskItemCard: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: colors.border,
  },
  taskItemOverdue: {
    borderColor: '#FECACA',
    backgroundColor: '#FFFBFB',
  },
  taskItemHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  taskItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 10,
  },
  taskItemIcon: {
    fontSize: 20,
  },
  taskItemInfo: {
    flex: 1,
  },
  taskItemTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
  },
  taskItemRecipient: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 2,
  },
  taskItemMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 10,
    flexWrap: 'wrap',
  },
  priorityBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
  },
  priorityBadgeText: {
    fontSize: 11,
    fontWeight: '600',
  },
  taskDueDate: {
    fontSize: 12,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  taskDueDateOverdue: {
    color: '#DC2626',
    fontWeight: '600',
  },
  taskCreatedDate: {
    fontSize: 11,
    color: colors.textSecondary,
  },
  taskCompletedDate: {
    fontSize: 11,
    color: '#27ae60',
    fontWeight: '500',
    marginTop: 6,
  },
});

export default LawFirmNotificationAnalyticsScreen;

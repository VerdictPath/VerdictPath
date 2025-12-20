import React, { useState, useEffect, useRef, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, RefreshControl, ActivityIndicator, ImageBackground, Platform, TextInput } from 'react-native';
import { theme } from '../styles/theme';
import { medicalProviderTheme } from '../styles/medicalProviderTheme';
import { useNotifications } from '../contexts/NotificationContext';

const pirateShipBackground = require('../../assets/images/pirate-notification-ship.png');

const getMedicalProviderStyles = () => ({
  container: {
    flex: 1,
    backgroundColor: medicalProviderTheme.colors.background,
  },
  overlay: {
    flex: 1,
    backgroundColor: medicalProviderTheme.colors.background,
  },
  contentContainer: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    paddingTop: Platform.OS === 'ios' ? 50 : 16,
    backgroundColor: medicalProviderTheme.colors.primary,
    borderBottomWidth: 1,
    borderBottomColor: medicalProviderTheme.colors.primaryDark,
  },
  backButton: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  backButtonText: {
    fontSize: 16,
    color: '#FFFFFF',
    fontWeight: '600',
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  placeholder: {
    width: 60,
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: '#F5F5F5',
    borderBottomWidth: 1,
    borderBottomColor: '#D0D0D0',
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderBottomWidth: 3,
    borderBottomColor: 'transparent',
    backgroundColor: '#F5F5F5',
  },
  activeTab: {
    borderBottomColor: medicalProviderTheme.colors.primary,
    backgroundColor: '#E0F2F1',
  },
  tabText: {
    fontSize: 16,
    color: '#1F2937',
    fontWeight: '700',
  },
  activeTabText: {
    color: medicalProviderTheme.colors.primary,
    fontWeight: '700',
  },
  tabBadge: {
    backgroundColor: '#dc3545',
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 2,
    marginLeft: 8,
    minWidth: 24,
    alignItems: 'center',
  },
  tabBadgeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: medicalProviderTheme.colors.cardBackground,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: medicalProviderTheme.colors.backgroundDark,
  },
  searchInput: {
    flex: 1,
    backgroundColor: medicalProviderTheme.colors.offWhite,
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
    color: medicalProviderTheme.colors.textPrimary,
    fontSize: 14,
    borderWidth: 1,
    borderColor: medicalProviderTheme.colors.backgroundDark,
  },
  clearSearchButton: {
    marginLeft: 10,
    padding: 8,
  },
  clearSearchText: {
    color: medicalProviderTheme.colors.primary,
    fontSize: 16,
  },
  filterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: medicalProviderTheme.colors.cardBackground,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: medicalProviderTheme.colors.backgroundDark,
  },
  typeDropdownButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: medicalProviderTheme.colors.offWhite,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: medicalProviderTheme.colors.primary,
  },
  typeDropdownText: {
    color: medicalProviderTheme.colors.primary,
    fontSize: 14,
    fontWeight: '500',
  },
  typeDropdownArrow: {
    marginLeft: 6,
    color: medicalProviderTheme.colors.primary,
    fontSize: 12,
  },
  dropdownMenu: {
    position: 'absolute',
    top: 50,
    left: 16,
    right: 16,
    backgroundColor: medicalProviderTheme.colors.cardBackground,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: medicalProviderTheme.colors.backgroundDark,
    maxHeight: 300,
    zIndex: 1000,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
  },
  dropdownItem: {
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: medicalProviderTheme.colors.backgroundDark,
  },
  dropdownItemActive: {
    backgroundColor: medicalProviderTheme.colors.offWhite,
  },
  dropdownItemText: {
    fontSize: 14,
    color: medicalProviderTheme.colors.textPrimary,
  },
  dropdownItemTextActive: {
    color: medicalProviderTheme.colors.primary,
    fontWeight: '600',
  },
  listContent: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 80,
  },
  notificationCard: {
    backgroundColor: medicalProviderTheme.colors.cardBackground,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: medicalProviderTheme.colors.backgroundDark,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  unreadCard: {
    backgroundColor: medicalProviderTheme.colors.offWhite,
    borderColor: medicalProviderTheme.colors.primary,
    borderWidth: 1,
  },
  urgentCard: {
    backgroundColor: '#FEF2F2',
    borderColor: '#dc3545',
    borderWidth: 2,
  },
  urgentBanner: {
    backgroundColor: '#dc3545',
    paddingVertical: 4,
    paddingHorizontal: 12,
  },
  urgentBannerText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: 'bold',
  },
  notificationRow: {
    flexDirection: 'row',
    padding: 16,
  },
  typeIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: medicalProviderTheme.colors.offWhite,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  typeIcon: {
    fontSize: 20,
  },
  notificationContent: {
    flex: 1,
  },
  notificationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  notificationTitle: {
    flex: 1,
    fontSize: 16,
    fontWeight: '500',
    color: medicalProviderTheme.colors.textPrimary,
  },
  unreadTitle: {
    fontWeight: '700',
  },
  urgentTitle: {
    color: '#dc3545',
  },
  unreadBadge: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: medicalProviderTheme.colors.primary,
    marginLeft: 8,
  },
  senderName: {
    fontSize: 13,
    color: medicalProviderTheme.colors.textSecondary,
    marginBottom: 4,
  },
  notificationBody: {
    fontSize: 14,
    color: medicalProviderTheme.colors.textSecondary,
    lineHeight: 20,
    marginBottom: 8,
  },
  notificationFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  notificationTime: {
    fontSize: 12,
    color: medicalProviderTheme.colors.textMuted,
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  clickedLabel: {
    fontSize: 12,
    color: medicalProviderTheme.colors.healthy,
    fontWeight: '500',
  },
  readLabel: {
    fontSize: 12,
    color: medicalProviderTheme.colors.textMuted,
  },
  markAllReadButton: {
    backgroundColor: medicalProviderTheme.colors.primary,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
  },
  markAllReadText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyIcon: {
    fontSize: 64,
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: medicalProviderTheme.colors.textPrimary,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    color: medicalProviderTheme.colors.textSecondary,
    textAlign: 'center',
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: medicalProviderTheme.colors.textSecondary,
  },
  autoRefreshIndicator: {
    position: 'absolute',
    bottom: 20,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  autoRefreshText: {
    fontSize: 12,
    color: medicalProviderTheme.colors.textMuted,
    backgroundColor: medicalProviderTheme.colors.cardBackground,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  dropdownArrow: {
    color: medicalProviderTheme.colors.textSecondary,
    marginLeft: 8,
    fontSize: 10,
  },
  typeDropdownMenu: {
    backgroundColor: medicalProviderTheme.colors.cardBackground,
    marginHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: medicalProviderTheme.colors.backgroundDark,
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  typeDropdownItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: medicalProviderTheme.colors.backgroundDark,
  },
  activeTypeDropdownItem: {
    backgroundColor: medicalProviderTheme.colors.offWhite,
  },
  typeDropdownItemText: {
    color: medicalProviderTheme.colors.textPrimary,
    fontSize: 14,
  },
  checkmark: {
    color: medicalProviderTheme.colors.primary,
    fontWeight: 'bold',
  },
  readFilterContainer: {
    flexDirection: 'row',
    marginLeft: 'auto',
  },
  readFilterButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    marginLeft: 6,
    backgroundColor: medicalProviderTheme.colors.offWhite,
  },
  activeReadFilter: {
    backgroundColor: medicalProviderTheme.colors.primary + '30',
  },
  readFilterText: {
    color: '#000000',
    fontSize: 13,
    fontWeight: '600',
  },
  activeReadFilterText: {
    color: medicalProviderTheme.colors.primary,
    fontWeight: '600',
  },
  actionButtonContainer: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
    backgroundColor: medicalProviderTheme.colors.cardBackground,
    borderBottomWidth: 1,
    borderBottomColor: medicalProviderTheme.colors.backgroundDark,
  },
  sendNotificationButton: {
    backgroundColor: medicalProviderTheme.colors.primary,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
  },
  sendNotificationText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
});

const getLawFirmStyles = () => ({
  container: {
    flex: 1,
    backgroundColor: theme.lawFirm.background,
  },
  overlay: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  contentContainer: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    paddingTop: Platform.OS === 'ios' ? 50 : 16,
    backgroundColor: theme.lawFirm.primary,
    borderBottomWidth: 1,
    borderBottomColor: theme.lawFirm.primaryDark,
  },
  backButton: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  backButtonText: {
    fontSize: 16,
    color: '#FFFFFF',
    fontWeight: '600',
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: theme.lawFirm.surface,
    borderBottomWidth: 1,
    borderBottomColor: theme.lawFirm.border,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderBottomWidth: 3,
    borderBottomColor: 'transparent',
  },
  activeTab: {
    borderBottomColor: theme.lawFirm.primary,
    backgroundColor: theme.lawFirm.surfaceAlt,
  },
  tabText: {
    fontSize: 16,
    color: theme.lawFirm.textSecondary,
    fontWeight: '500',
  },
  activeTabText: {
    color: theme.lawFirm.primary,
    fontWeight: '700',
  },
  tabBadge: {
    backgroundColor: '#dc3545',
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 2,
    marginLeft: 8,
    minWidth: 24,
    alignItems: 'center',
  },
  tabBadgeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.lawFirm.surface,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: theme.lawFirm.border,
  },
  searchInput: {
    flex: 1,
    backgroundColor: theme.lawFirm.surfaceAlt,
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
    color: theme.lawFirm.text,
    fontSize: 14,
    borderWidth: 1,
    borderColor: theme.lawFirm.border,
  },
  clearSearchButton: {
    marginLeft: 10,
    padding: 8,
  },
  clearSearchText: {
    color: theme.lawFirm.primary,
    fontSize: 16,
  },
  filterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.lawFirm.surface,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: theme.lawFirm.border,
  },
  typeDropdownButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.lawFirm.surfaceAlt,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: theme.lawFirm.border,
  },
  typeDropdownText: {
    color: theme.lawFirm.text,
    fontSize: 14,
    fontWeight: '500',
  },
  dropdownArrow: {
    color: theme.lawFirm.textSecondary,
    marginLeft: 8,
    fontSize: 10,
  },
  typeDropdownMenu: {
    backgroundColor: theme.lawFirm.surface,
    marginHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: theme.lawFirm.border,
    overflow: 'hidden',
  },
  typeDropdownItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: theme.lawFirm.border,
  },
  activeTypeDropdownItem: {
    backgroundColor: theme.lawFirm.surfaceAlt,
  },
  typeDropdownItemText: {
    color: theme.lawFirm.text,
    fontSize: 14,
  },
  checkmark: {
    color: theme.lawFirm.primary,
    fontSize: 16,
    fontWeight: 'bold',
  },
  readFilterContainer: {
    flexDirection: 'row',
    marginLeft: 'auto',
  },
  readFilterButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    marginLeft: 6,
  },
  activeReadFilter: {
    backgroundColor: theme.lawFirm.primary + '20',
  },
  readFilterText: {
    color: theme.lawFirm.textSecondary,
    fontSize: 12,
    fontWeight: '500',
  },
  activeReadFilterText: {
    color: theme.lawFirm.primary,
    fontWeight: '700',
  },
  actionButtonContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: theme.lawFirm.surface,
    borderBottomWidth: 1,
    borderBottomColor: theme.lawFirm.border,
  },
  sendNotificationButton: {
    backgroundColor: theme.lawFirm.primary,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginRight: 10,
  },
  sendNotificationText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  markAllReadButton: {
    backgroundColor: theme.lawFirm.surfaceAlt,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: theme.lawFirm.border,
  },
  markAllReadText: {
    color: theme.lawFirm.primary,
    fontSize: 14,
    fontWeight: '600',
  },
  listContent: {
    padding: 16,
    paddingBottom: 100,
  },
  notificationCard: {
    backgroundColor: theme.lawFirm.surface,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: theme.lawFirm.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  unreadCard: {
    backgroundColor: theme.lawFirm.surface,
    borderLeftWidth: 4,
    borderLeftColor: theme.lawFirm.primary,
    borderColor: theme.lawFirm.primary + '40',
  },
  urgentCard: {
    borderColor: '#dc3545',
    borderWidth: 2,
    backgroundColor: 'rgba(220, 53, 69, 0.05)',
  },
  urgentBanner: {
    backgroundColor: '#dc3545',
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 4,
    alignSelf: 'flex-start',
    marginBottom: 10,
  },
  urgentBannerText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  notificationRow: {
    flexDirection: 'row',
  },
  typeIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: theme.lawFirm.surfaceAlt,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  typeIcon: {
    fontSize: 18,
  },
  notificationContent: {
    flex: 1,
  },
  notificationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  notificationTitle: {
    flex: 1,
    fontSize: 16,
    color: theme.lawFirm.text,
    fontWeight: '500',
  },
  unreadTitle: {
    fontWeight: '700',
    color: theme.lawFirm.primary,
  },
  urgentTitle: {
    color: '#dc3545',
  },
  unreadBadge: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: theme.lawFirm.info,
    marginLeft: 8,
  },
  senderName: {
    fontSize: 13,
    color: theme.lawFirm.textSecondary,
    marginBottom: 6,
  },
  notificationBody: {
    fontSize: 14,
    color: theme.lawFirm.textSecondary,
    lineHeight: 20,
    marginBottom: 8,
  },
  notificationFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  notificationTime: {
    fontSize: 12,
    color: theme.lawFirm.textLight,
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  clickedLabel: {
    fontSize: 11,
    color: theme.lawFirm.success,
    fontWeight: '600',
  },
  readLabel: {
    fontSize: 11,
    color: theme.lawFirm.textLight,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: theme.lawFirm.primary,
    marginTop: 12,
    fontSize: 16,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  emptyIcon: {
    fontSize: 60,
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: theme.lawFirm.primary,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    color: theme.lawFirm.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
  },
  autoRefreshIndicator: {
    backgroundColor: theme.lawFirm.surfaceAlt,
    paddingVertical: 8,
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: theme.lawFirm.border,
  },
  autoRefreshText: {
    fontSize: 11,
    color: theme.lawFirm.textLight,
  },
  placeholder: {
    width: 60,
  },
});

const NOTIFICATION_TYPES = [
  { key: 'all', label: 'All', icon: '📬' },
  { key: 'case_update', label: 'Case Updates', icon: '📋' },
  { key: 'appointment_reminder', label: 'Appointments', icon: '📅' },
  { key: 'payment_notification', label: 'Payments', icon: '💰' },
  { key: 'document_request', label: 'Documents', icon: '📄' },
  { key: 'system_alert', label: 'System Alerts', icon: '⚙️' },
];

const getNotificationTypeIcon = (type) => {
  switch (type) {
    case 'case_update':
    case 'new_information':
    case 'status_update_request':
    case 'deadline_reminder':
      return '📋';
    case 'appointment_request':
    case 'appointment_reminder':
      return '📅';
    case 'payment_notification':
    case 'disbursement_complete':
      return '💰';
    case 'document_request':
      return '📄';
    case 'system_alert':
      return '⚙️';
    case 'task_assigned':
      return '✅';
    case 'message':
      return '💬';
    default:
      return '🔔';
  }
};

const NotificationInboxScreen = ({ user, onNavigate, onNotificationPress, embedded = false }) => {
  const { notifications, isLoading, refreshNotifications, markAllAsRead, unreadCount } = useNotifications();
  const isMedicalProvider = user?.userType === 'medical_provider' || user?.type === 'medicalprovider';
  const isLawFirm = user?.userType === 'law_firm' || user?.type === 'lawfirm';
  const mpStyles = isMedicalProvider ? getMedicalProviderStyles() : null;
  const lfStyles = isLawFirm ? getLawFirmStyles() : null;
  
  // Use appropriate styles based on user type
  const currentStyles = isLawFirm ? lfStyles : (isMedicalProvider ? mpStyles : styles);
  const [activeTab, setActiveTab] = useState('inbox');
  const [readFilter, setReadFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [showTypeDropdown, setShowTypeDropdown] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [markingAllRead, setMarkingAllRead] = useState(false);
  const autoRefreshInterval = useRef(null);

  useEffect(() => {
    refreshNotifications();
    
    autoRefreshInterval.current = setInterval(() => {
      refreshNotifications();
    }, 30000);

    return () => {
      if (autoRefreshInterval.current) {
        clearInterval(autoRefreshInterval.current);
      }
    };
  }, []);

  const handleRefresh = async () => {
    setRefreshing(true);
    await refreshNotifications();
    setRefreshing(false);
  };

  const handleMarkAllAsRead = async () => {
    const unreadNotifications = notifications.filter(n => !n.is_read);
    if (unreadNotifications.length === 0) {
      return;
    }

    setMarkingAllRead(true);
    const result = await markAllAsRead();
    setMarkingAllRead(false);

    if (result.success) {
      await refreshNotifications();
    }
  };

  const filteredNotifications = notifications.filter(notification => {
    if (readFilter === 'unread' && notification.is_read) return false;
    if (readFilter === 'read' && !notification.is_read) return false;
    
    if (typeFilter !== 'all') {
      const notificationType = notification.type || notification.notification_type;
      if (typeFilter === 'case_update') {
        if (!['case_update', 'new_information', 'status_update_request', 'deadline_reminder'].includes(notificationType)) return false;
      } else if (typeFilter === 'appointment_reminder') {
        if (!['appointment_reminder', 'appointment_request'].includes(notificationType)) return false;
      } else if (notificationType !== typeFilter) {
        return false;
      }
    }
    
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      const title = (notification.subject || notification.title || '').toLowerCase();
      const body = (notification.body || '').toLowerCase();
      const sender = (notification.sender_name || '').toLowerCase();
      if (!title.includes(query) && !body.includes(query) && !sender.includes(query)) {
        return false;
      }
    }
    
    return true;
  });

  const formatTimestamp = (timestamp) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString('en-US');
  };

  const renderNotificationItem = ({ item }) => {
    const isUrgent = item.is_urgent || item.priority === 'urgent';
    const notificationType = item.type || item.notification_type;
    const typeIcon = getNotificationTypeIcon(notificationType);
    
    return (
      <TouchableOpacity
        style={[
          currentStyles.notificationCard,
          !item.is_read && currentStyles.unreadCard,
          isUrgent && currentStyles.urgentCard
        ]}
        onPress={() => onNotificationPress && onNotificationPress(item.id)}
      >
        {isUrgent && (
          <View style={currentStyles.urgentBanner}>
            <Text style={currentStyles.urgentBannerText}>⚠️ URGENT</Text>
          </View>
        )}
        <View style={currentStyles.notificationRow}>
          <View style={currentStyles.typeIconContainer}>
            <Text style={currentStyles.typeIcon}>{typeIcon}</Text>
          </View>
          <View style={currentStyles.notificationContent}>
            <View style={currentStyles.notificationHeader}>
              <Text 
                style={[
                  currentStyles.notificationTitle, 
                  isUrgent && currentStyles.urgentTitle,
                  !item.is_read && currentStyles.unreadTitle
                ]} 
                numberOfLines={1}
              >
                {item.subject || item.title}
              </Text>
              {!item.is_read && <View style={currentStyles.unreadBadge} />}
            </View>
            {item.sender_name && (
              <Text style={currentStyles.senderName}>From: {item.sender_name}</Text>
            )}
            <Text style={currentStyles.notificationBody} numberOfLines={2}>
              {item.body}
            </Text>
            <View style={currentStyles.notificationFooter}>
              <Text style={currentStyles.notificationTime}>
                {formatTimestamp(item.created_at)}
              </Text>
              <View style={currentStyles.statusContainer}>
                {item.is_clicked && (
                  <Text style={currentStyles.clickedLabel}>✓ Viewed</Text>
                )}
                {item.is_read && !item.is_clicked && (
                  <Text style={currentStyles.readLabel}>Read</Text>
                )}
              </View>
            </View>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  const selectedType = NOTIFICATION_TYPES.find(t => t.key === typeFilter);

  const renderContent = () => (
    <View style={currentStyles.contentContainer}>
      {!embedded && (
        <>
          <View style={currentStyles.header}>
            <TouchableOpacity
              style={currentStyles.backButton}
              onPress={() => onNavigate && onNavigate('dashboard')}
            >
              <Text style={currentStyles.backButtonText}>← Back</Text>
            </TouchableOpacity>
            <Text style={currentStyles.headerTitle}>🔔 Notifications</Text>
            <View style={currentStyles.placeholder} />
          </View>

          <View style={currentStyles.tabContainer}>
            <TouchableOpacity
              style={[currentStyles.tab, activeTab === 'inbox' && currentStyles.activeTab]}
              onPress={() => setActiveTab('inbox')}
            >
              <Text style={[currentStyles.tabText, activeTab === 'inbox' && currentStyles.activeTabText]}>
                📥 Inbox
              </Text>
              {unreadCount > 0 && (
                <View style={currentStyles.tabBadge}>
                  <Text style={currentStyles.tabBadgeText}>{unreadCount > 99 ? '99+' : unreadCount}</Text>
                </View>
              )}
            </TouchableOpacity>
            <TouchableOpacity
              style={[currentStyles.tab, activeTab === 'outbox' && currentStyles.activeTab]}
              onPress={() => {
                setActiveTab('outbox');
                onNavigate && onNavigate('notification-outbox');
              }}
            >
              <Text style={[currentStyles.tabText, activeTab === 'outbox' && currentStyles.activeTabText]}>
                📤 Sent
              </Text>
            </TouchableOpacity>
          </View>
        </>
      )}

      <View style={currentStyles.searchContainer}>
        <TextInput
          style={currentStyles.searchInput}
          placeholder="Search notifications..."
          placeholderTextColor={isLawFirm ? theme.lawFirm.textLight : (isMedicalProvider ? medicalProviderTheme.colors.textMuted : "rgba(255, 255, 255, 0.5)")}
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity
            style={currentStyles.clearSearchButton}
            onPress={() => setSearchQuery('')}
          >
            <Text style={currentStyles.clearSearchText}>✕</Text>
          </TouchableOpacity>
        )}
      </View>

      <View style={currentStyles.filterRow}>
        <TouchableOpacity
          style={currentStyles.typeDropdownButton}
          onPress={() => setShowTypeDropdown(!showTypeDropdown)}
        >
          <Text style={currentStyles.typeDropdownText}>
            {selectedType?.icon} {selectedType?.label}
          </Text>
          <Text style={currentStyles.dropdownArrow}>{showTypeDropdown ? '▲' : '▼'}</Text>
        </TouchableOpacity>

        <View style={currentStyles.readFilterContainer}>
          {['all', 'unread', 'read'].map((filter) => (
            <TouchableOpacity
              key={filter}
              style={[currentStyles.readFilterButton, readFilter === filter && currentStyles.activeReadFilter]}
              onPress={() => setReadFilter(filter)}
            >
              <Text style={[currentStyles.readFilterText, readFilter === filter && currentStyles.activeReadFilterText]}>
                {filter.charAt(0).toUpperCase() + filter.slice(1)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {showTypeDropdown && (
        <View style={currentStyles.typeDropdownMenu}>
          {NOTIFICATION_TYPES.map((type) => (
            <TouchableOpacity
              key={type.key}
              style={[currentStyles.typeDropdownItem, typeFilter === type.key && currentStyles.activeTypeDropdownItem]}
              onPress={() => {
                setTypeFilter(type.key);
                setShowTypeDropdown(false);
              }}
            >
              <Text style={currentStyles.typeDropdownItemText}>
                {type.icon} {type.label}
              </Text>
              {typeFilter === type.key && <Text style={currentStyles.checkmark}>✓</Text>}
            </TouchableOpacity>
          ))}
        </View>
      )}

      <View style={currentStyles.actionButtonContainer}>
        {user?.userType === 'individual' && (
          <TouchableOpacity
            style={currentStyles.sendNotificationButton}
            onPress={() => onNavigate && onNavigate('individual-send-notification')}
          >
            <Text style={currentStyles.sendNotificationText}>📨 Compose</Text>
          </TouchableOpacity>
        )}
        {notifications.filter(n => !n.is_read).length > 0 && (
          <TouchableOpacity
            style={currentStyles.markAllReadButton}
            onPress={handleMarkAllAsRead}
            disabled={markingAllRead}
          >
            <Text style={currentStyles.markAllReadText}>
              {markingAllRead ? '✓ Marking...' : '✓ Mark All Read'}
            </Text>
          </TouchableOpacity>
        )}
      </View>

      {isLoading && notifications.length === 0 ? (
        <View style={currentStyles.loadingContainer}>
          <ActivityIndicator size="large" color={isLawFirm ? theme.lawFirm.primary : "#FFD700"} />
          <Text style={currentStyles.loadingText}>Loading notifications...</Text>
        </View>
      ) : filteredNotifications.length === 0 ? (
        <View style={currentStyles.emptyContainer}>
          <Text style={currentStyles.emptyIcon}>{isLawFirm ? '📭' : '🏴‍☠️'}</Text>
          <Text style={currentStyles.emptyTitle}>No Notifications</Text>
          <Text style={currentStyles.emptyText}>
            {searchQuery 
              ? `No notifications matching "${searchQuery}"`
              : readFilter === 'unread' 
                ? "You're all caught up! No unread notifications."
                : readFilter === 'read'
                ? "No read notifications yet."
                : typeFilter !== 'all'
                ? `No ${selectedType?.label.toLowerCase()} found.`
                : "When you receive notifications, they'll appear here."}
          </Text>
        </View>
      ) : (
        <FlatList
          data={filteredNotifications}
          renderItem={renderNotificationItem}
          keyExtractor={(item) => item.id.toString()}
          contentContainerStyle={currentStyles.listContent}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              colors={[isLawFirm ? theme.lawFirm.primary : '#FFD700']}
              tintColor={isLawFirm ? theme.lawFirm.primary : '#FFD700'}
            />
          }
        />
      )}

      <View style={currentStyles.autoRefreshIndicator}>
        <Text style={currentStyles.autoRefreshText}>Auto-refreshes every 30 seconds</Text>
      </View>
    </View>
  );

  if (isMedicalProvider) {
    return (
      <View style={mpStyles.container}>
        <View style={mpStyles.overlay}>
          {renderContent()}
        </View>
      </View>
    );
  }

  if (isLawFirm) {
    return (
      <View style={lfStyles.container}>
        <View style={lfStyles.overlay}>
          {renderContent()}
        </View>
      </View>
    );
  }

  return (
    <ImageBackground
      source={pirateShipBackground}
      style={styles.backgroundImage}
      resizeMode="cover"
    >
      <View style={styles.overlay}>
        {renderContent()}
      </View>
    </ImageBackground>
  );
};

const styles = StyleSheet.create({
  backgroundImage: {
    flex: 1,
    width: '100%',
    height: '100%',
  },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
  },
  contentContainer: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    paddingTop: Platform.OS === 'ios' ? 50 : 16,
    backgroundColor: 'rgba(26, 26, 26, 0.88)',
    borderBottomWidth: 2,
    borderBottomColor: 'rgba(255, 215, 0, 0.5)',
  },
  backButton: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: 'rgba(255, 215, 0, 0.2)',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 215, 0, 0.5)',
  },
  backButtonText: {
    fontSize: 16,
    color: '#FFD700',
    fontWeight: '600',
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#FFD700',
    textShadowColor: 'rgba(0, 0, 0, 0.5)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 3,
  },
  placeholder: {
    width: 60,
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: 'rgba(26, 26, 26, 0.88)',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 215, 0, 0.3)',
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderBottomWidth: 3,
    borderBottomColor: 'transparent',
  },
  activeTab: {
    borderBottomColor: '#FFD700',
    backgroundColor: 'rgba(255, 215, 0, 0.1)',
  },
  tabText: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.7)',
    fontWeight: '500',
  },
  activeTabText: {
    color: '#FFD700',
    fontWeight: '700',
  },
  tabBadge: {
    backgroundColor: '#dc3545',
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 2,
    marginLeft: 8,
    minWidth: 24,
    alignItems: 'center',
  },
  tabBadgeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(26, 26, 26, 0.75)',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 215, 0, 0.2)',
  },
  searchInput: {
    flex: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
    color: '#fff',
    fontSize: 14,
    borderWidth: 1,
    borderColor: 'rgba(255, 215, 0, 0.3)',
  },
  clearSearchButton: {
    marginLeft: 10,
    padding: 8,
  },
  clearSearchText: {
    color: '#FFD700',
    fontSize: 16,
  },
  filterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(26, 26, 26, 0.75)',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 215, 0, 0.2)',
  },
  typeDropdownButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 215, 0, 0.15)',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 215, 0, 0.5)',
  },
  typeDropdownText: {
    color: '#FFD700',
    fontSize: 14,
    fontWeight: '500',
  },
  dropdownArrow: {
    color: '#FFD700',
    marginLeft: 8,
    fontSize: 10,
  },
  typeDropdownMenu: {
    backgroundColor: 'rgba(26, 26, 26, 0.95)',
    marginHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 215, 0, 0.5)',
    overflow: 'hidden',
  },
  typeDropdownItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 215, 0, 0.2)',
  },
  activeTypeDropdownItem: {
    backgroundColor: 'rgba(255, 215, 0, 0.15)',
  },
  typeDropdownItemText: {
    color: '#fff',
    fontSize: 14,
  },
  checkmark: {
    color: '#FFD700',
    fontSize: 16,
    fontWeight: 'bold',
  },
  readFilterContainer: {
    flexDirection: 'row',
    marginLeft: 'auto',
  },
  readFilterButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    marginLeft: 6,
  },
  activeReadFilter: {
    backgroundColor: 'rgba(255, 215, 0, 0.3)',
  },
  readFilterText: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: 12,
    fontWeight: '500',
  },
  activeReadFilterText: {
    color: '#FFD700',
    fontWeight: '700',
  },
  actionButtonContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: 'rgba(26, 26, 26, 0.75)',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 215, 0, 0.3)',
  },
  sendNotificationButton: {
    backgroundColor: 'rgba(30, 58, 95, 0.9)',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(192, 192, 192, 0.5)',
    marginRight: 10,
  },
  sendNotificationText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  markAllReadButton: {
    backgroundColor: 'rgba(255, 215, 0, 0.2)',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 215, 0, 0.5)',
  },
  markAllReadText: {
    color: '#FFD700',
    fontSize: 14,
    fontWeight: '600',
  },
  listContent: {
    padding: 16,
    paddingBottom: 100,
  },
  notificationCard: {
    backgroundColor: '#1A1A1A',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 215, 0, 0.3)',
  },
  unreadCard: {
    backgroundColor: '#242424',
    borderLeftWidth: 4,
    borderLeftColor: '#FFD700',
    borderColor: 'rgba(255, 215, 0, 0.5)',
  },
  urgentCard: {
    borderColor: '#dc3545',
    borderWidth: 2,
    backgroundColor: '#2D1A1A',
  },
  urgentBanner: {
    backgroundColor: '#dc3545',
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 4,
    alignSelf: 'flex-start',
    marginBottom: 10,
  },
  urgentBannerText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  notificationRow: {
    flexDirection: 'row',
  },
  typeIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 215, 0, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  typeIcon: {
    fontSize: 18,
  },
  notificationContent: {
    flex: 1,
  },
  notificationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  notificationTitle: {
    flex: 1,
    fontSize: 16,
    color: '#fff',
    fontWeight: '500',
  },
  unreadTitle: {
    fontWeight: '700',
    color: '#FFD700',
  },
  urgentTitle: {
    color: '#ff6b6b',
  },
  unreadBadge: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#3b82f6',
    marginLeft: 8,
  },
  senderName: {
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.7)',
    marginBottom: 6,
  },
  notificationBody: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.8)',
    lineHeight: 20,
    marginBottom: 8,
  },
  notificationFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  notificationTime: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.5)',
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  clickedLabel: {
    fontSize: 11,
    color: '#4ade80',
    fontWeight: '600',
  },
  readLabel: {
    fontSize: 11,
    color: 'rgba(255, 255, 255, 0.5)',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: '#FFD700',
    marginTop: 12,
    fontSize: 16,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  emptyIcon: {
    fontSize: 60,
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFD700',
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.7)',
    textAlign: 'center',
    lineHeight: 22,
  },
  autoRefreshIndicator: {
    backgroundColor: '#1A1A1A',
    paddingVertical: 8,
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 215, 0, 0.2)',
  },
  autoRefreshText: {
    fontSize: 11,
    color: 'rgba(255, 255, 255, 0.4)',
  },
});

export default NotificationInboxScreen;

import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, RefreshControl, ActivityIndicator, ImageBackground, Platform, TextInput, Modal, ScrollView } from 'react-native';
import { theme } from '../styles/theme';
import { medicalProviderTheme } from '../styles/medicalProviderTheme';
import { API_BASE_URL } from '../config/api';

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
    backgroundColor: medicalProviderTheme.colors.primary,
    paddingVertical: 8,
    paddingHorizontal: 8,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    marginHorizontal: 4,
    borderRadius: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.4)',
  },
  activeTab: {
    backgroundColor: medicalProviderTheme.colors.cardBackground,
    borderColor: medicalProviderTheme.colors.cardBackground,
  },
  tabText: {
    fontSize: 16,
    color: '#FFFFFF',
    fontWeight: '600',
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
  urgentTitle: {
    color: '#dc3545',
  },
  recipientName: {
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
  deliveryStatus: {
    fontSize: 12,
    color: medicalProviderTheme.colors.textMuted,
  },
  deliveryStatusRead: {
    color: medicalProviderTheme.colors.healthy,
    fontWeight: '500',
  },
  composeButton: {
    position: 'absolute',
    bottom: 20,
    right: 20,
    backgroundColor: medicalProviderTheme.colors.primary,
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 5,
  },
  composeButtonText: {
    color: '#FFFFFF',
    fontSize: 28,
    fontWeight: '300',
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
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  notOpenedContainer: {
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: medicalProviderTheme.colors.backgroundDark,
  },
  notOpenedText: {
    color: medicalProviderTheme.colors.textMuted,
    fontSize: 12,
    fontStyle: 'italic',
  },
  trackingContainer: {
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: medicalProviderTheme.colors.backgroundDark,
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  trackingText: {
    fontSize: 11,
    marginRight: 12,
    color: medicalProviderTheme.colors.textSecondary,
  },
  autoRefreshIndicator: {
    backgroundColor: medicalProviderTheme.colors.cardBackground,
    paddingVertical: 8,
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: medicalProviderTheme.colors.backgroundDark,
  },
  autoRefreshText: {
    fontSize: 11,
    color: medicalProviderTheme.colors.textMuted,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: medicalProviderTheme.colors.cardBackground,
    borderRadius: 16,
    maxHeight: '85%',
    borderWidth: 1,
    borderColor: medicalProviderTheme.colors.backgroundDark,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: medicalProviderTheme.colors.backgroundDark,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: medicalProviderTheme.colors.primary,
  },
  closeButton: {
    padding: 8,
  },
  closeButtonText: {
    color: medicalProviderTheme.colors.primary,
    fontSize: 20,
  },
  modalBody: {
    padding: 16,
  },
  analyticsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: medicalProviderTheme.colors.backgroundDark,
  },
  analyticsIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  analyticsIconText: {
    fontSize: 18,
  },
  analyticsLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: medicalProviderTheme.colors.textPrimary,
  },
  analyticsTime: {
    fontSize: 12,
    color: medicalProviderTheme.colors.textSecondary,
  },
  analyticsCheck: {
    fontSize: 16,
    marginLeft: 'auto',
  },
  legendContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    paddingVertical: 12,
    backgroundColor: medicalProviderTheme.colors.cardBackground,
    borderTopWidth: 1,
    borderTopColor: medicalProviderTheme.colors.backgroundDark,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 12,
  },
  legendDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: 6,
  },
  legendText: {
    fontSize: 11,
    color: medicalProviderTheme.colors.textSecondary,
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
  statusFilterContainer: {
    flexDirection: 'row',
    marginLeft: 'auto',
  },
  statusFilterButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    marginLeft: 6,
  },
  activeStatusFilter: {
    backgroundColor: theme.lawFirm.primary + '20',
  },
  statusFilterText: {
    color: theme.lawFirm.textSecondary,
    fontSize: 12,
    fontWeight: '500',
  },
  activeStatusFilterText: {
    color: theme.lawFirm.primary,
    fontWeight: '700',
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
    fontWeight: '600',
  },
  recipientName: {
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
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
    marginRight: 8,
  },
  sentBadge: {
    backgroundColor: theme.lawFirm.info + '20',
  },
  deliveredBadge: {
    backgroundColor: theme.lawFirm.success + '20',
  },
  readBadge: {
    backgroundColor: theme.lawFirm.success + '30',
  },
  failedBadge: {
    backgroundColor: theme.lawFirm.error + '20',
  },
  statusText: {
    fontSize: 11,
    fontWeight: '600',
  },
  sentText: {
    color: theme.lawFirm.info,
  },
  deliveredText: {
    color: theme.lawFirm.success,
  },
  readText: {
    color: theme.lawFirm.success,
  },
  failedText: {
    color: theme.lawFirm.error,
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
  analyticsButton: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  analyticsButtonText: {
    fontSize: 14,
    color: '#FFFFFF',
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: theme.lawFirm.surface,
    borderRadius: 16,
    padding: 20,
    width: '100%',
    maxWidth: 500,
    maxHeight: '80%',
    borderWidth: 1,
    borderColor: theme.lawFirm.border,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: theme.lawFirm.border,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: theme.lawFirm.text,
  },
  closeButton: {
    padding: 8,
  },
  closeButtonText: {
    fontSize: 24,
    color: theme.lawFirm.textSecondary,
  },
  detailRow: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  detailLabel: {
    width: 100,
    fontSize: 14,
    fontWeight: '600',
    color: theme.lawFirm.textSecondary,
  },
  detailValue: {
    flex: 1,
    fontSize: 14,
    color: theme.lawFirm.text,
  },
  detailBody: {
    fontSize: 14,
    color: theme.lawFirm.text,
    lineHeight: 22,
    backgroundColor: theme.lawFirm.surfaceAlt,
    padding: 12,
    borderRadius: 8,
    marginTop: 8,
  },
  modalBody: {
    padding: 16,
  },
  modalUrgentBanner: {
    backgroundColor: '#dc3545',
    padding: 10,
    borderRadius: 8,
    marginBottom: 16,
    alignItems: 'center',
  },
  modalUrgentText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 14,
  },
  detailSection: {
    marginBottom: 16,
  },
  detailMessage: {
    color: theme.lawFirm.text,
    fontSize: 14,
    lineHeight: 22,
    backgroundColor: theme.lawFirm.surfaceAlt,
    padding: 12,
    borderRadius: 8,
  },
  analyticsSection: {
    backgroundColor: theme.lawFirm.surfaceAlt,
    borderRadius: 12,
    padding: 16,
    marginTop: 8,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: theme.lawFirm.border,
  },
  analyticsSectionTitle: {
    color: theme.lawFirm.primary,
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  analyticsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: theme.lawFirm.border,
  },
  analyticsIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  analyticsInfo: {
    flex: 1,
  },
  analyticsLabel: {
    color: theme.lawFirm.text,
    fontSize: 14,
    fontWeight: '500',
  },
  analyticsTime: {
    color: theme.lawFirm.textSecondary,
    fontSize: 12,
    marginTop: 2,
  },
  analyticsCheck: {
    color: '#4ade80',
    fontSize: 16,
    fontWeight: 'bold',
  },
  currentStatusSection: {
    padding: 16,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
  },
  currentStatusText: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  trackingContainer: {
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: theme.lawFirm.border,
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  trackingText: {
    fontSize: 11,
    marginRight: 12,
    color: theme.lawFirm.textSecondary,
  },
  notOpenedContainer: {
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: theme.lawFirm.border,
  },
  notOpenedText: {
    color: theme.lawFirm.textSecondary,
    fontSize: 12,
    fontStyle: 'italic',
  },
  legendContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    backgroundColor: theme.lawFirm.surfaceAlt,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: theme.lawFirm.border,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 12,
  },
  legendDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: 6,
  },
  legendText: {
    color: theme.lawFirm.textSecondary,
    fontSize: 12,
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

const NotificationOutboxScreen = ({ user, onNavigate, onNotificationPress, onViewAnalytics, embedded = false }) => {
  const userType = (user?.userType || user?.type || '').toLowerCase().replace(/[_\s-]/g, '');
  const isMedicalProvider = userType === 'medicalprovider' || userType === 'medical_provider';
  const isLawFirm = userType === 'lawfirm' || userType === 'law_firm';
  const mpStyles = isMedicalProvider ? getMedicalProviderStyles() : null;
  const lfStyles = isLawFirm ? getLawFirmStyles() : null;
  
  // Use appropriate styles based on user type
  const currentStyles = isLawFirm ? lfStyles : (isMedicalProvider ? mpStyles : styles);
  const [notifications, setNotifications] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [statusFilter, setStatusFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [showTypeDropdown, setShowTypeDropdown] = useState(false);
  const [total, setTotal] = useState(0);
  const [selectedNotification, setSelectedNotification] = useState(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const autoRefreshInterval = useRef(null);

  useEffect(() => {
    fetchSentNotifications();
    
    autoRefreshInterval.current = setInterval(() => {
      fetchSentNotifications();
    }, 30000);

    return () => {
      if (autoRefreshInterval.current) {
        clearInterval(autoRefreshInterval.current);
      }
    };
  }, []);

  const fetchSentNotifications = async () => {
    try {
      setIsLoading(true);
      const response = await fetch(
        `${API_BASE_URL}/api/notifications/sent-notifications?limit=100`,
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${user.token}`,
          },
        }
      );

      const data = await response.json();
      if (data.success) {
        setNotifications(data.notifications || []);
        setTotal(data.total || 0);
      }
    } catch (error) {
    } finally {
      setIsLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchSentNotifications();
    setRefreshing(false);
  };

  const filteredNotifications = notifications.filter(notification => {
    if (statusFilter === 'clicked' && !notification.clickedAt) return false;
    if (statusFilter === 'read' && !notification.readAt) return false;
    if (statusFilter === 'unread' && notification.readAt) return false;
    
    if (typeFilter !== 'all') {
      const notificationType = notification.type || notification.notificationType;
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
      const recipient = (notification.recipientName || '').toLowerCase();
      if (!title.includes(query) && !body.includes(query) && !recipient.includes(query)) {
        return false;
      }
    }
    
    return true;
  });

  const formatTimestamp = (timestamp) => {
    if (!timestamp) return '';
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

  const formatFullTimestamp = (timestamp) => {
    if (!timestamp) return 'N/A';
    const date = new Date(timestamp);
    return date.toLocaleString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
  };

  const getStatusInfo = (notification) => {
    if (notification.readAt) {
      return { 
        label: 'Read', 
        color: '#4ade80', 
        icon: '✓✓',
        bgColor: 'rgba(74, 222, 128, 0.15)',
        borderColor: '#4ade80'
      };
    }
    if (notification.clickedAt) {
      return { 
        label: 'Clicked', 
        color: '#fbbf24', 
        icon: '✓',
        bgColor: 'rgba(251, 191, 36, 0.15)',
        borderColor: '#fbbf24'
      };
    }
    if (notification.sentAt && !notification.clickedAt && !notification.readAt) {
      return { 
        label: 'Sent', 
        color: '#9ca3af', 
        icon: '↑',
        bgColor: 'rgba(156, 163, 175, 0.15)',
        borderColor: '#9ca3af'
      };
    }
    return { 
      label: 'Sent', 
      color: '#9ca3af', 
      icon: '↑',
      bgColor: 'rgba(156, 163, 175, 0.15)',
      borderColor: '#9ca3af'
    };
  };

  const openDetailModal = (notification) => {
    setSelectedNotification(notification);
    setShowDetailModal(true);
  };

  const renderNotificationItem = ({ item }) => {
    const isUrgent = item.isUrgent;
    const statusInfo = getStatusInfo(item);
    const notificationType = item.type || item.notificationType;
    const typeIcon = getNotificationTypeIcon(notificationType);

    return (
      <TouchableOpacity
        style={[
          currentStyles.notificationCard,
          isUrgent && currentStyles.urgentCard,
          { borderLeftWidth: 4, borderLeftColor: statusInfo.borderColor }
        ]}
        onPress={() => openDetailModal(item)}
      >
        {isUrgent && (
          <View style={currentStyles.urgentBanner}>
            <Text style={currentStyles.urgentBannerText}>⚠️ URGENT</Text>
          </View>
        )}
        <View style={currentStyles.notificationRow}>
          <View style={[currentStyles.typeIconContainer, { backgroundColor: statusInfo.bgColor }]}>
            <Text style={currentStyles.typeIcon}>{typeIcon}</Text>
          </View>
          <View style={currentStyles.notificationContent}>
            <View style={currentStyles.notificationHeader}>
              <Text style={[currentStyles.notificationTitle, isUrgent && currentStyles.urgentTitle]} numberOfLines={1}>
                {item.subject || item.title}
              </Text>
            </View>
            <Text style={currentStyles.recipientName}>To: {item.recipientName}</Text>
            <Text style={currentStyles.notificationBody} numberOfLines={2}>
              {item.body}
            </Text>
            <View style={currentStyles.notificationFooter}>
              <Text style={currentStyles.notificationTime}>
                Sent {formatTimestamp(item.sentAt)}
              </Text>
              <View style={[currentStyles.statusBadge, { backgroundColor: statusInfo.bgColor }]}>
                <Text style={[currentStyles.statusText, { color: statusInfo.color }]}>
                  {statusInfo.icon} {statusInfo.label}
                </Text>
              </View>
            </View>
            
            {!item.readAt && !item.clickedAt && (
              <View style={currentStyles.notOpenedContainer}>
                <Text style={currentStyles.notOpenedText}>📭 Not opened yet</Text>
              </View>
            )}
            
            {(item.clickedAt || item.readAt) && (
              <View style={currentStyles.trackingContainer}>
                {item.clickedAt && (
                  <Text style={[currentStyles.trackingText, { color: '#fbbf24' }]}>
                    ✓ Clicked {formatTimestamp(item.clickedAt)}
                  </Text>
                )}
                {item.readAt && (
                  <Text style={[currentStyles.trackingText, { color: '#4ade80' }]}>
                    ✓✓ Read {formatTimestamp(item.readAt)}
                  </Text>
                )}
              </View>
            )}
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  const renderDetailModal = () => {
    if (!selectedNotification) return null;
    
    const statusInfo = getStatusInfo(selectedNotification);
    const isUrgent = selectedNotification.isUrgent;
    
    return (
      <Modal
        visible={showDetailModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowDetailModal(false)}
      >
        <View style={currentStyles.modalOverlay}>
          <View style={currentStyles.modalContent}>
            <View style={currentStyles.modalHeader}>
              <Text style={currentStyles.modalTitle}>📤 Sent Notification</Text>
              <TouchableOpacity
                style={currentStyles.closeButton}
                onPress={() => setShowDetailModal(false)}
              >
                <Text style={currentStyles.closeButtonText}>✕</Text>
              </TouchableOpacity>
            </View>
            
            <ScrollView style={currentStyles.modalBody}>
              {isUrgent && (
                <View style={currentStyles.modalUrgentBanner}>
                  <Text style={currentStyles.modalUrgentText}>⚠️ URGENT NOTIFICATION</Text>
                </View>
              )}
              
              <View style={currentStyles.detailSection}>
                <Text style={currentStyles.detailLabel}>Subject</Text>
                <Text style={currentStyles.detailValue}>{selectedNotification.subject || selectedNotification.title}</Text>
              </View>
              
              <View style={currentStyles.detailSection}>
                <Text style={currentStyles.detailLabel}>Recipient</Text>
                <Text style={currentStyles.detailValue}>{selectedNotification.recipientName}</Text>
              </View>
              
              <View style={currentStyles.detailSection}>
                <Text style={currentStyles.detailLabel}>Message</Text>
                <Text style={currentStyles.detailMessage}>{selectedNotification.body}</Text>
              </View>
              
              <View style={currentStyles.analyticsSection}>
                <Text style={currentStyles.analyticsSectionTitle}>📊 Delivery Analytics</Text>
                
                <View style={currentStyles.analyticsRow}>
                  <View style={[currentStyles.analyticsIcon, { backgroundColor: 'rgba(156, 163, 175, 0.2)' }]}>
                    <Text>↑</Text>
                  </View>
                  <View style={currentStyles.analyticsInfo}>
                    <Text style={currentStyles.analyticsLabel}>Sent</Text>
                    <Text style={currentStyles.analyticsTime}>{formatFullTimestamp(selectedNotification.sentAt)}</Text>
                  </View>
                  <Text style={currentStyles.analyticsCheck}>✓</Text>
                </View>
                
                <View style={currentStyles.analyticsRow}>
                  <View style={[currentStyles.analyticsIcon, { backgroundColor: selectedNotification.clickedAt ? 'rgba(251, 191, 36, 0.2)' : 'rgba(100, 100, 100, 0.2)' }]}>
                    <Text>👆</Text>
                  </View>
                  <View style={currentStyles.analyticsInfo}>
                    <Text style={currentStyles.analyticsLabel}>Clicked</Text>
                    <Text style={[currentStyles.analyticsTime, selectedNotification.clickedAt && { color: '#fbbf24' }]}>
                      {selectedNotification.clickedAt ? formatFullTimestamp(selectedNotification.clickedAt) : 'Not clicked yet'}
                    </Text>
                  </View>
                  {selectedNotification.clickedAt && <Text style={[currentStyles.analyticsCheck, { color: '#fbbf24' }]}>✓</Text>}
                </View>
                
                <View style={currentStyles.analyticsRow}>
                  <View style={[currentStyles.analyticsIcon, { backgroundColor: selectedNotification.readAt ? 'rgba(74, 222, 128, 0.2)' : 'rgba(100, 100, 100, 0.2)' }]}>
                    <Text>👁️</Text>
                  </View>
                  <View style={currentStyles.analyticsInfo}>
                    <Text style={currentStyles.analyticsLabel}>Read</Text>
                    <Text style={[currentStyles.analyticsTime, selectedNotification.readAt && { color: '#4ade80' }]}>
                      {selectedNotification.readAt ? formatFullTimestamp(selectedNotification.readAt) : 'Not read yet'}
                    </Text>
                  </View>
                  {selectedNotification.readAt && <Text style={[currentStyles.analyticsCheck, { color: '#4ade80' }]}>✓✓</Text>}
                </View>
              </View>
              
              <View style={[currentStyles.currentStatusSection, { backgroundColor: statusInfo.bgColor, borderColor: statusInfo.borderColor }]}>
                <Text style={[currentStyles.currentStatusText, { color: statusInfo.color }]}>
                  Current Status: {statusInfo.icon} {statusInfo.label}
                </Text>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>
    );
  };

  const selectedType = NOTIFICATION_TYPES.find(t => t.key === typeFilter);

  const renderContent = () => (
    <View style={currentStyles.contentContainer}>
      {!embedded && (
        <View style={currentStyles.header}>
          <TouchableOpacity
            style={currentStyles.backButton}
            onPress={() => onNavigate && onNavigate('notifications')}
          >
            <Text style={currentStyles.backButtonText}>← Inbox</Text>
          </TouchableOpacity>
          <Text style={currentStyles.headerTitle}>📤 Sent ({total})</Text>
          <TouchableOpacity
            style={currentStyles.analyticsButton}
            onPress={() => onViewAnalytics && onViewAnalytics()}
          >
            <Text style={currentStyles.analyticsButtonText}>📊</Text>
          </TouchableOpacity>
        </View>
      )}

      <View style={currentStyles.searchContainer}>
        <TextInput
          style={currentStyles.searchInput}
          placeholder="Search sent notifications..."
          placeholderTextColor="rgba(255, 255, 255, 0.5)"
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

        <View style={currentStyles.statusFilterContainer}>
          {[
            { key: 'all', label: 'All' },
            { key: 'read', label: '✓✓', color: '#4ade80' },
            { key: 'clicked', label: '✓', color: '#fbbf24' },
            { key: 'unread', label: '○', color: '#9ca3af' },
          ].map((filter) => (
            <TouchableOpacity
              key={filter.key}
              style={[currentStyles.statusFilterButton, statusFilter === filter.key && currentStyles.activeStatusFilter]}
              onPress={() => setStatusFilter(filter.key)}
            >
              <Text style={[
                currentStyles.statusFilterText, 
                statusFilter === filter.key && currentStyles.activeStatusFilterText,
                filter.color && { color: statusFilter === filter.key ? filter.color : 'rgba(255,255,255,0.6)' }
              ]}>
                {filter.label}
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

      <View style={currentStyles.legendContainer}>
        <View style={currentStyles.legendItem}>
          <View style={[currentStyles.legendDot, { backgroundColor: '#9ca3af' }]} />
          <Text style={currentStyles.legendText}>Not opened</Text>
        </View>
        <View style={currentStyles.legendItem}>
          <View style={[currentStyles.legendDot, { backgroundColor: '#fbbf24' }]} />
          <Text style={currentStyles.legendText}>Clicked</Text>
        </View>
        <View style={currentStyles.legendItem}>
          <View style={[currentStyles.legendDot, { backgroundColor: '#4ade80' }]} />
          <Text style={currentStyles.legendText}>Read</Text>
        </View>
      </View>

      {isLoading && notifications.length === 0 ? (
        <View style={currentStyles.loadingContainer}>
          <ActivityIndicator size="large" color="#FFD700" />
          <Text style={currentStyles.loadingText}>Loading sent notifications...</Text>
        </View>
      ) : filteredNotifications.length === 0 ? (
        <View style={currentStyles.emptyContainer}>
          <Text style={currentStyles.emptyIcon}>📤</Text>
          <Text style={currentStyles.emptyTitle}>No Sent Notifications</Text>
          <Text style={currentStyles.emptyText}>
            {searchQuery 
              ? `No notifications matching "${searchQuery}"`
              : statusFilter !== 'all'
              ? `No ${statusFilter} notifications found.`
              : "Notifications you send will appear here so you can track their delivery status."}
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
              colors={['#FFD700']}
              tintColor="#FFD700"
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
          {renderDetailModal()}
        </View>
      </View>
    );
  }

  if (isLawFirm) {
    return (
      <View style={lfStyles.container}>
        <View style={lfStyles.overlay}>
          {renderContent()}
          {renderDetailModal()}
        </View>
      </View>
    );
  }

  return (
    <ImageBackground
      source={pirateShipBackground}
      style={currentStyles.backgroundImage}
      resizeMode="cover"
    >
      <View style={currentStyles.overlay}>
        {renderContent()}
        {renderDetailModal()}
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
    color: '#FFD700',
    fontSize: 16,
    fontWeight: '600',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FFD700',
    textShadowColor: 'rgba(0, 0, 0, 0.5)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 3,
  },
  placeholder: {
    width: 60,
  },
  analyticsButton: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: 'rgba(255, 215, 0, 0.2)',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 215, 0, 0.5)',
  },
  analyticsButtonText: {
    fontSize: 20,
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
  statusFilterContainer: {
    flexDirection: 'row',
    marginLeft: 'auto',
  },
  statusFilterButton: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
    marginLeft: 4,
  },
  activeStatusFilter: {
    backgroundColor: 'rgba(255, 215, 0, 0.2)',
  },
  statusFilterText: {
    color: 'rgba(255, 255, 255, 0.6)',
    fontSize: 12,
    fontWeight: '600',
  },
  activeStatusFilterText: {
    fontWeight: '700',
  },
  legendContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    backgroundColor: '#1A1A1A',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 215, 0, 0.2)',
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 12,
  },
  legendDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: 6,
  },
  legendText: {
    color: 'rgba(255, 255, 255, 0.6)',
    fontSize: 11,
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
  urgentCard: {
    backgroundColor: '#2D1A1A',
    borderColor: '#dc2626',
    borderWidth: 2,
  },
  urgentBanner: {
    backgroundColor: '#dc2626',
    borderRadius: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    alignSelf: 'flex-start',
    marginBottom: 10,
  },
  urgentBannerText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '700',
  },
  notificationRow: {
    flexDirection: 'row',
  },
  typeIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
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
    marginBottom: 4,
  },
  notificationTitle: {
    fontSize: 16,
    color: '#fff',
    fontWeight: '600',
  },
  urgentTitle: {
    color: '#fca5a5',
  },
  recipientName: {
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.7)',
    marginBottom: 6,
  },
  notificationBody: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.8)',
    lineHeight: 20,
    marginBottom: 10,
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
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  notOpenedContainer: {
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.1)',
  },
  notOpenedText: {
    color: 'rgba(255, 255, 255, 0.5)',
    fontSize: 12,
    fontStyle: 'italic',
  },
  trackingContainer: {
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.1)',
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  trackingText: {
    fontSize: 11,
    marginRight: 12,
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
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: '#1a1a1a',
    borderRadius: 16,
    maxHeight: '85%',
    borderWidth: 2,
    borderColor: 'rgba(255, 215, 0, 0.5)',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 215, 0, 0.3)',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFD700',
  },
  closeButton: {
    padding: 8,
  },
  closeButtonText: {
    color: '#FFD700',
    fontSize: 20,
  },
  modalBody: {
    padding: 16,
  },
  modalUrgentBanner: {
    backgroundColor: '#dc3545',
    padding: 10,
    borderRadius: 8,
    marginBottom: 16,
    alignItems: 'center',
  },
  modalUrgentText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 14,
  },
  detailSection: {
    marginBottom: 16,
  },
  detailLabel: {
    color: 'rgba(255, 255, 255, 0.6)',
    fontSize: 12,
    marginBottom: 4,
    textTransform: 'uppercase',
  },
  detailValue: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '500',
  },
  detailMessage: {
    color: 'rgba(255, 255, 255, 0.9)',
    fontSize: 14,
    lineHeight: 22,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    padding: 12,
    borderRadius: 8,
  },
  analyticsSection: {
    backgroundColor: 'rgba(255, 215, 0, 0.08)',
    borderRadius: 12,
    padding: 16,
    marginTop: 8,
    marginBottom: 16,
  },
  analyticsSectionTitle: {
    color: '#FFD700',
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  analyticsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  analyticsIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  analyticsInfo: {
    flex: 1,
  },
  analyticsLabel: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '500',
  },
  analyticsTime: {
    color: 'rgba(255, 255, 255, 0.6)',
    fontSize: 12,
    marginTop: 2,
  },
  analyticsCheck: {
    color: '#4ade80',
    fontSize: 16,
    fontWeight: 'bold',
  },
  currentStatusSection: {
    padding: 16,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
  },
  currentStatusText: {
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default NotificationOutboxScreen;

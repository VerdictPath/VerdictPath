import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl
} from 'react-native';
import { theme } from '../styles/theme';
import { medicalProviderTheme } from '../styles/medicalProviderTheme';
import { apiRequest, API_ENDPOINTS } from '../config/api';

// Get theme colors based on user type
const getThemeColors = (userType) => {
  const normalizedType = (userType || '').toLowerCase().replace(/_/g, '');
  if (normalizedType === 'medicalprovider') {
    return {
      primary: medicalProviderTheme.colors.primary,
      primaryDark: medicalProviderTheme.colors.primaryDark,
      background: medicalProviderTheme.colors.offWhite,
      cardBackground: medicalProviderTheme.colors.clinicalWhite,
      textPrimary: medicalProviderTheme.colors.charcoal,
      textSecondary: medicalProviderTheme.colors.darkGray,
      accent: medicalProviderTheme.colors.clinicalTeal,
      border: medicalProviderTheme.colors.lightGray,
    };
  }
  return {
    primary: '#1E3A5F',
    primaryDark: '#152942',
    background: '#F5F7FA',
    cardBackground: '#FFFFFF',
    textPrimary: '#1E3A5F',
    textSecondary: '#64748B',
    accent: '#C0C0C0',
    border: '#E2E8F0',
  };
};

const ReceivedDisbursementsScreen = ({ user, onBack, userType, hideHeader = false, bottomPadding = 0 }) => {
  // Get dynamic theme colors based on user type
  const themeColors = getThemeColors(userType || user?.userType || user?.type);
  
  const [disbursements, setDisbursements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadDisbursements();
  }, []);

  const loadDisbursements = async () => {
    try {
      setLoading(true);
      const response = await apiRequest(API_ENDPOINTS.DISBURSEMENTS.GET_RECEIVED, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${user.token}`
        }
      });

      setDisbursements(response.disbursements || []);
    } catch (error) {
      console.error('Error loading disbursements:', error);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadDisbursements();
    setRefreshing(false);
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getStatusBadge = (status) => {
    const statusColors = {
      'pending': { bg: '#FFF3CD', text: '#856404', label: 'Pending' },
      'completed': { bg: '#D4EDDA', text: '#155724', label: 'Completed' },
      'failed': { bg: '#F8D7DA', text: '#721C24', label: 'Failed' }
    };

    const statusStyle = statusColors[status] || statusColors['pending'];

    return (
      <View style={[styles.statusBadge, { backgroundColor: statusStyle.bg }]}>
        <Text style={[styles.statusText, { color: statusStyle.text }]}>
          {statusStyle.label}
        </Text>
      </View>
    );
  };

  const renderDisbursementCard = (disbursement) => {
    const isMedicalProvider = (userType || '').toLowerCase().includes('medical');

    return (
      <View key={disbursement.id} style={[styles.disbursementCard, { borderLeftColor: themeColors.primary }]}>
        <View style={styles.cardHeader}>
          <View style={styles.cardHeaderLeft}>
            <Text style={styles.cardIcon}>💰</Text>
            <View>
              <Text style={[styles.cardTitle, { color: themeColors.textPrimary }]}>
                {isMedicalProvider ? 'Medical Services Payment' : 'Settlement Disbursement'}
              </Text>
              <Text style={styles.cardSubtitle}>
                from {disbursement.lawFirmName}
                {isMedicalProvider && disbursement.clientName && ` (${disbursement.clientName})`}
              </Text>
            </View>
          </View>
          {getStatusBadge(disbursement.status)}
        </View>

        <View style={styles.cardDivider} />

        <View style={styles.cardBody}>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Amount:</Text>
            <Text style={[styles.infoValue, { color: themeColors.textPrimary }]}>{formatCurrency(disbursement.amount)}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Date:</Text>
            <Text style={[styles.infoValue, { color: themeColors.textPrimary }]}>{formatDate(disbursement.createdAt)}</Text>
          </View>
          {disbursement.stripeTransferId && (
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Transaction ID:</Text>
              <Text style={[styles.infoValueSmall, { color: themeColors.textPrimary }]} numberOfLines={1} ellipsizeMode="middle">
                {disbursement.stripeTransferId}
              </Text>
            </View>
          )}
        </View>
      </View>
    );
  };

  const renderEmptyState = () => {
    const isMedicalProvider = (userType || '').toLowerCase().includes('medical');

    return (
      <View style={styles.emptyState}>
        <Text style={styles.emptyIcon}>📭</Text>
        <Text style={[styles.emptyTitle, { color: themeColors.textPrimary }]}>No Disbursements Yet</Text>
        <Text style={styles.emptyText}>
          {isMedicalProvider
            ? 'When law firms send you payments for medical services, they will appear here.'
            : 'When your law firm sends settlement disbursements, they will appear here.'}
        </Text>
      </View>
    );
  };

  if (loading) {
    return (
      <View style={[styles.container, { backgroundColor: themeColors.background }]}>
        {!hideHeader && (
          <View style={[styles.header, { backgroundColor: themeColors.primary }]}>
            <TouchableOpacity style={styles.backButton} onPress={onBack}>
              <Text style={styles.backButtonText}>← Back</Text>
            </TouchableOpacity>
            <Text style={styles.headerTitle}>My Disbursements</Text>
            <View style={styles.placeholder} />
          </View>
        )}
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={themeColors.primary} />
          <Text style={styles.loadingText}>Loading disbursements...</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: themeColors.background }]}>
      {!hideHeader && (
        <View style={[styles.header, { backgroundColor: themeColors.primary }]}>
          <TouchableOpacity style={styles.backButton} onPress={onBack}>
            <Text style={styles.backButtonText}>← Back</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>
            {userType === 'medical_provider' ? 'Received Payments' : 'My Disbursements'}
          </Text>
          <View style={styles.placeholder} />
        </View>
      )}

      <ScrollView
        style={styles.content}
        contentContainerStyle={{ paddingBottom: bottomPadding || 20 }}
        showsVerticalScrollIndicator={true}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        <View style={[styles.summaryCard, { backgroundColor: themeColors.primary }]}>
          <Text style={styles.summaryIcon}>📊</Text>
          <View style={styles.summaryContent}>
            <Text style={styles.summaryLabel}>Total Disbursements</Text>
            <Text style={styles.summaryValue}>{disbursements.length}</Text>
          </View>
        </View>

        {disbursements.length === 0 ? (
          renderEmptyState()
        ) : (
          <View style={styles.disbursementsList}>
            <Text style={[styles.listTitle, { color: themeColors.textPrimary }]}>Payment History</Text>
            {disbursements.map(renderDisbursementCard)}
          </View>
        )}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F7FA',
  },
  header: {
    backgroundColor: '#1E3A5F',
    padding: 20,
    paddingTop: 50,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  backButton: {
    padding: 8,
  },
  backButtonText: {
    fontSize: 16,
    color: '#C0C0C0',
    fontWeight: '600',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  placeholder: {
    width: 60,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 10,
    color: '#64748B',
    fontSize: 16,
  },
  content: {
    flex: 1,
  },
  summaryCard: {
    backgroundColor: '#1E3A5F',
    margin: 16,
    padding: 20,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: 'rgba(30, 58, 95, 0.2)',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 4,
    elevation: 4,
  },
  summaryIcon: {
    fontSize: 40,
    marginRight: 16,
  },
  summaryContent: {
    flex: 1,
  },
  summaryLabel: {
    fontSize: 14,
    color: '#C0C0C0',
    marginBottom: 4,
  },
  summaryValue: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  disbursementsList: {
    padding: 16,
    paddingTop: 0,
  },
  listTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1E3A5F',
    marginBottom: 12,
  },
  disbursementCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderLeftWidth: 4,
    borderLeftColor: '#1E3A5F',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  cardHeaderLeft: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  cardIcon: {
    fontSize: 32,
    marginRight: 12,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1E3A5F',
    marginBottom: 2,
  },
  cardSubtitle: {
    fontSize: 13,
    color: '#64748B',
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  cardDivider: {
    height: 1,
    backgroundColor: '#E2E8F0',
    marginBottom: 12,
  },
  cardBody: {
    gap: 8,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  infoLabel: {
    fontSize: 14,
    color: '#64748B',
    fontWeight: '500',
  },
  infoValue: {
    fontSize: 14,
    color: '#1E3A5F',
    fontWeight: '600',
  },
  infoValueSmall: {
    fontSize: 12,
    color: '#1E3A5F',
    fontWeight: '500',
    maxWidth: 200,
  },
  emptyState: {
    padding: 40,
    alignItems: 'center',
  },
  emptyIcon: {
    fontSize: 64,
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1E3A5F',
    marginBottom: 12,
  },
  emptyText: {
    fontSize: 14,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 20,
  },
});

export default ReceivedDisbursementsScreen;

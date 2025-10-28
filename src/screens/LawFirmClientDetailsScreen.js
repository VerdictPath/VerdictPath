import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { theme } from '../styles/theme';
import { API_BASE_URL, API_ENDPOINTS } from '../config/api';

const LawFirmClientDetailsScreen = ({ user, clientId, onBack, onNavigate }) => {
  const [clientData, setClientData] = useState(null);
  const [litigationProgress, setLitigationProgress] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchClientDetails();
    fetchClientLitigationProgress();
  }, [clientId]);

  const fetchClientDetails = async () => {
    try {
      console.log('[ClientDetails] Fetching client details for clientId:', clientId);
      console.log('[ClientDetails] Token:', user?.token ? 'Present' : 'Missing');
      console.log('[ClientDetails] API URL:', `${API_BASE_URL}${API_ENDPOINTS.LAWFIRM.CLIENT_DETAILS(clientId)}`);
      
      const response = await fetch(
        `${API_BASE_URL}${API_ENDPOINTS.LAWFIRM.CLIENT_DETAILS(clientId)}`,
        {
          headers: {
            'Authorization': `Bearer ${user.token}`
          }
        }
      );
      
      console.log('[ClientDetails] Response status:', response.status);
      
      if (response.ok) {
        const data = await response.json();
        console.log('[ClientDetails] Data received:', data);
        setClientData(data);
      } else {
        const errorData = await response.json();
        console.error('[ClientDetails] Failed response:', response.status, errorData);
      }
    } catch (error) {
      console.error('[ClientDetails] Error fetching client details:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchClientLitigationProgress = async () => {
    try {
      console.log('[ClientDetails] Fetching litigation progress for clientId:', clientId);
      
      const response = await fetch(
        `${API_BASE_URL}/api/litigation/client/${clientId}/progress`,
        {
          headers: {
            'Authorization': `Bearer ${user.token}`
          }
        }
      );
      
      console.log('[ClientDetails] Litigation progress response status:', response.status);
      
      if (response.ok) {
        const data = await response.json();
        console.log('[ClientDetails] Litigation progress data:', data);
        setLitigationProgress(data);
      } else {
        const errorData = await response.json();
        console.error('[ClientDetails] Failed litigation progress response:', response.status, errorData);
      }
    } catch (error) {
      console.error('[ClientDetails] Error fetching client litigation progress:', error);
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={theme.colors.mahogany} />
        <Text style={styles.loadingText}>Loading client data...</Text>
      </View>
    );
  }

  if (!clientData) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>Unable to load client data</Text>
        <TouchableOpacity style={styles.backButton} onPress={onBack}>
          <Text style={styles.backButtonText}>← Back to Dashboard</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const { client, medicalRecords, medicalBilling, evidenceDocuments, litigationStage } = clientData;

  return (
    <ScrollView style={styles.container}>
      <TouchableOpacity style={styles.backLink} onPress={onBack}>
        <Text style={styles.backLinkText}>← Back to Dashboard</Text>
      </TouchableOpacity>

      <View style={styles.header}>
        <Text style={styles.clientName}>{client.displayName}</Text>
        <Text style={styles.clientEmail}>{client.email}</Text>
      </View>

      <View style={styles.statsGrid}>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>{medicalRecords.total}</Text>
          <Text style={styles.statLabel}>Medical Records</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>{medicalBilling.total}</Text>
          <Text style={styles.statLabel}>Medical Bills</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>${medicalBilling.totalAmountBilled?.toFixed(2) || '0.00'}</Text>
          <Text style={styles.statLabel}>Total Billed</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>{evidenceDocuments.total}</Text>
          <Text style={styles.statLabel}>Evidence Docs</Text>
        </View>
      </View>

      {/* Litigation Roadmap */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>⚖️ Litigation Roadmap</Text>
        {litigationProgress ? (
          <View>
            {/* Progress Summary */}
            <View style={styles.progressSummary}>
              <View style={styles.progressSummaryRow}>
                <Text style={styles.progressCurrentStage}>
                  Current Stage: {litigationProgress.progress?.current_stage_name || 'Pre-Litigation'}
                </Text>
                <Text style={styles.progressPercentage}>
                  {parseFloat(litigationProgress.progress?.progress_percentage || 0).toFixed(0)}%
                </Text>
              </View>
              <View style={styles.progressBarBackground}>
                <View 
                  style={[
                    styles.progressBarFill, 
                    { width: `${litigationProgress.progress?.progress_percentage || 0}%` }
                  ]} 
                />
              </View>
              <View style={styles.progressStatsRow}>
                <Text style={styles.progressStat}>
                  📋 {litigationProgress.progress?.total_substages_completed || 0} Tasks Completed
                </Text>
                <Text style={styles.progressStat}>
                  🪙 {litigationProgress.progress?.total_coins_earned || 0} Coins Earned
                </Text>
              </View>
            </View>

            {/* View Full Interactive Roadmap Button */}
            <TouchableOpacity 
              style={styles.viewRoadmapButton}
              onPress={() => onNavigate && onNavigate('client-roadmap', { clientId, clientData: litigationProgress })}
            >
              <Text style={styles.viewRoadmapButtonText}>🗺️ View Full Interactive Roadmap</Text>
            </TouchableOpacity>

            {/* Full Roadmap - All 9 Stages */}
            <View style={styles.roadmapContainer}>
              {litigationProgress.stages?.map((stage, index) => {
                const isCompleted = stage.completed_at !== null;
                const isCurrent = litigationProgress.progress?.current_stage_id === stage.stage_id;
                
                return (
                  <View key={stage.stage_id} style={styles.roadmapStageItem}>
                    <View style={styles.roadmapStageRow}>
                      <View style={[
                        styles.roadmapStageBadge,
                        isCompleted && styles.roadmapStageBadgeCompleted,
                        isCurrent && styles.roadmapStageBadgeCurrent
                      ]}>
                        <Text style={[
                          styles.roadmapStageBadgeText,
                          isCompleted && styles.roadmapStageBadgeTextCompleted
                        ]}>
                          {isCompleted ? '✓' : stage.stage_id}
                        </Text>
                      </View>
                      <View style={styles.roadmapStageInfo}>
                        <Text style={[
                          styles.roadmapStageName,
                          isCurrent && styles.roadmapStageNameCurrent
                        ]}>
                          {stage.stage_name}
                          {isCurrent && ' ← Current'}
                        </Text>
                        <Text style={styles.roadmapStageProgress}>
                          {stage.substages_completed}/{stage.total_substages} substages completed
                        </Text>
                        {stage.completed_at && (
                          <Text style={styles.roadmapStageDate}>
                            Completed: {new Date(stage.completed_at).toLocaleDateString()}
                          </Text>
                        )}
                      </View>
                    </View>
                    {index < litigationProgress.stages.length - 1 && (
                      <View style={styles.roadmapConnector} />
                    )}
                  </View>
                );
              })}
            </View>

            {/* Case Details */}
            {litigationStage && (
              <View style={styles.caseDetailsContainer}>
                <Text style={styles.caseDetailsTitle}>Case Details</Text>
                {litigationStage.case_number && (
                  <Text style={styles.detailText}>
                    <Text style={styles.detailLabel}>Case Number:</Text> {litigationStage.case_number}
                  </Text>
                )}
                {litigationStage.case_value && (
                  <Text style={styles.detailText}>
                    <Text style={styles.detailLabel}>Case Value:</Text> ${parseFloat(litigationStage.case_value).toFixed(2)}
                  </Text>
                )}
                {litigationStage.next_step_description && (
                  <Text style={styles.detailText}>
                    <Text style={styles.detailLabel}>Next Step:</Text> {litigationStage.next_step_description}
                  </Text>
                )}
                {litigationStage.notes && (
                  <Text style={styles.detailText}>
                    <Text style={styles.detailLabel}>Notes:</Text> {litigationStage.notes}
                  </Text>
                )}
              </View>
            )}
          </View>
        ) : (
          <Text style={styles.emptyText}>No litigation progress data available</Text>
        )}
      </View>

      {/* Medical Records */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Medical Records ({medicalRecords.total})</Text>
        {medicalRecords.records.length === 0 ? (
          <Text style={styles.emptyText}>No medical records uploaded yet</Text>
        ) : (
          medicalRecords.records.map((record) => (
            <View key={record.id} style={styles.documentItem}>
              <Text style={styles.documentTitle}>
                {record.record_type?.replace(/_/g, ' ').toUpperCase()}
              </Text>
              <Text style={styles.documentMeta}>
                {record.facility_name && `Facility: ${record.facility_name} | `}
                {record.date_of_service && `Date: ${new Date(record.date_of_service).toLocaleDateString()} | `}
                Uploaded: {new Date(record.uploaded_at).toLocaleDateString()}
              </Text>
              {record.description && (
                <Text style={styles.documentDescription}>{record.description}</Text>
              )}
            </View>
          ))
        )}
      </View>

      {/* Medical Billing */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Medical Billing ({medicalBilling.total})</Text>
        <Text style={styles.billingSummary}>
          Total Billed: ${medicalBilling.totalAmountBilled?.toFixed(2) || '0.00'} | 
          Total Due: ${medicalBilling.totalAmountDue?.toFixed(2) || '0.00'}
        </Text>
        {medicalBilling.bills.length === 0 ? (
          <Text style={styles.emptyText}>No medical bills uploaded yet</Text>
        ) : (
          medicalBilling.bills.map((bill) => (
            <View key={bill.id} style={styles.documentItem}>
              <Text style={styles.documentTitle}>
                {bill.billing_type?.replace(/_/g, ' ').toUpperCase()}
              </Text>
              <Text style={styles.documentMeta}>
                {bill.facility_name && `Facility: ${bill.facility_name} | `}
                {bill.bill_number && `Bill #: ${bill.bill_number} | `}
                Amount: ${parseFloat(bill.total_amount).toFixed(2)}
                {bill.bill_date && ` | Date: ${new Date(bill.bill_date).toLocaleDateString()}`}
              </Text>
            </View>
          ))
        )}
      </View>

      {/* Evidence Locker */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>📎 Evidence Locker ({evidenceDocuments.total})</Text>
        <Text style={styles.sectionSubtitle}>
          Photos, reports, and other case evidence uploaded by this client
        </Text>
        {evidenceDocuments.documents.length === 0 ? (
          <View style={styles.emptyStateContainer}>
            <Text style={styles.emptyIcon}>🗃️</Text>
            <Text style={styles.emptyText}>Evidence locker is empty</Text>
            <Text style={styles.emptySubtext}>Evidence documents will appear here once uploaded</Text>
          </View>
        ) : (
          evidenceDocuments.documents.map((doc) => (
            <View key={doc.id} style={styles.documentItem}>
              <Text style={styles.documentTitle}>📎 {doc.title}</Text>
              <Text style={styles.documentMeta}>
                Type: {doc.evidence_type?.replace(/_/g, ' ').toUpperCase()}
                {doc.location && ` | Location: ${doc.location}`}
                {doc.date_of_incident && ` | Incident: ${new Date(doc.date_of_incident).toLocaleDateString()}`}
              </Text>
              {doc.description && (
                <Text style={styles.documentDescription}>{doc.description}</Text>
              )}
              <Text style={styles.documentUploadDate}>
                Uploaded: {new Date(doc.uploaded_at).toLocaleDateString()}
              </Text>
            </View>
          ))
        )}
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.sand,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: theme.colors.sand,
  },
  loadingText: {
    marginTop: 10,
    color: theme.colors.textSecondary,
    fontSize: 16,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: theme.colors.sand,
    padding: 20,
  },
  errorText: {
    fontSize: 16,
    color: theme.colors.deepMaroon,
    marginBottom: 20,
  },
  backButton: {
    backgroundColor: theme.colors.mahogany,
    padding: 15,
    borderRadius: 8,
  },
  backButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  backLink: {
    padding: 15,
    marginLeft: 5,
  },
  backLinkText: {
    color: theme.colors.mahogany,
    fontSize: 16,
    fontWeight: '600',
  },
  header: {
    backgroundColor: theme.colors.cream,
    padding: 20,
    borderBottomWidth: 3,
    borderBottomColor: theme.colors.secondary,
    marginBottom: 20,
  },
  clientName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: theme.colors.mahogany,
    marginBottom: 5,
  },
  clientEmail: {
    fontSize: 14,
    color: theme.colors.textSecondary,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 10,
    marginBottom: 20,
  },
  statCard: {
    backgroundColor: theme.colors.cream,
    padding: 15,
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: theme.colors.secondary,
    width: '48%',
    margin: '1%',
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: theme.colors.mahogany,
  },
  statLabel: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    marginTop: 3,
  },
  section: {
    backgroundColor: theme.colors.cream,
    padding: 20,
    marginHorizontal: 20,
    marginBottom: 20,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: theme.colors.secondary,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: theme.colors.mahogany,
    marginBottom: 15,
    paddingBottom: 10,
    borderBottomWidth: 2,
    borderBottomColor: theme.colors.secondary,
  },
  sectionSubtitle: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    marginBottom: 15,
    lineHeight: 20,
  },
  emptyStateContainer: {
    padding: 30,
    alignItems: 'center',
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: 10,
  },
  emptySubtext: {
    fontSize: 14,
    color: theme.colors.warmGray,
    textAlign: 'center',
    marginTop: 5,
  },
  litigationStatus: {
    backgroundColor: theme.colors.secondary,
    padding: 10,
    borderRadius: 6,
    marginBottom: 10,
    alignSelf: 'flex-start',
  },
  litigationStageText: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.navy,
  },
  detailText: {
    fontSize: 14,
    color: theme.colors.navy,
    marginBottom: 8,
  },
  detailLabel: {
    fontWeight: '600',
    color: theme.colors.mahogany,
  },
  billingSummary: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.navy,
    marginBottom: 15,
  },
  documentItem: {
    backgroundColor: theme.colors.lightCream,
    padding: 15,
    borderRadius: 6,
    marginBottom: 10,
    borderLeftWidth: 3,
    borderLeftColor: theme.colors.secondary,
  },
  documentTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.navy,
    marginBottom: 5,
  },
  documentMeta: {
    fontSize: 13,
    color: theme.colors.textSecondary,
  },
  documentDescription: {
    fontSize: 14,
    color: theme.colors.navy,
    marginTop: 5,
  },
  documentUploadDate: {
    fontSize: 12,
    color: theme.colors.warmGray,
    marginTop: 5,
  },
  emptyText: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    fontStyle: 'italic',
    textAlign: 'center',
    padding: 20,
  },
  // Litigation Roadmap Styles
  progressSummary: {
    backgroundColor: theme.colors.lightCream,
    padding: 15,
    borderRadius: 8,
    marginBottom: 20,
    borderWidth: 2,
    borderColor: theme.colors.warmGold,
  },
  progressSummaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  progressCurrentStage: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.mahogany,
    flex: 1,
  },
  progressPercentage: {
    fontSize: 24,
    fontWeight: 'bold',
    color: theme.colors.navy,
  },
  progressBarBackground: {
    height: 20,
    backgroundColor: theme.colors.sand,
    borderRadius: 10,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: theme.colors.secondary,
    marginBottom: 10,
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: theme.colors.warmGold,
  },
  progressStatsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 5,
  },
  progressStat: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    fontWeight: '500',
  },
  viewRoadmapButton: {
    backgroundColor: theme.colors.mahogany,
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 15,
    marginBottom: 15,
  },
  viewRoadmapButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  roadmapContainer: {
    marginTop: 10,
  },
  roadmapStageItem: {
    marginBottom: 5,
  },
  roadmapStageRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  roadmapStageBadge: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: theme.colors.sand,
    borderWidth: 2,
    borderColor: theme.colors.textSecondary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
  },
  roadmapStageBadgeCompleted: {
    backgroundColor: theme.colors.warmGold,
    borderColor: theme.colors.mahogany,
  },
  roadmapStageBadgeCurrent: {
    backgroundColor: theme.colors.cream,
    borderColor: theme.colors.navy,
    borderWidth: 3,
  },
  roadmapStageBadgeText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: theme.colors.textSecondary,
  },
  roadmapStageBadgeTextCompleted: {
    color: theme.colors.white,
  },
  roadmapStageInfo: {
    flex: 1,
    paddingTop: 2,
  },
  roadmapStageName: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.navy,
    marginBottom: 3,
  },
  roadmapStageNameCurrent: {
    color: theme.colors.mahogany,
    fontWeight: 'bold',
  },
  roadmapStageProgress: {
    fontSize: 13,
    color: theme.colors.textSecondary,
  },
  roadmapStageDate: {
    fontSize: 12,
    color: theme.colors.warmGreen,
    marginTop: 2,
  },
  roadmapConnector: {
    width: 2,
    height: 15,
    backgroundColor: theme.colors.secondary,
    marginLeft: 19,
    marginVertical: 2,
  },
  caseDetailsContainer: {
    marginTop: 20,
    paddingTop: 20,
    borderTopWidth: 2,
    borderTopColor: theme.colors.secondary,
  },
  caseDetailsTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: theme.colors.mahogany,
    marginBottom: 10,
  },
});

export default LawFirmClientDetailsScreen;

import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, ActivityIndicator, ImageBackground, useWindowDimensions } from 'react-native';
import { theme } from '../styles/theme';
import { API_BASE_URL, API_ENDPOINTS } from '../config/api';

const LawFirmClientDetailsScreen = ({ user, clientId, onBack, onNavigate }) => {
  const { width, height } = useWindowDimensions();
  const [clientData, setClientData] = useState(null);
  const [litigationProgress, setLitigationProgress] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  
  const isPhone = width < 768;
  const isTablet = width >= 768 && width < 1024;
  const isDesktop = width >= 1024;

  useEffect(() => {
    fetchClientDetails();
    fetchClientLitigationProgress();
  }, [clientId]);

  const fetchClientDetails = async () => {
    try {
      console.log('[ClientDetails] Fetching client details for clientId:', clientId);
      console.log('[ClientDetails] Token:', user?.token ? 'Present' : 'Missing');
      console.log('[ClientDetails] API URL:', API_ENDPOINTS.LAWFIRM.CLIENT_DETAILS(clientId));
      
      const response = await fetch(
        API_ENDPOINTS.LAWFIRM.CLIENT_DETAILS(clientId),
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

  const renderOverviewTab = () => {
    if (!clientData) return null;
    const { client, medicalRecords, medicalBilling, evidenceDocuments, litigationStage } = clientData;

    return (
      <View style={styles.tabContent}>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>👤 Client Information</Text>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Name:</Text>
            <Text style={styles.infoValue}>{client.displayName}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Email:</Text>
            <Text style={styles.infoValue}>{client.email}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Current Stage:</Text>
            <Text style={styles.infoValue}>
              {litigationProgress?.progress?.current_stage_name || 'Pre-Litigation'}
            </Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Progress:</Text>
            <Text style={styles.infoValue}>
              {litigationProgress?.progress?.progress_percentage || 0}%
            </Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>📊 Case Summary</Text>
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
        </View>

        {litigationStage && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>⚖️ Case Details</Text>
            {litigationStage.case_number && (
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Case Number:</Text>
                <Text style={styles.infoValue}>{litigationStage.case_number}</Text>
              </View>
            )}
            {litigationStage.case_value && (
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Case Value:</Text>
                <Text style={styles.infoValue}>${parseFloat(litigationStage.case_value).toFixed(2)}</Text>
              </View>
            )}
            {litigationStage.next_step_description && (
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Next Step:</Text>
                <Text style={styles.infoValue}>{litigationStage.next_step_description}</Text>
              </View>
            )}
            {litigationStage.notes && (
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Notes:</Text>
                <Text style={styles.infoValue}>{litigationStage.notes}</Text>
              </View>
            )}
          </View>
        )}
      </View>
    );
  };

  const renderRoadmapTab = () => {
    if (!clientData) return null;
    const { client } = clientData;

    return (
      <View style={styles.tabContent}>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>⚖️ Litigation Roadmap</Text>
          {litigationProgress ? (
            <View>
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

              <TouchableOpacity 
                style={styles.viewRoadmapButton}
                onPress={() => onNavigate && onNavigate('client-roadmap', { clientId, clientData: litigationProgress })}
              >
                <Text style={styles.viewRoadmapButtonText}>🗺️ View Full Interactive Roadmap</Text>
              </TouchableOpacity>

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
            </View>
          ) : (
            <View style={styles.emptyState}>
              <Text style={styles.emptyIcon}>🗺️</Text>
              <Text style={styles.emptyText}>No litigation progress data available</Text>
            </View>
          )}
        </View>
      </View>
    );
  };

  const renderMedicalHubTab = () => {
    if (!clientData) return null;
    const { client, medicalRecords, medicalBilling } = clientData;

    return (
      <ImageBackground
        source={require('../../attached_assets/Medical Ward_1764038075699.png')}
        style={styles.medicalHubBackground}
        resizeMode="cover"
      >
        <View style={styles.medicalHubOverlay}>
          <View style={[
            styles.medicalHubContent,
            { 
              paddingHorizontal: isDesktop ? 40 : isTablet ? 30 : 15,
              paddingTop: isDesktop ? 30 : 20,
            }
          ]}>
            <View style={[
              styles.section,
              styles.medicalHubSection
            ]}>
              <Text style={[
                styles.sectionTitle,
                styles.medicalHubSectionTitle,
                { fontSize: isDesktop ? 24 : 20 }
              ]}>📋 Medical Records</Text>
              {medicalRecords.records.length === 0 ? (
                <View style={styles.emptyState}>
                  <Text style={styles.emptyIcon}>📋</Text>
                  <Text style={[styles.emptyText, { color: '#2c3e50' }]}>No medical records uploaded yet</Text>
                </View>
              ) : (
                <>
                  {medicalRecords.records.map((record) => (
                    <View key={record.id} style={styles.documentCard}>
                      <View style={styles.documentHeader}>
                        <Text style={styles.documentTitle}>📋 {record.record_type?.replace(/_/g, ' ').toUpperCase()}</Text>
                        <Text style={styles.documentBadge}>{record.file_name}</Text>
                      </View>
                      {record.facility_name && (
                        <Text style={styles.documentDetail}>🏥 {record.facility_name}</Text>
                      )}
                      {record.date_of_service && (
                        <Text style={styles.documentDetail}>
                          📅 Service: {new Date(record.date_of_service).toLocaleDateString()}
                        </Text>
                      )}
                      {record.description && (
                        <Text style={styles.documentDetail}>📝 {record.description}</Text>
                      )}
                      <Text style={styles.documentDate}>
                        Uploaded: {new Date(record.uploaded_at).toLocaleDateString()}
                      </Text>
                    </View>
                  ))}
                </>
              )}
            </View>

            <View style={[
              styles.section,
              styles.medicalHubSection
            ]}>
              <Text style={[
                styles.sectionTitle,
                styles.medicalHubSectionTitle,
                { fontSize: isDesktop ? 24 : 20 }
              ]}>💰 Medical Billing</Text>
              {medicalBilling.bills.length === 0 ? (
                <View style={styles.emptyState}>
                  <Text style={styles.emptyIcon}>💰</Text>
                  <Text style={[styles.emptyText, { color: '#2c3e50' }]}>No medical bills uploaded yet</Text>
                </View>
              ) : (
                <>
                  <View style={styles.billingSummaryContainer}>
                    <Text style={styles.billingSummary}>
                      Total Billed: ${medicalBilling.totalAmountBilled?.toFixed(2) || '0.00'}
                    </Text>
                    <Text style={styles.billingSummary}>
                      Total Due: ${medicalBilling.totalAmountDue?.toFixed(2) || '0.00'}
                    </Text>
                  </View>
                  
                  {medicalBilling.bills.map((bill) => (
                    <View key={bill.id} style={styles.documentCard}>
                      <View style={styles.documentHeader}>
                        <Text style={styles.documentTitle}>💰 {bill.billing_type?.replace(/_/g, ' ').toUpperCase()}</Text>
                        <Text style={styles.documentBadge}>${parseFloat(bill.total_amount).toFixed(2)}</Text>
                      </View>
                      {bill.facility_name && (
                        <Text style={styles.documentDetail}>🏥 {bill.facility_name}</Text>
                      )}
                      {bill.bill_number && (
                        <Text style={styles.documentDetail}>📝 Bill #: {bill.bill_number}</Text>
                      )}
                      {bill.bill_date && (
                        <Text style={styles.documentDetail}>
                          📅 Date: {new Date(bill.bill_date).toLocaleDateString()}
                        </Text>
                      )}
                      <Text style={styles.documentDate}>
                        Uploaded: {new Date(bill.uploaded_at).toLocaleDateString()}
                      </Text>
                    </View>
                  ))}
                </>
              )}
            </View>

            <View style={[styles.infoSection, styles.medicalHubInfoSection]}>
              <Text style={styles.infoIcon}>ℹ️</Text>
              <Text style={[styles.infoText, { color: '#FFFFFF' }]}>
                All medical records and billing can be accessed by {client.displayName} with proper consent.
              </Text>
            </View>
          </View>
        </View>
      </ImageBackground>
    );
  };

  const renderEvidenceTab = () => {
    if (!clientData) return null;
    const { client, evidenceDocuments } = clientData;

    return (
      <View style={styles.tabContent}>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>🗃️ Evidence Locker</Text>
          
          {evidenceDocuments.documents.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyIcon}>🗃️</Text>
              <Text style={styles.emptyText}>Evidence locker is empty</Text>
              <Text style={styles.emptySubtext}>
                Evidence documents will appear here when uploaded by {client.displayName}
              </Text>
            </View>
          ) : (
            evidenceDocuments.documents.map((doc) => (
              <View key={doc.id} style={styles.documentCard}>
                <View style={styles.documentHeader}>
                  <Text style={styles.documentTitle}>📎 {doc.title}</Text>
                  <Text style={styles.documentBadge}>{doc.file_name}</Text>
                </View>
                {doc.evidence_type && (
                  <Text style={styles.documentDetail}>
                    📂 Type: {doc.evidence_type?.replace(/_/g, ' ').toUpperCase()}
                  </Text>
                )}
                {doc.description && (
                  <Text style={styles.documentDetail}>📋 {doc.description}</Text>
                )}
                {doc.location && (
                  <Text style={styles.documentDetail}>📍 {doc.location}</Text>
                )}
                {doc.date_of_incident && (
                  <Text style={styles.documentDetail}>
                    📅 Incident: {new Date(doc.date_of_incident).toLocaleDateString()}
                  </Text>
                )}
                <Text style={styles.documentDate}>
                  Uploaded: {new Date(doc.uploaded_at).toLocaleDateString()}
                </Text>
              </View>
            ))
          )}
        </View>

        <View style={styles.infoSection}>
          <Text style={styles.infoIcon}>ℹ️</Text>
          <Text style={styles.infoText}>
            Evidence documents are securely shared and can be accessed by {client.displayName}.
          </Text>
        </View>
      </View>
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#C0C0C0" />
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

  const { client } = clientData;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack} style={styles.headerBackButton}>
          <Text style={styles.backArrow}>←</Text>
        </TouchableOpacity>
        <View style={styles.headerContent}>
          <Text style={styles.headerTitle}>👤 {client.displayName}</Text>
          <Text style={styles.headerSubtitle}>Client Details</Text>
        </View>
      </View>

      <View style={styles.tabBar}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'overview' && styles.activeTab]}
          onPress={() => setActiveTab('overview')}
        >
          <Text style={styles.tabIcon}>📋</Text>
          <Text style={[styles.tabText, activeTab === 'overview' && styles.activeTabText]}>
            Overview
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'roadmap' && styles.activeTab]}
          onPress={() => setActiveTab('roadmap')}
        >
          <Text style={styles.tabIcon}>🗺️</Text>
          <Text style={[styles.tabText, activeTab === 'roadmap' && styles.activeTabText]}>
            Roadmap
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'medicalHub' && styles.activeTab]}
          onPress={() => setActiveTab('medicalHub')}
        >
          <Text style={styles.tabIcon}>🏥</Text>
          <Text style={[styles.tabText, activeTab === 'medicalHub' && styles.activeTabText]}>
            Medical Hub
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'evidence' && styles.activeTab]}
          onPress={() => setActiveTab('evidence')}
        >
          <Text style={styles.tabIcon}>🗃️</Text>
          <Text style={[styles.tabText, activeTab === 'evidence' && styles.activeTabText]}>
            Evidence Locker
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content}>
        {activeTab === 'overview' && renderOverviewTab()}
        {activeTab === 'roadmap' && renderRoadmapTab()}
        {activeTab === 'medicalHub' && renderMedicalHubTab()}
        {activeTab === 'evidence' && renderEvidenceTab()}

        <TouchableOpacity style={styles.backButtonBottom} onPress={onBack}>
          <Text style={styles.backButtonBottomText}>← Back to Dashboard</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1E3A5F',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#1E3A5F',
  },
  loadingText: {
    marginTop: 10,
    color: '#C0C0C0',
    fontSize: 16,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#1E3A5F',
    padding: 20,
  },
  errorText: {
    fontSize: 16,
    color: '#ff6b6b',
    marginBottom: 20,
  },
  backButton: {
    backgroundColor: '#C0C0C0',
    padding: 15,
    borderRadius: 8,
  },
  backButtonText: {
    color: '#1E3A5F',
    fontSize: 16,
    fontWeight: '600',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#152d4a',
    padding: 15,
    borderBottomWidth: 2,
    borderBottomColor: '#C0C0C0',
  },
  headerBackButton: {
    padding: 8,
    marginRight: 10,
  },
  backArrow: {
    fontSize: 24,
    color: '#C0C0C0',
    fontWeight: 'bold',
  },
  headerContent: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#C0C0C0',
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#a0a0a0',
    marginTop: 2,
  },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: '#152d4a',
    borderBottomWidth: 2,
    borderBottomColor: '#C0C0C0',
  },
  tab: {
    flex: 1,
    padding: 12,
    alignItems: 'center',
    borderRightWidth: 1,
    borderRightColor: 'rgba(192, 192, 192, 0.3)',
  },
  activeTab: {
    backgroundColor: '#1E3A5F',
    borderBottomWidth: 3,
    borderBottomColor: '#C0C0C0',
  },
  tabIcon: {
    fontSize: 20,
    marginBottom: 4,
  },
  tabText: {
    fontSize: 12,
    color: '#a0a0a0',
    textAlign: 'center',
  },
  activeTabText: {
    color: '#C0C0C0',
    fontWeight: 'bold',
  },
  content: {
    flex: 1,
    backgroundColor: '#1E3A5F',
  },
  tabContent: {
    padding: 15,
  },
  section: {
    backgroundColor: '#152d4a',
    padding: 20,
    marginBottom: 15,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(192, 192, 192, 0.3)',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#C0C0C0',
    marginBottom: 15,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(192, 192, 192, 0.3)',
  },
  infoRow: {
    flexDirection: 'row',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(192, 192, 192, 0.2)',
  },
  infoLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#C0C0C0',
    width: 120,
  },
  infoValue: {
    fontSize: 14,
    color: '#fff',
    flex: 1,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 10,
  },
  statCard: {
    backgroundColor: 'rgba(192, 192, 192, 0.1)',
    padding: 15,
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#C0C0C0',
    width: '48%',
    margin: '1%',
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#C0C0C0',
  },
  statLabel: {
    fontSize: 12,
    color: '#a0a0a0',
    marginTop: 3,
  },
  emptyState: {
    padding: 30,
    alignItems: 'center',
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: 10,
  },
  emptyText: {
    fontSize: 14,
    color: '#a0a0a0',
    textAlign: 'center',
  },
  emptySubtext: {
    fontSize: 12,
    color: '#808080',
    textAlign: 'center',
    marginTop: 5,
  },
  documentCard: {
    backgroundColor: 'rgba(192, 192, 192, 0.1)',
    padding: 15,
    borderRadius: 8,
    marginBottom: 10,
    borderLeftWidth: 4,
    borderLeftColor: '#C0C0C0',
  },
  documentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  documentTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
    flex: 1,
  },
  documentBadge: {
    fontSize: 12,
    color: '#a0a0a0',
    backgroundColor: 'rgba(192, 192, 192, 0.2)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  documentDetail: {
    fontSize: 14,
    color: '#fff',
    marginBottom: 4,
  },
  documentDate: {
    fontSize: 12,
    color: '#808080',
    marginTop: 4,
  },
  billingSummaryContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 15,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(192, 192, 192, 0.3)',
  },
  billingSummary: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
  },
  infoSection: {
    flexDirection: 'row',
    backgroundColor: 'rgba(192, 192, 192, 0.1)',
    padding: 15,
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#C0C0C0',
    marginTop: 10,
  },
  infoIcon: {
    fontSize: 20,
    marginRight: 10,
  },
  infoText: {
    flex: 1,
    fontSize: 14,
    color: '#a0a0a0',
    lineHeight: 20,
  },
  backButtonBottom: {
    backgroundColor: '#152d4a',
    padding: 15,
    margin: 15,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#C0C0C0',
    alignItems: 'center',
  },
  backButtonBottomText: {
    color: '#C0C0C0',
    fontSize: 16,
    fontWeight: '600',
  },
  progressSummary: {
    backgroundColor: 'rgba(192, 192, 192, 0.1)',
    padding: 15,
    borderRadius: 8,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#C0C0C0',
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
    color: '#C0C0C0',
    flex: 1,
  },
  progressPercentage: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
  },
  progressBarBackground: {
    height: 20,
    backgroundColor: '#1E3A5F',
    borderRadius: 10,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(192, 192, 192, 0.3)',
    marginBottom: 10,
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#C0C0C0',
  },
  progressStatsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 5,
  },
  progressStat: {
    fontSize: 14,
    color: '#a0a0a0',
    fontWeight: '500',
  },
  viewRoadmapButton: {
    backgroundColor: '#C0C0C0',
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
    marginBottom: 15,
  },
  viewRoadmapButtonText: {
    color: '#1E3A5F',
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
    backgroundColor: '#1E3A5F',
    borderWidth: 2,
    borderColor: '#a0a0a0',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
  },
  roadmapStageBadgeCompleted: {
    backgroundColor: '#C0C0C0',
    borderColor: '#fff',
  },
  roadmapStageBadgeCurrent: {
    backgroundColor: '#152d4a',
    borderColor: '#C0C0C0',
    borderWidth: 3,
  },
  roadmapStageBadgeText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#a0a0a0',
  },
  roadmapStageBadgeTextCompleted: {
    color: '#1E3A5F',
  },
  roadmapStageInfo: {
    flex: 1,
    paddingTop: 2,
  },
  roadmapStageName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 3,
  },
  roadmapStageNameCurrent: {
    color: '#C0C0C0',
    fontWeight: 'bold',
  },
  roadmapStageProgress: {
    fontSize: 13,
    color: '#a0a0a0',
  },
  roadmapStageDate: {
    fontSize: 12,
    color: '#4ade80',
    marginTop: 2,
  },
  roadmapConnector: {
    width: 2,
    height: 15,
    backgroundColor: 'rgba(192, 192, 192, 0.3)',
    marginLeft: 19,
    marginVertical: 2,
  },
  medicalHubBackground: {
    minHeight: 500,
    width: '100%',
  },
  medicalHubOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  medicalHubContent: {
    flex: 1,
    paddingBottom: 30,
  },
  medicalHubSection: {
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderWidth: 2,
    borderColor: '#FFD700',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  medicalHubSectionTitle: {
    color: '#2c3e50',
    fontWeight: 'bold',
  },
  medicalHubInfoSection: {
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    borderColor: '#FFD700',
    borderWidth: 1,
  },
});

export default LawFirmClientDetailsScreen;

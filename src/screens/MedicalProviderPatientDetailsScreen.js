import React, { useState, useEffect } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet, ActivityIndicator, useWindowDimensions
} from 'react-native';
import Svg, { Path, Circle } from 'react-native-svg';
import { theme } from '../styles/theme';
import { API_BASE_URL, API_ENDPOINTS } from '../config/api';
import { LITIGATION_STAGES } from '../constants/mockData';
import { pickDocument, pickImage, pickImageFromLibrary, createFormDataFromFile } from '../utils/fileUpload';
import alert from '../utils/alert';
import UploadModal from '../components/UploadModal';

const MedicalProviderPatientDetailsScreen = ({ user, patientId, onBack }) => {
  const { width } = useWindowDimensions();
  const [loading, setLoading] = useState(true);
  const [patient, setPatient] = useState(null);
  const [litigationProgress, setLitigationProgress] = useState(null);
  const [medicalRecords, setMedicalRecords] = useState([]);
  const [medicalBilling, setMedicalBilling] = useState([]);
  const [evidence, setEvidence] = useState([]);
  const [activeTab, setActiveTab] = useState('roadmap');
  const [uploading, setUploading] = useState(false);
  const [uploadModalVisible, setUploadModalVisible] = useState(false);
  const [currentDocumentType, setCurrentDocumentType] = useState(null);

  useEffect(() => {
    fetchPatientDetails();
  }, [patientId]);

  const fetchPatientDetails = async () => {
    try {
      const response = await fetch(
        `${API_BASE_URL}${API_ENDPOINTS.MEDICALPROVIDER.PATIENT_DETAILS(patientId)}`,
        {
          headers: {
            'Authorization': `Bearer ${user.token}`
          }
        }
      );

      if (response.ok) {
        const data = await response.json();
        setPatient(data.patient);
        setLitigationProgress(data.litigationProgress);
        
        // Set patient-specific documents
        setMedicalRecords(data.medicalRecords || []);
        setMedicalBilling(data.medicalBilling || []);
        setEvidence(data.evidence || []);
      } else {
        console.error('Failed to fetch patient details');
      }
    } catch (error) {
      console.error('Error fetching patient details:', error);
    } finally {
      setLoading(false);
    }
  };

  const mergeCompletedSubstages = () => {
    if (!litigationProgress || !litigationProgress.completedSubstages) {
      return LITIGATION_STAGES;
    }

    const stagesWithProgress = JSON.parse(JSON.stringify(LITIGATION_STAGES));

    // Map numeric stage IDs to string prefixes
    const stageIdToPrefix = {
      1: 'pre-',
      2: 'cf-',
      3: 'disc-',
      4: 'dep-',
      5: 'med-',
      6: 'tp-',
      7: 'trial-',
      8: 'settle-',
      9: 'cr-'
    };

    litigationProgress.completedSubstages.forEach(completedSubstage => {
      const stageIndex = stagesWithProgress.findIndex(s => s.id === completedSubstage.stage_id);
      if (stageIndex !== -1) {
        const stage = stagesWithProgress[stageIndex];
        
        // Safety check: ensure subStages array exists (note: LITIGATION_STAGES uses camelCase 'subStages')
        if (stage.subStages && Array.isArray(stage.subStages)) {
          // Convert database format "4-0" to mockData format "dep-1"
          // Database uses numeric stage_id and zero-based index
          // Frontend uses string prefix and one-based index
          let matchingSubstageId = completedSubstage.substage_id;
          
          // Check if substage_id is in numeric format (e.g., "4-0", "3-2")
          if (/^\d+-\d+$/.test(completedSubstage.substage_id)) {
            const parts = completedSubstage.substage_id.split('-');
            const stageId = parseInt(parts[0]);
            const zeroBasedIndex = parseInt(parts[1]);
            const prefix = stageIdToPrefix[stageId];
            
            if (prefix) {
              // Convert zero-based to one-based
              matchingSubstageId = `${prefix}${zeroBasedIndex + 1}`;
            }
          }

          const substageIndex = stage.subStages.findIndex(sub => 
            sub.id === matchingSubstageId
          );

          if (substageIndex !== -1) {
            stage.subStages[substageIndex].completed = true;
            stage.subStages[substageIndex].completedAt = completedSubstage.completed_at;
          }
        }
      }
    });

    stagesWithProgress.forEach(stage => {
      // Safety check: ensure subStages array exists
      if (stage.subStages && Array.isArray(stage.subStages)) {
        const hasAnyCompleted = stage.subStages.some(sub => sub.completed);
        if (hasAnyCompleted) {
          stage.completed = stage.subStages.every(sub => sub.completed);
        }
      }
    });

    return stagesWithProgress;
  };

  const renderRoadmapPath = () => {
    const stages = mergeCompletedSubstages();
    const mapWidth = width - 40;
    const mapHeight = 600;
    const centerX = mapWidth / 2;

    const stagePositions = [
      { x: centerX - 100, y: 50 },
      { x: centerX + 80, y: 120 },
      { x: centerX - 120, y: 200 },
      { x: centerX + 100, y: 280 },
      { x: centerX - 80, y: 360 },
      { x: centerX + 90, y: 440 },
      { x: centerX - 110, y: 520 },
      { x: centerX + 70, y: 590 },
      { x: centerX, y: 660 }
    ];

    const paths = [];
    const circles = [];

    for (let i = 0; i < stagePositions.length - 1; i++) {
      const start = stagePositions[i];
      const end = stagePositions[i + 1];
      const stage = stages[i];
      
      // Determine stage status: complete, in-progress, or not started
      const isComplete = stage.completed === true;
      const hasAnyCompleted = (stage.subStages && Array.isArray(stage.subStages)) 
        ? stage.subStages.some(sub => sub.completed === true) 
        : false;
      const isInProgress = !isComplete && hasAnyCompleted;
      
      // Color coding: green for complete, yellow for in-progress, gray for not started
      let pathColor = theme.colors.warmGray;
      if (isComplete) {
        pathColor = '#27ae60'; // Green
      } else if (isInProgress) {
        pathColor = '#f39c12'; // Yellow/Amber
      }
      
      const strokeDasharray = (isComplete || isInProgress) ? "5,5" : "0";

      const controlX1 = start.x + (end.x - start.x) / 3;
      const controlY1 = start.y + (end.y - start.y) / 3 + 30;
      const controlX2 = start.x + 2 * (end.x - start.x) / 3;
      const controlY2 = start.y + 2 * (end.y - start.y) / 3 - 30;

      paths.push(
        <Path
          key={`path-${i}`}
          d={`M ${start.x} ${start.y} C ${controlX1} ${controlY1}, ${controlX2} ${controlY2}, ${end.x} ${end.y}`}
          stroke={pathColor}
          strokeWidth="3"
          fill="none"
          strokeDasharray={strokeDasharray}
        />
      );
    }

    stages.forEach((stage, index) => {
      const pos = stagePositions[index];
      
      // Determine stage status: complete, in-progress, or not started
      const isComplete = stage.completed === true;
      const hasAnyCompleted = (stage.subStages && Array.isArray(stage.subStages)) 
        ? stage.subStages.some(sub => sub.completed === true) 
        : false;
      const isInProgress = !isComplete && hasAnyCompleted;
      
      // Color coding: green for complete, yellow for in-progress, gray for not started
      let circleColor = theme.colors.warmGray;
      if (isComplete) {
        circleColor = '#27ae60'; // Green
      } else if (isInProgress) {
        circleColor = '#f39c12'; // Yellow/Amber
      }
      
      console.log(`Stage ${index} (${stage.name}): isComplete=${isComplete}, isInProgress=${isInProgress}, hasAnyCompleted=${hasAnyCompleted}, color=${circleColor}`);
      
      const circleIcon = isComplete ? '✓' : stage.icon;

      circles.push(
        <Circle
          key={`circle-${index}`}
          cx={pos.x}
          cy={pos.y}
          r="25"
          fill={circleColor}
          stroke={theme.colors.navy}
          strokeWidth="2"
        />
      );
    });

    return (
      <View style={styles.mapContainer}>
        <Svg width={mapWidth} height={750}>
          {paths}
          {circles}
        </Svg>
        
        {stages.map((stage, index) => {
          const pos = stagePositions[index];
          const hasProgress = stage.completed || (stage.subStages && stage.subStages.some(sub => sub.completed));
          const completedCount = stage.subStages ? stage.subStages.filter(sub => sub.completed).length : 0;
          const totalCount = stage.subStages ? stage.subStages.length : 0;
          
          return (
            <View
              key={`label-${index}`}
              style={[
                styles.stageLabel,
                {
                  position: 'absolute',
                  left: pos.x - 60,
                  top: pos.y + 30,
                }
              ]}
            >
              <Text style={styles.stageName}>{stage.name}</Text>
              {hasProgress && (
                <Text style={styles.stageProgress}>
                  {completedCount}/{totalCount} Complete
                </Text>
              )}
            </View>
          );
        })}
      </View>
    );
  };

  const renderRoadmapTab = () => {
    const stages = mergeCompletedSubstages();
    
    return (
      <View style={styles.tabContent}>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>🗺️ Litigation Journey</Text>
          <View style={styles.progressSummary}>
            <Text style={styles.progressLabel}>Overall Progress:</Text>
            <View style={styles.progressBarContainer}>
              <View 
                style={[
                  styles.progressBarFill, 
                  { width: `${litigationProgress?.progress?.progress_percentage || 0}%` }
                ]} 
              />
            </View>
            <Text style={styles.progressPercentage}>
              {litigationProgress?.progress?.progress_percentage || 0}% Complete
            </Text>
          </View>
          {renderRoadmapPath()}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>📋 Stage Details</Text>
          {stages.map((stage, index) => {
            if (!stage.subStages || !Array.isArray(stage.subStages)) return null;
            
            const completedCount = stage.subStages.filter(sub => sub.completed).length;
            const hasProgress = completedCount > 0;
            
            if (!hasProgress) return null;
            
            return (
              <View key={index} style={styles.stageDetailCard}>
                <View style={styles.stageDetailHeader}>
                  <Text style={styles.stageDetailIcon}>{stage.icon}</Text>
                  <Text style={styles.stageDetailName}>{stage.name}</Text>
                </View>
                <Text style={styles.stageDetailProgress}>
                  {completedCount} of {stage.subStages.length} tasks completed
                </Text>
                <View style={styles.substageList}>
                  {stage.subStages.filter(sub => sub.completed).map((substage, subIndex) => (
                    <Text key={subIndex} style={styles.completedSubstage}>
                      ✓ {substage.name}
                    </Text>
                  ))}
                </View>
              </View>
            );
          })}
        </View>
      </View>
    );
  };

  const handleUploadMedicalBills = () => {
    alert(
      '🏴‍☠️ Ahoy There, Matey!',
      'Blimey! This treasure chest be still under construction by our crew! The Medical Bills upload feature ain\'t ready to set sail just yet. Keep yer eyes on the horizon - we\'ll have it shipshape soon! ⚓'
    );
  };

  const handleUploadMedicalRecords = () => {
    alert(
      '🏴‍☠️ Shiver Me Timbers!',
      'Arrr! The Medical Records vault be locked up tighter than Davy Jones\' locker! Our ship\'s carpenter be workin\' hard to get this feature ready for ye. Check back soon, savvy? ⚓'
    );
  };

  const closeUploadModal = () => {
    setUploadModalVisible(false);
    setTimeout(() => setCurrentDocumentType(null), 300);
  };

  const handleModalTakePhoto = async () => {
    closeUploadModal();
    alert(
      '🏴‍☠️ Hold Yer Horses!',
      'Arrr! This feature be under construction, matey! Our crew is workin\' hard to get it ready for ye. Check back soon! ⚓'
    );
  };

  const handleModalChooseFile = async () => {
    closeUploadModal();
    alert(
      '🏴‍☠️ Hold Yer Horses!',
      'Arrr! This feature be under construction, matey! Our crew is workin\' hard to get it ready for ye. Check back soon! ⚓'
    );
  };

  // DISABLED: Upload functionality under development
  // Will be re-enabled when Medical Hub upload feature is complete
  const pickImageFromCamera = async (documentType) => {
    alert(
      '🏴‍☠️ Feature Coming Soon!',
      'Medical document uploads are currently under development. Stay tuned, matey! ⚓'
    );
  };

  const pickDocumentFromDevice = async (documentType) => {
    alert(
      '🏴‍☠️ Feature Coming Soon!',
      'Medical document uploads are currently under development. Stay tuned, matey! ⚓'
    );
  };

  const uploadFile = async (file, documentType) => {
    alert(
      '🏴‍☠️ Feature Coming Soon!',
      'Medical document uploads are currently under development. Stay tuned, matey! ⚓'
    );
  };

  const renderMedicalHubTab = () => {
    const totalBilled = medicalBilling.reduce((sum, bill) => sum + (parseFloat(bill.total_amount) || 0), 0);

    return (
      <View style={styles.tabContent}>
        {/* Medical Records Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionTitle}>📋 Medical Records</Text>
            <TouchableOpacity 
              style={styles.uploadButtonSmall}
              onPress={handleUploadMedicalRecords}
              disabled={uploading}
            >
              <Text style={styles.uploadButtonSmallText}>
                {uploading ? '⏳' : '📤 Upload'}
              </Text>
            </TouchableOpacity>
          </View>
          
          {medicalRecords.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyIcon}>🏥</Text>
              <Text style={styles.emptyText}>No medical records uploaded yet</Text>
            </View>
          ) : (
            medicalRecords.map((record) => (
              <View key={record.id} style={styles.documentCard}>
                <View style={styles.documentHeader}>
                  <Text style={styles.documentTitle}>📄 {record.record_type || 'Medical Record'}</Text>
                  <Text style={styles.documentBadge}>{record.file_name}</Text>
                </View>
                {record.facility_name && (
                  <Text style={styles.documentDetail}>🏥 {record.facility_name}</Text>
                )}
                {record.provider_name && (
                  <Text style={styles.documentDetail}>👨‍⚕️ {record.provider_name}</Text>
                )}
                {record.date_of_service && (
                  <Text style={styles.documentDetail}>
                    📅 Service: {new Date(record.date_of_service).toLocaleDateString()}
                  </Text>
                )}
                <Text style={styles.documentDate}>
                  Uploaded: {new Date(record.uploaded_at).toLocaleDateString()}
                </Text>
              </View>
            ))
          )}
        </View>

        {/* Medical Billing Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionTitle}>💊 Medical Billing</Text>
            <TouchableOpacity 
              style={styles.uploadButtonSmall}
              onPress={handleUploadMedicalBills}
              disabled={uploading}
            >
              <Text style={styles.uploadButtonSmallText}>
                {uploading ? '⏳' : '📤 Upload'}
              </Text>
            </TouchableOpacity>
          </View>
          
          {medicalBilling.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyIcon}>💰</Text>
              <Text style={styles.emptyText}>No medical bills uploaded yet</Text>
            </View>
          ) : (
            <>
              <View style={styles.billingSummary}>
                <View style={styles.billingRow}>
                  <Text style={styles.billingLabel}>Total Billed:</Text>
                  <Text style={styles.billingValue}>${totalBilled.toLocaleString()}</Text>
                </View>
                <View style={styles.billingRow}>
                  <Text style={styles.billingLabel}>Total Bills:</Text>
                  <Text style={styles.billingValue}>{medicalBilling.length}</Text>
                </View>
              </View>
              
              {medicalBilling.map((bill) => (
                <View key={bill.id} style={styles.documentCard}>
                  <View style={styles.documentHeader}>
                    <Text style={styles.documentTitle}>💰 {bill.billing_type || 'Medical Bill'}</Text>
                    <Text style={styles.documentBadge}>${parseFloat(bill.total_amount || 0).toFixed(2)}</Text>
                  </View>
                  {bill.facility_name && (
                    <Text style={styles.documentDetail}>🏥 {bill.facility_name}</Text>
                  )}
                  {bill.bill_number && (
                    <Text style={styles.documentDetail}>📝 Bill #: {bill.bill_number}</Text>
                  )}
                  {bill.date_of_service && (
                    <Text style={styles.documentDetail}>
                      📅 Service: {new Date(bill.date_of_service).toLocaleDateString()}
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

        <View style={styles.infoSection}>
          <Text style={styles.infoIcon}>ℹ️</Text>
          <Text style={styles.infoText}>
            All medical records and billing can be accessed by {patient?.displayName}'s law firm with proper consent.
          </Text>
        </View>
      </View>
    );
  };

  const renderEvidenceTab = () => (
    <View style={styles.tabContent}>
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>🗃️ Evidence Locker</Text>
        
        {evidence.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyIcon}>🗃️</Text>
            <Text style={styles.emptyText}>No evidence documents uploaded yet</Text>
            <Text style={styles.emptySubtext}>
              Evidence documents will appear here when uploaded by the patient or their law firm
            </Text>
          </View>
        ) : (
          evidence.map((item) => (
            <View key={item.id} style={styles.documentCard}>
              <View style={styles.documentHeader}>
                <Text style={styles.documentTitle}>📎 {item.evidence_type || 'Evidence'}</Text>
                <Text style={styles.documentBadge}>{item.file_name}</Text>
              </View>
              {item.title && (
                <Text style={styles.documentDetail}>📝 {item.title}</Text>
              )}
              {item.description && (
                <Text style={styles.documentDetail}>📋 {item.description}</Text>
              )}
              {item.location && (
                <Text style={styles.documentDetail}>📍 {item.location}</Text>
              )}
              {item.date_of_incident && (
                <Text style={styles.documentDetail}>
                  📅 Incident: {new Date(item.date_of_incident).toLocaleDateString()}
                </Text>
              )}
              <Text style={styles.documentDate}>
                Uploaded: {new Date(item.uploaded_at).toLocaleDateString()}
              </Text>
            </View>
          ))
        )}
      </View>

      <View style={styles.infoSection}>
        <Text style={styles.infoIcon}>ℹ️</Text>
        <Text style={styles.infoText}>
          Evidence documents are securely shared with proper consent and can be accessed by {patient?.displayName}'s law firm.
        </Text>
      </View>
    </View>
  );

  const renderOverviewTab = () => (
    <View style={styles.tabContent}>
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>👤 Patient Information</Text>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Name:</Text>
          <Text style={styles.infoValue}>{patient?.displayName}</Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Email:</Text>
          <Text style={styles.infoValue}>{patient?.email}</Text>
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
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Tasks Completed:</Text>
          <Text style={styles.infoValue}>
            {litigationProgress?.progress?.total_substages_completed || 0}
          </Text>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>📊 Progress Summary</Text>
        <View style={styles.statsGrid}>
          <View style={styles.statCard}>
            <Text style={styles.statIcon}>🎯</Text>
            <Text style={styles.statValue}>
              {litigationProgress?.progress?.total_substages_completed || 0}
            </Text>
            <Text style={styles.statLabel}>Tasks Done</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statIcon}>🏆</Text>
            <Text style={styles.statValue}>
              {litigationProgress?.progress?.total_coins_earned || 0}
            </Text>
            <Text style={styles.statLabel}>Coins Earned</Text>
          </View>
        </View>
      </View>
    </View>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={theme.colors.mahogany} />
        <Text style={styles.loadingText}>Loading Patient Details...</Text>
      </View>
    );
  }

  if (!patient) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>Patient not found or access denied</Text>
        <TouchableOpacity style={styles.backButton} onPress={onBack}>
          <Text style={styles.backButtonText}>← Back to Dashboard</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack} style={styles.headerBackButton}>
          <Text style={styles.backArrow}>←</Text>
        </TouchableOpacity>
        <View style={styles.headerContent}>
          <Text style={styles.headerTitle}>👤 {patient.displayName}</Text>
          <Text style={styles.headerSubtitle}>Patient Details (Read-Only)</Text>
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

      <UploadModal
        visible={uploadModalVisible}
        onClose={closeUploadModal}
        onTakePhoto={handleModalTakePhoto}
        onChooseFile={handleModalChooseFile}
        subStage={currentDocumentType}
      />
    </View>
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
    color: theme.colors.textSecondary,
    marginBottom: 20,
    textAlign: 'center',
  },
  header: {
    backgroundColor: theme.colors.cream,
    padding: 20,
    borderBottomWidth: 3,
    borderBottomColor: theme.colors.secondary,
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerBackButton: {
    marginRight: 15,
  },
  backArrow: {
    fontSize: 24,
    color: theme.colors.mahogany,
  },
  headerContent: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: theme.colors.mahogany,
  },
  headerSubtitle: {
    fontSize: 13,
    color: theme.colors.textSecondary,
    marginTop: 2,
  },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: theme.colors.cream,
    borderBottomWidth: 2,
    borderBottomColor: theme.colors.secondary,
  },
  tab: {
    flex: 1,
    padding: 12,
    alignItems: 'center',
    borderBottomWidth: 3,
    borderBottomColor: 'transparent',
  },
  activeTab: {
    borderBottomColor: theme.colors.warmGold,
    backgroundColor: theme.colors.lightCream,
  },
  tabIcon: {
    fontSize: 20,
    marginBottom: 4,
  },
  tabText: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    fontWeight: '600',
  },
  activeTabText: {
    color: theme.colors.mahogany,
  },
  content: {
    flex: 1,
  },
  tabContent: {
    padding: 16,
  },
  section: {
    backgroundColor: theme.colors.cream,
    padding: 20,
    marginBottom: 16,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: theme.colors.secondary,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: theme.colors.mahogany,
    marginBottom: 15,
    paddingBottom: 10,
    borderBottomWidth: 2,
    borderBottomColor: theme.colors.secondary,
  },
  sectionDescription: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    marginBottom: 15,
    lineHeight: 20,
  },
  uploadButton: {
    backgroundColor: theme.colors.mahogany,
    padding: 16,
    borderRadius: 10,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: theme.colors.secondary,
  },
  uploadButtonText: {
    color: theme.colors.cream,
    fontSize: 16,
    fontWeight: '600',
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
    paddingBottom: 10,
    borderBottomWidth: 2,
    borderBottomColor: theme.colors.secondary,
  },
  uploadButtonSmall: {
    backgroundColor: theme.colors.mahogany,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: theme.colors.secondary,
  },
  uploadButtonSmallText: {
    color: theme.colors.cream,
    fontSize: 12,
    fontWeight: '600',
  },
  documentCard: {
    backgroundColor: theme.colors.lightCream,
    padding: 15,
    borderRadius: 6,
    marginBottom: 12,
    borderLeftWidth: 4,
    borderLeftColor: theme.colors.warmGold,
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
    color: theme.colors.mahogany,
    flex: 1,
  },
  documentBadge: {
    backgroundColor: theme.colors.warmGold,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    fontSize: 11,
    fontWeight: '600',
    color: theme.colors.navy,
  },
  documentDetail: {
    fontSize: 13,
    color: theme.colors.textSecondary,
    marginBottom: 4,
  },
  documentDate: {
    fontSize: 12,
    color: theme.colors.warmGray,
    marginTop: 4,
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
    fontSize: 16,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    fontWeight: '600',
  },
  billingSummary: {
    backgroundColor: theme.colors.lightCream,
    padding: 15,
    borderRadius: 6,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: theme.colors.warmGold,
  },
  billingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 6,
  },
  billingLabel: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    fontWeight: '600',
  },
  billingValue: {
    fontSize: 16,
    color: theme.colors.mahogany,
    fontWeight: 'bold',
  },
  infoSection: {
    backgroundColor: theme.colors.lightCream,
    padding: 16,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: theme.colors.secondary,
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  infoIcon: {
    fontSize: 20,
    marginRight: 10,
  },
  infoText: {
    flex: 1,
    fontSize: 14,
    color: theme.colors.navy,
    lineHeight: 20,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.secondary,
  },
  infoLabel: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    fontWeight: '600',
  },
  infoValue: {
    fontSize: 14,
    color: theme.colors.navy,
    fontWeight: '500',
  },
  statsGrid: {
    flexDirection: 'row',
    gap: 12,
  },
  statCard: {
    flex: 1,
    backgroundColor: theme.colors.lightCream,
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: theme.colors.warmGold,
  },
  statIcon: {
    fontSize: 32,
    marginBottom: 8,
  },
  statValue: {
    fontSize: 28,
    fontWeight: 'bold',
    color: theme.colors.mahogany,
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    textAlign: 'center',
  },
  progressSummary: {
    marginBottom: 20,
  },
  progressLabel: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    marginBottom: 8,
    fontWeight: '600',
  },
  progressBarContainer: {
    height: 20,
    backgroundColor: theme.colors.sand,
    borderRadius: 10,
    overflow: 'hidden',
    marginBottom: 8,
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#27ae60',
    borderRadius: 10,
  },
  progressPercentage: {
    fontSize: 16,
    color: theme.colors.mahogany,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  mapContainer: {
    position: 'relative',
    marginTop: 20,
  },
  stageLabel: {
    alignItems: 'center',
    width: 120,
  },
  stageName: {
    fontSize: 12,
    color: theme.colors.navy,
    fontWeight: '600',
    textAlign: 'center',
  },
  stageProgress: {
    fontSize: 10,
    color: '#27ae60',
    marginTop: 2,
    textAlign: 'center',
  },
  stageDetailCard: {
    backgroundColor: theme.colors.lightCream,
    padding: 15,
    borderRadius: 6,
    marginBottom: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#27ae60',
  },
  stageDetailHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  stageDetailIcon: {
    fontSize: 24,
    marginRight: 10,
  },
  stageDetailName: {
    fontSize: 18,
    fontWeight: '600',
    color: theme.colors.mahogany,
  },
  stageDetailProgress: {
    fontSize: 13,
    color: theme.colors.textSecondary,
    marginBottom: 10,
  },
  substageList: {
    gap: 6,
  },
  completedSubstage: {
    fontSize: 13,
    color: '#27ae60',
    paddingLeft: 10,
  },
  backButton: {
    backgroundColor: theme.colors.mahogany,
    padding: 15,
    borderRadius: 8,
    marginTop: 20,
  },
  backButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
  backButtonBottom: {
    backgroundColor: theme.colors.mahogany,
    padding: 15,
    borderRadius: 8,
    margin: 16,
    alignItems: 'center',
  },
  backButtonBottomText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default MedicalProviderPatientDetailsScreen;

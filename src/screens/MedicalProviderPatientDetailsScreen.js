import React, { useState, useEffect } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet, ActivityIndicator, useWindowDimensions, ImageBackground, Platform, Linking, Modal
} from 'react-native';
import Svg, { Path, Circle } from 'react-native-svg';
import { medicalProviderTheme as theme } from '../styles/medicalProviderTheme';
import { API_BASE_URL, API_ENDPOINTS } from '../config/api';
import { LITIGATION_STAGES } from '../constants/mockData';
import alert from '../utils/alert';

const MedicalProviderPatientDetailsScreen = ({ user, patientId, onBack }) => {
  const { width } = useWindowDimensions();
  const [loading, setLoading] = useState(true);
  const [patient, setPatient] = useState(null);
  const [litigationProgress, setLitigationProgress] = useState(null);
  const [medicalRecords, setMedicalRecords] = useState([]);
  const [medicalBilling, setMedicalBilling] = useState([]);
  const [evidence, setEvidence] = useState([]);
  const [activeTab, setActiveTab] = useState('roadmap');
  const [uploadingType, setUploadingType] = useState(null);
  const [viewingDocId, setViewingDocId] = useState(null);
  const [showRecordTypeModal, setShowRecordTypeModal] = useState(false);
  const [selectedRecordType, setSelectedRecordType] = useState('Medical Record');

  const RECORD_TYPE_OPTIONS = [
    { label: 'Medical Record', value: 'Medical Record' },
    { label: 'HIPAA Release', value: 'HIPAA Release' },
    { label: 'Imaging / Radiology', value: 'Imaging / Radiology' },
    { label: 'Lab Results', value: 'Lab Results' },
    { label: 'Surgical Report', value: 'Surgical Report' },
    { label: 'Physician Notes', value: 'Physician Notes' },
    { label: 'Discharge Summary', value: 'Discharge Summary' },
    { label: 'Other', value: 'Other' },
  ];

  useEffect(() => {
    fetchPatientDetails();
  }, [patientId]);

  useEffect(() => {
    if (activeTab === 'medical' && patientId && user?.token) {
      fetchPatientRecords();
      fetchPatientBills();
    }
  }, [activeTab, patientId]);

  const fetchPatientDetails = async () => {
    try {
      const url = API_ENDPOINTS.MEDICALPROVIDER.PATIENT_DETAILS(patientId);
      
      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${user.token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setPatient(data.patient);
        setLitigationProgress(data.litigationProgress);
        
        // Set patient-specific documents
        setMedicalRecords(data.medicalRecords || []);
        setMedicalBilling(data.medicalBilling || []);
        setEvidence(data.evidence || []);
      } else {
        const errorData = await response.json().catch(() => ({}));
        console.error('[PatientDetails] Failed response:', response.status, errorData);
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

  const fetchPatientRecords = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/uploads/client/${patientId}/medical-records`, {
        headers: { 'Authorization': `Bearer ${user.token}` }
      });
      if (response.ok) {
        const data = await response.json();
        setMedicalRecords(data.records || []);
      }
    } catch (error) {
      console.error('Error fetching patient medical records:', error);
    }
  };

  const fetchPatientBills = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/uploads/client/${patientId}/medical-bills`, {
        headers: { 'Authorization': `Bearer ${user.token}` }
      });
      if (response.ok) {
        const data = await response.json();
        setMedicalBilling(data.bills || []);
      }
    } catch (error) {
      console.error('Error fetching patient medical bills:', error);
    }
  };

  const getMimeTypeFromExtension = (filename) => {
    const ext = (filename || '').toLowerCase().split('.').pop();
    const mimeMap = {
      'pdf': 'application/pdf',
      'jpg': 'image/jpeg',
      'jpeg': 'image/jpeg',
      'png': 'image/png',
      'heic': 'image/heic',
      'doc': 'application/msword',
      'docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    };
    return mimeMap[ext] || null;
  };

  const handleUploadForPatient = (category) => {
    if (category === 'records') {
      setSelectedRecordType('Medical Record');
      setShowRecordTypeModal(true);
    } else {
      proceedWithUploadForPatient(category);
    }
  };

  const proceedWithUploadForPatient = (category) => {
    if (Platform.OS === 'web') {
      pickFileFromWebForPatient(category);
    } else {
      alert('Upload', 'Choose an option', [
        { text: 'Choose File', onPress: () => pickDocumentForPatient(category) },
        { text: 'Cancel', style: 'cancel' }
      ]);
    }
  };

  const pickFileFromWebForPatient = (category) => {
    try {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = '.pdf,.doc,.docx,.jpg,.jpeg,.png,.heic,image/*';
      input.style.display = 'none';
      document.body.appendChild(input);

      input.onchange = async (e) => {
        try {
          const file = e.target.files[0];
          if (file) {
            let mimeType = file.type;
            if (!mimeType || mimeType === 'application/octet-stream') {
              mimeType = getMimeTypeFromExtension(file.name) || 'application/octet-stream';
            }
            const properFile = mimeType !== file.type
              ? new File([file], file.name, { type: mimeType })
              : file;

            await uploadFileForPatient(properFile, file.name, mimeType, category);
          }
        } catch (err) {
          console.error('Error in file onchange:', err);
          alert('Upload Error', err.message || 'Failed to process selected file.');
          setUploadingType(null);
        } finally {
          document.body.removeChild(input);
        }
      };
      input.click();
    } catch (err) {
      console.error('Error creating file picker:', err);
      alert('Error', 'Failed to open file picker.');
    }
  };

  const pickDocumentForPatient = async (category) => {
    try {
      const DocumentPicker = require('expo-document-picker');
      const result = await DocumentPicker.getDocumentAsync({
        type: ['application/pdf', 'image/*', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
        copyToCacheDirectory: true,
      });
      if (!result.canceled && result.assets && result.assets.length > 0) {
        const asset = result.assets[0];
        await uploadFileForPatient(null, asset.name || asset.fileName, asset.mimeType || asset.type, category, asset);
      }
    } catch (error) {
      console.error('Error picking document:', error);
      alert('Error', 'Failed to pick document.');
    }
  };

  const uploadFileForPatient = async (webFile, fileName, mimeType, category, nativeAsset) => {
    setUploadingType(category);
    try {
      const formData = new FormData();
      if (Platform.OS === 'web' && webFile) {
        formData.append('file', webFile, fileName);
      } else if (nativeAsset) {
        formData.append('file', {
          uri: nativeAsset.uri,
          name: fileName,
          type: mimeType,
        });
      }

      const endpoint = category === 'bills'
        ? `${API_BASE_URL}/api/uploads/client/${patientId}/medical-bill`
        : `${API_BASE_URL}/api/uploads/client/${patientId}/medical-record`;

      if (category === 'bills') {
        formData.append('billingType', 'Medical Bill');
      } else {
        formData.append('recordType', selectedRecordType || 'Medical Record');
      }

      const uploadResponse = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${user.token}` },
        credentials: 'include',
        body: formData,
      });

      if (!uploadResponse.ok) {
        const errorData = await uploadResponse.json().catch(() => ({}));
        throw new Error(errorData.error || 'Upload failed');
      }

      alert('Success', `${category === 'bills' ? 'Medical bill' : 'Medical record'} uploaded successfully for patient.`);

      if (category === 'bills') {
        fetchPatientBills();
      } else {
        fetchPatientRecords();
      }
    } catch (error) {
      console.error('Error uploading file for patient:', error);
      alert('Upload Error', error.message || 'Failed to upload document.');
    } finally {
      setUploadingType(null);
    }
  };

  const handleViewMedicalDoc = async (docId, docType, fileName) => {
    setViewingDocId(docId);
    try {
      const type = docType === 'bill' ? 'bill' : 'record';
      console.log('[MedProviderView] Requesting medical doc view:', type, docId);
      const response = await fetch(`${API_BASE_URL}/api/uploads/medical/${type}/${docId}/view`, {
        headers: { 'Authorization': `Bearer ${user.token}` }
      });
      console.log('[MedProviderView] Response status:', response.status);
      if (!response.ok) {
        const errText = await response.text();
        console.error('[MedProviderView] Error response:', errText);
        let errMsg = 'Failed to retrieve document';
        try { const errData = JSON.parse(errText); errMsg = errData.error || errMsg; } catch (e) {}
        throw new Error(errMsg);
      }
      const data = await response.json();
      if (data.url) {
        let docUrl = data.url;
        if (docUrl.startsWith('/')) {
          docUrl = `${API_BASE_URL}${docUrl}`;
        }
        if (docUrl.includes('/api/uploads/stream/')) {
          docUrl = `${docUrl}${docUrl.includes('?') ? '&' : '?'}token=${user.token}`;
        }
        if (Platform.OS === 'web') {
          const newWin = window.open(docUrl, '_blank');
          if (!newWin) window.location.href = docUrl;
        } else {
          await Linking.openURL(docUrl);
        }
      } else {
        alert('Error', 'Document URL not available.');
      }
    } catch (error) {
      console.error('Error viewing medical document:', error.message || error);
      alert('View Error', error.message || 'Failed to open document.');
    } finally {
      setViewingDocId(null);
    }
  };

  const handleViewEvidence = async (docId, fileName) => {
    setViewingDocId(docId);
    try {
      console.log('[MedProviderView] Requesting evidence view:', docId);
      const response = await fetch(`${API_BASE_URL}/api/uploads/evidence/${docId}/view`, {
        headers: { 'Authorization': `Bearer ${user.token}` }
      });
      console.log('[MedProviderView] Evidence response status:', response.status);
      if (!response.ok) {
        const errText = await response.text();
        console.error('[MedProviderView] Evidence error response:', errText);
        let errMsg = 'Failed to retrieve document';
        try { const errData = JSON.parse(errText); errMsg = errData.error || errMsg; } catch (e) {}
        throw new Error(errMsg);
      }
      const data = await response.json();
      if (data.url) {
        let docUrl = data.url;
        if (docUrl.startsWith('/')) {
          docUrl = `${API_BASE_URL}${docUrl}`;
        }
        if (docUrl.includes('/api/uploads/stream/')) {
          docUrl = `${docUrl}${docUrl.includes('?') ? '&' : '?'}token=${user.token}`;
        }
        if (Platform.OS === 'web') {
          const newWin = window.open(docUrl, '_blank');
          if (!newWin) window.location.href = docUrl;
        } else {
          await Linking.openURL(docUrl);
        }
      } else {
        alert('Error', 'Document URL not available.');
      }
    } catch (error) {
      console.error('Error viewing evidence:', error.message || error);
      alert('View Error', error.message || 'Failed to open document.');
    } finally {
      setViewingDocId(null);
    }
  };

  const renderMedicalHubTab = () => {
    const totalBilled = medicalBilling.reduce((sum, bill) => sum + (parseFloat(bill.total_amount) || 0), 0);
    const isPhone = width < 768;
    const isTablet = width >= 768 && width < 1024;
    const isDesktop = width >= 1024;

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
            <View style={[styles.section, styles.medicalHubSection]}>
              <View style={styles.sectionHeaderRow}>
                <Text style={[
                  styles.sectionTitle,
                  styles.medicalHubSectionTitle,
                  { fontSize: isDesktop ? 24 : 20 }
                ]}>📋 Medical Records</Text>
                <TouchableOpacity
                  style={styles.uploadBtn}
                  onPress={() => handleUploadForPatient('records')}
                  disabled={uploadingType === 'records'}
                >
                  {uploadingType === 'records' ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <Text style={styles.uploadBtnText}>+ Upload Record</Text>
                  )}
                </TouchableOpacity>
              </View>
              
              {medicalRecords.length === 0 ? (
                <View style={styles.emptyState}>
                  <Text style={styles.emptyIcon}>🏥</Text>
                  <Text style={[styles.emptyText, { color: '#2c3e50' }]}>No medical records uploaded yet</Text>
                </View>
              ) : (
                medicalRecords.map((record) => (
                  <TouchableOpacity 
                    key={record.id} 
                    style={styles.documentCard}
                    onPress={() => handleViewMedicalDoc(record.id, 'record', record.file_name)}
                    disabled={viewingDocId === record.id}
                  >
                    <View style={styles.documentHeader}>
                      <Text style={styles.documentTitle}>📄 {record.record_type || 'Medical Record'}</Text>
                      {viewingDocId === record.id ? (
                        <ActivityIndicator size="small" color={theme.colors.primary} />
                      ) : (
                        <Text style={styles.documentBadge}>{record.file_name}</Text>
                      )}
                    </View>
                    {record.facility_name && (
                      <Text style={styles.documentDetail}>🏥 {record.facility_name}</Text>
                    )}
                    {record.provider_name && (
                      <Text style={styles.documentDetail}>👨‍⚕️ {record.provider_name}</Text>
                    )}
                    {record.date_of_service && (
                      <Text style={styles.documentDetail}>
                        📅 Service: {new Date(record.date_of_service).toLocaleDateString('en-US')}
                      </Text>
                    )}
                    <Text style={styles.documentDate}>
                      Uploaded: {new Date(record.uploaded_at).toLocaleDateString('en-US')}
                    </Text>
                    {record.uploaded_by_name && (
                      <Text style={styles.uploaderInfo}>By: {record.uploaded_by_name}</Text>
                    )}
                    <Text style={styles.tapToView}>Tap to view</Text>
                  </TouchableOpacity>
                ))
              )}
            </View>

            <View style={[styles.section, styles.medicalHubSection]}>
              <View style={styles.sectionHeaderRow}>
                <Text style={[
                  styles.sectionTitle,
                  styles.medicalHubSectionTitle,
                  { fontSize: isDesktop ? 24 : 20 }
                ]}>💊 Medical Billing</Text>
                <TouchableOpacity
                  style={styles.uploadBtn}
                  onPress={() => handleUploadForPatient('bills')}
                  disabled={uploadingType === 'bills'}
                >
                  {uploadingType === 'bills' ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <Text style={styles.uploadBtnText}>+ Upload Bill</Text>
                  )}
                </TouchableOpacity>
              </View>
              
              {medicalBilling.length === 0 ? (
                <View style={styles.emptyState}>
                  <Text style={styles.emptyIcon}>💰</Text>
                  <Text style={[styles.emptyText, { color: '#2c3e50' }]}>No medical bills uploaded yet</Text>
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
                    <TouchableOpacity 
                      key={bill.id} 
                      style={styles.documentCard}
                      onPress={() => handleViewMedicalDoc(bill.id, 'bill', bill.file_name)}
                      disabled={viewingDocId === bill.id}
                    >
                      <View style={styles.documentHeader}>
                        <Text style={styles.documentTitle}>💰 {bill.billing_type || 'Medical Bill'}</Text>
                        {viewingDocId === bill.id ? (
                          <ActivityIndicator size="small" color={theme.colors.primary} />
                        ) : (
                          <Text style={styles.documentBadge}>${parseFloat(bill.total_amount || 0).toFixed(2)}</Text>
                        )}
                      </View>
                      {bill.facility_name && (
                        <Text style={styles.documentDetail}>🏥 {bill.facility_name}</Text>
                      )}
                      {bill.bill_number && (
                        <Text style={styles.documentDetail}>📝 Bill #: {bill.bill_number}</Text>
                      )}
                      {bill.date_of_service && (
                        <Text style={styles.documentDetail}>
                          📅 Service: {new Date(bill.date_of_service).toLocaleDateString('en-US')}
                        </Text>
                      )}
                      <Text style={styles.documentDate}>
                        Uploaded: {new Date(bill.uploaded_at).toLocaleDateString('en-US')}
                      </Text>
                      {bill.uploaded_by_name && (
                        <Text style={styles.uploaderInfo}>By: {bill.uploaded_by_name}</Text>
                      )}
                      <Text style={styles.tapToView}>Tap to view</Text>
                    </TouchableOpacity>
                  ))}
                </>
              )}
            </View>

            <View style={[styles.infoSection, styles.medicalHubInfoSection]}>
              <Text style={styles.infoIcon}>ℹ️</Text>
              <Text style={[styles.infoText, { color: '#FFFFFF' }]}>
                All medical records and billing can be accessed by {patient?.displayName}'s law firm with proper consent.
              </Text>
            </View>
          </View>
        </View>
      </ImageBackground>
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
                  📅 Incident: {new Date(item.date_of_incident).toLocaleDateString('en-US')}
                </Text>
              )}
              <Text style={styles.documentDate}>
                Uploaded: {new Date(item.uploaded_at).toLocaleDateString('en-US')}
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
        <ActivityIndicator size="large" color={theme.colors.primary} />
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

      <Modal
        visible={showRecordTypeModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowRecordTypeModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.recordTypeModalContent}>
            <View style={styles.recordTypeModalHeader}>
              <Text style={styles.recordTypeModalTitle}>Select Record Type</Text>
              <TouchableOpacity 
                onPress={() => setShowRecordTypeModal(false)}
              >
                <Text style={{ fontSize: 20, color: '#666', fontWeight: 'bold' }}>✕</Text>
              </TouchableOpacity>
            </View>
            <ScrollView style={{ padding: 16 }}>
              {RECORD_TYPE_OPTIONS.map((option) => (
                <TouchableOpacity
                  key={option.value}
                  style={{
                    padding: 14,
                    borderRadius: 8,
                    marginBottom: 8,
                    backgroundColor: selectedRecordType === option.value ? theme.colors.primary : '#f0f0f0',
                    borderWidth: 1,
                    borderColor: selectedRecordType === option.value ? theme.colors.primary : '#ddd',
                  }}
                  onPress={() => setSelectedRecordType(option.value)}
                >
                  <Text style={{
                    fontSize: 15,
                    fontWeight: selectedRecordType === option.value ? '700' : '400',
                    color: selectedRecordType === option.value ? '#fff' : '#333',
                  }}>
                    {option.value === 'HIPAA Release' ? '🔒 ' : '📄 '}{option.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
            <View style={{ flexDirection: 'row', justifyContent: 'flex-end', padding: 16, gap: 12 }}>
              <TouchableOpacity
                style={{ padding: 12, borderRadius: 8, backgroundColor: '#e0e0e0', minWidth: 80, alignItems: 'center' }}
                onPress={() => setShowRecordTypeModal(false)}
              >
                <Text style={{ color: '#333', fontWeight: '600' }}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={{ padding: 12, borderRadius: 8, backgroundColor: theme.colors.primary, minWidth: 120, alignItems: 'center' }}
                onPress={() => {
                  setShowRecordTypeModal(false);
                  proceedWithUploadForPatient('records');
                }}
              >
                <Text style={{ color: '#fff', fontWeight: '700' }}>Choose File</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: theme.colors.background,
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
    backgroundColor: theme.colors.background,
    padding: 20,
  },
  errorText: {
    fontSize: 16,
    color: theme.colors.textSecondary,
    marginBottom: 20,
    textAlign: 'center',
  },
  header: {
    backgroundColor: theme.colors.cardBackground,
    padding: 20,
    borderBottomWidth: 3,
    borderBottomColor: theme.colors.silver,
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerBackButton: {
    marginRight: 15,
  },
  backArrow: {
    fontSize: 24,
    color: theme.colors.primary,
  },
  headerContent: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: theme.colors.primary,
  },
  headerSubtitle: {
    fontSize: 13,
    color: theme.colors.textSecondary,
    marginTop: 2,
  },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: theme.colors.cardBackground,
    borderBottomWidth: 2,
    borderBottomColor: theme.colors.silver,
  },
  tab: {
    flex: 1,
    padding: 12,
    alignItems: 'center',
    borderBottomWidth: 3,
    borderBottomColor: 'transparent',
  },
  activeTab: {
    borderBottomColor: theme.colors.primaryLight,
    backgroundColor: theme.colors.offWhite,
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
    color: theme.colors.primary,
  },
  content: {
    flex: 1,
  },
  tabContent: {
    padding: 16,
  },
  section: {
    backgroundColor: theme.colors.cardBackground,
    padding: 20,
    marginBottom: 16,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: theme.colors.silver,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: theme.colors.primary,
    marginBottom: 15,
    paddingBottom: 10,
    borderBottomWidth: 2,
    borderBottomColor: theme.colors.silver,
  },
  sectionDescription: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    marginBottom: 15,
    lineHeight: 20,
  },
  uploadButton: {
    backgroundColor: theme.colors.primary,
    padding: 16,
    borderRadius: 10,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: theme.colors.silver,
  },
  uploadButtonText: {
    color: theme.colors.cardBackground,
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
    borderBottomColor: theme.colors.silver,
  },
  uploadButtonSmall: {
    backgroundColor: theme.colors.primary,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: theme.colors.silver,
  },
  uploadButtonSmallText: {
    color: theme.colors.cardBackground,
    fontSize: 12,
    fontWeight: '600',
  },
  comingSoonBadge: {
    backgroundColor: theme.colors.primaryLight,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
    fontSize: 11,
    fontWeight: '600',
    color: theme.colors.primary,
    borderWidth: 1,
    borderColor: theme.colors.silver,
  },
  uploadBtn: {
    backgroundColor: theme.colors.primary,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 6,
  },
  uploadBtnText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '600',
  },
  tapToView: {
    fontSize: 11,
    color: theme.colors.primary,
    fontStyle: 'italic',
    marginTop: 4,
  },
  documentCard: {
    backgroundColor: theme.colors.offWhite,
    padding: 15,
    borderRadius: 6,
    marginBottom: 12,
    borderLeftWidth: 4,
    borderLeftColor: theme.colors.primaryLight,
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
    color: theme.colors.primary,
    flex: 1,
  },
  documentBadge: {
    backgroundColor: theme.colors.primaryLight,
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
  uploaderInfo: {
    fontSize: 11,
    color: '#4FC3F7',
    fontStyle: 'italic',
    marginTop: 2,
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
    backgroundColor: theme.colors.offWhite,
    padding: 15,
    borderRadius: 6,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: theme.colors.primaryLight,
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
    color: theme.colors.primary,
    fontWeight: 'bold',
  },
  infoSection: {
    backgroundColor: theme.colors.offWhite,
    padding: 16,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: theme.colors.silver,
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
    borderBottomColor: theme.colors.silver,
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
    backgroundColor: theme.colors.offWhite,
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: theme.colors.primaryLight,
  },
  statIcon: {
    fontSize: 32,
    marginBottom: 8,
  },
  statValue: {
    fontSize: 28,
    fontWeight: 'bold',
    color: theme.colors.primary,
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
    backgroundColor: theme.colors.background,
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
    color: theme.colors.primary,
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
    backgroundColor: theme.colors.offWhite,
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
    color: theme.colors.primary,
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
    backgroundColor: theme.colors.primary,
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
    backgroundColor: theme.colors.primary,
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
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  recordTypeModalContent: {
    backgroundColor: '#fff',
    borderRadius: 12,
    width: '90%',
    maxWidth: 400,
    maxHeight: 500,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 10,
  },
  recordTypeModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  recordTypeModalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#333',
  },
});

export default MedicalProviderPatientDetailsScreen;

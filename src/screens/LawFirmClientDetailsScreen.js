import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, ActivityIndicator, ImageBackground, useWindowDimensions, Image, Modal, Linking, Platform } from 'react-native';
import alert from '../utils/alert';
import { theme } from '../styles/theme';
import { API_BASE_URL, API_ENDPOINTS } from '../config/api';

const LawFirmClientDetailsScreen = ({ user, clientId, onBack, onNavigate }) => {
  const { width, height } = useWindowDimensions();
  const [clientData, setClientData] = useState(null);
  const [litigationProgress, setLitigationProgress] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  const [viewingDocument, setViewingDocument] = useState(null);
  const [documentLoading, setDocumentLoading] = useState(false);
  const [imageLoading, setImageLoading] = useState(true);
  const [uploadingType, setUploadingType] = useState(null);
  const [medicalRecordsList, setMedicalRecordsList] = useState([]);
  const [medicalBillsList, setMedicalBillsList] = useState([]);
  const [loadingRecords, setLoadingRecords] = useState(false);
  const [loadingBills, setLoadingBills] = useState(false);
  const [viewingDocId, setViewingDocId] = useState(null);
  const [showRecordTypeModal, setShowRecordTypeModal] = useState(false);
  const [selectedRecordType, setSelectedRecordType] = useState('Medical Record');
  
  const RECORD_TYPE_OPTIONS = [
    { label: 'Medical Record', value: 'Medical Record' },
    { label: 'HIPAA Release', value: 'HIPAA Release' },
    { label: 'Police Report', value: 'Police Report' },
    { label: 'Pictures / Photos', value: 'Pictures' },
    { label: 'Health Insurance Card', value: 'Health Insurance Card' },
    { label: 'Imaging / Radiology', value: 'Imaging / Radiology' },
    { label: 'Lab Results', value: 'Lab Results' },
    { label: 'Surgical Report', value: 'Surgical Report' },
    { label: 'Physician Notes', value: 'Physician Notes' },
    { label: 'Discharge Summary', value: 'Discharge Summary' },
    { label: 'Chiropractor', value: 'Chiropractor' },
    { label: 'Ortho', value: 'Ortho' },
    { label: 'Physical Therapy', value: 'Physical Therapy' },
    { label: 'Other', value: 'Other' },
  ];

  const isPhone = width < 768;
  const isTablet = width >= 768 && width < 1024;
  const isDesktop = width >= 1024;

  useEffect(() => {
    fetchClientDetails();
    fetchClientLitigationProgress();
    fetchClientRecords();
    fetchClientBills();
  }, [clientId]);

  const fetchClientDetails = async () => {
    try {
      
      const response = await fetch(
        API_ENDPOINTS.LAWFIRM.CLIENT_DETAILS(clientId),
        {
          headers: {
            'Authorization': `Bearer ${user.token}`
          }
        }
      );
      
      
      if (response.ok) {
        const data = await response.json();
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
      
      const response = await fetch(
        `${API_BASE_URL}/api/litigation/client/${clientId}/progress`,
        {
          headers: {
            'Authorization': `Bearer ${user.token}`
          }
        }
      );
      
      
      if (response.ok) {
        const data = await response.json();
        setLitigationProgress(data);
      } else {
        const errorData = await response.json();
        console.error('[ClientDetails] Failed litigation progress response:', response.status, errorData);
      }
    } catch (error) {
      console.error('[ClientDetails] Error fetching client litigation progress:', error);
    }
  };

  const fetchClientRecords = async () => {
    setLoadingRecords(true);
    try {
      const response = await fetch(`${API_BASE_URL}/api/uploads/client/${clientId}/medical-records`, {
        headers: { 'Authorization': `Bearer ${user.token}` }
      });
      if (response.ok) {
        const data = await response.json();
        setMedicalRecordsList(data.records || []);
      }
    } catch (error) {
      console.error('Error fetching client medical records:', error);
    } finally {
      setLoadingRecords(false);
    }
  };

  const fetchClientBills = async () => {
    setLoadingBills(true);
    try {
      const response = await fetch(`${API_BASE_URL}/api/uploads/client/${clientId}/medical-bills`, {
        headers: { 'Authorization': `Bearer ${user.token}` }
      });
      if (response.ok) {
        const data = await response.json();
        setMedicalBillsList(data.bills || []);
      }
    } catch (error) {
      console.error('Error fetching client medical bills:', error);
    } finally {
      setLoadingBills(false);
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

  const handleUploadForClient = (category) => {
    if (category === 'records') {
      setSelectedRecordType('Medical Record');
      setShowRecordTypeModal(true);
    } else {
      proceedWithUpload(category);
    }
  };

  const proceedWithUpload = (category) => {
    if (Platform.OS === 'web') {
      pickFileFromWebForClient(category);
    } else {
      alert('Upload', 'Choose an option', [
        { text: 'Choose File', onPress: () => pickDocumentForClient(category) },
        { text: 'Cancel', style: 'cancel' }
      ]);
    }
  };

  const pickFileFromWebForClient = (category) => {
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

            await uploadFileForClient(properFile, file.name, mimeType, category);
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

  const pickDocumentForClient = async (category) => {
    try {
      const DocumentPicker = require('expo-document-picker');
      const result = await DocumentPicker.getDocumentAsync({
        type: ['application/pdf', 'image/*', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
        copyToCacheDirectory: true,
      });
      if (!result.canceled && result.assets && result.assets.length > 0) {
        const asset = result.assets[0];
        await uploadFileForClient(null, asset.name || asset.fileName, asset.mimeType || asset.type, category, asset);
      }
    } catch (error) {
      console.error('Error picking document:', error);
      alert('Error', 'Failed to pick document.');
    }
  };

  const uploadFileForClient = async (webFile, fileName, mimeType, category, nativeAsset) => {
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
        ? `${API_BASE_URL}/api/uploads/client/${clientId}/medical-bill`
        : `${API_BASE_URL}/api/uploads/client/${clientId}/medical-record`;

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

      const data = await uploadResponse.json();
      alert('Success', `${category === 'bills' ? 'Medical bill' : 'Medical record'} uploaded successfully for client.`);

      if (category === 'bills') {
        fetchClientBills();
      } else {
        fetchClientRecords();
      }
      fetchClientDetails();
    } catch (error) {
      console.error('Error uploading file for client:', error);
      alert('Upload Error', error.message || 'Failed to upload document.');
    } finally {
      setUploadingType(null);
    }
  };

  const handleViewMedicalDoc = async (docId, docType, fileName) => {
    setViewingDocId(docId);
    let preOpenedWindow = null;
    if (Platform.OS === 'web') {
      preOpenedWindow = window.open('about:blank', '_blank');
    }
    try {
      const type = docType === 'bill' ? 'bill' : 'record';
      const response = await fetch(`${API_BASE_URL}/api/uploads/medical/${type}/${docId}/view`, {
        headers: { 'Authorization': `Bearer ${user.token}` }
      });
      if (!response.ok) {
        const errText = await response.text();
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
          if (preOpenedWindow) {
            preOpenedWindow.location.href = docUrl;
          } else {
            const a = document.createElement('a');
            a.href = docUrl;
            a.target = '_blank';
            a.rel = 'noopener noreferrer';
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
          }
        } else {
          await Linking.openURL(docUrl);
        }
      } else {
        if (preOpenedWindow) preOpenedWindow.close();
        alert('Error', 'Document URL not available.');
      }
    } catch (error) {
      if (preOpenedWindow) preOpenedWindow.close();
      console.error('Error viewing medical document:', error.message || error);
      alert('View Error', error.message || 'Failed to open document.');
    } finally {
      setViewingDocId(null);
    }
  };

  const isImageFile = (mimeType) => {
    return mimeType && mimeType.startsWith('image/');
  };

  const viewDocument = async (doc) => {
    // Check if evidence is expired (30+ days old)
    const expired = isEvidenceExpired(doc.uploaded_at);
    
    if (expired) {
      alert(
        '⚠️ Evidence Expired',
        'This evidence is 30+ days old and has expired. Expired evidence cannot be viewed.',
        [
          {
            text: 'OK',
            style: 'default'
          }
        ]
      );
      return;
    }
    
    proceedWithViewDocument(doc);
  };

  const proceedWithViewDocument = async (doc) => {
    setDocumentLoading(true);
    setImageLoading(true);
    let preOpenedWindow = null;
    if (Platform.OS === 'web' && !isImageFile(doc.mime_type)) {
      preOpenedWindow = window.open('about:blank', '_blank');
    }
    try {
      const response = await fetch(
        `${API_BASE_URL}/api/uploads/download/evidence/${doc.id}`,
        {
          headers: {
            'Authorization': `Bearer ${user.token}`
          }
        }
      );

      if (response.ok) {
        const data = await response.json();
        
        let imageUrl = data.presignedUrl;
        if (imageUrl && imageUrl.startsWith('/')) {
          imageUrl = `${API_BASE_URL}${imageUrl}`;
        }
        
        if (isImageFile(doc.mime_type)) {
          if (data.storageType === 's3' || imageUrl.includes('amazonaws.com') || imageUrl.includes('s3.')) {
            setViewingDocument({
              ...doc,
              presignedUrl: imageUrl
            });
          } else {
            try {
              const imageResponse = await fetch(imageUrl, {
                headers: {
                  'Authorization': `Bearer ${user.token}`
                }
              });
              
              if (imageResponse.ok) {
                const blob = await imageResponse.blob();
                const reader = new FileReader();
                
                reader.onloadend = () => {
                  const base64data = reader.result;
                  setViewingDocument({
                    ...doc,
                    presignedUrl: base64data
                  });
                };
                
                reader.onerror = (error) => {
                  console.error('[View Document] Error reading blob:', error);
                  const urlWithToken = `${imageUrl}${imageUrl.includes('?') ? '&' : '?'}token=${user.token}`;
                  setViewingDocument({
                    ...doc,
                    presignedUrl: urlWithToken
                  });
                };
                
                reader.readAsDataURL(blob);
              } else {
                const urlWithToken = `${imageUrl}${imageUrl.includes('?') ? '&' : '?'}token=${user.token}`;
                setViewingDocument({
                  ...doc,
                  presignedUrl: urlWithToken
                });
              }
            } catch (fetchError) {
              console.error('[View Document] Error fetching image:', fetchError);
              const urlWithToken = `${imageUrl}${imageUrl.includes('?') ? '&' : '?'}token=${user.token}`;
              setViewingDocument({
                ...doc,
                presignedUrl: urlWithToken
              });
            }
          }
        } else {
          let nonImageUrl = data.presignedUrl;
          if (nonImageUrl && nonImageUrl.startsWith('/')) {
            nonImageUrl = `${API_BASE_URL}${nonImageUrl}`;
          }
          if (nonImageUrl && nonImageUrl.includes('/api/uploads/stream/')) {
            nonImageUrl = `${nonImageUrl}${nonImageUrl.includes('?') ? '&' : '?'}token=${user.token}`;
          }
          if (Platform.OS === 'web') {
            if (preOpenedWindow) {
              preOpenedWindow.location.href = nonImageUrl;
            } else {
              const a = document.createElement('a');
              a.href = nonImageUrl;
              a.target = '_blank';
              a.rel = 'noopener noreferrer';
              document.body.appendChild(a);
              a.click();
              document.body.removeChild(a);
            }
          } else {
            Linking.openURL(nonImageUrl);
          }
        }
      } else {
        if (preOpenedWindow) preOpenedWindow.close();
        const errText = await response.text();
        let errMsg = 'Failed to load document. Please try again.';
        try { const errData = JSON.parse(errText); errMsg = errData.error || errMsg; } catch (e) {}
        alert('View Error', errMsg);
      }
    } catch (error) {
      if (preOpenedWindow) preOpenedWindow.close();
      console.error('Error viewing document:', error.message || error);
      alert('View Error', 'Failed to load document. Please try again.');
    } finally {
      setDocumentLoading(false);
    }
  };

  const downloadDocument = async (doc) => {
    // Check if evidence is expired
    const expired = isEvidenceExpired(doc.uploaded_at);
    
    if (expired) {
      alert(
        '⚠️ Evidence Expired',
        'This evidence is 30+ days old and has expired. Expired evidence cannot be downloaded.',
        [
          {
            text: 'OK',
            style: 'default'
          }
        ]
      );
      return;
    }
    
    proceedWithDownloadDocument(doc);
  };

  const proceedWithDownloadDocument = async (doc) => {
    setDocumentLoading(true);
    let preOpenedWindow = null;
    if (Platform.OS === 'web') {
      preOpenedWindow = window.open('about:blank', '_blank');
    }
    try {
      const response = await fetch(
        `${API_BASE_URL}/api/uploads/download/evidence/${doc.id}`,
        {
          headers: {
            'Authorization': `Bearer ${user.token}`
          }
        }
      );

      if (response.ok) {
        const data = await response.json();
        let downloadUrl = data.presignedUrl;
        if (downloadUrl && downloadUrl.startsWith('/')) {
          downloadUrl = `${API_BASE_URL}${downloadUrl}`;
        }
        if (downloadUrl && downloadUrl.includes('/api/uploads/stream/')) {
          downloadUrl = `${downloadUrl}${downloadUrl.includes('?') ? '&' : '?'}token=${user.token}`;
        }
        if (Platform.OS === 'web') {
          if (preOpenedWindow) {
            preOpenedWindow.location.href = downloadUrl;
          } else {
            const a = document.createElement('a');
            a.href = downloadUrl;
            a.target = '_blank';
            a.rel = 'noopener noreferrer';
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
          }
        } else {
          Linking.openURL(downloadUrl);
        }
      } else {
        if (preOpenedWindow) preOpenedWindow.close();
        const errText = await response.text();
        let errMsg = 'Failed to download document. Please try again.';
        try { const errData = JSON.parse(errText); errMsg = errData.error || errMsg; } catch (e) {}
        alert('Download Error', errMsg);
      }
    } catch (error) {
      if (preOpenedWindow) preOpenedWindow.close();
      console.error('Error downloading document:', error.message || error);
      alert('Download Error', 'Failed to download document. Please try again.');
    } finally {
      setDocumentLoading(false);
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
    const { client } = clientData;
    const records = medicalRecordsList;
    const bills = medicalBillsList;
    const totalBilled = bills.reduce((sum, b) => sum + (parseFloat(b.total_amount) || 0), 0);
    const totalDue = bills.reduce((sum, b) => sum + (parseFloat(b.amount_due) || 0), 0);

    return (
      <View style={styles.tabContent}>
        <View style={[
          styles.medicalHubContent,
          { 
            paddingHorizontal: isDesktop ? 40 : isTablet ? 30 : 15,
            paddingTop: isDesktop ? 30 : 20,
          }
        ]}>
            <View style={styles.section}>
              <View style={styles.sectionHeaderRow}>
                <Text style={[styles.sectionTitle, { fontSize: isDesktop ? 24 : 20 }]}>📋 Medical Records</Text>
                <TouchableOpacity 
                  style={styles.uploadButton}
                  onPress={() => handleUploadForClient('records')}
                  disabled={uploadingType === 'records'}
                >
                  {uploadingType === 'records' ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <Text style={styles.uploadButtonText}>+ Upload Record</Text>
                  )}
                </TouchableOpacity>
              </View>
              {loadingRecords ? (
                <ActivityIndicator size="small" color="#C0C0C0" style={{ marginVertical: 20 }} />
              ) : records.length === 0 ? (
                <View style={styles.emptyState}>
                  <Text style={styles.emptyIcon}>📋</Text>
                  <Text style={styles.emptyText}>No medical records uploaded yet</Text>
                </View>
              ) : (
                records.map((record) => (
                  <TouchableOpacity 
                    key={record.id} 
                    style={styles.documentCard}
                    onPress={() => handleViewMedicalDoc(record.id, 'record', record.file_name)}
                    disabled={viewingDocId === record.id}
                  >
                    <View style={styles.documentHeader}>
                      <Text style={styles.documentTitle}>📋 {record.record_type?.replace(/_/g, ' ').toUpperCase()}</Text>
                      {viewingDocId === record.id ? (
                        <ActivityIndicator size="small" color="#1E3A5F" />
                      ) : (
                        <Text style={styles.documentBadge}>{record.file_name}</Text>
                      )}
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
                    {record.uploaded_by_name && (
                      <Text style={styles.uploaderInfo}>By: {record.uploaded_by_name}</Text>
                    )}
                    <Text style={styles.tapToViewHint}>Tap to view</Text>
                  </TouchableOpacity>
                ))
              )}
            </View>

            <View style={styles.section}>
              <View style={styles.sectionHeaderRow}>
                <Text style={[styles.sectionTitle, { fontSize: isDesktop ? 24 : 20 }]}>💰 Medical Billing</Text>
                <TouchableOpacity 
                  style={styles.uploadButton}
                  onPress={() => handleUploadForClient('bills')}
                  disabled={uploadingType === 'bills'}
                >
                  {uploadingType === 'bills' ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <Text style={styles.uploadButtonText}>+ Upload Bill</Text>
                  )}
                </TouchableOpacity>
              </View>
              {loadingBills ? (
                <ActivityIndicator size="small" color="#C0C0C0" style={{ marginVertical: 20 }} />
              ) : bills.length === 0 ? (
                <View style={styles.emptyState}>
                  <Text style={styles.emptyIcon}>💰</Text>
                  <Text style={styles.emptyText}>No medical bills uploaded yet</Text>
                </View>
              ) : (
                <>
                  <View style={styles.billingSummaryContainer}>
                    <Text style={styles.billingSummary}>
                      Total Billed: ${totalBilled.toFixed(2)}
                    </Text>
                    <Text style={styles.billingSummary}>
                      Total Due: ${totalDue.toFixed(2)}
                    </Text>
                  </View>
                  
                  {bills.map((bill) => (
                    <TouchableOpacity 
                      key={bill.id} 
                      style={styles.documentCard}
                      onPress={() => handleViewMedicalDoc(bill.id, 'bill', bill.file_name)}
                      disabled={viewingDocId === bill.id}
                    >
                      <View style={styles.documentHeader}>
                        <Text style={styles.documentTitle}>💰 {bill.billing_type?.replace(/_/g, ' ').toUpperCase()}</Text>
                        {viewingDocId === bill.id ? (
                          <ActivityIndicator size="small" color="#1E3A5F" />
                        ) : (
                          <Text style={styles.documentBadge}>${parseFloat(bill.total_amount).toFixed(2)}</Text>
                        )}
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
                      {bill.uploaded_by_name && (
                        <Text style={styles.uploaderInfo}>By: {bill.uploaded_by_name}</Text>
                      )}
                      <Text style={styles.tapToViewHint}>Tap to view</Text>
                    </TouchableOpacity>
                  ))}
                </>
              )}
            </View>

            <View style={styles.infoSection}>
              <Text style={styles.infoIcon}>ℹ️</Text>
              <Text style={styles.infoText}>
                All medical records and billing can be accessed by {client.displayName} with proper consent.
              </Text>
            </View>
          </View>
      </View>
    );
  };

  // Check if evidence is expired (1 minute old for testing - change back to 30 days for production)
  const isEvidenceExpired = (uploadedAt) => {
    if (!uploadedAt) return false;
    const uploadDate = new Date(uploadedAt);
    const today = new Date();
    // 30 days = 30 * 24 * 60 * 60 * 1000 milliseconds
    const daysDiff = Math.floor((today - uploadDate) / (1000 * 60 * 60 * 24));
    return daysDiff >= 30;
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
            evidenceDocuments.documents.map((doc) => {
              const expired = isEvidenceExpired(doc.uploaded_at);
              
              return (
              <View key={doc.id} style={[styles.documentCard, expired && styles.expiredDocumentCard]}>
                {expired && (
                  <View style={styles.expiredBanner}>
                    <Text style={styles.expiredBannerText}>⚠️ Evidence Expired (30+ days old)</Text>
                  </View>
                )}
                <View style={styles.documentHeader}>
                  <Text style={styles.documentTitle}>
                    {isImageFile(doc.mime_type) ? '🖼️' : '📎'} {doc.title}
                  </Text>
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
                  {expired && (
                    <Text style={styles.expiredText}> • Expired</Text>
                  )}
                </Text>
                <View style={styles.documentActions}>
                  <TouchableOpacity 
                    style={[styles.viewButton, expired && styles.viewButtonExpired]}
                    onPress={() => viewDocument(doc)}
                    disabled={documentLoading || expired}
                  >
                    <Text style={[styles.viewButtonText, expired && styles.viewButtonTextDisabled]}>
                      {expired 
                        ? '🔒 Expired - Access Denied' 
                        : (isImageFile(doc.mime_type) ? '👁️ View Image' : '📥 Download')
                      }
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
              );
            })
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
          <Image 
            source={require('../../attached_assets/MAP_1763356928680.png')}
            style={styles.tabIconImage}
          />
          <Text style={[styles.tabText, activeTab === 'roadmap' && styles.activeTabText]}>
            Roadmap
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'medicalHub' && styles.activeTab]}
          onPress={() => setActiveTab('medicalHub')}
        >
          <Image 
            source={require('../../attached_assets/Medical Symbol Latin_1764039151974.png')}
            style={styles.tabIconImage}
          />
          <Text style={[styles.tabText, activeTab === 'medicalHub' && styles.activeTabText]}>
            Medical Hub
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'evidence' && styles.activeTab]}
          onPress={() => setActiveTab('evidence')}
        >
          <Image 
            source={require('../../attached_assets/Evidence Vault_1764037430801.png')}
            style={styles.tabIconImage}
          />
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
          <View style={[styles.imageModalContent, { maxWidth: 400, maxHeight: 500 }]}>
            <View style={styles.imageModalHeader}>
              <Text style={styles.imageModalTitle}>Select Record Type</Text>
              <TouchableOpacity 
                style={styles.imageModalCloseBtn}
                onPress={() => setShowRecordTypeModal(false)}
              >
                <Text style={styles.imageModalCloseBtnText}>✕</Text>
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
                    backgroundColor: selectedRecordType === option.value ? '#1E3A5F' : '#f0f0f0',
                    borderWidth: 1,
                    borderColor: selectedRecordType === option.value ? '#1E3A5F' : '#ddd',
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
                style={{ padding: 12, borderRadius: 8, backgroundColor: '#1E3A5F', minWidth: 120, alignItems: 'center' }}
                onPress={() => {
                  setShowRecordTypeModal(false);
                  proceedWithUpload('records');
                }}
              >
                <Text style={{ color: '#fff', fontWeight: '700' }}>Choose File</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <Modal
        visible={viewingDocument !== null}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setViewingDocument(null)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.imageModalContent}>
            <View style={styles.imageModalHeader}>
              <Text style={styles.imageModalTitle}>
                {viewingDocument?.title || 'Evidence Image'}
              </Text>
              <TouchableOpacity 
                style={styles.imageModalCloseBtn}
                onPress={() => setViewingDocument(null)}
              >
                <Text style={styles.imageModalCloseBtnText}>✕</Text>
              </TouchableOpacity>
            </View>
            {viewingDocument?.presignedUrl ? (
              <View style={styles.imageContainer}>
                {imageLoading && (
                  <View style={styles.imageLoaderContainer}>
                    <ActivityIndicator size="large" color="#1E3A5F" />
                    <Text style={styles.imageLoaderText}>Loading image...</Text>
                  </View>
                )}
                <Image 
                  source={{ uri: viewingDocument.presignedUrl }}
                  style={[styles.evidenceImage, imageLoading && styles.imageHidden]}
                  resizeMode="contain"
                  onError={(error) => {
                    console.error('[View Document] Image load error:', error);
                    console.error('[View Document] Failed URL:', viewingDocument.presignedUrl);
                    setImageLoading(false);
                  }}
                  onLoad={() => {
                    setImageLoading(false);
                  }}
                />
              </View>
            ) : (
              <View style={[styles.evidenceImage, { justifyContent: 'center', alignItems: 'center' }]}>
                <ActivityIndicator size="large" color="#1E3A5F" />
                <Text style={{ textAlign: 'center', padding: 20, color: '#666', marginTop: 10 }}>Loading image...</Text>
              </View>
            )}
            <View style={styles.imageModalActions}>
              <TouchableOpacity 
                style={styles.downloadButton}
                onPress={() => {
                  if (viewingDocument) {
                    downloadDocument(viewingDocument);
                  }
                }}
              >
                <Text style={styles.downloadButtonText}>📥 Download Original</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={styles.closeModalButton}
                onPress={() => setViewingDocument(null)}
              >
                <Text style={styles.closeModalButtonText}>Close</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {documentLoading && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color="#C0C0C0" />
          <Text style={styles.loadingOverlayText}>Loading document...</Text>
        </View>
      )}
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
  tabIconImage: {
    width: 24,
    height: 24,
    marginBottom: 4,
    resizeMode: 'contain',
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
    backgroundColor: '#FFFFFF',
  },
  tabContent: {
    padding: 15,
  },
  section: {
    backgroundColor: '#FFFFFF',
    padding: 20,
    marginBottom: 15,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(30, 58, 95, 0.2)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1E3A5F',
    marginBottom: 15,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(30, 58, 95, 0.2)',
  },
  infoRow: {
    flexDirection: 'row',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(30, 58, 95, 0.1)',
  },
  infoLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1E3A5F',
    width: 120,
  },
  infoValue: {
    fontSize: 14,
    color: '#333',
    flex: 1,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 10,
  },
  statCard: {
    backgroundColor: '#F5F7FA',
    padding: 15,
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#1E3A5F',
    width: '48%',
    margin: '1%',
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1E3A5F',
  },
  statLabel: {
    fontSize: 12,
    color: '#666',
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
    color: '#666',
    textAlign: 'center',
  },
  emptySubtext: {
    fontSize: 12,
    color: '#888',
    textAlign: 'center',
    marginTop: 5,
  },
  documentCard: {
    backgroundColor: '#F5F7FA',
    padding: 15,
    borderRadius: 8,
    marginBottom: 10,
    borderLeftWidth: 4,
    borderLeftColor: '#1E3A5F',
  },
  expiredDocumentCard: {
    backgroundColor: '#FFF5F5',
    borderLeftColor: '#DC2626',
    opacity: 0.85,
  },
  expiredBanner: {
    backgroundColor: '#FEE2E2',
    borderColor: '#DC2626',
    borderWidth: 1,
    borderRadius: 6,
    padding: 8,
    marginBottom: 10,
  },
  expiredBannerText: {
    color: '#DC2626',
    fontSize: 13,
    fontWeight: '600',
    textAlign: 'center',
  },
  expiredText: {
    color: '#DC2626',
    fontWeight: '600',
  },
  viewButtonExpired: {
    backgroundColor: '#9CA3AF',
    opacity: 0.6,
  },
  viewButtonTextDisabled: {
    color: '#FFFFFF',
    opacity: 0.8,
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
    color: '#1E3A5F',
    flex: 1,
  },
  documentBadge: {
    fontSize: 12,
    color: '#666',
    backgroundColor: 'rgba(30, 58, 95, 0.1)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  documentDetail: {
    fontSize: 14,
    color: '#333',
    marginBottom: 4,
  },
  documentDate: {
    fontSize: 12,
    color: '#888',
    marginTop: 4,
  },
  uploaderInfo: {
    fontSize: 11,
    color: '#4FC3F7',
    fontStyle: 'italic',
    marginTop: 2,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  uploadButton: {
    backgroundColor: '#1E3A5F',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 6,
  },
  uploadButtonText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '600',
  },
  tapToViewHint: {
    fontSize: 11,
    color: '#1E3A5F',
    fontStyle: 'italic',
    marginTop: 4,
  },
  billingSummaryContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 15,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(30, 58, 95, 0.2)',
  },
  billingSummary: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1E3A5F',
  },
  infoSection: {
    flexDirection: 'row',
    backgroundColor: '#F5F7FA',
    padding: 15,
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#1E3A5F',
    marginTop: 10,
  },
  infoIcon: {
    fontSize: 20,
    marginRight: 10,
  },
  infoText: {
    flex: 1,
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
  backButtonBottom: {
    backgroundColor: '#1E3A5F',
    padding: 15,
    margin: 15,
    borderRadius: 8,
    alignItems: 'center',
  },
  backButtonBottomText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  progressSummary: {
    backgroundColor: '#F5F7FA',
    padding: 15,
    borderRadius: 8,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: 'rgba(30, 58, 95, 0.2)',
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
    color: '#1E3A5F',
    flex: 1,
  },
  progressPercentage: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1E3A5F',
  },
  progressBarBackground: {
    height: 20,
    backgroundColor: '#E0E0E0',
    borderRadius: 10,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(30, 58, 95, 0.2)',
    marginBottom: 10,
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#1E3A5F',
  },
  progressStatsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 5,
  },
  progressStat: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  viewRoadmapButton: {
    backgroundColor: '#1E3A5F',
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
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
    backgroundColor: '#E0E0E0',
    borderWidth: 2,
    borderColor: '#ccc',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
  },
  roadmapStageBadgeCompleted: {
    backgroundColor: '#1E3A5F',
    borderColor: '#1E3A5F',
  },
  roadmapStageBadgeCurrent: {
    backgroundColor: '#C0C0C0',
    borderColor: '#1E3A5F',
    borderWidth: 3,
  },
  roadmapStageBadgeText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#888',
  },
  roadmapStageBadgeTextCompleted: {
    color: '#FFFFFF',
  },
  roadmapStageInfo: {
    flex: 1,
    paddingTop: 2,
  },
  roadmapStageName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 3,
  },
  roadmapStageNameCurrent: {
    color: '#1E3A5F',
    fontWeight: 'bold',
  },
  roadmapStageProgress: {
    fontSize: 13,
    color: '#666',
  },
  roadmapStageDate: {
    fontSize: 12,
    color: '#4ade80',
    marginTop: 2,
  },
  roadmapConnector: {
    width: 2,
    height: 15,
    backgroundColor: 'rgba(30, 58, 95, 0.2)',
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
  documentActions: {
    flexDirection: 'row',
    marginTop: 12,
    gap: 10,
  },
  viewButton: {
    backgroundColor: '#1E3A5F',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#C0C0C0',
  },
  viewButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  imageModalContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    maxWidth: 800,
    width: '100%',
    maxHeight: '90%',
    overflow: 'hidden',
  },
  imageModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 15,
    backgroundColor: '#1E3A5F',
    borderBottomWidth: 2,
    borderBottomColor: '#C0C0C0',
  },
  imageModalTitle: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: 'bold',
    flex: 1,
  },
  imageModalCloseBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  imageModalCloseBtnText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: 'bold',
  },
  imageContainer: {
    position: 'relative',
    width: '100%',
    height: 400,
    backgroundColor: '#f0f0f0',
  },
  evidenceImage: {
    width: '100%',
    height: 400,
    backgroundColor: '#f0f0f0',
  },
  imageHidden: {
    opacity: 0,
  },
  imageLoaderContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f0f0f0',
    zIndex: 1,
  },
  imageLoaderText: {
    marginTop: 10,
    fontSize: 14,
    color: '#666',
  },
  imageModalActions: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 15,
    gap: 15,
    backgroundColor: '#f5f5f5',
    borderTopWidth: 1,
    borderTopColor: '#ddd',
  },
  downloadButton: {
    backgroundColor: '#1E3A5F',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
  },
  downloadButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  closeModalButton: {
    backgroundColor: '#C0C0C0',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
  },
  closeModalButtonText: {
    color: '#1E3A5F',
    fontSize: 14,
    fontWeight: '600',
  },
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingOverlayText: {
    color: '#FFFFFF',
    marginTop: 10,
    fontSize: 16,
  },
});

export default LawFirmClientDetailsScreen;

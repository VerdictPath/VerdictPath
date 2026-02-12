import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet, ImageBackground, useWindowDimensions, Modal, TextInput, ActivityIndicator, Platform, Linking } from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';
import { commonStyles } from '../styles/commonStyles';
import alert from '../utils/alert';
import { API_BASE_URL } from '../config/api';

const MedicalHubScreen = ({ onNavigate, onUploadMedicalDocument, medicalHubUploads, authToken }) => {
  const { width, height } = useWindowDimensions();
  
  const isPhone = width < 768;
  const isTablet = width >= 768 && width < 1024;
  const isDesktop = width >= 1024;

  const [showProviderModal, setShowProviderModal] = useState(false);
  const [providerCode, setProviderCode] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [connectedProviders, setConnectedProviders] = useState([]);
  const [fetchingProviders, setFetchingProviders] = useState(true);

  const [medicalRecords, setMedicalRecords] = useState([]);
  const [medicalBills, setMedicalBills] = useState([]);
  const [loadingRecords, setLoadingRecords] = useState(true);
  const [loadingBills, setLoadingBills] = useState(true);
  const [uploadingType, setUploadingType] = useState(null);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [uploadCategory, setUploadCategory] = useState(null);

  useEffect(() => {
    fetchConnectedProviders();
    fetchMedicalRecords();
    fetchMedicalBills();
  }, []);

  const fetchConnectedProviders = async () => {
    try {
      setFetchingProviders(true);
      const response = await fetch(`${API_BASE_URL}/api/connections/my-connections`, {
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setConnectedProviders(data.medicalProviders || []);
      }
    } catch (error) {
      console.error('Error fetching connected providers:', error);
    } finally {
      setFetchingProviders(false);
    }
  };

  const fetchMedicalRecords = async () => {
    try {
      setLoadingRecords(true);
      const response = await fetch(`${API_BASE_URL}/api/uploads/my-medical-records`, {
        headers: { 'Authorization': `Bearer ${authToken}` }
      });
      if (response.ok) {
        const data = await response.json();
        setMedicalRecords(data.records || []);
      }
    } catch (error) {
      console.error('Error fetching medical records:', error);
    } finally {
      setLoadingRecords(false);
    }
  };

  const fetchMedicalBills = async () => {
    try {
      setLoadingBills(true);
      const response = await fetch(`${API_BASE_URL}/api/uploads/my-medical-bills`, {
        headers: { 'Authorization': `Bearer ${authToken}` }
      });
      if (response.ok) {
        const data = await response.json();
        setMedicalBills(data.bills || []);
      }
    } catch (error) {
      console.error('Error fetching medical bills:', error);
    } finally {
      setLoadingBills(false);
    }
  };

  const handleAddProvider = () => {
    setProviderCode('');
    setShowProviderModal(true);
  };

  const handleConnectProvider = async () => {
    if (!providerCode.trim()) {
      alert('Missing Code', 'Please enter a medical provider code to connect.');
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/api/connections/add-medical-provider`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ medicalProviderCode: providerCode.trim() })
      });

      const data = await response.json();

      if (response.ok && data.success) {
        setShowProviderModal(false);
        setProviderCode('');
        await fetchConnectedProviders();
        alert(
          'Ahoy, Success!',
          `Ye be now connected to ${data.medicalProvider?.provider_name || 'yer medical provider'}! Yer crew be growin\' stronger!`
        );
      } else {
        alert(
          'Connection Failed',
          data.error || 'Failed to connect with the medical provider. Check the code and try again.'
        );
      }
    } catch (error) {
      console.error('Error connecting to medical provider:', error);
      alert('Connection Error', 'Please check your internet and try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRemoveProvider = async (providerId, providerName) => {
    alert(
      'Remove Provider?',
      `Are you sure you want to disconnect from ${providerName}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Remove', 
          style: 'destructive',
          onPress: async () => {
            try {
              const response = await fetch(`${API_BASE_URL}/api/connections/remove-medical-provider`, {
                method: 'POST',
                headers: {
                  'Authorization': `Bearer ${authToken}`,
                  'Content-Type': 'application/json'
                },
                body: JSON.stringify({ providerId: providerId })
              });

              if (response.ok) {
                await fetchConnectedProviders();
                alert('Success', `${providerName} has been removed.`);
              } else {
                const data = await response.json();
                alert('Error', data.error || 'Failed to remove provider.');
              }
            } catch (error) {
              console.error('Error removing provider:', error);
              alert('Error', 'Failed to remove provider. Please try again.');
            }
          }
        }
      ]
    );
  };

  const openUploadOptions = (category) => {
    setUploadCategory(category);
    setShowUploadModal(true);
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

  const pickFileFromWeb = (category) => {
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

            const webFile = {
              uri: URL.createObjectURL(properFile),
              name: file.name,
              fileName: file.name,
              type: mimeType,
              mimeType: mimeType,
              file: properFile,
            };
            console.log('[MedicalHub] Web file selected:', { name: file.name, browserType: file.type, resolvedType: mimeType, size: file.size });
            await uploadMedicalFile(webFile, category);
          }
        } catch (err) {
          console.error('[MedicalHub] Error in file onchange:', err);
          alert('Upload Error', err.message || 'Failed to process selected file.');
          setUploadingType(null);
        } finally {
          document.body.removeChild(input);
        }
      };

      input.click();
    } catch (err) {
      console.error('[MedicalHub] Error creating file picker:', err);
      alert('Error', 'Failed to open file picker.');
    }
  };

  const handleTakePhoto = async () => {
    setShowUploadModal(false);
    if (Platform.OS === 'web') {
      alert('Camera Not Available', 'Camera is not available on web. Please use Choose Files instead.');
      return;
    }

    try {
      const permissionResult = await ImagePicker.requestCameraPermissionsAsync();
      if (!permissionResult.granted) {
        alert('Permission Required', 'Please grant camera permission to take photos.');
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        allowsEditing: false,
        quality: 0.8,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        await uploadMedicalFile(result.assets[0], uploadCategory);
      }
    } catch (error) {
      console.error('Error taking photo:', error);
      alert('Error', 'Failed to take photo. Please try again.');
    }
  };

  const handleChooseFile = async () => {
    setShowUploadModal(false);

    if (Platform.OS === 'web') {
      pickFileFromWeb(uploadCategory);
      return;
    }

    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['application/pdf', 'image/*', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
        copyToCacheDirectory: true,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        await uploadMedicalFile(result.assets[0], uploadCategory);
      }
    } catch (error) {
      console.error('Error picking document:', error);
      alert('Error', 'Failed to pick document. Please try again.');
    }
  };

  const uploadMedicalFile = async (file, category) => {
    console.log('[MedicalHub] uploadMedicalFile called', { category, hasFile: !!file, hasAuthToken: !!authToken });
    
    if (!authToken) {
      console.error('[MedicalHub] No auth token available');
      alert('Error', 'You must be logged in to upload files.');
      return;
    }

    setUploadingType(category);

    try {
      const formData = new FormData();
      const fileName = file.fileName || file.name || `${category}_${Date.now()}.jpg`;
      const fileType = file.mimeType || file.type || 'application/octet-stream';

      console.log('[MedicalHub] File details:', { fileName, fileType, hasFileObj: !!file.file, uri: file.uri?.substring(0, 50) });

      if (Platform.OS === 'web') {
        if (file.file) {
          formData.append('file', file.file, fileName);
        } else {
          const response = await fetch(file.uri);
          const blob = await response.blob();
          formData.append('file', blob, fileName);
        }
      } else {
        formData.append('file', {
          uri: file.uri,
          name: fileName,
          type: fileType,
        });
      }

      const endpoint = category === 'bills'
        ? `${API_BASE_URL}/api/uploads/medical-bill`
        : `${API_BASE_URL}/api/uploads/medical-record`;

      if (category === 'bills') {
        formData.append('billingType', 'Medical Bill');
      } else {
        formData.append('recordType', 'Medical Record');
      }

      console.log('[MedicalHub] Uploading to:', endpoint);

      const uploadResponse = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${authToken}`,
        },
        credentials: 'include',
        body: formData,
      });

      console.log('[MedicalHub] Upload response status:', uploadResponse.status);

      if (!uploadResponse.ok) {
        const errorData = await uploadResponse.json().catch(() => ({}));
        console.error('[MedicalHub] Upload error response:', errorData);
        const errorMessage = errorData.details 
          ? `${errorData.error}: ${Array.isArray(errorData.details) ? errorData.details.join(', ') : errorData.details}`
          : (errorData.error || 'Upload failed');
        throw new Error(errorMessage);
      }

      const responseData = await uploadResponse.json().catch(() => ({}));
      console.log('[MedicalHub] Upload success:', responseData);

      alert('Upload Successful!', `Your ${category === 'bills' ? 'medical bill' : 'medical record'} "${fileName}" has been securely uploaded.`);

      if (category === 'bills') {
        await fetchMedicalBills();
      } else {
        await fetchMedicalRecords();
      }
    } catch (error) {
      console.error('[MedicalHub] Error uploading medical file:', error);
      alert('Upload Failed', error.message || 'Failed to upload file. Please try again.');
    } finally {
      setUploadingType(null);
    }
  };

  const handleDeleteDocument = (type, id, fileName) => {
    alert(
      'Delete Document?',
      `Are you sure you want to delete "${fileName}"? This cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              const response = await fetch(`${API_BASE_URL}/api/uploads/medical/${type}/${id}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${authToken}` }
              });

              if (response.ok) {
                alert('Deleted', 'Document has been removed.');
                if (type === 'bill') {
                  await fetchMedicalBills();
                } else {
                  await fetchMedicalRecords();
                }
              } else {
                const data = await response.json();
                alert('Error', data.error || 'Failed to delete document.');
              }
            } catch (error) {
              console.error('Error deleting document:', error);
              alert('Error', 'Failed to delete document. Please try again.');
            }
          }
        }
      ]
    );
  };

  const formatFileSize = (bytes) => {
    if (!bytes) return '';
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const getFileIcon = (mimeType) => {
    if (!mimeType) return '📄';
    if (mimeType.startsWith('image/')) return '🖼️';
    if (mimeType.includes('pdf')) return '📕';
    if (mimeType.includes('word') || mimeType.includes('document')) return '📘';
    return '📄';
  };

  const getContentWidth = () => {
    if (isDesktop) return Math.min(width * 0.6, 800);
    if (isTablet) return width * 0.85;
    return width;
  };

  const [viewingDocId, setViewingDocId] = useState(null);

  const handleViewDocument = async (type, docId, fileName) => {
    setViewingDocId(docId);
    let preOpenedWindow = null;
    if (Platform.OS === 'web') {
      preOpenedWindow = window.open('about:blank', '_blank');
    }
    try {
      const docType = type === 'bills' ? 'bill' : 'record';
      const response = await fetch(`${API_BASE_URL}/api/uploads/medical/${docType}/${docId}/view`, {
        headers: { 'Authorization': `Bearer ${authToken}` }
      });

      if (!response.ok) {
        const errText = await response.text();
        let errMsg = 'Failed to retrieve document';
        try {
          const errData = JSON.parse(errText);
          errMsg = errData.error || errMsg;
        } catch (e) {}
        throw new Error(errMsg);
      }

      const data = await response.json();

      if (data.url) {
        let docUrl = data.url;
        if (docUrl.startsWith('/')) {
          docUrl = `${API_BASE_URL}${docUrl}`;
        }
        if (docUrl.includes('/api/uploads/stream/')) {
          docUrl = `${docUrl}${docUrl.includes('?') ? '&' : '?'}token=${authToken}`;
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
      console.error('Error viewing document:', error.message || error);
      alert('View Error', error.message || 'Failed to open document.');
    } finally {
      setViewingDocId(null);
    }
  };

  const renderDocumentList = (documents, type) => {
    if (documents.length === 0) {
      return (
        <View style={styles.emptyState}>
          <Text style={styles.emptyStateText}>
            No {type === 'bills' ? 'medical bills' : 'medical records'} uploaded yet
          </Text>
        </View>
      );
    }

    return documents.map((doc) => (
      <View key={doc.id} style={styles.documentCard}>
        <TouchableOpacity
          style={styles.documentCardLeft}
          onPress={() => handleViewDocument(type, doc.id, doc.file_name)}
          disabled={viewingDocId === doc.id}
        >
          {viewingDocId === doc.id ? (
            <ActivityIndicator size="small" color="#FFD700" style={{ marginRight: 10 }} />
          ) : (
            <Text style={styles.documentIcon}>{getFileIcon(doc.mime_type)}</Text>
          )}
          <View style={styles.documentDetails}>
            <Text style={[styles.documentName, { fontSize: isDesktop ? 15 : 13 }]} numberOfLines={1}>
              {doc.file_name}
            </Text>
            <Text style={styles.documentMeta}>
              {formatFileSize(doc.file_size)} {doc.uploaded_at ? `• ${formatDate(doc.uploaded_at)}` : ''}
            </Text>
            {doc.uploaded_by_name && (
              <Text style={styles.uploaderInfo}>
                Uploaded by: {doc.uploaded_by_name}
              </Text>
            )}
            <Text style={styles.tapToView}>Tap to view</Text>
          </View>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.deleteDocButton}
          onPress={() => handleDeleteDocument(type === 'bills' ? 'bill' : 'record', doc.id, doc.file_name)}
        >
          <Text style={styles.deleteDocText}>✕</Text>
        </TouchableOpacity>
      </View>
    ));
  };

  return (
    <View style={styles.container}>
      <ImageBackground
        source={require('../../attached_assets/Medical Ward_1764038075699.png')}
        style={[styles.backgroundImage, { width, height }]}
        resizeMode="cover"
      >
        <View style={styles.overlay}>
          <ScrollView 
            style={styles.scrollView}
            contentContainerStyle={[
              styles.scrollContent,
              { alignItems: isDesktop || isTablet ? 'center' : 'stretch' }
            ]}
          >
            <View style={[
              styles.contentWrapper,
              { width: getContentWidth() }
            ]}>
              <View style={[
                styles.header,
                { paddingTop: isDesktop ? 30 : 50 }
              ]}>
                <TouchableOpacity onPress={() => onNavigate('dashboard')}>
                  <Text style={[
                    styles.backButton,
                    { fontSize: isDesktop ? 20 : 18 }
                  ]}>← Back</Text>
                </TouchableOpacity>
                <Text style={[
                  styles.headerTitle,
                  { fontSize: isDesktop ? 28 : isTablet ? 24 : 20 }
                ]}>Medical Documentation Hub</Text>
                <View style={{ width: 60 }} />
              </View>

              <View style={[
                styles.secureNotice,
                { padding: isDesktop ? 18 : 15 }
              ]}>
                <Text style={[styles.secureIcon, { fontSize: isDesktop ? 28 : 24 }]}>🔒</Text>
                <Text style={[
                  styles.secureText,
                  { fontSize: isDesktop ? 18 : 16 }
                ]}>HIPAA-Compliant Secure Storage</Text>
              </View>

              <View style={[
                styles.medicalContainer,
                { padding: isDesktop ? 30 : 20 }
              ]}>
                <View style={[
                  styles.documentSection,
                  { padding: isDesktop ? 25 : 20 }
                ]}>
                  <View style={styles.sectionHeader}>
                    <Text style={[
                      styles.sectionTitle,
                      { fontSize: isDesktop ? 24 : 20 }
                    ]}>💵 Medical Bills</Text>
                    <View style={styles.countBadge}>
                      <Text style={styles.countBadgeText}>{medicalBills.length}</Text>
                    </View>
                  </View>
                  <Text style={[styles.sectionDescription, { fontSize: isDesktop ? 15 : 13 }]}>
                    Upload and store your medical bills securely
                  </Text>

                  <TouchableOpacity
                    style={[styles.uploadButton, uploadingType === 'bills' && styles.uploadButtonDisabled]}
                    onPress={() => openUploadOptions('bills')}
                    disabled={uploadingType === 'bills'}
                  >
                    {uploadingType === 'bills' ? (
                      <View style={styles.uploadingRow}>
                        <ActivityIndicator size="small" color="#FFD700" />
                        <Text style={styles.uploadButtonText}>  Uploading...</Text>
                      </View>
                    ) : (
                      <Text style={styles.uploadButtonText}>📤 Upload Medical Bill</Text>
                    )}
                  </TouchableOpacity>

                  {loadingBills ? (
                    <View style={styles.loadingRow}>
                      <ActivityIndicator size="small" color="#FFD700" />
                      <Text style={styles.loadingText}>Loading bills...</Text>
                    </View>
                  ) : (
                    renderDocumentList(medicalBills, 'bills')
                  )}
                </View>

                <View style={[
                  styles.documentSection,
                  { padding: isDesktop ? 25 : 20 }
                ]}>
                  <View style={styles.sectionHeader}>
                    <Text style={[
                      styles.sectionTitle,
                      { fontSize: isDesktop ? 24 : 20 }
                    ]}>📋 Medical Records</Text>
                    <View style={styles.countBadge}>
                      <Text style={styles.countBadgeText}>{medicalRecords.length}</Text>
                    </View>
                  </View>
                  <Text style={[styles.sectionDescription, { fontSize: isDesktop ? 15 : 13 }]}>
                    Upload and store your medical records securely
                  </Text>

                  <TouchableOpacity
                    style={[styles.uploadButton, uploadingType === 'records' && styles.uploadButtonDisabled]}
                    onPress={() => openUploadOptions('records')}
                    disabled={uploadingType === 'records'}
                  >
                    {uploadingType === 'records' ? (
                      <View style={styles.uploadingRow}>
                        <ActivityIndicator size="small" color="#FFD700" />
                        <Text style={styles.uploadButtonText}>  Uploading...</Text>
                      </View>
                    ) : (
                      <Text style={styles.uploadButtonText}>📤 Upload Medical Record</Text>
                    )}
                  </TouchableOpacity>

                  {loadingRecords ? (
                    <View style={styles.loadingRow}>
                      <ActivityIndicator size="small" color="#FFD700" />
                      <Text style={styles.loadingText}>Loading records...</Text>
                    </View>
                  ) : (
                    renderDocumentList(medicalRecords, 'records')
                  )}
                </View>

                <TouchableOpacity 
                  style={[
                    styles.addProviderButton,
                    { 
                      paddingVertical: isDesktop ? 18 : 15,
                      marginBottom: isDesktop ? 20 : 15,
                    }
                  ]}
                  onPress={handleAddProvider}
                >
                  <Text style={[
                    styles.buttonText,
                    { fontSize: isDesktop ? 18 : 16 }
                  ]}>➕ Add Medical Provider</Text>
                </TouchableOpacity>

                {fetchingProviders ? (
                  <View style={styles.loadingContainer}>
                    <ActivityIndicator size="small" color="#FFD700" />
                    <Text style={styles.loadingText}>Loading connected providers...</Text>
                  </View>
                ) : connectedProviders.length > 0 && (
                  <View style={[
                    styles.documentSection,
                    { padding: isDesktop ? 25 : 20, marginBottom: isDesktop ? 35 : 30 }
                  ]}>
                    <Text style={[
                      styles.sectionTitle,
                      { fontSize: isDesktop ? 24 : 20, marginBottom: 15 }
                    ]}>🏥 Connected Providers</Text>
                    {connectedProviders.map((provider) => (
                      <View key={provider.id} style={styles.providerCard}>
                        <View style={styles.providerInfo}>
                          <Text style={[
                            styles.providerName,
                            { fontSize: isDesktop ? 18 : 16 }
                          ]}>{provider.provider_name}</Text>
                          <Text style={[
                            styles.providerCode,
                            { fontSize: isDesktop ? 14 : 12 }
                          ]}>Code: {provider.provider_code}</Text>
                        </View>
                        <TouchableOpacity
                          style={styles.removeButton}
                          onPress={() => handleRemoveProvider(provider.id, provider.provider_name)}
                        >
                          <Text style={styles.removeButtonText}>✕</Text>
                        </TouchableOpacity>
                      </View>
                    ))}
                  </View>
                )}

                {!fetchingProviders && connectedProviders.length === 0 && (
                  <View style={[styles.noProvidersContainer, { marginBottom: isDesktop ? 35 : 30 }]}>
                    <Text style={styles.noProvidersText}>
                      No medical providers connected yet. Tap the button above to add one.
                    </Text>
                  </View>
                )}

                <View style={[
                  styles.documentSection,
                  { padding: isDesktop ? 25 : 20 }
                ]}>
                  <Text style={[
                    styles.sectionTitle,
                    { fontSize: isDesktop ? 24 : 20 }
                  ]}>📋 HIPAA Forms</Text>
                  <Text style={[
                    styles.sectionDescription,
                    { fontSize: isDesktop ? 16 : 14 }
                  ]}>
                    Manage consent forms and authorizations for sharing your medical information
                  </Text>
                  <TouchableOpacity 
                    style={[
                      styles.primaryButton,
                      { paddingVertical: isDesktop ? 18 : 15 }
                    ]}
                    onPress={() => onNavigate('hipaaForms')}
                  >
                    <Text style={[
                      styles.buttonText,
                      { fontSize: isDesktop ? 18 : 16 }
                    ]}>📄 View HIPAA Forms</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          </ScrollView>
        </View>
      </ImageBackground>

      <Modal
        visible={showUploadModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowUploadModal(false)}
      >
        <TouchableOpacity 
          style={styles.modalOverlay} 
          activeOpacity={1} 
          onPress={() => setShowUploadModal(false)}
        >
          <View style={[
            styles.modalContent,
            { width: isDesktop ? 420 : isTablet ? 380 : width * 0.9 }
          ]}>
            <Text style={styles.modalTitle}>
              📤 Upload {uploadCategory === 'bills' ? 'Medical Bill' : 'Medical Record'}
            </Text>
            <Text style={styles.modalDescription}>
              Choose how to add your document. Files are encrypted and stored securely.
            </Text>

            <TouchableOpacity style={styles.uploadOptionRow} onPress={handleTakePhoto}>
              <Text style={styles.uploadOptionIcon}>📷</Text>
              <View style={styles.uploadOptionContent}>
                <Text style={styles.uploadOptionTitle}>Take Photo</Text>
                <Text style={styles.uploadOptionDesc}>Use your camera to capture a document</Text>
              </View>
              <Text style={styles.uploadOptionArrow}>›</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.uploadOptionRow} onPress={handleChooseFile}>
              <Text style={styles.uploadOptionIcon}>📁</Text>
              <View style={styles.uploadOptionContent}>
                <Text style={styles.uploadOptionTitle}>Choose File</Text>
                <Text style={styles.uploadOptionDesc}>Select PDF, image, or document from your device</Text>
              </View>
              <Text style={styles.uploadOptionArrow}>›</Text>
            </TouchableOpacity>

            <View style={styles.fileTypesInfo}>
              <Text style={styles.fileTypesText}>
                Accepted: PDF, JPG, PNG, HEIC, DOC, DOCX
              </Text>
            </View>

            <TouchableOpacity
              style={styles.cancelUploadButton}
              onPress={() => setShowUploadModal(false)}
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      <Modal
        visible={showProviderModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowProviderModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[
            styles.modalContent,
            { width: isDesktop ? 450 : isTablet ? 400 : width * 0.9 }
          ]}>
            <Text style={styles.modalTitle}>🏥 Add Medical Provider</Text>
            <Text style={styles.modalDescription}>
              Enter the provider code given to you by your medical provider to connect.
            </Text>
            
            <TextInput
              style={styles.modalInput}
              placeholder="Enter Provider Code (e.g., MP-XXXXX)"
              placeholderTextColor="#8B7355"
              value={providerCode}
              onChangeText={setProviderCode}
              autoCapitalize="characters"
              autoCorrect={false}
            />

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelBtn]}
                onPress={() => setShowProviderModal(false)}
                disabled={isLoading}
              >
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[styles.modalButton, styles.connectButton]}
                onPress={handleConnectProvider}
                disabled={isLoading}
              >
                {isLoading ? (
                  <ActivityIndicator size="small" color="#FFF" />
                ) : (
                  <Text style={styles.connectButtonText}>Connect</Text>
                )}
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
  },
  backgroundImage: {
    flex: 1,
  },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: 100,
  },
  contentWrapper: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 15,
  },
  backButton: {
    color: '#FFFFFF',
    fontWeight: '600',
    textShadowColor: '#000',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  headerTitle: {
    fontWeight: 'bold',
    color: '#FFFFFF',
    textShadowColor: '#000',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 6,
  },
  secureNotice: {
    backgroundColor: 'rgba(30, 80, 50, 0.85)',
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginHorizontal: 20,
    borderRadius: 12,
    marginBottom: 20,
    borderWidth: 2,
    borderColor: 'rgba(39, 174, 96, 0.6)',
  },
  secureIcon: {
    marginRight: 10,
  },
  secureText: {
    color: '#90EE90',
    fontWeight: '700',
    textShadowColor: '#000',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  medicalContainer: {
    paddingHorizontal: 20,
  },
  documentSection: {
    marginBottom: 25,
    backgroundColor: 'rgba(26, 26, 26, 0.88)',
    borderRadius: 16,
    borderWidth: 2,
    borderColor: 'rgba(255, 215, 0, 0.5)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5,
    shadowRadius: 8,
    elevation: 8,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  sectionTitle: {
    fontWeight: 'bold',
    color: '#FFD700',
    textShadowColor: '#000',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  countBadge: {
    backgroundColor: 'rgba(255, 215, 0, 0.2)',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 215, 0, 0.4)',
  },
  countBadgeText: {
    color: '#FFD700',
    fontSize: 13,
    fontWeight: '700',
  },
  sectionDescription: {
    color: '#B8A080',
    marginBottom: 15,
    lineHeight: 20,
  },
  uploadButton: {
    backgroundColor: 'rgba(40, 100, 60, 0.9)',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'rgba(80, 200, 120, 0.5)',
    marginBottom: 15,
  },
  uploadButtonDisabled: {
    opacity: 0.6,
  },
  uploadButtonText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 15,
  },
  uploadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  emptyState: {
    paddingVertical: 15,
    alignItems: 'center',
  },
  emptyStateText: {
    color: '#8B7355',
    fontSize: 13,
    fontStyle: 'italic',
  },
  documentCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(60, 50, 30, 0.7)',
    padding: 12,
    borderRadius: 10,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 215, 0, 0.2)',
  },
  documentCardLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  documentIcon: {
    fontSize: 24,
    marginRight: 10,
  },
  documentDetails: {
    flex: 1,
  },
  documentName: {
    color: '#E8D5B0',
    fontWeight: '600',
  },
  tapToView: {
    color: '#90CAF9',
    fontSize: 11,
    marginTop: 3,
    fontStyle: 'italic',
  },
  documentMeta: {
    color: '#8B7355',
    fontSize: 11,
    marginTop: 2,
  },
  uploaderInfo: {
    color: '#4FC3F7',
    fontSize: 10,
    marginTop: 2,
    fontStyle: 'italic',
  },
  deleteDocButton: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(180, 60, 60, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
  },
  deleteDocText: {
    color: '#FFF',
    fontWeight: 'bold',
    fontSize: 12,
  },
  loadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
  },
  loadingText: {
    color: '#FFD700',
    marginLeft: 10,
    fontSize: 13,
  },
  addProviderButton: {
    backgroundColor: 'rgba(80, 70, 60, 0.9)',
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'rgba(150, 140, 130, 0.5)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.4,
    shadowRadius: 4,
    elevation: 4,
  },
  primaryButton: {
    backgroundColor: 'rgba(40, 80, 120, 0.9)',
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'rgba(100, 180, 255, 0.4)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.4,
    shadowRadius: 4,
    elevation: 4,
  },
  buttonText: {
    color: '#FFFFFF',
    fontWeight: '700',
    textShadowColor: '#000',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 15,
    marginBottom: 20,
  },
  providerCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: 'rgba(60, 50, 30, 0.85)',
    padding: 15,
    borderRadius: 10,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: 'rgba(255, 215, 0, 0.3)',
  },
  providerInfo: {
    flex: 1,
  },
  providerName: {
    color: '#FFD700',
    fontWeight: '700',
    marginBottom: 4,
  },
  providerCode: {
    color: '#B8A080',
  },
  removeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(180, 60, 60, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 10,
  },
  removeButtonText: {
    color: '#FFF',
    fontWeight: 'bold',
    fontSize: 14,
  },
  noProvidersContainer: {
    padding: 20,
    alignItems: 'center',
  },
  noProvidersText: {
    color: '#B8A080',
    textAlign: 'center',
    fontSize: 14,
    fontStyle: 'italic',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#2A2520',
    borderRadius: 20,
    padding: 25,
    borderWidth: 2,
    borderColor: 'rgba(255, 215, 0, 0.5)',
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#FFD700',
    textAlign: 'center',
    marginBottom: 10,
  },
  modalDescription: {
    fontSize: 14,
    color: '#B8A080',
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 20,
  },
  modalInput: {
    backgroundColor: '#1A1815',
    borderWidth: 2,
    borderColor: 'rgba(255, 215, 0, 0.3)',
    borderRadius: 12,
    padding: 15,
    fontSize: 16,
    color: '#FFD700',
    marginBottom: 20,
    textAlign: 'center',
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  modalButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
  },
  cancelBtn: {
    backgroundColor: 'rgba(80, 70, 60, 0.9)',
    marginRight: 10,
    borderWidth: 1,
    borderColor: 'rgba(150, 140, 130, 0.5)',
  },
  cancelBtnText: {
    color: '#B8A080',
    fontWeight: '600',
    fontSize: 16,
  },
  connectButton: {
    backgroundColor: 'rgba(40, 120, 80, 0.9)',
    marginLeft: 10,
    borderWidth: 1,
    borderColor: 'rgba(80, 200, 120, 0.5)',
  },
  connectButtonText: {
    color: '#FFF',
    fontWeight: '700',
    fontSize: 16,
  },
  uploadOptionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(60, 50, 30, 0.85)',
    padding: 16,
    borderRadius: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: 'rgba(255, 215, 0, 0.3)',
  },
  uploadOptionIcon: {
    fontSize: 28,
    marginRight: 14,
  },
  uploadOptionContent: {
    flex: 1,
  },
  uploadOptionTitle: {
    color: '#FFD700',
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 3,
  },
  uploadOptionDesc: {
    color: '#B8A080',
    fontSize: 12,
    lineHeight: 16,
  },
  uploadOptionArrow: {
    color: '#FFD700',
    fontSize: 24,
    fontWeight: '300',
    marginLeft: 8,
  },
  fileTypesInfo: {
    paddingVertical: 10,
    alignItems: 'center',
  },
  fileTypesText: {
    color: '#8B7355',
    fontSize: 12,
    fontStyle: 'italic',
  },
  cancelUploadButton: {
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: 5,
  },
  cancelButtonText: {
    color: '#B8A080',
    fontWeight: '600',
    fontSize: 15,
  },
});

export default MedicalHubScreen;

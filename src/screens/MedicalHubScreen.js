import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet, ImageBackground, useWindowDimensions, Modal, TextInput, ActivityIndicator, Platform } from 'react-native';
import { commonStyles } from '../styles/commonStyles';
import alert from '../utils/alert';
import { API_URL } from '../config/api';
import { pickDocument, pickImage, pickImageFromLibrary, createFormDataFromFile } from '../utils/fileUpload';

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
  
  const [medicalBills, setMedicalBills] = useState([]);
  const [medicalRecords, setMedicalRecords] = useState([]);
  const [fetchingDocuments, setFetchingDocuments] = useState(true);
  const [uploadingBill, setUploadingBill] = useState(false);
  const [uploadingRecord, setUploadingRecord] = useState(false);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [uploadType, setUploadType] = useState(null);

  useEffect(() => {
    fetchConnectedProviders();
    fetchDocuments();
  }, []);

  const fetchDocuments = async () => {
    try {
      setFetchingDocuments(true);
      const [billsRes, recordsRes] = await Promise.all([
        fetch(`${API_URL}/api/uploads/my-medical-bills`, {
          headers: {
            'Authorization': `Bearer ${authToken}`,
            'Content-Type': 'application/json'
          }
        }),
        fetch(`${API_URL}/api/uploads/my-medical-records`, {
          headers: {
            'Authorization': `Bearer ${authToken}`,
            'Content-Type': 'application/json'
          }
        })
      ]);
      
      if (billsRes.ok) {
        const billsData = await billsRes.json();
        setMedicalBills(billsData.bills || billsData || []);
      }
      
      if (recordsRes.ok) {
        const recordsData = await recordsRes.json();
        setMedicalRecords(recordsData.records || recordsData || []);
      }
    } catch (error) {
      console.error('Error fetching documents:', error);
    } finally {
      setFetchingDocuments(false);
    }
  };

  const fetchConnectedProviders = async () => {
    try {
      setFetchingProviders(true);
      const response = await fetch(`${API_URL}/api/connections/my-connections`, {
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

  const handleUpload = (type) => {
    setUploadType(type);
    setShowUploadModal(true);
  };

  const handleSelectUploadMethod = async (method) => {
    setShowUploadModal(false);
    
    const isUploadingBill = uploadType === 'bill';
    if (isUploadingBill) {
      setUploadingBill(true);
    } else {
      setUploadingRecord(true);
    }

    try {
      let result;
      if (method === 'camera') {
        result = await pickImage();
      } else if (method === 'library') {
        result = await pickImageFromLibrary();
      } else {
        result = await pickDocument();
      }

      if (result.canceled || !result.assets || result.assets.length === 0) {
        return;
      }

      const fileAsset = result.assets[0];
      const formData = createFormDataFromFile(fileAsset, 'file');
      
      const endpoint = isUploadingBill 
        ? `${API_URL}/api/uploads/medical-bill`
        : `${API_URL}/api/uploads/medical-record`;

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${authToken}`,
        },
        body: formData
      });

      if (response.ok) {
        const data = await response.json();
        await fetchDocuments();
        alert(
          '🏴‍☠️ Treasure Secured!',
          `Yer ${isUploadingBill ? 'medical bill' : 'medical record'} has been safely stored in the vault! ⚓`
        );
      } else {
        const errorData = await response.json();
        alert(
          '🏴‍☠️ Upload Failed',
          errorData.error || `Failed to upload ${isUploadingBill ? 'bill' : 'record'}. Please try again.`
        );
      }
    } catch (error) {
      console.error('Upload error:', error);
      alert(
        '🏴‍☠️ Stormy Seas!',
        'The upload was lost in a storm! Please check yer connection and try again.'
      );
    } finally {
      if (isUploadingBill) {
        setUploadingBill(false);
      } else {
        setUploadingRecord(false);
      }
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'Unknown date';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const formatFileSize = (bytes) => {
    if (!bytes) return '';
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
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
      const response = await fetch(`${API_URL}/api/connections/add-medical-provider`, {
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
          '🏴‍☠️ Ahoy, Success!',
          `Ye be now connected to ${data.medicalProvider?.provider_name || 'yer medical provider'}! Yer crew be growin\' stronger! ⚓`
        );
      } else {
        alert(
          '🏴‍☠️ Blimey!',
          data.error || 'Failed to connect with the medical provider. Check yer code and try again, matey!'
        );
      }
    } catch (error) {
      console.error('Error connecting to medical provider:', error);
      alert(
        '🏴‍☠️ Stormy Seas!',
        'The connection be lost in a storm! Please check yer internet and try again.'
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleRemoveProvider = async (providerId, providerName) => {
    alert(
      '🏴‍☠️ Remove Provider?',
      `Are ye sure ye want to disconnect from ${providerName}? This will remove them from yer crew!`,
      [
        { text: 'Nay, Keep Em\'', style: 'cancel' },
        { 
          text: 'Aye, Remove', 
          style: 'destructive',
          onPress: async () => {
            try {
              const response = await fetch(`${API_URL}/api/connections/remove-medical-provider`, {
                method: 'POST',
                headers: {
                  'Authorization': `Bearer ${authToken}`,
                  'Content-Type': 'application/json'
                },
                body: JSON.stringify({ providerId: providerId })
              });

              if (response.ok) {
                await fetchConnectedProviders();
                alert('🏴‍☠️ Success!', `${providerName} has been removed from yer crew.`);
              } else {
                const data = await response.json();
                alert('🏴‍☠️ Error!', data.error || 'Failed to remove provider.');
              }
            } catch (error) {
              console.error('Error removing provider:', error);
              alert('🏴‍☠️ Error!', 'Failed to remove provider. Please try again.');
            }
          }
        }
      ]
    );
  };

  const getContentWidth = () => {
    if (isDesktop) return Math.min(width * 0.6, 800);
    if (isTablet) return width * 0.85;
    return width;
  };

  const renderDocumentItem = (doc, type) => {
    const fileName = doc.file_name || doc.fileName || 'Document';
    const fileSize = doc.file_size || doc.fileSize;
    const uploadDate = doc.created_at || doc.createdAt || doc.uploaded_at;
    
    return (
      <View key={doc.id} style={styles.documentItem}>
        <View style={styles.documentIcon}>
          <Text style={{ fontSize: 24 }}>
            {doc.mime_type?.includes('pdf') ? '📄' : '🖼️'}
          </Text>
        </View>
        <View style={styles.documentDetails}>
          <Text style={styles.documentName} numberOfLines={1}>{fileName}</Text>
          <Text style={styles.documentMeta}>
            {formatDate(uploadDate)} {fileSize ? `• ${formatFileSize(fileSize)}` : ''}
          </Text>
        </View>
      </View>
    );
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
                {/* Medical Bills Section */}
                <View style={[
                  styles.documentSection,
                  { padding: isDesktop ? 25 : 20 }
                ]}>
                  <View style={styles.sectionHeader}>
                    <Text style={[
                      styles.sectionTitle,
                      { fontSize: isDesktop ? 24 : 20 }
                    ]}>💵 Medical Bills</Text>
                    <Text style={[
                      styles.documentCount,
                      { fontSize: isDesktop ? 13 : 11 }
                    ]}>{medicalBills.length} uploaded</Text>
                  </View>
                  <Text style={[
                    styles.sectionDescription,
                    { fontSize: isDesktop ? 16 : 14 }
                  ]}>
                    Upload your medical bills securely for case documentation
                  </Text>
                  
                  {fetchingDocuments ? (
                    <ActivityIndicator size="small" color="#FFD700" style={{ marginVertical: 10 }} />
                  ) : medicalBills.length > 0 && (
                    <View style={styles.documentList}>
                      {medicalBills.slice(0, 3).map(bill => renderDocumentItem(bill, 'bill'))}
                      {medicalBills.length > 3 && (
                        <Text style={styles.moreDocuments}>
                          + {medicalBills.length - 3} more documents
                        </Text>
                      )}
                    </View>
                  )}
                  
                  <TouchableOpacity 
                    style={[
                      styles.uploadButton,
                      { paddingVertical: isDesktop ? 18 : 15 }
                    ]}
                    onPress={() => handleUpload('bill')}
                    disabled={uploadingBill}
                  >
                    {uploadingBill ? (
                      <ActivityIndicator size="small" color="#FFF" />
                    ) : (
                      <Text style={[
                        styles.buttonText,
                        { fontSize: isDesktop ? 18 : 16 }
                      ]}>📤 Upload Medical Bill</Text>
                    )}
                  </TouchableOpacity>
                </View>

                {/* Medical Records Section */}
                <View style={[
                  styles.documentSection,
                  { padding: isDesktop ? 25 : 20 }
                ]}>
                  <View style={styles.sectionHeader}>
                    <Text style={[
                      styles.sectionTitle,
                      { fontSize: isDesktop ? 24 : 20 }
                    ]}>📋 Medical Records</Text>
                    <Text style={[
                      styles.documentCount,
                      { fontSize: isDesktop ? 13 : 11 }
                    ]}>{medicalRecords.length} uploaded</Text>
                  </View>
                  <Text style={[
                    styles.sectionDescription,
                    { fontSize: isDesktop ? 16 : 14 }
                  ]}>
                    Store medical records, doctor notes, and treatment documentation
                  </Text>
                  
                  {fetchingDocuments ? (
                    <ActivityIndicator size="small" color="#FFD700" style={{ marginVertical: 10 }} />
                  ) : medicalRecords.length > 0 && (
                    <View style={styles.documentList}>
                      {medicalRecords.slice(0, 3).map(record => renderDocumentItem(record, 'record'))}
                      {medicalRecords.length > 3 && (
                        <Text style={styles.moreDocuments}>
                          + {medicalRecords.length - 3} more documents
                        </Text>
                      )}
                    </View>
                  )}
                  
                  <TouchableOpacity 
                    style={[
                      styles.uploadButton,
                      { paddingVertical: isDesktop ? 18 : 15 }
                    ]}
                    onPress={() => handleUpload('record')}
                    disabled={uploadingRecord}
                  >
                    {uploadingRecord ? (
                      <ActivityIndicator size="small" color="#FFF" />
                    ) : (
                      <Text style={[
                        styles.buttonText,
                        { fontSize: isDesktop ? 18 : 16 }
                      ]}>📤 Upload Medical Record</Text>
                    )}
                  </TouchableOpacity>
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
                      🏴‍☠️ No medical providers in yer crew yet! Tap the button above to add one.
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

      {/* Provider Modal */}
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
              Enter the provider code given to ye by yer medical provider to join their crew!
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
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => setShowProviderModal(false)}
                disabled={isLoading}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
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

      {/* Upload Method Selection Modal */}
      <Modal
        visible={showUploadModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowUploadModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[
            styles.modalContent,
            { width: isDesktop ? 450 : isTablet ? 400 : width * 0.9 }
          ]}>
            <Text style={styles.modalTitle}>
              📤 Upload {uploadType === 'bill' ? 'Medical Bill' : 'Medical Record'}
            </Text>
            <Text style={styles.modalDescription}>
              Choose how ye want to upload yer document, captain!
            </Text>
            
            <TouchableOpacity
              style={[styles.uploadMethodButton]}
              onPress={() => handleSelectUploadMethod('camera')}
            >
              <Text style={styles.uploadMethodIcon}>📷</Text>
              <Text style={styles.uploadMethodText}>Take Photo</Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[styles.uploadMethodButton]}
              onPress={() => handleSelectUploadMethod('library')}
            >
              <Text style={styles.uploadMethodIcon}>🖼️</Text>
              <Text style={styles.uploadMethodText}>Choose from Library</Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[styles.uploadMethodButton]}
              onPress={() => handleSelectUploadMethod('document')}
            >
              <Text style={styles.uploadMethodIcon}>📄</Text>
              <Text style={styles.uploadMethodText}>Browse Files (PDF, DOC)</Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[styles.uploadMethodButton, styles.cancelMethodButton]}
              onPress={() => setShowUploadModal(false)}
            >
              <Text style={styles.cancelMethodText}>Cancel</Text>
            </TouchableOpacity>
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
    marginBottom: 10,
  },
  sectionTitle: {
    fontWeight: 'bold',
    color: '#FFD700',
    textShadowColor: '#000',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  documentCount: {
    backgroundColor: 'rgba(40, 120, 80, 0.9)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    fontWeight: '700',
    color: '#90EE90',
    borderWidth: 1,
    borderColor: 'rgba(80, 200, 120, 0.5)',
    overflow: 'hidden',
  },
  sectionDescription: {
    color: '#B8A080',
    marginBottom: 15,
    lineHeight: 22,
  },
  documentList: {
    marginBottom: 15,
  },
  documentItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(60, 50, 30, 0.85)',
    padding: 12,
    borderRadius: 10,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 215, 0, 0.3)',
  },
  documentIcon: {
    marginRight: 12,
  },
  documentDetails: {
    flex: 1,
  },
  documentName: {
    color: '#FFD700',
    fontWeight: '600',
    fontSize: 14,
    marginBottom: 2,
  },
  documentMeta: {
    color: '#8B7355',
    fontSize: 12,
  },
  moreDocuments: {
    color: '#B8A080',
    fontStyle: 'italic',
    textAlign: 'center',
    marginTop: 5,
    fontSize: 13,
  },
  uploadButton: {
    backgroundColor: 'rgba(40, 120, 80, 0.9)',
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'rgba(80, 200, 120, 0.4)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.4,
    shadowRadius: 4,
    elevation: 4,
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
  loadingText: {
    color: '#FFD700',
    marginLeft: 10,
    fontSize: 14,
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
  cancelButton: {
    backgroundColor: 'rgba(80, 70, 60, 0.9)',
    marginRight: 10,
    borderWidth: 1,
    borderColor: 'rgba(150, 140, 130, 0.5)',
  },
  cancelButtonText: {
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
  uploadMethodButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(60, 50, 30, 0.85)',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 215, 0, 0.3)',
  },
  uploadMethodIcon: {
    fontSize: 24,
    marginRight: 15,
  },
  uploadMethodText: {
    color: '#FFD700',
    fontWeight: '600',
    fontSize: 16,
  },
  cancelMethodButton: {
    backgroundColor: 'rgba(80, 70, 60, 0.9)',
    justifyContent: 'center',
    marginTop: 5,
  },
  cancelMethodText: {
    color: '#B8A080',
    fontWeight: '600',
    fontSize: 16,
    textAlign: 'center',
  },
});

export default MedicalHubScreen;

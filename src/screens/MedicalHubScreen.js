import React, { useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet, Platform, ActivityIndicator } from 'react-native';
import { commonStyles } from '../styles/commonStyles';
import { API_URL } from '../config/api';
import { pickDocument, pickImage, pickImageFromLibrary, createFormDataFromFile } from '../utils/fileUpload';
import alert from '../utils/alert';
import UploadModal from '../components/UploadModal';

const MedicalHubScreen = ({ onNavigate, onUploadMedicalDocument, medicalHubUploads, authToken }) => {
  const [uploading, setUploading] = useState(false);
  const [uploadModalVisible, setUploadModalVisible] = useState(false);
  const [currentDocumentType, setCurrentDocumentType] = useState(null);

  const handleUploadMedicalBills = () => {
    setCurrentDocumentType({
      type: 'medicalBills',
      name: 'Medical Bills',
      icon: '💵',
      acceptedFormats: 'PDF, JPG, PNG, DOC, DOCX'
    });
    setUploadModalVisible(true);
  };

  const handleUploadMedicalRecords = () => {
    setCurrentDocumentType({
      type: 'medicalRecords',
      name: 'Medical Records',
      icon: '📋',
      acceptedFormats: 'PDF, JPG, PNG, DOC, DOCX'
    });
    setUploadModalVisible(true);
  };

  const closeUploadModal = () => {
    setUploadModalVisible(false);
    setTimeout(() => setCurrentDocumentType(null), 300);
  };

  const handleModalTakePhoto = async () => {
    closeUploadModal();
    if (currentDocumentType) {
      await pickImageFromCamera(currentDocumentType.type);
    }
  };

  const handleModalChooseFile = async () => {
    closeUploadModal();
    if (currentDocumentType) {
      await pickDocumentFromDevice(currentDocumentType.type);
    }
  };

  const pickImageFromCamera = async (documentType) => {
    try {
      const result = await pickImage();

      if (!result.canceled && result.assets && result.assets.length > 0) {
        await uploadFile(result.assets[0], documentType);
      }
    } catch (error) {
      console.error('Error picking image:', error);
      if (error.message === 'Camera permission is required') {
        alert('Permission Required', 'Camera permission is required to take photos.');
      } else {
        alert('Error', 'Failed to take photo. Please try again.');
      }
    }
  };

  const pickDocumentFromDevice = async (documentType) => {
    try {
      const result = await pickDocument();

      if (!result.canceled && result.assets && result.assets.length > 0) {
        await uploadFile(result.assets[0], documentType);
      }
    } catch (error) {
      console.error('Error picking document:', error);
      alert('Error', 'Failed to select file. Please try again.');
    }
  };

  const uploadFile = async (file, documentType) => {
    if (!authToken) {
      alert('Error', 'You must be logged in to upload files.');
      return;
    }

    setUploading(true);

    try {
      const endpoint = documentType === 'medicalBills' ? 'medical-bill' : 'medical-record';
      const recordType = documentType === 'medicalBills' ? 'Medical Bill' : 'Medical Record';
      
      const formData = createFormDataFromFile(file, 'file', { recordType });

      const response = await fetch(`${API_URL}/uploads/${endpoint}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${authToken}`,
        },
        body: formData,
      });

      const data = await response.json();

      if (response.ok) {
        onUploadMedicalDocument(documentType, data.document.file_name);
        alert(
          '✅ Upload Successful!',
          `${data.document.file_name} has been uploaded successfully to your Medical Hub.`
        );
      } else {
        alert('Upload Failed', data.error || 'Failed to upload file.');
      }
    } catch (error) {
      console.error('Upload error:', error);
      alert('Upload Failed', 'An error occurred while uploading the file.');
    } finally {
      setUploading(false);
    }
  };


  const handleAddProvider = () => {
    alert('Coming Soon', 'Provider management in progress');
  };

  const viewUploadedDocuments = (documentType) => {
    const documents = medicalHubUploads[documentType];
    
    if (!documents || documents.length === 0) {
      alert('No Documents', `No ${documentType === 'medicalBills' ? 'Medical Bills' : 'Medical Records'} have been uploaded yet.`);
      return;
    }

    const fileList = documents.map((file, index) => 
      `${index + 1}. ${file}`
    ).join('\n');

    alert(
      `📁 ${documentType === 'medicalBills' ? 'Medical Bills' : 'Medical Records'}`,
      fileList,
      [{ text: 'OK' }]
    );
  };

  return (
    <ScrollView style={commonStyles.container}>
      <View style={commonStyles.header}>
        <TouchableOpacity onPress={() => onNavigate('dashboard')}>
          <Text style={commonStyles.backButton}>← Back</Text>
        </TouchableOpacity>
        <Text style={commonStyles.headerTitle}>Medical Documentation Hub</Text>
      </View>

      <View style={styles.secureNotice}>
        <Text style={styles.secureIcon}>🔒</Text>
        <Text style={styles.secureText}>HIPAA-Compliant Secure Storage</Text>
      </View>

      <View style={styles.medicalContainer}>
        <View style={styles.documentSection}>
          <Text style={styles.sectionTitle}>💵 Medical Bills</Text>
          <TouchableOpacity 
            style={commonStyles.primaryButton}
            onPress={handleUploadMedicalBills}
          >
            <Text style={commonStyles.buttonText}>
              {medicalHubUploads.medicalBills.length > 0 ? '📤 Upload More Bills' : '📤 Upload Medical Bills'}
            </Text>
          </TouchableOpacity>
          {medicalHubUploads.medicalBills.length > 0 && (
            <TouchableOpacity 
              style={styles.viewButton}
              onPress={() => viewUploadedDocuments('medicalBills')}
            >
              <Text style={styles.viewButtonText}>
                📁 View Uploaded Bills ({medicalHubUploads.medicalBills.length})
              </Text>
            </TouchableOpacity>
          )}
        </View>

        <View style={styles.documentSection}>
          <Text style={styles.sectionTitle}>📋 Medical Records</Text>
          <TouchableOpacity 
            style={commonStyles.primaryButton}
            onPress={handleUploadMedicalRecords}
          >
            <Text style={commonStyles.buttonText}>
              {medicalHubUploads.medicalRecords.length > 0 ? '📤 Upload More Records' : '📤 Upload Medical Records'}
            </Text>
          </TouchableOpacity>
          {medicalHubUploads.medicalRecords.length > 0 && (
            <TouchableOpacity 
              style={styles.viewButton}
              onPress={() => viewUploadedDocuments('medicalRecords')}
            >
              <Text style={styles.viewButtonText}>
                📁 View Uploaded Records ({medicalHubUploads.medicalRecords.length})
              </Text>
            </TouchableOpacity>
          )}
        </View>

        <TouchableOpacity 
          style={[commonStyles.primaryButton, { backgroundColor: '#95a5a6' }]}
          onPress={handleAddProvider}
        >
          <Text style={commonStyles.buttonText}>➕ Add Medical Provider</Text>
        </TouchableOpacity>

        <View style={styles.documentSection}>
          <Text style={styles.sectionTitle}>📋 HIPAA Forms</Text>
          <Text style={styles.sectionDescription}>
            Manage consent forms and authorizations for sharing your medical information
          </Text>
          <TouchableOpacity 
            style={commonStyles.primaryButton}
            onPress={() => onNavigate('hipaaForms')}
          >
            <Text style={commonStyles.buttonText}>📄 View HIPAA Forms</Text>
          </TouchableOpacity>
        </View>
      </View>

      <UploadModal
        visible={uploadModalVisible}
        onClose={closeUploadModal}
        onTakePhoto={handleModalTakePhoto}
        onChooseFile={handleModalChooseFile}
        subStage={currentDocumentType}
      />
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  secureNotice: {
    backgroundColor: '#27ae60',
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 15,
    marginBottom: 20,
  },
  secureIcon: {
    fontSize: 24,
    marginRight: 10,
  },
  secureText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  medicalContainer: {
    padding: 20,
  },
  documentSection: {
    marginBottom: 30,
    backgroundColor: '#fff',
    padding: 20,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginBottom: 15,
  },
  sectionDescription: {
    fontSize: 14,
    color: '#7f8c8d',
    marginBottom: 15,
    lineHeight: 20,
  },
  viewButton: {
    backgroundColor: '#ecf0f1',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 10,
    borderWidth: 1,
    borderColor: '#bdc3c7',
  },
  viewButtonText: {
    color: '#34495e',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default MedicalHubScreen;

import React, { useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, Alert, StyleSheet, Platform, ActivityIndicator } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import { commonStyles } from '../styles/commonStyles';
import { API_URL } from '../config/api';

const MedicalHubScreen = ({ onNavigate, onUploadMedicalDocument, medicalHubUploads, authToken }) => {
  const [uploading, setUploading] = useState(false);

  const handleUploadMedicalBills = () => {
    Alert.alert(
      '📄 Upload Medical Bills',
      'Select files to upload for Medical Bills\n\nAccepted formats: PDF, JPG, PNG',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Take Photo', 
          onPress: () => simulateUpload('medicalBills', 'photo')
        },
        { 
          text: 'Choose Files', 
          onPress: () => simulateUpload('medicalBills', 'file')
        }
      ]
    );
  };

  const handleUploadMedicalRecords = () => {
    Alert.alert(
      '📋 Upload Medical Records',
      'Select files to upload for Medical Records\n\nAccepted formats: PDF, JPG, PNG',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Take Photo', 
          onPress: () => simulateUpload('medicalRecords', 'photo')
        },
        { 
          text: 'Choose Files', 
          onPress: () => simulateUpload('medicalRecords', 'file')
        }
      ]
    );
  };

  const pickImage = async (documentType) => {
    try {
      const permissionResult = await ImagePicker.requestCameraPermissionsAsync();
      
      if (permissionResult.granted === false) {
        Alert.alert('Permission Required', 'Camera permission is required to take photos.');
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: false,
        quality: 0.8,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        await uploadFile(result.assets[0], documentType);
      }
    } catch (error) {
      console.error('Error picking image:', error);
      Alert.alert('Error', 'Failed to take photo. Please try again.');
    }
  };

  const pickDocument = async (documentType) => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['image/*', 'application/pdf'],
        copyToCacheDirectory: true,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        await uploadFile(result.assets[0], documentType);
      }
    } catch (error) {
      console.error('Error picking document:', error);
      Alert.alert('Error', 'Failed to select file. Please try again.');
    }
  };

  const uploadFile = async (file, documentType) => {
    if (!authToken) {
      Alert.alert('Error', 'You must be logged in to upload files.');
      return;
    }

    setUploading(true);

    try {
      const formData = new FormData();
      
      const fileToUpload = {
        uri: Platform.OS === 'web' ? file.uri : file.uri,
        type: file.mimeType || 'application/octet-stream',
        name: file.name || `upload_${Date.now()}.${file.mimeType?.split('/')[1] || 'jpg'}`
      };

      formData.append('file', fileToUpload);
      
      const endpoint = documentType === 'medicalBills' ? 'medical-bill' : 'medical-record';
      
      formData.append('recordType', documentType === 'medicalBills' ? 'Medical Bill' : 'Medical Record');

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
        Alert.alert(
          '✅ Upload Successful!',
          `${data.document.file_name} has been uploaded successfully to your Medical Hub.`
        );
      } else {
        Alert.alert('Upload Failed', data.error || 'Failed to upload file.');
      }
    } catch (error) {
      console.error('Upload error:', error);
      Alert.alert('Upload Failed', 'An error occurred while uploading the file.');
    } finally {
      setUploading(false);
    }
  };

  const simulateUpload = (documentType, uploadType) => {
    if (uploadType === 'photo') {
      pickImage(documentType);
    } else {
      pickDocument(documentType);
    }
  };

  const handleAddProvider = () => {
    Alert.alert('Coming Soon', 'Provider management in progress');
  };

  const viewUploadedDocuments = (documentType) => {
    const documents = medicalHubUploads[documentType];
    
    if (!documents || documents.length === 0) {
      Alert.alert('No Documents', `No ${documentType === 'medicalBills' ? 'Medical Bills' : 'Medical Records'} have been uploaded yet.`);
      return;
    }

    const fileList = documents.map((file, index) => 
      `${index + 1}. ${file}`
    ).join('\n');

    Alert.alert(
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
      </View>
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

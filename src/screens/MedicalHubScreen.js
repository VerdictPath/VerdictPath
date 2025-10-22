import React from 'react';
import { View, Text, TouchableOpacity, ScrollView, Alert, StyleSheet } from 'react-native';
import { commonStyles } from '../styles/commonStyles';

const MedicalHubScreen = ({ onNavigate, onUploadMedicalDocument, medicalHubUploads }) => {
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

  const simulateUpload = (documentType, uploadType) => {
    const fileName = uploadType === 'photo' 
      ? `${documentType}_photo_${Date.now()}.jpg` 
      : `${documentType}_document_${Date.now()}.pdf`;
    
    onUploadMedicalDocument(documentType, fileName);
    
    Alert.alert(
      '✅ Upload Successful!',
      `${fileName} has been uploaded successfully to your Medical Hub.`
    );
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

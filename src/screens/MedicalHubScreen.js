import React from 'react';
import { View, Text, TouchableOpacity, ScrollView, Alert, StyleSheet } from 'react-native';
import { commonStyles } from '../styles/commonStyles';

const MedicalHubScreen = ({ onNavigate }) => {
  const handleUpload = () => {
    Alert.alert('Coming Soon', 'File upload integration in progress');
  };

  const handleAddProvider = () => {
    Alert.alert('Coming Soon', 'Provider management in progress');
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
        <TouchableOpacity 
          style={commonStyles.primaryButton}
          onPress={handleUpload}
        >
          <Text style={commonStyles.buttonText}>📷 Upload Medical Bill</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={commonStyles.primaryButton}
          onPress={handleAddProvider}
        >
          <Text style={commonStyles.buttonText}>➕ Add Medical Provider</Text>
        </TouchableOpacity>

        <View style={styles.placeholderBox}>
          <Text style={styles.placeholderText}>Your medical documents will appear here</Text>
        </View>
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
  placeholderBox: {
    backgroundColor: '#fff',
    padding: 40,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 20,
    borderWidth: 2,
    borderColor: '#ddd',
    borderStyle: 'dashed',
  },
  placeholderText: {
    fontSize: 16,
    color: '#7f8c8d',
    textAlign: 'center',
  },
});

export default MedicalHubScreen;

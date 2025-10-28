import React from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet } from 'react-native';
import { commonStyles } from '../styles/commonStyles';
import alert from '../utils/alert';

const MedicalHubScreen = ({ onNavigate, onUploadMedicalDocument, medicalHubUploads, authToken }) => {
  const handleAddProvider = () => {
    alert(
      '🏴‍☠️ Aye, Not Quite Ready!',
      'Arrr! Our navigators be still plottin\' the course to add medical providers to yer crew! This feature be comin\' soon, so hold fast and keep yer compass handy! ⚓'
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
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>💵 Medical Bills</Text>
            <Text style={styles.comingSoonBadge}>🏴‍☠️ Coming Soon</Text>
          </View>
          <View style={styles.comingSoonMessage}>
            <Text style={styles.comingSoonText}>
              Blimey! This treasure chest be still under construction. Medical Bills upload will be ready soon! ⚓
            </Text>
          </View>
        </View>

        <View style={styles.documentSection}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>📋 Medical Records</Text>
            <Text style={styles.comingSoonBadge}>🏴‍☠️ Coming Soon</Text>
          </View>
          <View style={styles.comingSoonMessage}>
            <Text style={styles.comingSoonText}>
              Arrr! The Medical Records vault be locked tighter than Davy Jones' locker! Upload feature coming soon, savvy? ⚓
            </Text>
          </View>
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
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#2c3e50',
  },
  comingSoonBadge: {
    backgroundColor: '#f39c12',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    fontSize: 11,
    fontWeight: '600',
    color: '#fff',
    borderWidth: 1,
    borderColor: '#e67e22',
  },
  comingSoonMessage: {
    backgroundColor: '#fff3cd',
    padding: 15,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#f39c12',
  },
  comingSoonText: {
    fontSize: 14,
    color: '#856404',
    textAlign: 'center',
    lineHeight: 20,
  },
  sectionDescription: {
    fontSize: 14,
    color: '#7f8c8d',
    marginBottom: 15,
    lineHeight: 20,
  },
});

export default MedicalHubScreen;

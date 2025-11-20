import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Alert, ActivityIndicator } from 'react-native';
import { theme } from '../styles/theme';
import { apiRequest, API_ENDPOINTS } from '../config/api';

const NOTIFICATION_TEMPLATES = [
  {
    id: 'appointment_reminder',
    type: 'appointment_reminder',
    title: 'Appointment Reminder',
    icon: '📅',
    defaultTitle: 'Upcoming Appointment Reminder',
    defaultBody: 'This is a reminder about your upcoming appointment. Please arrive 15 minutes early to complete any necessary paperwork.',
    actionButton: 'View Dashboard',
    actionScreen: 'dashboard',
  },
  {
    id: 'document_upload',
    type: 'document_request',
    title: 'Document Upload Request',
    icon: '📄',
    defaultTitle: 'Medical Documents Needed',
    defaultBody: 'We need you to upload additional medical documents for your records. Please use the Medical Hub to submit the required files.',
    actionButton: 'Upload Documents',
    actionScreen: 'medical',
  },
  {
    id: 'billing_notice',
    type: 'general',
    title: 'Billing Notice',
    icon: '💳',
    defaultTitle: 'Billing Statement Available',
    defaultBody: 'Your latest billing statement is now available. Please review and contact us if you have any questions.',
    actionButton: 'View Details',
    actionScreen: 'dashboard',
  },
  {
    id: 'test_results',
    type: 'general',
    title: 'Scans Available',
    icon: '🔬',
    defaultTitle: 'Scans Ready',
    defaultBody: 'Your recent scans are now available for review. Please check your medical records or contact us for more information.',
    actionButton: 'View Results',
    actionScreen: 'dashboard',
  },
  {
    id: 'prescription_refill',
    type: 'general',
    title: 'Prescription Refill Reminder',
    icon: '💊',
    defaultTitle: 'Time to Refill Your Prescription',
    defaultBody: 'Your prescription is due for a refill. Please contact our office to arrange pickup or delivery.',
    actionButton: 'View Dashboard',
    actionScreen: 'dashboard',
  },
  {
    id: 'custom',
    type: 'general',
    title: 'Custom Message',
    icon: '✉️',
    defaultTitle: '',
    defaultBody: '',
    actionButton: 'View Dashboard',
    actionScreen: 'dashboard',
  },
];

const MedicalProviderSendNotificationScreen = ({ user, onBack }) => {
  const [patients, setPatients] = useState([]);
  const [selectedPatients, setSelectedPatients] = useState([]);
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [notificationTitle, setNotificationTitle] = useState('');
  const [notificationBody, setNotificationBody] = useState('');
  const [notificationPriority, setNotificationPriority] = useState('medium');
  const [actionButtonText, setActionButtonText] = useState('View Dashboard');
  const [actionScreen, setActionScreen] = useState('dashboard');
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    fetchPatients();
  }, []);

  const fetchPatients = async () => {
    try {
      setIsLoading(true);
      const response = await apiRequest(API_ENDPOINTS.MEDICALPROVIDER.PATIENTS, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${user.token}`,
        },
      });

      if (response.patients) {
        setPatients(response.patients);
      }
    } catch (error) {
      console.error('Error fetching patients:', error);
      Alert.alert('Error', 'Failed to load patients');
    } finally {
      setIsLoading(false);
    }
  };

  const handleTemplateSelect = (template) => {
    setSelectedTemplate(template);
    setNotificationTitle(template.defaultTitle);
    setNotificationBody(template.defaultBody);
    setActionButtonText(template.actionButton);
    setActionScreen(template.actionScreen);
  };

  const togglePatientSelection = (patientId) => {
    setSelectedPatients(prev => {
      if (prev.includes(patientId)) {
        return prev.filter(id => id !== patientId);
      } else {
        return [...prev, patientId];
      }
    });
  };

  const selectAllPatients = () => {
    if (selectedPatients.length === patients.length) {
      setSelectedPatients([]);
    } else {
      setSelectedPatients(patients.map(p => p.id));
    }
  };

  const handleSendNotification = async () => {
    if (selectedPatients.length === 0) {
      Alert.alert('Error', 'Please select at least one patient');
      return;
    }

    if (!notificationTitle.trim() || !notificationBody.trim()) {
      Alert.alert('Error', 'Please enter notification title and message');
      return;
    }

    try {
      setIsSending(true);

      const response = await apiRequest(API_ENDPOINTS.NOTIFICATIONS.SEND_TO_PATIENTS, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${user.token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          patientIds: selectedPatients,
          title: notificationTitle,
          body: notificationBody,
          type: selectedTemplate?.type || 'general',
          priority: notificationPriority,
          actionUrl: actionScreen ? `verdictpath://${actionScreen}` : undefined,
          actionData: {
            buttonText: actionButtonText,
            screen: actionScreen,
          },
        }),
      });

      if (response.success) {
        Alert.alert(
          'Success',
          `Notification sent to ${response.results?.successful || selectedPatients.length} patient(s)`,
          [
            {
              text: 'OK',
              onPress: () => {
                setSelectedPatients([]);
                setSelectedTemplate(null);
                setNotificationTitle('');
                setNotificationBody('');
                setActionButtonText('View Dashboard');
                setActionScreen('dashboard');
              },
            },
          ]
        );
      } else {
        Alert.alert('Error', response.error || 'Failed to send notification');
      }
    } catch (error) {
      console.error('Error sending notification:', error);
      Alert.alert('Error', 'Failed to send notification. Please try again.');
    } finally {
      setIsSending(false);
    }
  };

  if (isLoading) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={onBack}>
            <Text style={styles.backButtonText}>← Back</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Send Notification</Text>
          <View style={styles.placeholder} />
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <Text style={styles.loadingText}>Loading patients...</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={onBack}>
          <Text style={styles.backButtonText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>📨 Send Notification</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView style={styles.scrollContent} contentContainerStyle={styles.contentContainer}>
        {/* Step 1: Select Template */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Step 1: Choose Template</Text>
          <View style={styles.templatesGrid}>
            {NOTIFICATION_TEMPLATES.map(template => (
              <TouchableOpacity
                key={template.id}
                style={[
                  styles.templateCard,
                  selectedTemplate?.id === template.id && styles.templateCardSelected
                ]}
                onPress={() => handleTemplateSelect(template)}
              >
                <Text style={styles.templateIcon}>{template.icon}</Text>
                <Text style={styles.templateTitle}>{template.title}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Step 2: Select Recipients */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Step 2: Select Recipients</Text>
            <TouchableOpacity
              style={styles.selectAllButton}
              onPress={selectAllPatients}
            >
              <Text style={styles.selectAllText}>
                {selectedPatients.length === patients.length ? 'Deselect All' : 'Select All'}
              </Text>
            </TouchableOpacity>
          </View>
          
          {/* Search Bar */}
          <View style={styles.searchContainer}>
            <Text style={styles.searchIcon}>🔍</Text>
            <TextInput
              style={styles.searchInput}
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholder="Search patients by name or email..."
              placeholderTextColor="#999"
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity
                style={styles.clearSearchButton}
                onPress={() => setSearchQuery('')}
              >
                <Text style={styles.clearSearchText}>✕</Text>
              </TouchableOpacity>
            )}
          </View>
          
          {patients.length === 0 ? (
            <View style={styles.emptyPatients}>
              <Text style={styles.emptyPatientsText}>No patients found</Text>
            </View>
          ) : (
            <View style={styles.patientsList}>
              {patients.filter(patient => {
                if (!searchQuery.trim()) return true;
                const query = searchQuery.toLowerCase();
                const fullName = `${patient.first_name} ${patient.last_name}`.toLowerCase();
                const email = patient.email.toLowerCase();
                return fullName.includes(query) || email.includes(query);
              }).map(patient => (
                <TouchableOpacity
                  key={patient.id}
                  style={[
                    styles.patientCard,
                    selectedPatients.includes(patient.id) && styles.patientCardSelected
                  ]}
                  onPress={() => togglePatientSelection(patient.id)}
                >
                  <View style={styles.patientInfo}>
                    <Text style={styles.patientName}>
                      {patient.first_name} {patient.last_name}
                    </Text>
                    <Text style={styles.patientEmail}>{patient.email}</Text>
                  </View>
                  {selectedPatients.includes(patient.id) && (
                    <Text style={styles.checkmark}>✓</Text>
                  )}
                </TouchableOpacity>
              ))}
            </View>
          )}
          
          {selectedPatients.length > 0 && (
            <Text style={styles.selectedCount}>
              {selectedPatients.length} patient{selectedPatients.length !== 1 ? 's' : ''} selected
            </Text>
          )}
        </View>

        {/* Step 3: Compose Message */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Step 3: Compose Message</Text>
          
          <Text style={styles.inputLabel}>Notification Title</Text>
          <TextInput
            style={styles.input}
            value={notificationTitle}
            onChangeText={setNotificationTitle}
            placeholder="Enter notification title..."
            placeholderTextColor="#999"
          />

          <Text style={styles.inputLabel}>Message</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            value={notificationBody}
            onChangeText={setNotificationBody}
            placeholder="Enter your message..."
            placeholderTextColor="#999"
            multiline
            numberOfLines={6}
            textAlignVertical="top"
          />

          <Text style={styles.inputLabel}>Action Button Text</Text>
          <TextInput
            style={styles.input}
            value={actionButtonText}
            onChangeText={setActionButtonText}
            placeholder="View Dashboard"
            placeholderTextColor="#999"
          />
        </View>

        {/* Send Button */}
        <TouchableOpacity
          style={[
            styles.sendButton,
            (selectedPatients.length === 0 || !notificationTitle.trim() || !notificationBody.trim() || isSending) && styles.sendButtonDisabled
          ]}
          onPress={handleSendNotification}
          disabled={selectedPatients.length === 0 || !notificationTitle.trim() || !notificationBody.trim() || isSending}
        >
          {isSending ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Text style={styles.sendButtonText}>
              Send to {selectedPatients.length} Patient{selectedPatients.length !== 1 ? 's' : ''}
            </Text>
          )}
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: theme.colors.primary,
    borderBottomWidth: 2,
    borderBottomColor: '#d4a574',
  },
  backButton: {
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  backButtonText: {
    fontSize: 16,
    color: '#fff',
    fontWeight: '600',
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#fff',
  },
  placeholder: {
    width: 60,
  },
  scrollContent: {
    flex: 1,
  },
  contentContainer: {
    padding: 20,
    paddingBottom: 40,
  },
  section: {
    marginBottom: 30,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 12,
  },
  selectAllButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: theme.colors.primary,
    borderRadius: 6,
  },
  selectAllText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  templatesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  templateCard: {
    width: '48%',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#e0e0e0',
  },
  templateCardSelected: {
    borderColor: theme.colors.primary,
    backgroundColor: '#f0f8ff',
  },
  templateIcon: {
    fontSize: 32,
    marginBottom: 8,
  },
  templateTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#333',
    textAlign: 'center',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  searchIcon: {
    fontSize: 18,
    marginRight: 12,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#333',
  },
  clearSearchButton: {
    padding: 4,
  },
  clearSearchText: {
    fontSize: 20,
    color: '#999',
    fontWeight: 'bold',
  },
  patientsList: {
    gap: 10,
  },
  patientCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    borderWidth: 2,
    borderColor: '#e0e0e0',
  },
  patientCardSelected: {
    borderColor: theme.colors.primary,
    backgroundColor: '#f0f8ff',
  },
  patientInfo: {
    flex: 1,
  },
  patientName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  patientEmail: {
    fontSize: 14,
    color: '#666',
  },
  checkmark: {
    fontSize: 24,
    color: theme.colors.primary,
    fontWeight: 'bold',
  },
  selectedCount: {
    marginTop: 12,
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.primary,
    textAlign: 'center',
  },
  emptyPatients: {
    padding: 40,
    alignItems: 'center',
  },
  emptyPatientsText: {
    fontSize: 16,
    color: '#666',
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
    marginTop: 12,
  },
  input: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: '#333',
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  textArea: {
    height: 120,
    paddingTop: 16,
  },
  sendButton: {
    backgroundColor: theme.colors.secondary,
    borderRadius: 12,
    paddingVertical: 18,
    alignItems: 'center',
    marginTop: 20,
  },
  sendButtonDisabled: {
    backgroundColor: '#ccc',
  },
  sendButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '700',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
  },
});

export default MedicalProviderSendNotificationScreen;

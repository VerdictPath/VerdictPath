import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Alert, ActivityIndicator } from 'react-native';
import { medicalProviderTheme } from '../styles/medicalProviderTheme';
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
  const [showPatientDropdown, setShowPatientDropdown] = useState(false);

  useEffect(() => {
    fetchPatients();
  }, []);

  const fetchPatients = async () => {
    try {
      setIsLoading(true);
      console.log('[SendNotification] Fetching patients with token:', user?.token ? 'Present' : 'Missing');
      
      const response = await apiRequest(API_ENDPOINTS.MEDICALPROVIDER.PATIENTS, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${user.token}`,
        },
      });

      console.log('[SendNotification] Full API response:', JSON.stringify(response, null, 2));
      console.log('[SendNotification] Patients array:', response.patients);
      
      if (response.patients && response.patients.length > 0) {
        console.log('[SendNotification] First patient data:', JSON.stringify(response.patients[0], null, 2));
        console.log('[SendNotification] Patient fields available:', Object.keys(response.patients[0]));
        setPatients(response.patients);
      } else {
        console.log('[SendNotification] No patients in response');
        setPatients([]);
      }
    } catch (error) {
      console.error('[SendNotification] Error fetching patients:', error);
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
          <ActivityIndicator size="large" color={medicalProviderTheme.colors.primary} />
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
          <Text style={styles.sectionTitle}>Step 2: Select Recipients</Text>
          
          {/* Dropdown Selector */}
          <TouchableOpacity
            style={styles.dropdownButton}
            onPress={() => setShowPatientDropdown(!showPatientDropdown)}
          >
            <View style={styles.dropdownButtonContent}>
              <Text style={{ fontSize: 18, marginRight: 8 }}>👥</Text>
              <Text style={styles.dropdownButtonText}>
                {selectedPatients.length === 0
                  ? 'Select patients...'
                  : selectedPatients.length === patients.length
                    ? `All patients (${patients.length})`
                    : `${selectedPatients.length} patient${selectedPatients.length !== 1 ? 's' : ''} selected`
                }
              </Text>
            </View>
            <Text style={styles.dropdownArrow}>{showPatientDropdown ? '▲' : '▼'}</Text>
          </TouchableOpacity>

          {/* Dropdown Content */}
          {showPatientDropdown && (
            <View style={styles.dropdownContent}>
              {/* Search Bar */}
              <View style={styles.dropdownSearchContainer}>
                <Text style={{ fontSize: 16, marginRight: 8 }}>🔍</Text>
                <TextInput
                  style={styles.dropdownSearchInput}
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                  placeholder="Search patients..."
                  placeholderTextColor="#999"
                  autoCapitalize="none"
                />
                {searchQuery.length > 0 && (
                  <TouchableOpacity onPress={() => setSearchQuery('')}>
                    <Text style={{ fontSize: 16, color: '#999' }}>✕</Text>
                  </TouchableOpacity>
                )}
              </View>

              {/* Select All Option */}
              <TouchableOpacity
                style={styles.dropdownSelectAll}
                onPress={selectAllPatients}
              >
                <Text style={{ fontSize: 16, marginRight: 8 }}>
                  {selectedPatients.length === patients.length ? '☑️' : '⬜'}
                </Text>
                <Text style={styles.dropdownSelectAllText}>
                  {selectedPatients.length === patients.length ? 'Deselect All' : 'Select All'} ({patients.length})
                </Text>
              </TouchableOpacity>

              {/* Patient List */}
              <ScrollView style={styles.dropdownList} nestedScrollEnabled={true}>
                {patients.length === 0 ? (
                  <View style={styles.dropdownEmptyState}>
                    <Text style={styles.dropdownEmptyText}>No patients found</Text>
                  </View>
                ) : (
                  patients.filter(patient => {
                    if (!searchQuery.trim()) return true;
                    const query = searchQuery.toLowerCase();
                    const fullName = `${patient.firstName || ''} ${patient.lastName || ''}`.toLowerCase();
                    const displayName = (patient.displayName || '').toLowerCase();
                    const email = (patient.email || '').toLowerCase();
                    return fullName.includes(query) || displayName.includes(query) || email.includes(query);
                  }).map(patient => (
                    <TouchableOpacity
                      key={patient.id}
                      style={[
                        styles.dropdownItem,
                        selectedPatients.includes(patient.id) && styles.dropdownItemSelected
                      ]}
                      onPress={() => togglePatientSelection(patient.id)}
                    >
                      <Text style={{ fontSize: 16, marginRight: 8 }}>
                        {selectedPatients.includes(patient.id) ? '☑️' : '⬜'}
                      </Text>
                      <View style={styles.dropdownItemInfo}>
                        <Text style={[
                          styles.dropdownItemName,
                          selectedPatients.includes(patient.id) && styles.dropdownItemNameSelected
                        ]}>
                          {patient.displayName || `${patient.firstName || ''} ${patient.lastName || ''}`}
                        </Text>
                        <Text style={styles.dropdownItemEmail}>{patient.email}</Text>
                      </View>
                    </TouchableOpacity>
                  ))
                )}
                {searchQuery && patients.filter(patient => {
                  const query = searchQuery.toLowerCase();
                  const fullName = `${patient.firstName || ''} ${patient.lastName || ''}`.toLowerCase();
                  const displayName = (patient.displayName || '').toLowerCase();
                  const email = (patient.email || '').toLowerCase();
                  return fullName.includes(query) || displayName.includes(query) || email.includes(query);
                }).length === 0 && (
                  <View style={styles.dropdownEmptyState}>
                    <Text style={styles.dropdownEmptyText}>No patients match "{searchQuery}"</Text>
                  </View>
                )}
              </ScrollView>
            </View>
          )}
          
          {/* Selected Patients Summary */}
          {selectedPatients.length > 0 && !showPatientDropdown && (
            <View style={styles.selectedSummary}>
              <Text style={styles.selectedSummaryText}>
                ✓ {selectedPatients.length} patient{selectedPatients.length !== 1 ? 's' : ''} will receive this notification
              </Text>
            </View>
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
    backgroundColor: medicalProviderTheme.colors.offWhite,
    paddingBottom: 100,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: medicalProviderTheme.spacing.xl,
    paddingVertical: medicalProviderTheme.spacing.lg,
    backgroundColor: medicalProviderTheme.colors.deepTeal,
    ...medicalProviderTheme.shadows.header,
  },
  backButton: {
    paddingVertical: medicalProviderTheme.spacing.sm,
    paddingHorizontal: medicalProviderTheme.spacing.md,
  },
  backButtonText: {
    fontSize: 16,
    color: medicalProviderTheme.colors.clinicalWhite,
    fontWeight: '600',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: medicalProviderTheme.colors.clinicalWhite,
  },
  placeholder: {
    width: 60,
  },
  scrollContent: {
    flex: 1,
  },
  contentContainer: {
    padding: medicalProviderTheme.spacing.xl,
    paddingBottom: 40,
  },
  section: {
    marginBottom: medicalProviderTheme.spacing.xxxl,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: medicalProviderTheme.spacing.md,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: medicalProviderTheme.colors.charcoal,
    marginBottom: medicalProviderTheme.spacing.md,
  },
  selectAllButton: {
    paddingHorizontal: medicalProviderTheme.spacing.md,
    paddingVertical: medicalProviderTheme.spacing.sm,
    backgroundColor: medicalProviderTheme.colors.clinicalTeal,
    borderRadius: medicalProviderTheme.borderRadius.small,
  },
  selectAllText: {
    color: medicalProviderTheme.colors.clinicalWhite,
    fontSize: 14,
    fontWeight: '600',
  },
  templatesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: medicalProviderTheme.spacing.md,
  },
  templateCard: {
    width: '48%',
    backgroundColor: medicalProviderTheme.colors.clinicalWhite,
    borderRadius: medicalProviderTheme.borderRadius.medium,
    padding: medicalProviderTheme.spacing.lg,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: medicalProviderTheme.colors.lightGray,
    ...medicalProviderTheme.shadows.card,
  },
  templateCardSelected: {
    borderColor: medicalProviderTheme.colors.clinicalTeal,
    backgroundColor: medicalProviderTheme.colors.lightTeal,
  },
  templateIcon: {
    fontSize: 32,
    marginBottom: medicalProviderTheme.spacing.sm,
  },
  templateTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: medicalProviderTheme.colors.charcoal,
    textAlign: 'center',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: medicalProviderTheme.colors.clinicalWhite,
    borderRadius: medicalProviderTheme.borderRadius.medium,
    paddingHorizontal: medicalProviderTheme.spacing.lg,
    paddingVertical: medicalProviderTheme.spacing.md,
    marginBottom: medicalProviderTheme.spacing.lg,
    ...medicalProviderTheme.shadows.card,
  },
  searchIcon: {
    fontSize: 18,
    marginRight: medicalProviderTheme.spacing.md,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: medicalProviderTheme.colors.charcoal,
  },
  clearSearchButton: {
    padding: medicalProviderTheme.spacing.xs,
  },
  clearSearchText: {
    fontSize: 20,
    color: medicalProviderTheme.colors.mediumGray,
    fontWeight: 'bold',
  },
  patientsList: {
    gap: medicalProviderTheme.spacing.md,
  },
  patientCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: medicalProviderTheme.colors.clinicalWhite,
    borderRadius: medicalProviderTheme.borderRadius.medium,
    padding: medicalProviderTheme.spacing.lg,
    borderWidth: 2,
    borderColor: medicalProviderTheme.colors.lightGray,
    ...medicalProviderTheme.shadows.card,
  },
  patientCardSelected: {
    borderColor: medicalProviderTheme.colors.clinicalTeal,
    backgroundColor: medicalProviderTheme.colors.lightTeal,
  },
  patientInfo: {
    flex: 1,
  },
  patientName: {
    fontSize: 16,
    fontWeight: '700',
    color: medicalProviderTheme.colors.charcoal,
    marginBottom: medicalProviderTheme.spacing.xs,
  },
  patientEmail: {
    fontSize: 14,
    color: medicalProviderTheme.colors.darkGray,
  },
  checkmark: {
    fontSize: 24,
    color: medicalProviderTheme.colors.clinicalTeal,
    fontWeight: 'bold',
  },
  selectedCount: {
    marginTop: medicalProviderTheme.spacing.md,
    fontSize: 14,
    fontWeight: '600',
    color: medicalProviderTheme.colors.clinicalTeal,
    textAlign: 'center',
  },
  emptyPatients: {
    padding: 40,
    alignItems: 'center',
  },
  emptyPatientsText: {
    fontSize: 16,
    color: medicalProviderTheme.colors.darkGray,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: medicalProviderTheme.colors.charcoal,
    marginBottom: medicalProviderTheme.spacing.sm,
    marginTop: medicalProviderTheme.spacing.md,
  },
  input: {
    backgroundColor: medicalProviderTheme.colors.clinicalWhite,
    borderRadius: medicalProviderTheme.borderRadius.medium,
    padding: medicalProviderTheme.spacing.lg,
    fontSize: 16,
    color: medicalProviderTheme.colors.charcoal,
    borderWidth: 1,
    borderColor: medicalProviderTheme.colors.lightGray,
  },
  textArea: {
    height: 120,
    paddingTop: medicalProviderTheme.spacing.lg,
  },
  sendButton: {
    backgroundColor: medicalProviderTheme.colors.deepTeal,
    borderRadius: medicalProviderTheme.borderRadius.medium,
    paddingVertical: 18,
    alignItems: 'center',
    marginTop: medicalProviderTheme.spacing.xl,
    ...medicalProviderTheme.shadows.card,
  },
  sendButtonDisabled: {
    backgroundColor: medicalProviderTheme.colors.mediumGray,
  },
  sendButtonText: {
    color: medicalProviderTheme.colors.clinicalWhite,
    fontSize: 18,
    fontWeight: '700',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: medicalProviderTheme.spacing.lg,
    fontSize: 16,
    color: medicalProviderTheme.colors.darkGray,
  },
  dropdownButton: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: medicalProviderTheme.colors.clinicalWhite,
    borderRadius: medicalProviderTheme.borderRadius.medium,
    padding: medicalProviderTheme.spacing.lg,
    borderWidth: 2,
    borderColor: medicalProviderTheme.colors.lightGray,
    ...medicalProviderTheme.shadows.card,
  },
  dropdownButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  dropdownButtonText: {
    fontSize: 16,
    color: medicalProviderTheme.colors.charcoal,
  },
  dropdownArrow: {
    fontSize: 14,
    color: medicalProviderTheme.colors.darkGray,
  },
  dropdownContent: {
    marginTop: medicalProviderTheme.spacing.sm,
    backgroundColor: medicalProviderTheme.colors.clinicalWhite,
    borderRadius: medicalProviderTheme.borderRadius.medium,
    borderWidth: 1,
    borderColor: medicalProviderTheme.colors.lightGray,
    ...medicalProviderTheme.shadows.card,
    maxHeight: 300,
  },
  dropdownSearchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: medicalProviderTheme.spacing.md,
    paddingVertical: medicalProviderTheme.spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: medicalProviderTheme.colors.lightGray,
  },
  dropdownSearchInput: {
    flex: 1,
    fontSize: 14,
    color: medicalProviderTheme.colors.charcoal,
    paddingVertical: medicalProviderTheme.spacing.xs,
  },
  dropdownSelectAll: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: medicalProviderTheme.spacing.md,
    paddingVertical: medicalProviderTheme.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: medicalProviderTheme.colors.lightGray,
    backgroundColor: medicalProviderTheme.colors.lightTeal,
  },
  dropdownSelectAllText: {
    fontSize: 14,
    fontWeight: '600',
    color: medicalProviderTheme.colors.deepTeal,
  },
  dropdownList: {
    maxHeight: 200,
  },
  dropdownItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: medicalProviderTheme.spacing.md,
    paddingVertical: medicalProviderTheme.spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: medicalProviderTheme.colors.offWhite,
  },
  dropdownItemSelected: {
    backgroundColor: medicalProviderTheme.colors.lightTeal,
  },
  dropdownItemInfo: {
    flex: 1,
  },
  dropdownItemName: {
    fontSize: 14,
    fontWeight: '600',
    color: medicalProviderTheme.colors.charcoal,
  },
  dropdownItemNameSelected: {
    color: medicalProviderTheme.colors.deepTeal,
  },
  dropdownItemEmail: {
    fontSize: 12,
    color: medicalProviderTheme.colors.darkGray,
  },
  dropdownEmptyState: {
    padding: medicalProviderTheme.spacing.xl,
    alignItems: 'center',
  },
  dropdownEmptyText: {
    fontSize: 14,
    color: medicalProviderTheme.colors.darkGray,
  },
  selectedSummary: {
    marginTop: medicalProviderTheme.spacing.md,
    padding: medicalProviderTheme.spacing.md,
    backgroundColor: medicalProviderTheme.colors.lightTeal,
    borderRadius: medicalProviderTheme.borderRadius.small,
  },
  selectedSummaryText: {
    fontSize: 14,
    fontWeight: '600',
    color: medicalProviderTheme.colors.deepTeal,
    textAlign: 'center',
  },
});

export default MedicalProviderSendNotificationScreen;

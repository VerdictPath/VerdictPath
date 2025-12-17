import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Alert, ActivityIndicator, Switch } from 'react-native';
import { theme } from '../styles/theme';
import { apiRequest, API_BASE_URL } from '../config/api';

const NOTIFICATION_TYPES = [
  {
    id: 'case_update',
    type: 'case_update',
    title: 'Case Update',
    icon: '📋',
    defaultSubject: 'Case Update',
    defaultMessage: 'I have an update regarding my case that I would like to share.',
    description: 'Milestone completions, status changes'
  },
  {
    id: 'appointment_reminder',
    type: 'appointment_reminder',
    title: 'Appointment',
    icon: '📅',
    defaultSubject: 'Appointment Request',
    defaultMessage: 'I would like to schedule an appointment at your earliest convenience.',
    description: 'Medical appointments, consultations'
  },
  {
    id: 'payment_notification',
    type: 'payment_notification',
    title: 'Payment',
    icon: '💳',
    defaultSubject: 'Payment Inquiry',
    defaultMessage: 'I have a question regarding payments or billing.',
    description: 'Invoices, payment confirmations'
  },
  {
    id: 'document_request',
    type: 'document_request',
    title: 'Document',
    icon: '📄',
    defaultSubject: 'Document Submission',
    defaultMessage: 'I have documents to submit or need assistance with document requests.',
    description: 'Medical records, evidence, signatures'
  },
  {
    id: 'system_alert',
    type: 'system_alert',
    title: 'General',
    icon: '📢',
    defaultSubject: 'General Message',
    defaultMessage: 'I would like to send a general message.',
    description: 'General inquiries, other matters'
  },
];

const IndividualSendNotificationScreen = ({ user, onBack }) => {
  const [connections, setConnections] = useState({ lawFirm: null, medicalProviders: [] });
  const [selectedRecipient, setSelectedRecipient] = useState(null);
  const [selectedType, setSelectedType] = useState(null);
  const [subject, setSubject] = useState('');
  const [customMessage, setCustomMessage] = useState('');
  const [isUrgent, setIsUrgent] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);

  useEffect(() => {
    fetchConnections();
  }, []);

  const fetchConnections = async () => {
    try {
      setIsLoading(true);
      const response = await fetch(
        `${API_BASE_URL}/api/notifications/my-connections-for-notification`,
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${user.token}`,
          },
        }
      );

      const data = await response.json();
      if (data.success) {
        setConnections(data.connections);
      }
    } catch (error) {
      console.error('Error fetching connections:', error);
      Alert.alert('Error', 'Failed to load your connections');
    } finally {
      setIsLoading(false);
    }
  };

  const handleTypeSelect = (type) => {
    setSelectedType(type);
    setSubject(type.defaultSubject);
    setCustomMessage(type.defaultMessage);
  };

  const handleRecipientSelect = (recipient, type) => {
    setSelectedRecipient({ ...recipient, recipientType: type });
  };

  const handleSendNotification = async () => {
    if (!selectedRecipient) {
      Alert.alert('Select Recipient', 'Please select who you want to notify');
      return;
    }

    if (!selectedType) {
      Alert.alert('Select Type', 'Please select a notification type');
      return;
    }

    if (!subject.trim()) {
      Alert.alert('Subject Required', 'Please enter a subject for your notification');
      return;
    }

    try {
      setIsSending(true);
      const response = await fetch(
        `${API_BASE_URL}/api/notifications/send-to-connection`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${user.token}`,
          },
          body: JSON.stringify({
            recipientType: selectedRecipient.recipientType,
            recipientId: selectedRecipient.id,
            notificationType: selectedType.type,
            subject: subject.trim(),
            message: customMessage || selectedType.defaultMessage,
            priority: isUrgent ? 'urgent' : 'medium',
            isUrgent: isUrgent
          }),
        }
      );

      const data = await response.json();

      if (data.success) {
        Alert.alert(
          'Notification Sent',
          `Your ${selectedType.title.toLowerCase()} notification has been sent successfully!`,
          [{ text: 'OK', onPress: () => onBack() }]
        );
      } else {
        throw new Error(data.error || 'Failed to send notification');
      }
    } catch (error) {
      console.error('Error sending notification:', error);
      Alert.alert('Error', error.message || 'Failed to send notification');
    } finally {
      setIsSending(false);
    }
  };

  const hasConnections = connections.lawFirm || connections.medicalProviders.length > 0;

  if (isLoading) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={onBack} style={styles.backButton}>
            <Text style={styles.backButtonText}>← Back</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Send Notification</Text>
          <View style={styles.headerSpacer} />
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <Text style={styles.loadingText}>Loading connections...</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack} style={styles.backButton}>
          <Text style={styles.backButtonText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Send Notification</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
        {!hasConnections ? (
          <View style={styles.noConnectionsContainer}>
            <Text style={styles.noConnectionsIcon}>🔗</Text>
            <Text style={styles.noConnectionsTitle}>No Connections Yet</Text>
            <Text style={styles.noConnectionsText}>
              You need to connect with a law firm or medical provider before you can send notifications.
            </Text>
          </View>
        ) : (
          <>
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Step 1: Select Recipient</Text>
              <Text style={styles.sectionSubtitle}>Who do you want to notify?</Text>
              
              {connections.lawFirm && (
                <TouchableOpacity
                  style={[
                    styles.recipientCard,
                    selectedRecipient?.id === connections.lawFirm.id && 
                    selectedRecipient?.recipientType === 'law_firm' && styles.recipientCardSelected
                  ]}
                  onPress={() => handleRecipientSelect(connections.lawFirm, 'law_firm')}
                >
                  <View style={styles.recipientIcon}>
                    <Text style={styles.recipientIconText}>⚖️</Text>
                  </View>
                  <View style={styles.recipientInfo}>
                    <Text style={styles.recipientName}>{connections.lawFirm.firm_name}</Text>
                    <Text style={styles.recipientType}>Law Firm</Text>
                  </View>
                  {selectedRecipient?.id === connections.lawFirm.id && 
                   selectedRecipient?.recipientType === 'law_firm' && (
                    <Text style={styles.checkmark}>✓</Text>
                  )}
                </TouchableOpacity>
              )}

              {connections.medicalProviders.map((provider) => (
                <TouchableOpacity
                  key={provider.id}
                  style={[
                    styles.recipientCard,
                    selectedRecipient?.id === provider.id && 
                    selectedRecipient?.recipientType === 'medical_provider' && styles.recipientCardSelected
                  ]}
                  onPress={() => handleRecipientSelect(provider, 'medical_provider')}
                >
                  <View style={[styles.recipientIcon, styles.medicalIcon]}>
                    <Text style={styles.recipientIconText}>🏥</Text>
                  </View>
                  <View style={styles.recipientInfo}>
                    <Text style={styles.recipientName}>{provider.provider_name}</Text>
                    <Text style={styles.recipientType}>Medical Provider</Text>
                  </View>
                  {selectedRecipient?.id === provider.id && 
                   selectedRecipient?.recipientType === 'medical_provider' && (
                    <Text style={styles.checkmark}>✓</Text>
                  )}
                </TouchableOpacity>
              ))}
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Step 2: Select Notification Type</Text>
              <Text style={styles.sectionSubtitle}>What would you like to communicate?</Text>
              
              <View style={styles.templatesGrid}>
                {NOTIFICATION_TYPES.map((type) => (
                  <TouchableOpacity
                    key={type.id}
                    style={[
                      styles.templateCard,
                      selectedType?.id === type.id && styles.templateCardSelected
                    ]}
                    onPress={() => handleTypeSelect(type)}
                  >
                    <Text style={styles.templateIcon}>{type.icon}</Text>
                    <Text style={styles.templateTitle}>{type.title}</Text>
                    <Text style={styles.templateDescription}>{type.description}</Text>
                    {selectedType?.id === type.id && (
                      <View style={styles.templateCheckmark}>
                        <Text style={styles.templateCheckmarkText}>✓</Text>
                      </View>
                    )}
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {selectedType && (
              <>
                <View style={styles.urgentSection}>
                  <View style={styles.urgentRow}>
                    <Text style={styles.urgentIcon}>⚠️</Text>
                    <Text style={styles.urgentLabel}>Mark as URGENT</Text>
                    <Switch
                      value={isUrgent}
                      onValueChange={setIsUrgent}
                      trackColor={{ false: '#444', true: '#dc2626' }}
                      thumbColor={isUrgent ? '#fff' : '#ccc'}
                    />
                  </View>
                  {isUrgent && (
                    <Text style={styles.urgentWarning}>
                      Urgent notifications will be prioritized and may trigger immediate alerts
                    </Text>
                  )}
                </View>

                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>Step 3: Subject</Text>
                  <TextInput
                    style={styles.subjectInput}
                    value={subject}
                    onChangeText={setSubject}
                    placeholder="Enter subject..."
                    placeholderTextColor="#999"
                    maxLength={100}
                  />
                </View>

                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>Step 4: Message</Text>
                  <Text style={styles.sectionSubtitle}>Customize your message (no character limit)</Text>
                  
                  <TextInput
                    style={styles.messageInput}
                    value={customMessage}
                    onChangeText={setCustomMessage}
                    placeholder="Enter your message..."
                    placeholderTextColor="#999"
                    multiline
                    numberOfLines={6}
                    textAlignVertical="top"
                  />
                </View>
              </>
            )}

            <TouchableOpacity
              style={[
                styles.sendButton,
                (!selectedRecipient || !selectedType || !subject.trim()) && styles.sendButtonDisabled,
                isUrgent && styles.sendButtonUrgent
              ]}
              onPress={handleSendNotification}
              disabled={!selectedRecipient || !selectedType || !subject.trim() || isSending}
            >
              {isSending ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Text style={styles.sendButtonText}>
                  {isUrgent ? '⚠️ Send Urgent Notification' : 'Send Notification'}
                </Text>
              )}
            </TouchableOpacity>
          </>
        )}
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
    paddingHorizontal: 16,
    paddingVertical: 16,
    paddingTop: 50,
    backgroundColor: theme.colors.primary,
  },
  backButton: {
    padding: 8,
  },
  backButtonText: {
    color: '#C0C0C0',
    fontSize: 16,
    fontWeight: '600',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#fff',
  },
  headerSpacer: {
    width: 60,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: theme.colors.textSecondary,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: 16,
    paddingBottom: 40,
  },
  noConnectionsContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    paddingHorizontal: 20,
  },
  noConnectionsIcon: {
    fontSize: 48,
    marginBottom: 16,
  },
  noConnectionsTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: theme.colors.text,
    marginBottom: 8,
  },
  noConnectionsText: {
    fontSize: 16,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    lineHeight: 24,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: theme.colors.text,
    marginBottom: 4,
  },
  sectionSubtitle: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    marginBottom: 16,
  },
  recipientCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 10,
    borderWidth: 2,
    borderColor: 'transparent',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  recipientCardSelected: {
    borderColor: theme.colors.primary,
    backgroundColor: theme.colors.primaryLight + '10',
  },
  recipientIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: theme.colors.primary + '20',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  medicalIcon: {
    backgroundColor: '#115E5920',
  },
  recipientIconText: {
    fontSize: 24,
  },
  recipientInfo: {
    flex: 1,
  },
  recipientName: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.text,
  },
  recipientType: {
    fontSize: 13,
    color: theme.colors.textSecondary,
    marginTop: 2,
  },
  checkmark: {
    fontSize: 20,
    color: theme.colors.primary,
    fontWeight: '700',
  },
  templatesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -6,
  },
  templateCard: {
    width: '48%',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    margin: '1%',
    borderWidth: 2,
    borderColor: 'transparent',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
    position: 'relative',
  },
  templateCardSelected: {
    borderColor: theme.colors.primary,
    backgroundColor: theme.colors.primaryLight + '10',
  },
  templateIcon: {
    fontSize: 32,
    marginBottom: 8,
  },
  templateTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: theme.colors.text,
    marginBottom: 4,
  },
  templateDescription: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    lineHeight: 16,
  },
  templateCheckmark: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: theme.colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  templateCheckmarkText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
  },
  messageInput: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    fontSize: 15,
    color: theme.colors.text,
    minHeight: 140,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    textAlignVertical: 'top',
  },
  subjectInput: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    fontSize: 15,
    color: theme.colors.text,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  urgentSection: {
    backgroundColor: '#fee2e2',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#fca5a5',
  },
  urgentRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  urgentIcon: {
    fontSize: 20,
    marginRight: 10,
  },
  urgentLabel: {
    flex: 1,
    fontSize: 16,
    fontWeight: '700',
    color: '#dc2626',
  },
  urgentWarning: {
    marginTop: 10,
    fontSize: 13,
    color: '#b91c1c',
    fontStyle: 'italic',
  },
  sendButton: {
    backgroundColor: theme.colors.primary,
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 16,
  },
  sendButtonDisabled: {
    backgroundColor: '#CCC',
  },
  sendButtonUrgent: {
    backgroundColor: '#dc2626',
  },
  sendButtonText: {
    color: '#fff',
    fontSize: 17,
    fontWeight: '700',
  },
});

export default IndividualSendNotificationScreen;

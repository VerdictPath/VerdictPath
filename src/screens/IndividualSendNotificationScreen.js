import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Alert, ActivityIndicator } from 'react-native';
import { theme } from '../styles/theme';
import { apiRequest, API_BASE_URL } from '../config/api';

const NOTIFICATION_TEMPLATES = [
  {
    id: 'appointment_request',
    type: 'appointment_request',
    title: 'Appointment Request',
    icon: '📅',
    defaultMessage: 'I would like to schedule an appointment at your earliest convenience.',
    description: 'Request a new appointment'
  },
  {
    id: 'status_update_request',
    type: 'status_update_request',
    title: 'Status Update Request',
    icon: '📊',
    defaultMessage: 'Could you please provide an update on my case status?',
    description: 'Ask for a case status update'
  },
  {
    id: 'new_information',
    type: 'new_information',
    title: 'New Information',
    icon: '📝',
    defaultMessage: 'I have new information to share regarding my case.',
    description: 'Alert about new information'
  },
  {
    id: 'reschedule_request',
    type: 'reschedule_request',
    title: 'Reschedule Request',
    icon: '🔄',
    defaultMessage: 'I need to reschedule my upcoming appointment. Please let me know available times.',
    description: 'Request to reschedule'
  },
];

const IndividualSendNotificationScreen = ({ user, onBack }) => {
  const [connections, setConnections] = useState({ lawFirm: null, medicalProviders: [] });
  const [selectedRecipient, setSelectedRecipient] = useState(null);
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [customMessage, setCustomMessage] = useState('');
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

  const handleTemplateSelect = (template) => {
    setSelectedTemplate(template);
    setCustomMessage(template.defaultMessage);
  };

  const handleRecipientSelect = (recipient, type) => {
    setSelectedRecipient({ ...recipient, recipientType: type });
  };

  const handleSendNotification = async () => {
    if (!selectedRecipient) {
      Alert.alert('Select Recipient', 'Please select who you want to notify');
      return;
    }

    if (!selectedTemplate) {
      Alert.alert('Select Type', 'Please select a notification type');
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
            notificationType: selectedTemplate.type,
            message: customMessage || selectedTemplate.defaultMessage,
            priority: 'medium'
          }),
        }
      );

      const data = await response.json();

      if (data.success) {
        Alert.alert(
          'Notification Sent',
          `Your ${selectedTemplate.title.toLowerCase()} has been sent successfully!`,
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
                {NOTIFICATION_TEMPLATES.map((template) => (
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
                    <Text style={styles.templateDescription}>{template.description}</Text>
                    {selectedTemplate?.id === template.id && (
                      <View style={styles.templateCheckmark}>
                        <Text style={styles.templateCheckmarkText}>✓</Text>
                      </View>
                    )}
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {selectedTemplate && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Step 3: Customize Message (Optional)</Text>
                <Text style={styles.sectionSubtitle}>Edit the message or keep the default</Text>
                
                <TextInput
                  style={styles.messageInput}
                  value={customMessage}
                  onChangeText={setCustomMessage}
                  placeholder="Enter your message..."
                  placeholderTextColor="#999"
                  multiline
                  numberOfLines={4}
                  textAlignVertical="top"
                />
              </View>
            )}

            <TouchableOpacity
              style={[
                styles.sendButton,
                (!selectedRecipient || !selectedTemplate) && styles.sendButtonDisabled
              ]}
              onPress={handleSendNotification}
              disabled={!selectedRecipient || !selectedTemplate || isSending}
            >
              {isSending ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Text style={styles.sendButtonText}>
                  Send Notification
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
    minHeight: 120,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    textAlignVertical: 'top',
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
  sendButtonText: {
    color: '#fff',
    fontSize: 17,
    fontWeight: '700',
  },
});

export default IndividualSendNotificationScreen;

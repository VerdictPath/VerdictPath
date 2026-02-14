import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, ActivityIndicator, Platform } from 'react-native';
import alert from '../utils/alert';
import { theme } from '../styles/theme';
import { apiRequest, API_ENDPOINTS } from '../config/api';

const NOTIFICATION_TEMPLATES = [
  {
    id: 'deadline_reminder',
    type: 'deadline_reminder',
    title: 'Upcoming Deadline Reminder',
    icon: '⏰',
    defaultTitle: 'Important Deadline Approaching',
    defaultBody: 'You have an upcoming deadline for your case. Please review the details and take necessary action.',
    actionButton: 'View Roadmap',
    actionScreen: 'roadmap',
  },
  {
    id: 'document_request',
    type: 'document_request',
    title: 'Document Request',
    icon: '📄',
    defaultTitle: 'Documents Needed',
    defaultBody: 'We need additional documents for your case. Please upload the requested files at your earliest convenience.',
    actionButton: 'Upload Documents',
    actionScreen: 'medical',
  },
  {
    id: 'appointment_reminder',
    type: 'appointment_reminder',
    title: 'Appointment Reminder',
    icon: '📅',
    defaultTitle: 'Upcoming Appointment',
    defaultBody: 'This is a reminder about your upcoming appointment. Please confirm your attendance.',
    actionButton: 'View Details',
    actionScreen: 'dashboard',
  },
  {
    id: 'case_update',
    type: 'general',
    title: 'Case Update',
    icon: '📢',
    defaultTitle: 'Case Status Update',
    defaultBody: 'There has been an update on your case. Please review the latest information.',
    actionButton: 'View Dashboard',
    actionScreen: 'dashboard',
  },
  {
    id: 'task_reminder',
    type: 'task_reminder',
    title: 'Task Reminder',
    icon: '📋',
    defaultTitle: 'Task Requires Your Attention',
    defaultBody: 'You have a pending task that requires your attention. Please complete it as soon as possible.',
    actionButton: 'View Tasks',
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

const LawFirmSendNotificationScreen = ({ user, onBack }) => {
  const [clients, setClients] = useState([]);
  const [selectedClients, setSelectedClients] = useState([]);
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [notificationTitle, setNotificationTitle] = useState('');
  const [notificationBody, setNotificationBody] = useState('');
  const [notificationPriority, setNotificationPriority] = useState('medium');
  const [actionButtonText, setActionButtonText] = useState('View Dashboard');
  const [actionScreen, setActionScreen] = useState('dashboard');
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showRecipientDropdown, setShowRecipientDropdown] = useState(false);

  useEffect(() => {
    fetchClients();
  }, []);

  const fetchClients = async () => {
    try {
      setIsLoading(true);
      const response = await apiRequest(API_ENDPOINTS.LAWFIRM.CLIENTS, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${user.token}`,
        },
      });

      if (response.clients) {
        setClients(response.clients);
      }
    } catch (error) {
      console.error('Error fetching clients:', error);
      alert('Error', 'Failed to load clients');
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

  const toggleClientSelection = (clientId) => {
    setSelectedClients(prev => {
      if (prev.includes(clientId)) {
        return prev.filter(id => id !== clientId);
      } else {
        return [...prev, clientId];
      }
    });
  };

  const selectAllClients = () => {
    if (selectedClients.length === clients.length) {
      setSelectedClients([]);
    } else {
      setSelectedClients(clients.map(c => c.id));
    }
  };

  const handleSendNotification = async () => {
    if (selectedClients.length === 0) {
      alert('Error', 'Please select at least one client');
      return;
    }

    if (!notificationTitle.trim() || !notificationBody.trim()) {
      alert('Error', 'Please enter notification title and message');
      return;
    }

    try {
      setIsSending(true);

      const response = await apiRequest(API_ENDPOINTS.NOTIFICATIONS.SEND_TO_CLIENTS, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${user.token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          clientIds: selectedClients,
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
        alert(
          'Success',
          `Notification sent to ${response.results?.successful || selectedClients.length} client(s)`,
          [
            {
              text: 'OK',
              onPress: () => {
                setSelectedClients([]);
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
        alert('Error', response.error || 'Failed to send notification');
      }
    } catch (error) {
      console.error('Error sending notification:', error);
      alert('Error', 'Failed to send notification. Please try again.');
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
          <Text style={styles.loadingText}>Loading clients...</Text>
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
          
          {/* Dropdown Toggle Button */}
          <TouchableOpacity
            style={styles.recipientDropdownButton}
            onPress={() => setShowRecipientDropdown(!showRecipientDropdown)}
          >
            <View style={styles.recipientDropdownContent}>
              <Text style={styles.recipientDropdownIcon}>👥</Text>
              <Text style={styles.recipientDropdownText}>
                {selectedClients.length === 0 
                  ? 'Select clients...' 
                  : `${selectedClients.length} client${selectedClients.length !== 1 ? 's' : ''} selected`}
              </Text>
            </View>
            <Text style={styles.recipientDropdownArrow}>{showRecipientDropdown ? '▲' : '▼'}</Text>
          </TouchableOpacity>
          
          {/* Selected Clients Tags */}
          {selectedClients.length > 0 && !showRecipientDropdown && (
            <View style={styles.selectedClientsTags}>
              {selectedClients.slice(0, 3).map(clientId => {
                const client = clients.find(c => c.id === clientId);
                if (!client) return null;
                return (
                  <View key={clientId} style={styles.clientTag}>
                    <Text style={styles.clientTagText} numberOfLines={1}>
                      {client.firstName || client.first_name} {client.lastName || client.last_name}
                    </Text>
                    <TouchableOpacity
                      style={styles.clientTagRemove}
                      onPress={() => toggleClientSelection(clientId)}
                    >
                      <Text style={styles.clientTagRemoveText}>✕</Text>
                    </TouchableOpacity>
                  </View>
                );
              })}
              {selectedClients.length > 3 && (
                <View style={styles.clientTagMore}>
                  <Text style={styles.clientTagMoreText}>+{selectedClients.length - 3} more</Text>
                </View>
              )}
            </View>
          )}
          
          {/* Dropdown Menu */}
          {showRecipientDropdown && (
            <View style={styles.recipientDropdownMenu}>
              {/* Search Bar inside dropdown */}
              <View style={styles.dropdownSearchContainer}>
                <Text style={styles.searchIcon}>🔍</Text>
                <TextInput
                  style={styles.dropdownSearchInput}
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                  placeholder="Search clients..."
                  placeholderTextColor={theme.lawFirm.textLight}
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
              
              {/* Select All / Deselect All */}
              <TouchableOpacity
                style={styles.selectAllRow}
                onPress={selectAllClients}
              >
                <Text style={styles.selectAllRowText}>
                  {selectedClients.length === clients.length ? '☑ Deselect All' : '☐ Select All'}
                </Text>
                <Text style={styles.selectAllCount}>({clients.length} total)</Text>
              </TouchableOpacity>
              
              {/* Client List */}
              <ScrollView style={styles.dropdownClientList} nestedScrollEnabled={true}>
                {clients.length === 0 ? (
                  <View style={styles.emptyClients}>
                    <Text style={styles.emptyClientsText}>No clients found</Text>
                  </View>
                ) : (
                  clients.filter(client => {
                    if (!searchQuery.trim()) return true;
                    const query = searchQuery.toLowerCase();
                    const fullName = `${client.firstName || client.first_name || ''} ${client.lastName || client.last_name || ''}`.toLowerCase();
                    const email = (client.email || '').toLowerCase();
                    return fullName.includes(query) || email.includes(query);
                  }).map(client => (
                    <TouchableOpacity
                      key={client.id}
                      style={styles.dropdownClientItem}
                      onPress={() => toggleClientSelection(client.id)}
                    >
                      <View style={styles.dropdownClientCheckbox}>
                        <Text style={styles.dropdownCheckboxIcon}>
                          {selectedClients.includes(client.id) ? '☑' : '☐'}
                        </Text>
                      </View>
                      <View style={styles.dropdownClientInfo}>
                        <Text style={styles.dropdownClientName}>
                          {client.firstName || client.first_name} {client.lastName || client.last_name}
                        </Text>
                        <Text style={styles.dropdownClientEmail}>{client.email}</Text>
                      </View>
                    </TouchableOpacity>
                  ))
                )}
              </ScrollView>
              
              {/* Done Button */}
              <TouchableOpacity
                style={styles.dropdownDoneButton}
                onPress={() => setShowRecipientDropdown(false)}
              >
                <Text style={styles.dropdownDoneButtonText}>Done</Text>
              </TouchableOpacity>
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
            (selectedClients.length === 0 || !notificationTitle.trim() || !notificationBody.trim() || isSending) && styles.sendButtonDisabled
          ]}
          onPress={handleSendNotification}
          disabled={selectedClients.length === 0 || !notificationTitle.trim() || !notificationBody.trim() || isSending}
        >
          {isSending ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Text style={styles.sendButtonText}>
              Send to {selectedClients.length} Client{selectedClients.length !== 1 ? 's' : ''}
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
    backgroundColor: theme.lawFirm.background,
    paddingBottom: 100,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: theme.lawFirm.primary,
    borderBottomWidth: 1,
    borderBottomColor: theme.lawFirm.primaryDark,
  },
  backButton: {
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  backButtonText: {
    fontSize: 16,
    color: '#FFFFFF',
    fontWeight: '600',
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#FFFFFF',
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
    color: theme.lawFirm.text,
    marginBottom: 12,
  },
  selectAllButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: theme.lawFirm.primary,
    borderRadius: 6,
  },
  selectAllText: {
    color: '#FFFFFF',
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
    backgroundColor: theme.lawFirm.surface,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: theme.lawFirm.border,
  },
  templateCardSelected: {
    borderColor: theme.lawFirm.primary,
    backgroundColor: theme.lawFirm.surfaceAlt,
  },
  templateIcon: {
    fontSize: 32,
    marginBottom: 8,
  },
  templateTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: theme.lawFirm.text,
    textAlign: 'center',
  },
  clientsList: {
    gap: 10,
  },
  clientCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: theme.lawFirm.surface,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: theme.lawFirm.border,
  },
  clientCardSelected: {
    borderColor: theme.lawFirm.primary,
    backgroundColor: theme.lawFirm.surfaceAlt,
  },
  clientInfo: {
    flex: 1,
  },
  clientName: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.lawFirm.text,
    marginBottom: 4,
  },
  clientEmail: {
    fontSize: 14,
    color: theme.lawFirm.textSecondary,
  },
  checkmark: {
    fontSize: 24,
    color: theme.lawFirm.primary,
    fontWeight: 'bold',
  },
  selectedCount: {
    marginTop: 12,
    fontSize: 14,
    fontWeight: '600',
    color: theme.lawFirm.primary,
    textAlign: 'center',
  },
  emptyClients: {
    padding: 40,
    alignItems: 'center',
  },
  emptyClientsText: {
    fontSize: 16,
    color: theme.lawFirm.textSecondary,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.lawFirm.surface,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: theme.lawFirm.border,
  },
  searchIcon: {
    fontSize: 18,
    marginRight: 8,
    color: theme.lawFirm.textSecondary,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: theme.lawFirm.text,
    padding: 0,
  },
  clearSearchButton: {
    padding: 4,
    marginLeft: 8,
  },
  clearSearchText: {
    fontSize: 18,
    color: theme.lawFirm.textLight,
    fontWeight: 'bold',
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.lawFirm.text,
    marginBottom: 8,
    marginTop: 12,
  },
  input: {
    backgroundColor: theme.lawFirm.surface,
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: theme.lawFirm.text,
    borderWidth: 1,
    borderColor: theme.lawFirm.border,
  },
  datePickerContainer: {
    position: 'relative',
    flexDirection: 'row',
    alignItems: 'center',
  },
  dateSelectButton: {
    backgroundColor: theme.lawFirm.surface,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: theme.lawFirm.border,
    flexDirection: 'row',
    alignItems: 'center',
  },
  dateSelectIcon: {
    fontSize: 18,
    marginRight: 10,
  },
  dateSelectText: {
    fontSize: 16,
    color: theme.lawFirm.text,
    flex: 1,
  },
  clearDateButton: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#e0e0e0',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'absolute',
    right: 10,
    top: '50%',
    marginTop: -14,
  },
  clearDateText: {
    fontSize: 14,
    color: '#666',
    fontWeight: 'bold',
  },
  textArea: {
    height: 120,
    paddingTop: 16,
  },
  sendButton: {
    backgroundColor: theme.lawFirm.primary,
    borderRadius: 12,
    paddingVertical: 18,
    alignItems: 'center',
    marginTop: 20,
  },
  sendButtonDisabled: {
    backgroundColor: theme.lawFirm.textLight,
  },
  sendButtonText: {
    color: '#FFFFFF',
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
    color: theme.lawFirm.textSecondary,
  },
  recipientDropdownButton: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: theme.lawFirm.surface,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: theme.lawFirm.border,
  },
  recipientDropdownContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  recipientDropdownIcon: {
    fontSize: 20,
    marginRight: 12,
  },
  recipientDropdownText: {
    fontSize: 16,
    color: theme.lawFirm.text,
    fontWeight: '500',
  },
  recipientDropdownArrow: {
    fontSize: 12,
    color: theme.lawFirm.textSecondary,
    marginLeft: 8,
  },
  selectedClientsTags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 12,
    gap: 8,
  },
  clientTag: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.lawFirm.primary + '20',
    borderRadius: 20,
    paddingVertical: 6,
    paddingLeft: 12,
    paddingRight: 8,
    maxWidth: 180,
  },
  clientTagText: {
    fontSize: 13,
    color: theme.lawFirm.primary,
    fontWeight: '500',
    marginRight: 6,
  },
  clientTagRemove: {
    padding: 2,
  },
  clientTagRemoveText: {
    fontSize: 14,
    color: theme.lawFirm.primary,
    fontWeight: 'bold',
  },
  clientTagMore: {
    backgroundColor: theme.lawFirm.surfaceAlt,
    borderRadius: 20,
    paddingVertical: 6,
    paddingHorizontal: 12,
  },
  clientTagMoreText: {
    fontSize: 13,
    color: theme.lawFirm.textSecondary,
    fontWeight: '500',
  },
  recipientDropdownMenu: {
    backgroundColor: theme.lawFirm.surface,
    borderRadius: 12,
    marginTop: 8,
    borderWidth: 1,
    borderColor: theme.lawFirm.border,
    overflow: 'hidden',
    maxHeight: 350,
  },
  dropdownSearchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.lawFirm.surfaceAlt,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: theme.lawFirm.border,
  },
  dropdownSearchInput: {
    flex: 1,
    fontSize: 14,
    color: theme.lawFirm.text,
    padding: 0,
  },
  selectAllRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: theme.lawFirm.surfaceAlt,
    borderBottomWidth: 1,
    borderBottomColor: theme.lawFirm.border,
  },
  selectAllRowText: {
    fontSize: 14,
    color: theme.lawFirm.primary,
    fontWeight: '600',
  },
  selectAllCount: {
    fontSize: 12,
    color: theme.lawFirm.textSecondary,
  },
  dropdownClientList: {
    maxHeight: 200,
  },
  dropdownClientItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: theme.lawFirm.border,
  },
  dropdownClientCheckbox: {
    marginRight: 12,
  },
  dropdownCheckboxIcon: {
    fontSize: 18,
    color: theme.lawFirm.primary,
  },
  dropdownClientInfo: {
    flex: 1,
  },
  dropdownClientName: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.lawFirm.text,
    marginBottom: 2,
  },
  dropdownClientEmail: {
    fontSize: 12,
    color: theme.lawFirm.textSecondary,
  },
  dropdownDoneButton: {
    backgroundColor: theme.lawFirm.primary,
    paddingVertical: 12,
    alignItems: 'center',
  },
  dropdownDoneButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
});

export default LawFirmSendNotificationScreen;

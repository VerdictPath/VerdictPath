import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Alert, ActivityIndicator } from 'react-native';
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

const getPriorityColor = (priority) => {
  switch (priority) {
    case 'urgent': return '#e74c3c';
    case 'high': return '#e67e22';
    case 'medium': return '#3498db';
    case 'low': return '#95a5a6';
    default: return '#999';
  }
};

const LawFirmSendNotificationScreen = ({ user, onBack }) => {
  const [clients, setClients] = useState([]);
  const [selectedClients, setSelectedClients] = useState([]);
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [notificationTitle, setNotificationTitle] = useState('');
  const [notificationBody, setNotificationBody] = useState('');
  const [actionButtonText, setActionButtonText] = useState('View Dashboard');
  const [actionScreen, setActionScreen] = useState('dashboard');
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [createTask, setCreateTask] = useState(false);
  const [taskTitle, setTaskTitle] = useState('');
  const [taskDescription, setTaskDescription] = useState('');
  const [taskPriority, setTaskPriority] = useState('medium');
  const [taskDueDate, setTaskDueDate] = useState('');
  const [taskCoinsReward, setTaskCoinsReward] = useState('50');

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
      Alert.alert('Error', 'Failed to load clients');
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
    
    if (template.id === 'task_reminder' || template.id === 'document_request') {
      setCreateTask(true);
      setTaskTitle(template.defaultTitle);
      setTaskDescription(template.defaultBody);
    }
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
      Alert.alert('Error', 'Please select at least one client');
      return;
    }

    if (!notificationTitle.trim() || !notificationBody.trim()) {
      Alert.alert('Error', 'Please enter notification title and message');
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
          notificationType: selectedTemplate?.type || 'general',
          actionData: {
            buttonText: actionButtonText,
            screen: actionScreen,
          },
        }),
      });

      if (createTask && taskTitle.trim()) {
        const taskPromises = selectedClients.map(clientId =>
          apiRequest(API_ENDPOINTS.TASKS.CREATE, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${user.token}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              clientId,
              taskTitle,
              taskDescription,
              taskType: selectedTemplate?.id || 'general',
              priority: taskPriority,
              dueDate: taskDueDate || null,
              coinsReward: parseInt(taskCoinsReward) || 0,
              actionUrl: `verdictpath://${actionScreen}`,
              sendNotification: false
            }),
          })
        );

        await Promise.all(taskPromises);
      }

      if (response.success) {
        Alert.alert(
          'Success',
          `Notification ${createTask ? 'and task ' : ''}sent to ${response.results?.successful || selectedClients.length} client(s)`,
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
                setCreateTask(false);
                setTaskTitle('');
                setTaskDescription('');
                setTaskPriority('medium');
                setTaskDueDate('');
                setTaskCoinsReward('50');
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
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Step 2: Select Recipients</Text>
            <TouchableOpacity
              style={styles.selectAllButton}
              onPress={selectAllClients}
            >
              <Text style={styles.selectAllText}>
                {selectedClients.length === clients.length ? 'Deselect All' : 'Select All'}
              </Text>
            </TouchableOpacity>
          </View>
          
          {clients.length === 0 ? (
            <View style={styles.emptyClients}>
              <Text style={styles.emptyClientsText}>No clients found</Text>
            </View>
          ) : (
            <View style={styles.clientsList}>
              {clients.map(client => (
                <TouchableOpacity
                  key={client.id}
                  style={[
                    styles.clientCard,
                    selectedClients.includes(client.id) && styles.clientCardSelected
                  ]}
                  onPress={() => toggleClientSelection(client.id)}
                >
                  <View style={styles.clientInfo}>
                    <Text style={styles.clientName}>
                      {client.first_name} {client.last_name}
                    </Text>
                    <Text style={styles.clientEmail}>{client.email}</Text>
                  </View>
                  {selectedClients.includes(client.id) && (
                    <Text style={styles.checkmark}>✓</Text>
                  )}
                </TouchableOpacity>
              ))}
            </View>
          )}
          
          {selectedClients.length > 0 && (
            <Text style={styles.selectedCount}>
              {selectedClients.length} client{selectedClients.length !== 1 ? 's' : ''} selected
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

        {/* Step 4: Optional Task Assignment */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Step 4: Assign Task (Optional)</Text>
            <TouchableOpacity
              style={[styles.toggleButton, createTask && styles.toggleButtonActive]}
              onPress={() => setCreateTask(!createTask)}
            >
              <Text style={[styles.toggleButtonText, createTask && styles.toggleButtonTextActive]}>
                {createTask ? '✓ Enabled' : 'Enable'}
              </Text>
            </TouchableOpacity>
          </View>

          {createTask && (
            <View style={styles.taskForm}>
              <Text style={styles.taskFormHint}>
                💡 Create an actionable task for clients to complete
              </Text>

              <Text style={styles.inputLabel}>Task Title *</Text>
              <TextInput
                style={styles.input}
                value={taskTitle}
                onChangeText={setTaskTitle}
                placeholder="e.g., Upload Insurance Card"
                placeholderTextColor="#999"
              />

              <Text style={styles.inputLabel}>Task Description</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                value={taskDescription}
                onChangeText={setTaskDescription}
                placeholder="Provide detailed instructions..."
                placeholderTextColor="#999"
                multiline
                numberOfLines={4}
                textAlignVertical="top"
              />

              <Text style={styles.inputLabel}>Priority</Text>
              <View style={styles.priorityButtons}>
                {['urgent', 'high', 'medium', 'low'].map(priority => (
                  <TouchableOpacity
                    key={priority}
                    style={[
                      styles.priorityButton,
                      taskPriority === priority && styles.priorityButtonActive,
                      { borderColor: getPriorityColor(priority) }
                    ]}
                    onPress={() => setTaskPriority(priority)}
                  >
                    <Text style={[
                      styles.priorityButtonText,
                      taskPriority === priority && { color: getPriorityColor(priority) }
                    ]}>
                      {priority.charAt(0).toUpperCase() + priority.slice(1)}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={styles.inputLabel}>Due Date (Optional)</Text>
              <TextInput
                style={styles.input}
                value={taskDueDate}
                onChangeText={setTaskDueDate}
                placeholder="YYYY-MM-DD"
                placeholderTextColor="#999"
              />

              <Text style={styles.inputLabel}>Coin Reward</Text>
              <TextInput
                style={styles.input}
                value={taskCoinsReward}
                onChangeText={setTaskCoinsReward}
                placeholder="50"
                placeholderTextColor="#999"
                keyboardType="numeric"
              />
            </View>
          )}
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
  clientsList: {
    gap: 10,
  },
  clientCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    borderWidth: 2,
    borderColor: '#e0e0e0',
  },
  clientCardSelected: {
    borderColor: theme.colors.primary,
    backgroundColor: '#f0f8ff',
  },
  clientInfo: {
    flex: 1,
  },
  clientName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  clientEmail: {
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
  emptyClients: {
    padding: 40,
    alignItems: 'center',
  },
  emptyClientsText: {
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
  toggleButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#f0f0f0',
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#ddd',
  },
  toggleButtonActive: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary,
  },
  toggleButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
  },
  toggleButtonTextActive: {
    color: '#fff',
  },
  taskForm: {
    backgroundColor: '#f8f9fa',
    padding: 16,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: theme.colors.secondary,
  },
  taskFormHint: {
    fontSize: 13,
    color: '#666',
    marginBottom: 16,
    fontStyle: 'italic',
  },
  priorityButtons: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  priorityButton: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 2,
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  priorityButtonActive: {
    backgroundColor: '#f8f9fa',
  },
  priorityButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#666',
  },
});

export default LawFirmSendNotificationScreen;

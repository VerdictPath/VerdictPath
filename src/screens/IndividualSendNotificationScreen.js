import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, ActivityIndicator, Switch, Animated, Platform } from 'react-native';
import { theme } from '../styles/theme';
import { API_BASE_URL } from '../config/api';

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

const Toast = ({ visible, message, type, onHide }) => {
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(-100)).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.timing(opacity, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.timing(translateY, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start();

      const timer = setTimeout(() => {
        Animated.parallel([
          Animated.timing(opacity, {
            toValue: 0,
            duration: 300,
            useNativeDriver: true,
          }),
          Animated.timing(translateY, {
            toValue: -100,
            duration: 300,
            useNativeDriver: true,
          }),
        ]).start(() => onHide());
      }, 3000);

      return () => clearTimeout(timer);
    }
  }, [visible]);

  if (!visible) return null;

  return (
    <Animated.View
      style={[
        styles.toast,
        type === 'success' ? styles.toastSuccess : styles.toastError,
        { opacity, transform: [{ translateY }] },
      ]}
    >
      <Text style={styles.toastIcon}>{type === 'success' ? '✓' : '✕'}</Text>
      <Text style={styles.toastMessage}>{message}</Text>
    </Animated.View>
  );
};

const IndividualSendNotificationScreen = ({ user, onBack }) => {
  const [connections, setConnections] = useState({ lawFirm: null, medicalProviders: [] });
  const [selectedRecipient, setSelectedRecipient] = useState(null);
  const [selectedType, setSelectedType] = useState(null);
  const [subject, setSubject] = useState('');
  const [customMessage, setCustomMessage] = useState('');
  const [isUrgent, setIsUrgent] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [recipientSearch, setRecipientSearch] = useState('');
  const [showTypeDropdown, setShowTypeDropdown] = useState(false);
  const [toast, setToast] = useState({ visible: false, message: '', type: 'success' });

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
      showToast('Failed to load your connections', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const showToast = (message, type = 'success') => {
    setToast({ visible: true, message, type });
  };

  const hideToast = () => {
    setToast({ visible: false, message: '', type: 'success' });
  };

  const clearForm = () => {
    setSelectedRecipient(null);
    setSelectedType(null);
    setSubject('');
    setCustomMessage('');
    setIsUrgent(false);
    setRecipientSearch('');
  };

  const handleTypeSelect = (type) => {
    setSelectedType(type);
    setSubject(type.defaultSubject);
    setCustomMessage(type.defaultMessage);
    setShowTypeDropdown(false);
  };

  const handleRecipientSelect = (recipient, type) => {
    setSelectedRecipient({ ...recipient, recipientType: type });
  };

  const handleSendNotification = async () => {
    if (!selectedRecipient) {
      showToast('Please select who you want to notify', 'error');
      return;
    }

    if (!selectedType) {
      showToast('Please select a notification type', 'error');
      return;
    }

    if (!subject.trim()) {
      showToast('Please enter a subject for your notification', 'error');
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
        showToast(`${selectedType.title} notification sent successfully!`, 'success');
        clearForm();
        setTimeout(() => {
          onBack();
        }, 2000);
      } else {
        throw new Error(data.error || 'Failed to send notification');
      }
    } catch (error) {
      console.error('Error sending notification:', error);
      showToast(error.message || 'Failed to send notification', 'error');
    } finally {
      setIsSending(false);
    }
  };

  const getFilteredConnections = () => {
    const allConnections = [];
    
    if (connections.lawFirm) {
      allConnections.push({
        ...connections.lawFirm,
        displayName: connections.lawFirm.firm_name,
        type: 'law_firm',
        icon: '⚖️',
        typeLabel: 'Law Firm'
      });
    }
    
    connections.medicalProviders.forEach(provider => {
      allConnections.push({
        ...provider,
        displayName: provider.provider_name,
        type: 'medical_provider',
        icon: '🏥',
        typeLabel: 'Medical Provider'
      });
    });

    if (recipientSearch.trim()) {
      return allConnections.filter(conn => 
        conn.displayName.toLowerCase().includes(recipientSearch.toLowerCase())
      );
    }
    
    return allConnections;
  };

  const hasConnections = connections.lawFirm || connections.medicalProviders.length > 0;
  const filteredConnections = getFilteredConnections();

  if (isLoading) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={onBack} style={styles.backButton}>
            <Text style={styles.backButtonText}>← Back</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>📨 Compose</Text>
          <View style={styles.headerSpacer} />
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#FFD700" />
          <Text style={styles.loadingText}>Loading connections...</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Toast 
        visible={toast.visible} 
        message={toast.message} 
        type={toast.type} 
        onHide={hideToast} 
      />
      
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack} style={styles.backButton}>
          <Text style={styles.backButtonText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>📨 Compose</Text>
        <TouchableOpacity onPress={clearForm} style={styles.clearButton}>
          <Text style={styles.clearButtonText}>Clear</Text>
        </TouchableOpacity>
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
              <Text style={styles.sectionTitle}>To:</Text>
              <View style={styles.recipientSearchContainer}>
                <TextInput
                  style={styles.recipientSearchInput}
                  placeholder="Search recipients..."
                  placeholderTextColor="rgba(255, 255, 255, 0.5)"
                  value={recipientSearch}
                  onChangeText={setRecipientSearch}
                />
                {recipientSearch.length > 0 && (
                  <TouchableOpacity
                    style={styles.clearSearchButton}
                    onPress={() => setRecipientSearch('')}
                  >
                    <Text style={styles.clearSearchText}>✕</Text>
                  </TouchableOpacity>
                )}
              </View>
              
              {selectedRecipient && (
                <View style={styles.selectedRecipientBadge}>
                  <Text style={styles.selectedRecipientText}>
                    {selectedRecipient.recipientType === 'law_firm' ? '⚖️' : '🏥'} {selectedRecipient.firm_name || selectedRecipient.provider_name}
                  </Text>
                  <TouchableOpacity onPress={() => setSelectedRecipient(null)}>
                    <Text style={styles.removeRecipientText}>✕</Text>
                  </TouchableOpacity>
                </View>
              )}
              
              <View style={styles.recipientList}>
                {filteredConnections.map((connection) => (
                  <TouchableOpacity
                    key={`${connection.type}-${connection.id}`}
                    style={[
                      styles.recipientCard,
                      selectedRecipient?.id === connection.id && 
                      selectedRecipient?.recipientType === connection.type && styles.recipientCardSelected
                    ]}
                    onPress={() => handleRecipientSelect(connection, connection.type)}
                  >
                    <View style={[styles.recipientIcon, connection.type === 'medical_provider' && styles.medicalIcon]}>
                      <Text style={styles.recipientIconText}>{connection.icon}</Text>
                    </View>
                    <View style={styles.recipientInfo}>
                      <Text style={styles.recipientName}>{connection.displayName}</Text>
                      <Text style={styles.recipientType}>{connection.typeLabel}</Text>
                    </View>
                    {selectedRecipient?.id === connection.id && 
                     selectedRecipient?.recipientType === connection.type && (
                      <Text style={styles.checkmark}>✓</Text>
                    )}
                  </TouchableOpacity>
                ))}
                {filteredConnections.length === 0 && recipientSearch && (
                  <Text style={styles.noResultsText}>No recipients matching "{recipientSearch}"</Text>
                )}
              </View>
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Notification Type:</Text>
              <TouchableOpacity
                style={styles.typeDropdownButton}
                onPress={() => setShowTypeDropdown(!showTypeDropdown)}
              >
                {selectedType ? (
                  <Text style={styles.typeDropdownText}>
                    {selectedType.icon} {selectedType.title}
                  </Text>
                ) : (
                  <Text style={styles.typeDropdownPlaceholder}>Select notification type...</Text>
                )}
                <Text style={styles.dropdownArrow}>{showTypeDropdown ? '▲' : '▼'}</Text>
              </TouchableOpacity>
              
              {showTypeDropdown && (
                <View style={styles.typeDropdownMenu}>
                  {NOTIFICATION_TYPES.map((type) => (
                    <TouchableOpacity
                      key={type.id}
                      style={[
                        styles.typeDropdownItem,
                        selectedType?.id === type.id && styles.activeTypeDropdownItem
                      ]}
                      onPress={() => handleTypeSelect(type)}
                    >
                      <View style={styles.typeDropdownItemContent}>
                        <Text style={styles.typeDropdownItemIcon}>{type.icon}</Text>
                        <View>
                          <Text style={styles.typeDropdownItemTitle}>{type.title}</Text>
                          <Text style={styles.typeDropdownItemDesc}>{type.description}</Text>
                        </View>
                      </View>
                      {selectedType?.id === type.id && <Text style={styles.typeCheckmark}>✓</Text>}
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            </View>

            <View style={[styles.urgentSection, isUrgent && styles.urgentSectionActive]}>
              <View style={styles.urgentRow}>
                <Text style={styles.urgentIcon}>⚠️</Text>
                <View style={styles.urgentTextContainer}>
                  <Text style={[styles.urgentLabel, isUrgent && styles.urgentLabelActive]}>
                    Mark as URGENT
                  </Text>
                  {isUrgent && (
                    <Text style={styles.urgentWarning}>
                      Will trigger immediate alerts
                    </Text>
                  )}
                </View>
                <Switch
                  value={isUrgent}
                  onValueChange={setIsUrgent}
                  trackColor={{ false: '#444', true: '#dc2626' }}
                  thumbColor={isUrgent ? '#fff' : '#ccc'}
                />
              </View>
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Subject:</Text>
              <TextInput
                style={styles.subjectInput}
                value={subject}
                onChangeText={setSubject}
                placeholder="Enter subject..."
                placeholderTextColor="rgba(255, 255, 255, 0.5)"
                maxLength={100}
              />
              <Text style={styles.charCount}>{subject.length}/100</Text>
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Message:</Text>
              <Text style={styles.sectionSubtitle}>No character limit</Text>
              
              <TextInput
                style={styles.messageInput}
                value={customMessage}
                onChangeText={setCustomMessage}
                placeholder="Enter your message..."
                placeholderTextColor="rgba(255, 255, 255, 0.5)"
                multiline
                numberOfLines={8}
                textAlignVertical="top"
              />
            </View>

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
                  {isUrgent ? '⚠️ Send Urgent Notification' : '📤 Send Notification'}
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
    backgroundColor: '#1a1a2e',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 16,
    paddingTop: Platform.OS === 'ios' ? 50 : 16,
    backgroundColor: 'rgba(26, 26, 46, 0.95)',
    borderBottomWidth: 2,
    borderBottomColor: 'rgba(255, 215, 0, 0.5)',
  },
  backButton: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: 'rgba(255, 215, 0, 0.2)',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 215, 0, 0.5)',
  },
  backButtonText: {
    color: '#FFD700',
    fontSize: 16,
    fontWeight: '600',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FFD700',
  },
  clearButton: {
    padding: 8,
  },
  clearButtonText: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: 14,
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
    color: '#FFD700',
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
    color: '#FFD700',
    marginBottom: 8,
  },
  noConnectionsText: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.7)',
    textAlign: 'center',
    lineHeight: 24,
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFD700',
    marginBottom: 8,
  },
  sectionSubtitle: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.5)',
    marginBottom: 8,
  },
  recipientSearchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  recipientSearchInput: {
    flex: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    color: '#fff',
    fontSize: 14,
    borderWidth: 1,
    borderColor: 'rgba(255, 215, 0, 0.3)',
  },
  clearSearchButton: {
    marginLeft: 10,
    padding: 8,
  },
  clearSearchText: {
    color: '#FFD700',
    fontSize: 16,
  },
  selectedRecipientBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(255, 215, 0, 0.2)',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#FFD700',
  },
  selectedRecipientText: {
    color: '#FFD700',
    fontSize: 14,
    fontWeight: '600',
  },
  removeRecipientText: {
    color: '#FFD700',
    fontSize: 18,
    fontWeight: 'bold',
  },
  recipientList: {
    maxHeight: 200,
  },
  recipientCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 12,
    padding: 14,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  recipientCardSelected: {
    backgroundColor: 'rgba(255, 215, 0, 0.15)',
    borderColor: '#FFD700',
  },
  recipientIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(30, 58, 95, 0.8)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  medicalIcon: {
    backgroundColor: 'rgba(76, 175, 80, 0.3)',
  },
  recipientIconText: {
    fontSize: 22,
  },
  recipientInfo: {
    flex: 1,
  },
  recipientName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 2,
  },
  recipientType: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.6)',
  },
  checkmark: {
    fontSize: 20,
    color: '#FFD700',
    fontWeight: 'bold',
  },
  noResultsText: {
    color: 'rgba(255, 255, 255, 0.5)',
    textAlign: 'center',
    paddingVertical: 20,
    fontStyle: 'italic',
  },
  typeDropdownButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: 'rgba(255, 215, 0, 0.3)',
  },
  typeDropdownText: {
    color: '#fff',
    fontSize: 16,
  },
  typeDropdownPlaceholder: {
    color: 'rgba(255, 255, 255, 0.5)',
    fontSize: 16,
  },
  dropdownArrow: {
    color: '#FFD700',
    fontSize: 12,
  },
  typeDropdownMenu: {
    backgroundColor: 'rgba(26, 26, 46, 0.98)',
    borderRadius: 8,
    marginTop: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 215, 0, 0.5)',
    overflow: 'hidden',
  },
  typeDropdownItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  activeTypeDropdownItem: {
    backgroundColor: 'rgba(255, 215, 0, 0.15)',
  },
  typeDropdownItemContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  typeDropdownItemIcon: {
    fontSize: 20,
    marginRight: 12,
  },
  typeDropdownItemTitle: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
  },
  typeDropdownItemDesc: {
    color: 'rgba(255, 255, 255, 0.5)',
    fontSize: 12,
    marginTop: 2,
  },
  typeCheckmark: {
    color: '#FFD700',
    fontSize: 18,
    fontWeight: 'bold',
  },
  urgentSection: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  urgentSectionActive: {
    backgroundColor: 'rgba(220, 38, 38, 0.15)',
    borderColor: '#dc2626',
  },
  urgentRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  urgentIcon: {
    fontSize: 24,
    marginRight: 12,
  },
  urgentTextContainer: {
    flex: 1,
  },
  urgentLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: 'rgba(255, 255, 255, 0.8)',
  },
  urgentLabelActive: {
    color: '#ff6b6b',
  },
  urgentWarning: {
    fontSize: 12,
    color: '#ff6b6b',
    marginTop: 2,
  },
  subjectInput: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 14,
    color: '#fff',
    fontSize: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 215, 0, 0.3)',
  },
  charCount: {
    textAlign: 'right',
    color: 'rgba(255, 255, 255, 0.4)',
    fontSize: 12,
    marginTop: 4,
  },
  messageInput: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 14,
    color: '#fff',
    fontSize: 16,
    minHeight: 150,
    borderWidth: 1,
    borderColor: 'rgba(255, 215, 0, 0.3)',
  },
  sendButton: {
    backgroundColor: '#1e3a5f',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 10,
    borderWidth: 2,
    borderColor: '#FFD700',
  },
  sendButtonDisabled: {
    backgroundColor: 'rgba(30, 58, 95, 0.5)',
    borderColor: 'rgba(255, 215, 0, 0.3)',
  },
  sendButtonUrgent: {
    backgroundColor: '#dc2626',
    borderColor: '#ff6b6b',
  },
  sendButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '700',
  },
  toast: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 60 : 20,
    left: 20,
    right: 20,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 12,
    zIndex: 1000,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  toastSuccess: {
    backgroundColor: '#065f46',
    borderWidth: 1,
    borderColor: '#10b981',
  },
  toastError: {
    backgroundColor: '#7f1d1d',
    borderWidth: 1,
    borderColor: '#dc2626',
  },
  toastIcon: {
    fontSize: 20,
    color: '#fff',
    marginRight: 12,
    fontWeight: 'bold',
  },
  toastMessage: {
    flex: 1,
    color: '#fff',
    fontSize: 14,
    fontWeight: '500',
  },
});

export default IndividualSendNotificationScreen;

import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, ActivityIndicator, Platform, useWindowDimensions } from 'react-native';
import alert from '../utils/alert';
import { theme } from '../styles/theme';
import { apiRequest, API_ENDPOINTS } from '../config/api';

const TASK_TYPES = [
  {
    id: 'upload_police_report',
    title: 'Upload Police Report',
    icon: '🚔',
    description: 'Request client to upload their police report',
    defaultDescription: 'Please upload a copy of your police report related to your case. This is an important document for building your case.',
    actionScreen: 'medical',
  },
  {
    id: 'upload_insurance_info',
    title: 'Upload Insurance Information',
    icon: '🛡️',
    description: 'Request client to upload insurance details',
    defaultDescription: 'Please upload your insurance information including policy number, provider name, and coverage details.',
    actionScreen: 'medical',
  },
  {
    id: 'upload_pictures',
    title: 'Upload Pictures',
    icon: '📸',
    description: 'Request client to upload relevant photos',
    defaultDescription: 'Please upload any relevant pictures related to your case, such as photos of injuries, property damage, or the scene.',
    actionScreen: 'medical',
  },
  {
    id: 'upload_videos',
    title: 'Upload Videos',
    icon: '🎥',
    description: 'Request client to upload relevant videos',
    defaultDescription: 'Please upload any relevant video footage related to your case, such as dashcam footage, surveillance video, or other recordings.',
    actionScreen: 'medical',
  },
  {
    id: 'upload_witness_info',
    title: 'Upload Witness Information',
    icon: '👥',
    description: 'Request client to provide witness details',
    defaultDescription: 'Please provide information about any witnesses to the incident, including their names, contact numbers, and a brief description of what they observed.',
    actionScreen: 'medical',
  },
  {
    id: 'update_contact_info',
    title: 'Update Contact Information',
    icon: '📇',
    description: 'Request client to update their contact details',
    defaultDescription: 'Please review and update your contact information to ensure we can reach you regarding important case developments.',
    actionScreen: 'dashboard',
  },
  {
    id: 'answer_discovery',
    title: 'Answer Discovery Questions',
    icon: '📝',
    description: 'Request client to answer discovery questions',
    defaultDescription: 'You have discovery questions that require your response. Please review and answer all questions thoroughly and accurately.',
    actionScreen: 'dashboard',
  },
  {
    id: 'provide_availability',
    title: 'Provide Availability',
    icon: '📅',
    description: 'Request client to share their availability',
    defaultDescription: 'Please provide your availability for upcoming case-related appointments, depositions, or meetings.',
    actionScreen: 'calendar',
  },
  {
    id: 'sign_documents',
    title: 'Sign Documents',
    icon: '✍️',
    description: 'Request client to sign required documents',
    defaultDescription: 'You have documents that require your signature. Please review and sign them at your earliest convenience.',
    actionScreen: 'medical',
  },
  {
    id: 'other',
    title: 'Other',
    icon: '📌',
    description: 'Custom task for your client',
    defaultDescription: '',
    actionScreen: 'dashboard',
  },
];

const PRIORITIES = [
  { id: 'low', label: 'Low', color: '#94A3B8' },
  { id: 'medium', label: 'Medium', color: '#3B82F6' },
  { id: 'high', label: 'High', color: '#F59E0B' },
  { id: 'urgent', label: 'Urgent', color: '#EF4444' },
];

const LawFirmAssignTaskScreen = ({ user, onBack }) => {
  const { width } = useWindowDimensions();
  const isDesktop = width >= 900;
  const contentWidth = isDesktop ? Math.min(700, width - 80) : width;

  const [clients, setClients] = useState([]);
  const [selectedClients, setSelectedClients] = useState([]);
  const [selectedTaskTypes, setSelectedTaskTypes] = useState([]);
  const [taskDescriptions, setTaskDescriptions] = useState({});
  const [taskPriority, setTaskPriority] = useState('medium');
  const [taskDueDate, setTaskDueDate] = useState('');
  const [taskCoinsReward, setTaskCoinsReward] = useState('50');
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
        const sorted = response.clients.sort((a, b) => {
          const nameA = `${a.firstName || ''} ${a.lastName || ''}`.trim().toLowerCase();
          const nameB = `${b.firstName || ''} ${b.lastName || ''}`.trim().toLowerCase();
          return nameA.localeCompare(nameB);
        });
        setClients(sorted);
      }
    } catch (error) {
      console.error('Error fetching clients:', error);
      alert('Error', 'Failed to load clients');
    } finally {
      setIsLoading(false);
    }
  };

  const formatDisplayDate = (dateStr) => {
    if (!dateStr) return '';
    try {
      const parts = dateStr.split('-');
      if (parts.length === 3) {
        return `${parts[1]}/${parts[2]}/${parts[0]}`;
      }
      return dateStr;
    } catch (e) {
      return dateStr;
    }
  };

  const toggleTaskTypeSelection = (taskType) => {
    setSelectedTaskTypes(prev => {
      const isAlreadySelected = prev.some(t => t.id === taskType.id);
      if (isAlreadySelected) {
        const updated = prev.filter(t => t.id !== taskType.id);
        setTaskDescriptions(descs => {
          const newDescs = { ...descs };
          delete newDescs[taskType.id];
          return newDescs;
        });
        return updated;
      } else {
        setTaskDescriptions(descs => ({
          ...descs,
          [taskType.id]: taskType.defaultDescription,
        }));
        return [...prev, taskType];
      }
    });
  };

  const selectAllTaskTypes = () => {
    if (selectedTaskTypes.length === TASK_TYPES.length) {
      setSelectedTaskTypes([]);
      setTaskDescriptions({});
    } else {
      setSelectedTaskTypes([...TASK_TYPES]);
      const descs = {};
      TASK_TYPES.forEach(t => { descs[t.id] = t.defaultDescription; });
      setTaskDescriptions(descs);
    }
  };

  const updateTaskDescription = (taskTypeId, text) => {
    setTaskDescriptions(prev => ({ ...prev, [taskTypeId]: text }));
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

  const getFilteredClients = () => {
    if (!searchQuery.trim()) return clients;
    const query = searchQuery.toLowerCase();
    return clients.filter(c => {
      const fullName = `${c.firstName || ''} ${c.lastName || ''}`.toLowerCase();
      const email = (c.email || '').toLowerCase();
      return fullName.includes(query) || email.includes(query);
    });
  };

  const handleAssignTasks = async () => {
    if (selectedClients.length === 0) {
      alert('Error', 'Please select at least one client');
      return;
    }
    if (selectedTaskTypes.length === 0) {
      alert('Error', 'Please select at least one task type');
      return;
    }
    const otherTask = selectedTaskTypes.find(t => t.id === 'other');
    if (otherTask && !(taskDescriptions['other'] || '').trim()) {
      alert('Error', 'Please enter a description for the "Other" task');
      return;
    }

    try {
      setIsSending(true);

      const taskPromises = [];
      for (const taskType of selectedTaskTypes) {
        for (const clientId of selectedClients) {
          taskPromises.push(
            apiRequest(API_ENDPOINTS.TASKS.CREATE, {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${user.token}`,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                clientId,
                taskTitle: taskType.title,
                taskDescription: taskDescriptions[taskType.id] || taskType.defaultDescription,
                taskType: taskType.id,
                priority: taskPriority,
                dueDate: taskDueDate || null,
                coinsReward: parseInt(taskCoinsReward) || 0,
                actionUrl: `verdictpath://${taskType.actionScreen}`,
                sendNotification: true,
              }),
            })
          );
        }
      }

      const results = await Promise.all(taskPromises);
      const successCount = results.filter(r => r && !r.error).length;
      const totalExpected = selectedTaskTypes.length * selectedClients.length;

      alert(
        'Tasks Assigned',
        `${successCount} of ${totalExpected} task${totalExpected !== 1 ? 's' : ''} assigned successfully.\n\n${selectedTaskTypes.length} task type${selectedTaskTypes.length !== 1 ? 's' : ''} sent to ${selectedClients.length} client${selectedClients.length !== 1 ? 's' : ''}.`,
        [
          {
            text: 'OK',
            onPress: () => {
              setSelectedClients([]);
              setSelectedTaskTypes([]);
              setTaskDescriptions({});
              setTaskPriority('medium');
              setTaskDueDate('');
              setTaskCoinsReward('50');
            },
          },
        ]
      );
    } catch (error) {
      console.error('Error assigning tasks:', error);
      alert('Error', 'Failed to assign tasks. Please try again.');
    } finally {
      setIsSending(false);
    }
  };

  const getSelectedClientNames = () => {
    return selectedClients.map(id => {
      const client = clients.find(c => c.id === id);
      if (!client) return '';
      return `${client.firstName || ''} ${client.lastName || ''}`.trim() || client.email;
    }).filter(Boolean);
  };

  if (isLoading) {
    return (
      <View style={styles.container}>
        <View style={[styles.header, isDesktop && styles.headerDesktop]}>
          <TouchableOpacity style={styles.backButton} onPress={onBack}>
            <Text style={styles.backButtonText}>← Back</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Assign Tasks</Text>
          <View style={styles.placeholder} />
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.lawFirm.primary} />
          <Text style={styles.loadingText}>Loading clients...</Text>
        </View>
      </View>
    );
  }

  const filteredClients = getFilteredClients();
  const totalTasks = selectedTaskTypes.length * selectedClients.length;

  return (
    <View style={styles.container}>
      <View style={[styles.header, isDesktop && styles.headerDesktop]}>
        <TouchableOpacity style={styles.backButton} onPress={onBack}>
          <Text style={styles.backButtonText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Assign Tasks</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[styles.scrollContent, { alignItems: isDesktop ? 'center' : 'stretch' }]}
        showsVerticalScrollIndicator={false}
      >
        <View style={[styles.formContainer, isDesktop && { width: contentWidth }]}>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Select Client(s)</Text>
            <TouchableOpacity
              style={styles.recipientSelector}
              onPress={() => setShowRecipientDropdown(!showRecipientDropdown)}
            >
              <Text style={[styles.recipientSelectorText, selectedClients.length === 0 && styles.recipientPlaceholder]}>
                {selectedClients.length === 0
                  ? 'Choose clients...'
                  : `${selectedClients.length} client${selectedClients.length > 1 ? 's' : ''} selected`}
              </Text>
              <Text style={styles.dropdownArrow}>{showRecipientDropdown ? '▲' : '▼'}</Text>
            </TouchableOpacity>

            {selectedClients.length > 0 && !showRecipientDropdown && (
              <View style={styles.selectedChips}>
                {getSelectedClientNames().map((name, index) => (
                  <View key={index} style={styles.chip}>
                    <Text style={styles.chipText}>{name}</Text>
                    <TouchableOpacity onPress={() => toggleClientSelection(selectedClients[index])}>
                      <Text style={styles.chipRemove}>✕</Text>
                    </TouchableOpacity>
                  </View>
                ))}
              </View>
            )}

            {showRecipientDropdown && (
              <View style={styles.dropdownContainer}>
                <TextInput
                  style={styles.searchInput}
                  placeholder="Search clients..."
                  placeholderTextColor={theme.lawFirm.textLight}
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                />
                <TouchableOpacity style={styles.selectAllRow} onPress={selectAllClients}>
                  <View style={[styles.checkbox, selectedClients.length === clients.length && styles.checkboxChecked]}>
                    {selectedClients.length === clients.length && <Text style={styles.checkmark}>✓</Text>}
                  </View>
                  <Text style={styles.selectAllText}>Select All ({clients.length})</Text>
                </TouchableOpacity>
                <ScrollView style={styles.clientList} nestedScrollEnabled={true}>
                  {filteredClients.map(client => {
                    const isSelected = selectedClients.includes(client.id);
                    const clientName = `${client.firstName || ''} ${client.lastName || ''}`.trim() || client.email;
                    return (
                      <TouchableOpacity
                        key={client.id}
                        style={[styles.clientRow, isSelected && styles.clientRowSelected]}
                        onPress={() => toggleClientSelection(client.id)}
                      >
                        <View style={[styles.checkbox, isSelected && styles.checkboxChecked]}>
                          {isSelected && <Text style={styles.checkmark}>✓</Text>}
                        </View>
                        <View style={styles.clientInfo}>
                          <Text style={styles.clientName}>{clientName}</Text>
                          <Text style={styles.clientEmail}>{client.email}</Text>
                        </View>
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>
                <TouchableOpacity
                  style={styles.dropdownDoneBtn}
                  onPress={() => { setShowRecipientDropdown(false); setSearchQuery(''); }}
                >
                  <Text style={styles.dropdownDoneBtnText}>Done</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>

          <View style={styles.section}>
            <View style={styles.sectionHeaderRow}>
              <Text style={styles.sectionTitle}>Select Task Type(s)</Text>
              <TouchableOpacity onPress={selectAllTaskTypes} style={styles.selectAllTasksBtn}>
                <Text style={styles.selectAllTasksBtnText}>
                  {selectedTaskTypes.length === TASK_TYPES.length ? 'Deselect All' : 'Select All'}
                </Text>
              </TouchableOpacity>
            </View>
            {selectedTaskTypes.length > 0 && (
              <View style={styles.taskCountBadge}>
                <Text style={styles.taskCountBadgeText}>
                  {selectedTaskTypes.length} task type{selectedTaskTypes.length !== 1 ? 's' : ''} selected
                </Text>
              </View>
            )}
            <View style={styles.taskTypeGrid}>
              {TASK_TYPES.map(taskType => {
                const isSelected = selectedTaskTypes.some(t => t.id === taskType.id);
                return (
                  <TouchableOpacity
                    key={taskType.id}
                    style={[styles.taskTypeCard, isSelected && styles.taskTypeCardSelected]}
                    onPress={() => toggleTaskTypeSelection(taskType)}
                  >
                    <Text style={styles.taskTypeIcon}>{taskType.icon}</Text>
                    <Text style={[styles.taskTypeTitle, isSelected && styles.taskTypeTitleSelected]}>{taskType.title}</Text>
                    <Text style={styles.taskTypeDesc} numberOfLines={2}>{taskType.description}</Text>
                    {isSelected && (
                      <View style={styles.taskTypeCheck}>
                        <Text style={styles.taskTypeCheckText}>✓</Text>
                      </View>
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          {selectedTaskTypes.length > 0 && (
            <>
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Task Descriptions</Text>
                <Text style={styles.sectionSubtitle}>
                  Edit the message each client will see for each task
                </Text>
                {selectedTaskTypes.map(taskType => (
                  <View key={taskType.id} style={styles.taskDescriptionCard}>
                    <View style={styles.taskDescriptionHeader}>
                      <Text style={styles.taskDescriptionIcon}>{taskType.icon}</Text>
                      <Text style={styles.taskDescriptionTitle}>{taskType.title}</Text>
                    </View>
                    <TextInput
                      style={styles.textArea}
                      placeholder={taskType.id === 'other' ? 'Enter task details...' : 'Edit description...'}
                      placeholderTextColor={theme.lawFirm.textLight}
                      value={taskDescriptions[taskType.id] || ''}
                      onChangeText={(text) => updateTaskDescription(taskType.id, text)}
                      multiline
                      numberOfLines={3}
                      textAlignVertical="top"
                    />
                  </View>
                ))}
              </View>

              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Priority</Text>
                <View style={styles.priorityRow}>
                  {PRIORITIES.map(p => (
                    <TouchableOpacity
                      key={p.id}
                      style={[
                        styles.priorityBtn,
                        taskPriority === p.id && { backgroundColor: p.color, borderColor: p.color },
                      ]}
                      onPress={() => setTaskPriority(p.id)}
                    >
                      <Text style={[styles.priorityBtnText, taskPriority === p.id && styles.priorityBtnTextActive]}>
                        {p.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Due Date & Reward</Text>
                <View style={styles.rowFields}>
                  <View style={styles.fieldHalf}>
                    <Text style={styles.fieldLabel}>Due Date</Text>
                    {Platform.OS === 'web' ? (
                      <input
                        type="date"
                        value={taskDueDate}
                        onChange={(e) => setTaskDueDate(e.target.value)}
                        style={{
                          height: 48,
                          borderRadius: 10,
                          border: `1px solid ${theme.lawFirm.border}`,
                          backgroundColor: theme.lawFirm.surfaceAlt,
                          color: theme.lawFirm.text,
                          fontSize: 15,
                          paddingLeft: 14,
                          paddingRight: 14,
                          fontFamily: 'inherit',
                          width: '100%',
                          boxSizing: 'border-box',
                        }}
                        min={new Date().toISOString().split('T')[0]}
                      />
                    ) : (
                      <TextInput
                        style={styles.input}
                        placeholder="YYYY-MM-DD"
                        placeholderTextColor={theme.lawFirm.textLight}
                        value={taskDueDate}
                        onChangeText={setTaskDueDate}
                      />
                    )}
                  </View>
                  <View style={styles.fieldHalf}>
                    <Text style={styles.fieldLabel}>Coin Reward (per task)</Text>
                    <TextInput
                      style={styles.input}
                      placeholder="50"
                      placeholderTextColor={theme.lawFirm.textLight}
                      value={taskCoinsReward}
                      onChangeText={setTaskCoinsReward}
                      keyboardType="numeric"
                    />
                  </View>
                </View>
              </View>

              <View style={styles.summarySection}>
                <Text style={styles.summaryTitle}>Assignment Summary</Text>
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>Tasks:</Text>
                  <Text style={styles.summaryValue}>
                    {selectedTaskTypes.map(t => t.title).join(', ')}
                  </Text>
                </View>
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>Clients:</Text>
                  <Text style={styles.summaryValue}>{selectedClients.length} selected</Text>
                </View>
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>Total tasks:</Text>
                  <Text style={[styles.summaryValue, styles.summaryHighlight]}>
                    {totalTasks} ({selectedTaskTypes.length} type{selectedTaskTypes.length !== 1 ? 's' : ''} × {selectedClients.length} client{selectedClients.length !== 1 ? 's' : ''})
                  </Text>
                </View>
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>Priority:</Text>
                  <View style={[styles.priorityBadge, { backgroundColor: PRIORITIES.find(p => p.id === taskPriority)?.color || '#999' }]}>
                    <Text style={styles.priorityBadgeText}>{taskPriority.charAt(0).toUpperCase() + taskPriority.slice(1)}</Text>
                  </View>
                </View>
                {taskDueDate ? (
                  <View style={styles.summaryRow}>
                    <Text style={styles.summaryLabel}>Due:</Text>
                    <Text style={styles.summaryValue}>{formatDisplayDate(taskDueDate)}</Text>
                  </View>
                ) : null}
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>Reward per task:</Text>
                  <Text style={styles.summaryValue}>{taskCoinsReward || '0'} coins</Text>
                </View>
              </View>

              <TouchableOpacity
                style={[styles.assignButton, (isSending || selectedClients.length === 0 || selectedTaskTypes.length === 0) && styles.assignButtonDisabled]}
                onPress={handleAssignTasks}
                disabled={isSending || selectedClients.length === 0 || selectedTaskTypes.length === 0}
              >
                {isSending ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <Text style={styles.assignButtonText}>
                    Assign {totalTasks} Task{totalTasks !== 1 ? 's' : ''} to {selectedClients.length} Client{selectedClients.length !== 1 ? 's' : ''}
                  </Text>
                )}
              </TouchableOpacity>
            </>
          )}

          <View style={{ height: 120 }} />
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.lawFirm.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: Platform.OS === 'ios' ? 60 : Platform.OS === 'web' ? 20 : 40,
    paddingHorizontal: 20,
    paddingBottom: 16,
    backgroundColor: theme.lawFirm.primary,
  },
  headerDesktop: {
    paddingTop: 20,
  },
  backButton: {
    paddingVertical: 8,
    paddingRight: 12,
  },
  backButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '500',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  placeholder: {
    width: 60,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: theme.lawFirm.textSecondary,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
  },
  formContainer: {
    width: '100%',
  },
  section: {
    marginBottom: 24,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: theme.lawFirm.text,
    marginBottom: 0,
  },
  sectionSubtitle: {
    fontSize: 13,
    color: theme.lawFirm.textSecondary,
    marginBottom: 12,
  },
  selectAllTasksBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: theme.lawFirm.surfaceAlt,
    borderWidth: 1,
    borderColor: theme.lawFirm.border,
  },
  selectAllTasksBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: theme.lawFirm.primary,
  },
  taskCountBadge: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(30, 58, 95, 0.1)',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 16,
    marginBottom: 12,
  },
  taskCountBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: theme.lawFirm.primary,
  },
  recipientSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: theme.lawFirm.surface,
    borderWidth: 1,
    borderColor: theme.lawFirm.border,
    borderRadius: 10,
    padding: 14,
  },
  recipientSelectorText: {
    fontSize: 15,
    color: theme.lawFirm.text,
    fontWeight: '500',
  },
  recipientPlaceholder: {
    color: theme.lawFirm.textLight,
    fontWeight: '400',
  },
  dropdownArrow: {
    fontSize: 12,
    color: theme.lawFirm.textSecondary,
  },
  selectedChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 10,
    gap: 8,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.lawFirm.surfaceAlt,
    borderRadius: 20,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: theme.lawFirm.border,
  },
  chipText: {
    fontSize: 13,
    color: theme.lawFirm.text,
    marginRight: 6,
  },
  chipRemove: {
    fontSize: 12,
    color: theme.lawFirm.textSecondary,
    fontWeight: '700',
  },
  dropdownContainer: {
    backgroundColor: theme.lawFirm.surface,
    borderWidth: 1,
    borderColor: theme.lawFirm.border,
    borderRadius: 10,
    marginTop: 8,
    overflow: 'hidden',
  },
  searchInput: {
    padding: 12,
    fontSize: 14,
    color: theme.lawFirm.text,
    borderBottomWidth: 1,
    borderBottomColor: theme.lawFirm.border,
  },
  selectAllRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: theme.lawFirm.border,
    backgroundColor: theme.lawFirm.surfaceAlt,
  },
  selectAllText: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.lawFirm.text,
    marginLeft: 10,
  },
  clientList: {
    maxHeight: 200,
  },
  clientRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: theme.lawFirm.border,
  },
  clientRowSelected: {
    backgroundColor: 'rgba(30, 58, 95, 0.06)',
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: theme.lawFirm.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxChecked: {
    backgroundColor: theme.lawFirm.primary,
    borderColor: theme.lawFirm.primary,
  },
  checkmark: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
  clientInfo: {
    marginLeft: 10,
    flex: 1,
  },
  clientName: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.lawFirm.text,
  },
  clientEmail: {
    fontSize: 12,
    color: theme.lawFirm.textSecondary,
    marginTop: 2,
  },
  dropdownDoneBtn: {
    padding: 12,
    alignItems: 'center',
    backgroundColor: theme.lawFirm.primary,
  },
  dropdownDoneBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  taskTypeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  taskTypeCard: {
    width: '48%',
    backgroundColor: theme.lawFirm.surface,
    borderRadius: 12,
    padding: 14,
    borderWidth: 1.5,
    borderColor: theme.lawFirm.border,
    position: 'relative',
    minHeight: 110,
  },
  taskTypeCardSelected: {
    borderColor: theme.lawFirm.primary,
    backgroundColor: 'rgba(30, 58, 95, 0.05)',
  },
  taskTypeIcon: {
    fontSize: 24,
    marginBottom: 8,
  },
  taskTypeTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: theme.lawFirm.text,
    marginBottom: 4,
  },
  taskTypeTitleSelected: {
    color: theme.lawFirm.primary,
  },
  taskTypeDesc: {
    fontSize: 11,
    color: theme.lawFirm.textSecondary,
    lineHeight: 15,
  },
  taskTypeCheck: {
    position: 'absolute',
    top: 10,
    right: 10,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: theme.lawFirm.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  taskTypeCheckText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
  taskDescriptionCard: {
    backgroundColor: theme.lawFirm.surface,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: theme.lawFirm.border,
    marginBottom: 12,
    overflow: 'hidden',
  },
  taskDescriptionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: theme.lawFirm.border,
    backgroundColor: theme.lawFirm.surfaceAlt,
  },
  taskDescriptionIcon: {
    fontSize: 18,
    marginRight: 8,
  },
  taskDescriptionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.lawFirm.text,
  },
  fieldLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: theme.lawFirm.textSecondary,
    marginBottom: 6,
    marginTop: 4,
  },
  textArea: {
    padding: 14,
    fontSize: 14,
    color: theme.lawFirm.text,
    minHeight: 80,
  },
  input: {
    backgroundColor: theme.lawFirm.surfaceAlt,
    borderWidth: 1,
    borderColor: theme.lawFirm.border,
    borderRadius: 10,
    padding: 14,
    fontSize: 15,
    color: theme.lawFirm.text,
    height: 48,
  },
  priorityRow: {
    flexDirection: 'row',
    gap: 10,
  },
  priorityBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1.5,
    borderColor: theme.lawFirm.border,
    alignItems: 'center',
    backgroundColor: theme.lawFirm.surface,
  },
  priorityBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: theme.lawFirm.textSecondary,
  },
  priorityBtnTextActive: {
    color: '#FFFFFF',
  },
  rowFields: {
    flexDirection: 'row',
    gap: 14,
  },
  fieldHalf: {
    flex: 1,
  },
  summarySection: {
    backgroundColor: theme.lawFirm.surface,
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: theme.lawFirm.border,
  },
  summaryTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: theme.lawFirm.text,
    marginBottom: 12,
  },
  summaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: theme.lawFirm.border,
  },
  summaryLabel: {
    fontSize: 13,
    color: theme.lawFirm.textSecondary,
    fontWeight: '500',
    flexShrink: 0,
    marginRight: 8,
  },
  summaryValue: {
    fontSize: 13,
    color: theme.lawFirm.text,
    fontWeight: '600',
    flex: 1,
    textAlign: 'right',
  },
  summaryHighlight: {
    color: theme.lawFirm.primary,
    fontWeight: '700',
  },
  priorityBadge: {
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 12,
  },
  priorityBadgeText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
  assignButton: {
    backgroundColor: theme.lawFirm.primary,
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    marginBottom: 10,
  },
  assignButtonDisabled: {
    opacity: 0.5,
  },
  assignButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
});

export default LawFirmAssignTaskScreen;

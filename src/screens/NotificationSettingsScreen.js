import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  Platform,
  Alert,
  ActivityIndicator,
  Modal,
  TextInput
} from 'react-native';
import { theme } from '../styles/theme';
import { medicalProviderTheme } from '../styles/medicalProviderTheme';
import { API_BASE_URL } from '../config/api';

const getThemeForUserType = (isMedicalProvider) => {
  if (isMedicalProvider) {
    return {
      primary: medicalProviderTheme.colors.primary,
      headerBg: medicalProviderTheme.colors.primary,
      headerText: '#FFFFFF',
      backButtonText: '#A8A8A8',
      background: medicalProviderTheme.colors.background,
      surface: medicalProviderTheme.colors.surface,
      text: medicalProviderTheme.colors.text,
      textSecondary: medicalProviderTheme.colors.textSecondary,
      border: medicalProviderTheme.colors.border,
    };
  }
  return {
    primary: '#1E3A5F',
    headerBg: '#1E3A5F',
    headerText: '#FFFFFF',
    backButtonText: '#C0C0C0',
    background: '#F5F7FA',
    surface: '#FFFFFF',
    text: '#1E3A5F',
    textSecondary: '#64748B',
    border: '#E2E8F0',
  };
};

const NotificationSettingsScreen = ({ user, onBack }) => {
  const isMedicalProvider = user?.userType === 'medical_provider' || user?.type === 'medicalprovider';
  const themeColors = useMemo(() => getThemeForUserType(isMedicalProvider), [isMedicalProvider]);
  const styles = useMemo(() => createStyles(themeColors), [themeColors]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(null);
  const [timeInput, setTimeInput] = useState('');
  const [preferences, setPreferences] = useState({
    pushNotificationsEnabled: true,
    emailNotificationsEnabled: true,
    smsNotificationsEnabled: false,
    quietHoursEnabled: false,
    quietHoursStart: '22:00:00',
    quietHoursEnd: '08:00:00',
    timezone: 'America/New_York',
    urgentNotifications: true,
    taskNotifications: true,
    systemNotifications: true,
    marketingNotifications: false
  });
  const [emailCCPrefs, setEmailCCPrefs] = useState({
    emailCCEnabled: false,
    ccEmailAddress: '',
    ccCaseUpdates: false,
    ccAppointmentReminders: true,
    ccPaymentNotifications: false,
    ccDocumentRequests: true,
    ccSystemAlerts: false
  });
  const [editingCCEmail, setEditingCCEmail] = useState(false);
  const [ccEmailInput, setCCEmailInput] = useState('');

  useEffect(() => {
    fetchPreferences();
    fetchEmailCCPreferences();
  }, []);

  const fetchEmailCCPreferences = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/notifications/email-preferences`, {
        headers: {
          'Authorization': `Bearer ${user.token}`,
          'Content-Type': 'application/json'
        }
      });

      const data = await response.json();

      if (response.ok && data.success) {
        setEmailCCPrefs({
          emailCCEnabled: data.email_cc_enabled ?? false,
          ccEmailAddress: data.cc_email_address ?? '',
          ccCaseUpdates: data.cc_case_updates ?? false,
          ccAppointmentReminders: data.cc_appointment_reminders ?? true,
          ccPaymentNotifications: data.cc_payment_notifications ?? false,
          ccDocumentRequests: data.cc_document_requests ?? true,
          ccSystemAlerts: data.cc_system_alerts ?? false
        });
        setCCEmailInput(data.cc_email_address ?? '');
      }
    } catch (error) {
      console.error('Error fetching email CC preferences:', error);
    }
  };

  const updateEmailCCPreferences = async (updates) => {
    try {
      setSaving(true);
      
      const snakeCaseUpdates = {};
      Object.keys(updates).forEach(key => {
        const snakeKey = key.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
        snakeCaseUpdates[snakeKey] = updates[key];
      });
      
      const response = await fetch(`${API_BASE_URL}/api/notifications/email-preferences`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${user.token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(snakeCaseUpdates)
      });

      if (response.ok) {
        setEmailCCPrefs(prev => ({ ...prev, ...updates }));
      } else {
        Alert.alert('Error', 'Failed to update email CC settings');
      }
    } catch (error) {
      console.error('Error updating email CC preferences:', error);
      Alert.alert('Error', 'Failed to save email CC settings');
    } finally {
      setSaving(false);
    }
  };

  const handleCCToggle = (key, value) => {
    const newPrefs = { ...emailCCPrefs, [key]: value };
    setEmailCCPrefs(newPrefs);
    updateEmailCCPreferences({ [key]: value });
  };

  const saveCCEmailAddress = () => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (ccEmailInput && !emailRegex.test(ccEmailInput)) {
      Alert.alert('Invalid Email', 'Please enter a valid email address');
      return;
    }
    updateEmailCCPreferences({ ccEmailAddress: ccEmailInput });
    setEditingCCEmail(false);
  };

  const fetchPreferences = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${API_BASE_URL}/api/notifications/preferences`, {
        headers: {
          'Authorization': `Bearer ${user.token}`,
          'Content-Type': 'application/json'
        }
      });

      const data = await response.json();

      if (response.ok) {
        // Map snake_case API response to camelCase state
        setPreferences({
          pushNotificationsEnabled: data.push_notifications_enabled ?? true,
          emailNotificationsEnabled: data.email_notifications_enabled ?? true,
          smsNotificationsEnabled: data.sms_notifications_enabled ?? false,
          quietHoursEnabled: data.quiet_hours_enabled ?? false,
          quietHoursStart: data.quiet_hours_start ?? '22:00:00',
          quietHoursEnd: data.quiet_hours_end ?? '08:00:00',
          timezone: data.timezone ?? 'America/New_York',
          urgentNotifications: data.urgent_notifications ?? true,
          taskNotifications: data.task_notifications ?? true,
          systemNotifications: data.system_notifications ?? true,
          marketingNotifications: data.marketing_notifications ?? false
        });
      } else {
        Alert.alert('Error', data.error || 'Failed to load notification preferences');
      }
    } catch (error) {
      console.error('Error fetching preferences:', error);
      Alert.alert('Error', 'Failed to load notification preferences');
    } finally {
      setLoading(false);
    }
  };

  const updatePreferences = async (updates) => {
    try {
      setSaving(true);
      
      // Map camelCase updates to snake_case for API
      const snakeCaseUpdates = {};
      Object.keys(updates).forEach(key => {
        const snakeKey = key.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
        snakeCaseUpdates[snakeKey] = updates[key];
      });
      
      const response = await fetch(`${API_BASE_URL}/api/notifications/preferences`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${user.token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(snakeCaseUpdates)
      });

      const data = await response.json();

      if (response.ok) {
        // Map snake_case response back to camelCase state
        if (data.preferences) {
          setPreferences({
            pushNotificationsEnabled: data.preferences.push_notifications_enabled ?? preferences.pushNotificationsEnabled,
            emailNotificationsEnabled: data.preferences.email_notifications_enabled ?? preferences.emailNotificationsEnabled,
            smsNotificationsEnabled: data.preferences.sms_notifications_enabled ?? preferences.smsNotificationsEnabled,
            quietHoursEnabled: data.preferences.quiet_hours_enabled ?? preferences.quietHoursEnabled,
            quietHoursStart: data.preferences.quiet_hours_start ?? preferences.quietHoursStart,
            quietHoursEnd: data.preferences.quiet_hours_end ?? preferences.quietHoursEnd,
            timezone: data.preferences.timezone ?? preferences.timezone,
            urgentNotifications: data.preferences.urgent_notifications ?? preferences.urgentNotifications,
            taskNotifications: data.preferences.task_notifications ?? preferences.taskNotifications,
            systemNotifications: data.preferences.system_notifications ?? preferences.systemNotifications,
            marketingNotifications: data.preferences.marketing_notifications ?? preferences.marketingNotifications
          });
        }
        Alert.alert('Success', 'Notification preferences updated');
      } else {
        Alert.alert('Error', data.error || 'Failed to update preferences');
      }
    } catch (error) {
      console.error('Error updating preferences:', error);
      Alert.alert('Error', 'Failed to update preferences');
    } finally {
      setSaving(false);
    }
  };

  const handleToggle = (key, value) => {
    const newPrefs = { ...preferences, [key]: value };
    setPreferences(newPrefs);
    updatePreferences({ [key]: value });
  };

  const selectQuietHours = (type) => {
    const currentTime = preferences[type === 'start' ? 'quietHoursStart' : 'quietHoursEnd'].substring(0, 5);
    setTimeInput(currentTime);
    setShowTimePicker(type);
  };

  const handleTimeChange = () => {
    if (/^([01]\d|2[0-3]):([0-5]\d)$/.test(timeInput)) {
      const key = showTimePicker === 'start' ? 'quietHoursStart' : 'quietHoursEnd';
      const newTime = timeInput + ':00';
      setPreferences({ ...preferences, [key]: newTime });
      updatePreferences({ [key]: newTime });
      setShowTimePicker(null);
      setTimeInput('');
    } else {
      Alert.alert('Invalid Format', 'Please use HH:MM format (e.g., 22:00)');
    }
  };

  const cancelTimePicker = () => {
    setShowTimePicker(null);
    setTimeInput('');
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={onBack} style={styles.backButton}>
            <Text style={styles.backButtonText}>← Back</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Notification Settings</Text>
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={themeColors.primary} />
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
        <Text style={styles.headerTitle}>Notification Settings</Text>
      </View>

      <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
        {/* Global Settings */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>🔔 Global Settings</Text>
          
          <View style={styles.settingRow}>
            <View style={styles.settingInfo}>
              <Text style={styles.settingLabel}>Push Notifications</Text>
              <Text style={styles.settingDescription}>
                Receive push notifications on this device
              </Text>
            </View>
            <Switch
              value={preferences.pushNotificationsEnabled}
              onValueChange={(value) => handleToggle('pushNotificationsEnabled', value)}
              trackColor={{ false: '#ccc', true: themeColors.primary }}
              thumbColor={preferences.pushNotificationsEnabled ? '#fff' : '#f4f3f4'}
              disabled={saving}
            />
          </View>

          <View style={styles.settingRow}>
            <View style={styles.settingInfo}>
              <Text style={styles.settingLabel}>Email Notifications</Text>
              <Text style={styles.settingDescription}>
                Receive email summaries and updates
              </Text>
            </View>
            <Switch
              value={preferences.emailNotificationsEnabled}
              onValueChange={(value) => handleToggle('emailNotificationsEnabled', value)}
              trackColor={{ false: '#ccc', true: themeColors.primary }}
              thumbColor={preferences.emailNotificationsEnabled ? '#fff' : '#f4f3f4'}
              disabled={saving}
            />
          </View>

          <View style={styles.settingRow}>
            <View style={styles.settingInfo}>
              <Text style={styles.settingLabel}>SMS Notifications</Text>
              <Text style={styles.settingDescription}>
                Receive text messages for important updates and task reminders
              </Text>
            </View>
            <Switch
              value={preferences.smsNotificationsEnabled}
              onValueChange={(value) => handleToggle('smsNotificationsEnabled', value)}
              trackColor={{ false: '#ccc', true: themeColors.primary }}
              thumbColor={preferences.smsNotificationsEnabled ? '#fff' : '#f4f3f4'}
              disabled={saving}
            />
          </View>
        </View>

        {/* Quiet Hours */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>🌙 Quiet Hours</Text>
          
          <View style={styles.settingRow}>
            <View style={styles.settingInfo}>
              <Text style={styles.settingLabel}>Enable Quiet Hours</Text>
              <Text style={styles.settingDescription}>
                Pause non-urgent notifications during specified hours
              </Text>
            </View>
            <Switch
              value={preferences.quietHoursEnabled}
              onValueChange={(value) => handleToggle('quietHoursEnabled', value)}
              trackColor={{ false: '#ccc', true: themeColors.primary }}
              thumbColor={preferences.quietHoursEnabled ? '#fff' : '#f4f3f4'}
              disabled={saving}
            />
          </View>

          {preferences.quietHoursEnabled && (
            <View style={styles.quietHoursConfig}>
              <TouchableOpacity 
                style={styles.timeSelector}
                onPress={() => selectQuietHours('start')}
                disabled={saving}
              >
                <Text style={styles.timeSelectorLabel}>Start Time</Text>
                <Text style={styles.timeSelectorValue}>
                  {preferences.quietHoursStart.substring(0, 5)}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity 
                style={styles.timeSelector}
                onPress={() => selectQuietHours('end')}
                disabled={saving}
              >
                <Text style={styles.timeSelectorLabel}>End Time</Text>
                <Text style={styles.timeSelectorValue}>
                  {preferences.quietHoursEnd.substring(0, 5)}
                </Text>
              </TouchableOpacity>

              <Text style={styles.quietHoursNote}>
                ⚠️ Urgent notifications will still come through during quiet hours
              </Text>
            </View>
          )}
        </View>

        {/* Notification Types */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>📬 Notification Types</Text>
          
          <View style={styles.settingRow}>
            <View style={styles.settingInfo}>
              <Text style={styles.settingLabel}>Urgent Notifications</Text>
              <Text style={styles.settingDescription}>
                Important alerts from your attorney
              </Text>
            </View>
            <Switch
              value={preferences.urgentNotifications}
              onValueChange={(value) => handleToggle('urgentNotifications', value)}
              trackColor={{ false: '#ccc', true: themeColors.primary }}
              thumbColor={preferences.urgentNotifications ? '#fff' : '#f4f3f4'}
              disabled={saving}
            />
          </View>

          <View style={styles.settingRow}>
            <View style={styles.settingInfo}>
              <Text style={styles.settingLabel}>Task Notifications</Text>
              <Text style={styles.settingDescription}>
                Updates about assigned tasks and deadlines
              </Text>
            </View>
            <Switch
              value={preferences.taskNotifications}
              onValueChange={(value) => handleToggle('taskNotifications', value)}
              trackColor={{ false: '#ccc', true: themeColors.primary }}
              thumbColor={preferences.taskNotifications ? '#fff' : '#f4f3f4'}
              disabled={saving}
            />
          </View>

          <View style={styles.settingRow}>
            <View style={styles.settingInfo}>
              <Text style={styles.settingLabel}>System Notifications</Text>
              <Text style={styles.settingDescription}>
                Daily streaks, coin rewards, and milestones
              </Text>
            </View>
            <Switch
              value={preferences.systemNotifications}
              onValueChange={(value) => handleToggle('systemNotifications', value)}
              trackColor={{ false: '#ccc', true: themeColors.primary }}
              thumbColor={preferences.systemNotifications ? '#fff' : '#f4f3f4'}
              disabled={saving}
            />
          </View>

          <View style={styles.settingRow}>
            <View style={styles.settingInfo}>
              <Text style={styles.settingLabel}>Marketing Notifications</Text>
              <Text style={styles.settingDescription}>
                Product updates and promotional content
              </Text>
            </View>
            <Switch
              value={preferences.marketingNotifications}
              onValueChange={(value) => handleToggle('marketingNotifications', value)}
              trackColor={{ false: '#ccc', true: themeColors.primary }}
              thumbColor={preferences.marketingNotifications ? '#fff' : '#f4f3f4'}
              disabled={saving}
            />
          </View>
        </View>

        {/* Email CC Settings */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>📧 Email CC / Forwarding</Text>
          <Text style={styles.sectionDescription}>
            Receive copies of notifications via email for record-keeping
          </Text>
          
          <View style={styles.settingRow}>
            <View style={styles.settingInfo}>
              <Text style={styles.settingLabel}>Enable Email CC</Text>
              <Text style={styles.settingDescription}>
                Send copies of notifications to your email
              </Text>
            </View>
            <Switch
              value={emailCCPrefs.emailCCEnabled}
              onValueChange={(value) => handleCCToggle('emailCCEnabled', value)}
              trackColor={{ false: '#ccc', true: themeColors.primary }}
              thumbColor={emailCCPrefs.emailCCEnabled ? '#fff' : '#f4f3f4'}
              disabled={saving}
            />
          </View>

          {emailCCPrefs.emailCCEnabled && (
            <>
              <View style={styles.emailInputContainer}>
                <Text style={styles.emailInputLabel}>CC Email Address:</Text>
                {editingCCEmail ? (
                  <View style={styles.emailEditRow}>
                    <TextInput
                      style={styles.ccEmailInput}
                      value={ccEmailInput}
                      onChangeText={setCCEmailInput}
                      placeholder="Enter email address"
                      placeholderTextColor="#999"
                      keyboardType="email-address"
                      autoCapitalize="none"
                      autoCorrect={false}
                    />
                    <TouchableOpacity 
                      style={styles.emailSaveButton}
                      onPress={saveCCEmailAddress}
                    >
                      <Text style={styles.emailSaveButtonText}>Save</Text>
                    </TouchableOpacity>
                  </View>
                ) : (
                  <TouchableOpacity 
                    style={styles.emailDisplayRow}
                    onPress={() => setEditingCCEmail(true)}
                  >
                    <Text style={styles.ccEmailDisplay}>
                      {emailCCPrefs.ccEmailAddress || 'Not set - tap to add'}
                    </Text>
                    <Text style={styles.editEmailLink}>Edit</Text>
                  </TouchableOpacity>
                )}
              </View>

              <View style={styles.ccOptionsContainer}>
                <Text style={styles.ccOptionsTitle}>CC the following notification types:</Text>
                
                <View style={styles.settingRow}>
                  <View style={styles.settingInfo}>
                    <Text style={styles.settingLabel}>Case Updates</Text>
                  </View>
                  <Switch
                    value={emailCCPrefs.ccCaseUpdates}
                    onValueChange={(value) => handleCCToggle('ccCaseUpdates', value)}
                    trackColor={{ false: '#ccc', true: themeColors.primary }}
                    thumbColor={emailCCPrefs.ccCaseUpdates ? '#fff' : '#f4f3f4'}
                    disabled={saving}
                  />
                </View>

                <View style={styles.settingRow}>
                  <View style={styles.settingInfo}>
                    <Text style={styles.settingLabel}>Appointment Reminders</Text>
                  </View>
                  <Switch
                    value={emailCCPrefs.ccAppointmentReminders}
                    onValueChange={(value) => handleCCToggle('ccAppointmentReminders', value)}
                    trackColor={{ false: '#ccc', true: themeColors.primary }}
                    thumbColor={emailCCPrefs.ccAppointmentReminders ? '#fff' : '#f4f3f4'}
                    disabled={saving}
                  />
                </View>

                <View style={styles.settingRow}>
                  <View style={styles.settingInfo}>
                    <Text style={styles.settingLabel}>Payment Notifications</Text>
                  </View>
                  <Switch
                    value={emailCCPrefs.ccPaymentNotifications}
                    onValueChange={(value) => handleCCToggle('ccPaymentNotifications', value)}
                    trackColor={{ false: '#ccc', true: themeColors.primary }}
                    thumbColor={emailCCPrefs.ccPaymentNotifications ? '#fff' : '#f4f3f4'}
                    disabled={saving}
                  />
                </View>

                <View style={styles.settingRow}>
                  <View style={styles.settingInfo}>
                    <Text style={styles.settingLabel}>Document Requests</Text>
                  </View>
                  <Switch
                    value={emailCCPrefs.ccDocumentRequests}
                    onValueChange={(value) => handleCCToggle('ccDocumentRequests', value)}
                    trackColor={{ false: '#ccc', true: themeColors.primary }}
                    thumbColor={emailCCPrefs.ccDocumentRequests ? '#fff' : '#f4f3f4'}
                    disabled={saving}
                  />
                </View>

                <View style={styles.settingRow}>
                  <View style={styles.settingInfo}>
                    <Text style={styles.settingLabel}>System Alerts</Text>
                  </View>
                  <Switch
                    value={emailCCPrefs.ccSystemAlerts}
                    onValueChange={(value) => handleCCToggle('ccSystemAlerts', value)}
                    trackColor={{ false: '#ccc', true: themeColors.primary }}
                    thumbColor={emailCCPrefs.ccSystemAlerts ? '#fff' : '#f4f3f4'}
                    disabled={saving}
                  />
                </View>
              </View>
            </>
          )}
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>
            🏴‍☠️ Ahoy! These settings help you control when and how you receive notifications on your journey to justice.
          </Text>
        </View>
      </ScrollView>

      {saving && (
        <View style={styles.savingOverlay}>
          <ActivityIndicator size="large" color="#fff" />
          <Text style={styles.savingText}>Saving...</Text>
        </View>
      )}

      <Modal
        visible={showTimePicker !== null}
        transparent={true}
        animationType="fade"
        onRequestClose={cancelTimePicker}
      >
        <TouchableOpacity 
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={cancelTimePicker}
        >
          <View style={styles.timePickerModal}>
            <Text style={styles.timePickerTitle}>
              {showTimePicker === 'start' ? 'Quiet Hours Start Time' : 'Quiet Hours End Time'}
            </Text>
            <Text style={styles.timePickerSubtitle}>
              Enter time in 24-hour format (HH:MM)
            </Text>
            
            <TextInput
              style={styles.timeInput}
              value={timeInput}
              onChangeText={setTimeInput}
              placeholder="22:00"
              placeholderTextColor="#999"
              keyboardType="numbers-and-punctuation"
              maxLength={5}
              autoFocus={true}
            />

            <View style={styles.timePickerButtons}>
              <TouchableOpacity 
                style={[styles.timePickerButton, styles.cancelButton]}
                onPress={cancelTimePicker}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={[styles.timePickerButton, styles.confirmButton]}
                onPress={handleTimeChange}
              >
                <Text style={styles.confirmButtonText}>Confirm</Text>
              </TouchableOpacity>
            </View>
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
};

const createStyles = (colors) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background
  },
  header: {
    backgroundColor: colors.headerBg,
    paddingTop: Platform.OS === 'ios' ? 50 : 20,
    paddingBottom: 15,
    paddingHorizontal: 15,
    flexDirection: 'row',
    alignItems: 'center',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 4
      },
      android: {
        elevation: 4
      }
    })
  },
  backButton: {
    paddingVertical: 5,
    paddingRight: 15
  },
  backButtonText: {
    color: colors.backButtonText,
    fontSize: 16,
    fontWeight: '600'
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.headerText,
    flex: 1
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center'
  },
  content: {
    flex: 1
  },
  contentContainer: {
    paddingBottom: 180
  },
  section: {
    backgroundColor: colors.surface,
    marginTop: 20,
    paddingHorizontal: 15,
    paddingVertical: 15,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: colors.border
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 15
  },
  settingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.background
  },
  settingInfo: {
    flex: 1,
    marginRight: 15
  },
  settingLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 4
  },
  settingDescription: {
    fontSize: 13,
    color: colors.textSecondary,
    lineHeight: 18
  },
  quietHoursConfig: {
    marginTop: 15,
    paddingTop: 15,
    borderTopWidth: 1,
    borderTopColor: colors.border
  },
  timeSelector: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: colors.background,
    padding: 15,
    borderRadius: 8,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: colors.border
  },
  timeSelectorLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.text
  },
  timeSelectorValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.text
  },
  quietHoursNote: {
    fontSize: 12,
    color: '#F59E0B',
    marginTop: 10,
    lineHeight: 16,
    fontStyle: 'italic'
  },
  footer: {
    padding: 20,
    marginBottom: 20
  },
  footerText: {
    fontSize: 13,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20
  },
  savingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: `${colors.primary}B3`,
    justifyContent: 'center',
    alignItems: 'center'
  },
  savingText: {
    color: '#fff',
    fontSize: 16,
    marginTop: 10,
    fontWeight: '600'
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: `${colors.primary}80`,
    justifyContent: 'center',
    alignItems: 'center'
  },
  timePickerModal: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: 20,
    width: '85%',
    maxWidth: 400,
    ...Platform.select({
      ios: {
        shadowColor: colors.primary,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 8
      },
      android: {
        elevation: 8
      }
    })
  },
  timePickerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 8,
    textAlign: 'center'
  },
  timePickerSubtitle: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: 20,
    textAlign: 'center'
  },
  timeInput: {
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    padding: 15,
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    color: colors.text,
    marginBottom: 20
  },
  timePickerButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 10
  },
  timePickerButton: {
    flex: 1,
    padding: 15,
    borderRadius: 8,
    alignItems: 'center'
  },
  cancelButton: {
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border
  },
  confirmButton: {
    backgroundColor: colors.primary
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.textSecondary
  },
  confirmButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF'
  },
  sectionDescription: {
    fontSize: 13,
    color: colors.textSecondary,
    marginBottom: 15,
    lineHeight: 18
  },
  emailInputContainer: {
    backgroundColor: colors.background,
    padding: 15,
    borderRadius: 8,
    marginTop: 10,
    borderWidth: 1,
    borderColor: colors.border
  },
  emailInputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 8
  },
  emailEditRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10
  },
  ccEmailInput: {
    flex: 1,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    padding: 12,
    fontSize: 15,
    color: colors.text
  },
  emailSaveButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8
  },
  emailSaveButtonText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 14
  },
  emailDisplayRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  ccEmailDisplay: {
    fontSize: 15,
    color: colors.text,
    flex: 1
  },
  editEmailLink: {
    fontSize: 14,
    color: colors.primary,
    fontWeight: '600'
  },
  ccOptionsContainer: {
    marginTop: 15,
    paddingTop: 15,
    borderTopWidth: 1,
    borderTopColor: colors.border
  },
  ccOptionsTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 10
  }
});

export default NotificationSettingsScreen;

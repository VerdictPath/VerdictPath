// src/screens/LawFirmUserManagementScreen.jsx - NEW FILE

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Alert,
  Modal,
  Switch,
  Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { lawFirmTheme } from '../styles/lawFirmTheme';
import { theme } from '../styles/theme';
import { apiRequest, API_ENDPOINTS } from '../config/api';

// Cross-platform alert helper
const showAlert = (title, message) => {
  if (Platform.OS === 'web') {
    if (title === 'Success') {
      window.alert(`✅ ${message}`);
    } else if (title === 'Error') {
      window.alert(`❌ ${message}`);
    } else {
      window.alert(`${title}\n${message}`);
    }
  } else {
    Alert.alert(title, message);
  }
};

const LawFirmUserManagementScreen = ({ user, onBack }) => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddUserModal, setShowAddUserModal] = useState(false);
  const [filterStatus, setFilterStatus] = useState('active');

  useEffect(() => {
    loadUsers();
  }, [filterStatus]);

  const loadUsers = async () => {
    try {
      setLoading(true);
      const response = await apiRequest(`${API_ENDPOINTS.LAWFIRM_USERS.GET_ALL}?status=${filterStatus}`, {
        method: 'GET',
        headers: { 'Authorization': `Bearer ${user.token}` },
      });

      setUsers(response.users || []);
    } catch (error) {
      console.error('[UserManagement] Load error:', error);
      showAlert('Error', 'Failed to load users');
    } finally {
      setLoading(false);
    }
  };

  const handleDeactivateUser = (userId, userName) => {
    if (Platform.OS === 'web') {
      const confirmed = window.confirm(
        `Are you sure you want to deactivate ${userName}? They will immediately lose access to the portal.`
      );
      if (confirmed) {
        deactivateUser(userId);
      }
    } else {
      Alert.alert(
        'Deactivate User',
        `Are you sure you want to deactivate ${userName}? They will immediately lose access to the portal.`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Deactivate',
            style: 'destructive',
            onPress: () => deactivateUser(userId),
          },
        ]
      );
    }
  };

  const deactivateUser = async (userId) => {
    try {
      const url = API_ENDPOINTS.LAWFIRM_USERS.DEACTIVATE(userId);
      
      const response = await apiRequest(url, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${user.token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          reason: 'Deactivated by admin',
        }),
      });

      if (response.success) {
        showAlert('Success', 'User deactivated successfully');
        loadUsers();
      } else {
        showAlert('Error', response.message || 'Failed to deactivate user');
      }
    } catch (error) {
      console.error('[LawFirm UserManagement] Deactivate error:', error);
      showAlert('Error', error.message || 'Failed to deactivate user');
    }
  };

  const reactivateUser = async (userId) => {
    try {
      const response = await apiRequest(API_ENDPOINTS.LAWFIRM_USERS.REACTIVATE(userId), {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${user.token}` },
      });

      if (response.success) {
        showAlert('Success', 'User reactivated successfully');
        loadUsers();
      } else {
        showAlert('Error', response.message || 'Failed to reactivate user');
      }
    } catch (error) {
      console.error('[LawFirm UserManagement] Reactivate error:', error);
      showAlert('Error', error.message || 'Failed to reactivate user');
    }
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <TouchableOpacity onPress={onBack}>
            <Text style={styles.backText}>← Back</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>User Management</Text>
          <TouchableOpacity onPress={() => setShowAddUserModal(true)}>
            <Text style={styles.addButton}>+ Add</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Filter Tabs */}
      <View style={styles.filterContainer}>
        <TouchableOpacity
          style={[styles.filterTab, filterStatus === 'active' && styles.filterTabActive]}
          onPress={() => setFilterStatus('active')}
        >
          <Text style={[styles.filterText, filterStatus === 'active' && styles.filterTextActive]}>
            Active
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.filterTab, filterStatus === 'deactivated' && styles.filterTabActive]}
          onPress={() => setFilterStatus('deactivated')}
        >
          <Text style={[styles.filterText, filterStatus === 'deactivated' && styles.filterTextActive]}>
            Deactivated
          </Text>
        </TouchableOpacity>
      </View>

      {/* Users List */}
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.content}>
        {users.map((u) => (
          <UserCard
            key={u.id}
            user={u}
            onDeactivate={() => handleDeactivateUser(u.id, `${u.firstName} ${u.lastName}`)}
            onReactivate={() => reactivateUser(u.id)}
            onViewActivity={() => {/* Navigate to activity screen */}}
          />
        ))}

        {users.length === 0 && (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyText}>
              {filterStatus === 'active' ? 'No active users' : 'No deactivated users'}
            </Text>
          </View>
        )}
      </ScrollView>

      {/* Add User Modal */}
      <AddUserModal
        visible={showAddUserModal}
        onClose={() => setShowAddUserModal(false)}
        onUserAdded={() => {
          setShowAddUserModal(false);
          loadUsers();
        }}
        lawFirmToken={user.token}
      />
    </View>
  );
};

const UserCard = ({ user, onDeactivate, onReactivate, onViewActivity }) => {
  const roleColors = {
    admin: lawFirmTheme.colors.gold,
    attorney: lawFirmTheme.colors.accentBlue,
    paralegal: lawFirmTheme.colors.lightBlue,
    staff: lawFirmTheme.colors.mediumGray,
  };

  return (
    <View style={styles.userCard}>
      <View style={styles.userCardContent}>
        <View style={styles.userAvatar}>
          <Text style={styles.userInitials}>
            {user.firstName[0]}{user.lastName[0]}
          </Text>
        </View>

        <View style={styles.userInfo}>
          <Text style={styles.userName}>
            {user.firstName} {user.lastName}
          </Text>
          <Text style={styles.userEmail}>{user.email}</Text>
          <View style={styles.userMeta}>
            <View style={[styles.roleBadge, { backgroundColor: roleColors[user.role] + '30' }]}>
              <Text style={[styles.roleText, { color: roleColors[user.role] }]}>
                {user.role.toUpperCase()}
              </Text>
            </View>
            <Text style={styles.userCode}>{user.userCode}</Text>
          </View>
        </View>

        <View style={styles.userActions}>
          {user.status === 'active' ? (
            <>
              <TouchableOpacity style={styles.actionButton} onPress={onViewActivity}>
                <Text style={styles.actionButtonText}>📊</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.actionButton, styles.dangerButton]}
                onPress={onDeactivate}
              >
                <Text style={styles.actionButtonText}>🚫</Text>
              </TouchableOpacity>
            </>
          ) : (
            <TouchableOpacity
              style={[styles.actionButton, styles.successButton]}
              onPress={onReactivate}
            >
              <Text style={styles.actionButtonText}>✅</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {user.lastLogin && (
        <Text style={styles.lastLogin}>
          Last login: {new Date(user.lastLogin).toLocaleString()}
        </Text>
      )}
    </View>
  );
};

const AddUserModal = ({ visible, onClose, onUserAdded, lawFirmToken }) => {
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    role: 'attorney',
    title: '',
    barNumber: '',
    phoneNumber: '',
    notificationMethod: 'email',
    sendCredentials: true,
  });
  const [loading, setLoading] = useState(false);

  const resetForm = () => {
    setFormData({
      firstName: '',
      lastName: '',
      email: '',
      password: '',
      role: 'attorney',
      title: '',
      barNumber: '',
      phoneNumber: '',
      notificationMethod: 'email',
      sendCredentials: true,
    });
  };

  const handleSubmit = async () => {
    if (!formData.firstName || !formData.lastName || !formData.email) {
      showAlert('Error', 'Please fill in First Name, Last Name, and Email');
      return;
    }

    if (!formData.sendCredentials && !formData.password) {
      showAlert('Error', 'Please provide a password or enable "Send Credentials"');
      return;
    }

    if ((formData.notificationMethod === 'sms' || formData.notificationMethod === 'both') && !formData.phoneNumber) {
      showAlert('Error', 'Phone number is required for SMS notifications');
      return;
    }

    try {
      setLoading(true);
      const response = await apiRequest(API_ENDPOINTS.LAWFIRM_USERS.CREATE, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${lawFirmToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      if (response.success) {
        let message = `User created!\nUser code: ${response.user.userCode}`;
        
        if (response.credentialsSent && response.notificationResults) {
          const { email, sms } = response.notificationResults;
          const notifications = [];
          
          if (formData.notificationMethod === 'email' || formData.notificationMethod === 'both') {
            if (email?.success) {
              notifications.push('Email sent successfully');
            } else {
              notifications.push(`Email: ${email?.error || 'Not configured'}`);
            }
          }
          
          if (formData.notificationMethod === 'sms' || formData.notificationMethod === 'both') {
            if (sms?.success) {
              notifications.push('SMS sent successfully');
            } else {
              notifications.push(`SMS: ${sms?.error || 'Not configured'}`);
            }
          }
          
          if (notifications.length > 0) {
            message += '\n\nCredential Notifications:\n' + notifications.join('\n');
          }
        }
        
        showAlert('Success', message);
        resetForm();
        onUserAdded();
      }
    } catch (error) {
      console.error('[AddUser] Error:', error);
      showAlert('Error', error.message || 'Failed to create user');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent={true}>
      <View style={styles.modalContainer}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Add New User</Text>

          <ScrollView>
            <TextInput
              style={styles.input}
              placeholder="First Name *"
              placeholderTextColor="#999"
              value={formData.firstName}
              onChangeText={(text) => setFormData({ ...formData, firstName: text })}
            />
            <TextInput
              style={styles.input}
              placeholder="Last Name *"
              placeholderTextColor="#999"
              value={formData.lastName}
              onChangeText={(text) => setFormData({ ...formData, lastName: text })}
            />
            <TextInput
              style={styles.input}
              placeholder="Email *"
              placeholderTextColor="#999"
              keyboardType="email-address"
              autoCapitalize="none"
              value={formData.email}
              onChangeText={(text) => setFormData({ ...formData, email: text })}
            />
            <TextInput
              style={styles.input}
              placeholder="Title (e.g., Senior Partner)"
              placeholderTextColor="#999"
              value={formData.title}
              onChangeText={(text) => setFormData({ ...formData, title: text })}
            />
            <TextInput
              style={styles.input}
              placeholder="Bar Number"
              placeholderTextColor="#999"
              value={formData.barNumber}
              onChangeText={(text) => setFormData({ ...formData, barNumber: text })}
            />
            <TextInput
              style={styles.input}
              placeholder="Phone Number (required for SMS)"
              placeholderTextColor="#999"
              keyboardType="phone-pad"
              value={formData.phoneNumber}
              onChangeText={(text) => setFormData({ ...formData, phoneNumber: text })}
            />

            {/* Send Credentials Toggle */}
            <View style={styles.toggleContainer}>
              <View style={styles.toggleTextContainer}>
                <Text style={styles.toggleLabel}>Send Credentials Automatically</Text>
                <Text style={styles.toggleDesc}>
                  Generate a temporary password and send via email/SMS
                </Text>
              </View>
              <Switch
                value={formData.sendCredentials}
                onValueChange={(value) => setFormData({ ...formData, sendCredentials: value })}
                trackColor={{ false: 'rgba(255,255,255,0.3)', true: 'rgba(212, 175, 55, 0.6)' }}
                thumbColor={formData.sendCredentials ? '#d4af37' : '#f4f3f4'}
              />
            </View>

            {/* Password field - only shown if NOT sending credentials */}
            {!formData.sendCredentials && (
              <TextInput
                style={styles.input}
                placeholder="Password *"
                placeholderTextColor="#999"
                secureTextEntry
                value={formData.password}
                onChangeText={(text) => setFormData({ ...formData, password: text })}
              />
            )}

            {/* Notification Method Selector - only shown if sending credentials */}
            {formData.sendCredentials && (
              <>
                <Text style={styles.label}>Send credentials via:</Text>
            <View style={styles.notificationSelector}>
              {[
                { value: 'email', label: '📧 Email', desc: 'Email only' },
                { value: 'sms', label: '📱 SMS', desc: 'Text message only' },
                { value: 'both', label: '📧📱 Both', desc: 'Email & SMS' }
              ].map((method) => (
                <TouchableOpacity
                  key={method.value}
                  style={[
                    styles.notificationOption,
                    formData.notificationMethod === method.value && styles.notificationOptionActive,
                  ]}
                  onPress={() => setFormData({ ...formData, notificationMethod: method.value })}
                >
                  <Text
                    style={[
                      styles.notificationOptionLabel,
                      formData.notificationMethod === method.value && styles.notificationOptionLabelActive,
                    ]}
                  >
                    {method.label}
                  </Text>
                  <Text
                    style={[
                      styles.notificationOptionDesc,
                      formData.notificationMethod === method.value && styles.notificationOptionDescActive,
                    ]}
                  >
                    {method.desc}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
              </>
            )}

            {/* Role Selector */}
            <Text style={styles.label}>Role:</Text>
            <View style={styles.roleSelector}>
              {['admin', 'attorney', 'paralegal', 'staff'].map((role) => (
                <TouchableOpacity
                  key={role}
                  style={[
                    styles.roleOption,
                    formData.role === role && styles.roleOptionActive,
                  ]}
                  onPress={() => setFormData({ ...formData, role })}
                >
                  <Text
                    style={[
                      styles.roleOptionText,
                      formData.role === role && styles.roleOptionTextActive,
                    ]}
                  >
                    {role.charAt(0).toUpperCase() + role.slice(1)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </ScrollView>

          <View style={styles.modalActions}>
            <TouchableOpacity style={styles.cancelButton} onPress={onClose}>
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.submitButton}
              onPress={handleSubmit}
              disabled={loading}
            >
              <Text style={styles.submitButtonText}>
                {loading ? 'Creating...' : 'Create User'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.lawFirm.background,
    paddingBottom: 100,
  },
  header: {
    paddingTop: 60,
    paddingHorizontal: 20,
    paddingBottom: 20,
    backgroundColor: theme.lawFirm.surface,
    borderBottomWidth: 1,
    borderBottomColor: theme.lawFirm.border,
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  backText: {
    color: theme.lawFirm.primary,
    fontSize: 16,
    fontWeight: '600',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: theme.lawFirm.text,
  },
  addButton: {
    color: theme.lawFirm.primary,
    fontSize: 16,
    fontWeight: '700',
  },
  filterContainer: {
    flexDirection: 'row',
    padding: 20,
    paddingTop: 10,
    backgroundColor: theme.lawFirm.background,
  },
  filterTab: {
    flex: 1,
    padding: 12,
    alignItems: 'center',
    borderRadius: 12,
    marginHorizontal: 5,
    backgroundColor: theme.lawFirm.surface,
    borderWidth: 1,
    borderColor: theme.lawFirm.border,
  },
  filterTabActive: {
    backgroundColor: theme.lawFirm.primary,
    borderColor: theme.lawFirm.primary,
  },
  filterText: {
    color: theme.lawFirm.text,
    fontSize: 14,
    fontWeight: '600',
  },
  filterTextActive: {
    color: '#FFFFFF',
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: 20,
    paddingTop: 0,
  },
  userCard: {
    padding: 16,
    marginBottom: 12,
    backgroundColor: theme.lawFirm.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: theme.lawFirm.border,
  },
  userCardContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  userAvatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: lawFirmTheme.colors.accentBlue,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
  },
  userInitials: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '700',
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    color: theme.lawFirm.text,
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 4,
  },
  userEmail: {
    color: theme.lawFirm.primary,
    fontSize: 14,
    marginBottom: 6,
  },
  userMeta: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  roleBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    marginRight: 10,
  },
  roleText: {
    fontSize: 11,
    fontWeight: '700',
  },
  userCode: {
    color: lawFirmTheme.colors.mediumGray,
    fontSize: 12,
    fontFamily: 'monospace',
  },
  userActions: {
    flexDirection: 'row',
  },
  actionButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: theme.lawFirm.background,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
    borderWidth: 1,
    borderColor: theme.lawFirm.border,
  },
  dangerButton: {
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    borderColor: 'rgba(239, 68, 68, 0.5)',
  },
  successButton: {
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    borderColor: 'rgba(16, 185, 129, 0.5)',
  },
  actionButtonText: {
    fontSize: 20,
  },
  lastLogin: {
    color: theme.colors.warmGray,
    fontSize: 12,
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: theme.lawFirm.border,
  },
  emptyCard: {
    padding: 40,
    alignItems: 'center',
    backgroundColor: theme.lawFirm.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: theme.lawFirm.border,
  },
  emptyText: {
    color: theme.lawFirm.primary,
    fontSize: 16,
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    width: '100%',
  },
  modalContent: {
    width: '100%',
    maxHeight: '90%',
    backgroundColor: theme.lawFirm.surface,
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: theme.lawFirm.border,
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: theme.lawFirm.primary,
    marginBottom: 20,
    textAlign: 'center',
  },
  input: {
    backgroundColor: theme.lawFirm.background,
    borderRadius: 12,
    padding: 15,
    borderWidth: 1,
    borderColor: theme.lawFirm.border,
    color: theme.lawFirm.text,
    fontSize: 16,
    marginBottom: 15,
  },
  label: {
    color: theme.lawFirm.primary,
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 10,
    marginTop: 5,
  },
  toggleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: theme.lawFirm.background,
    borderRadius: 12,
    padding: 15,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: theme.lawFirm.border,
  },
  toggleTextContainer: {
    flex: 1,
    marginRight: 15,
  },
  toggleLabel: {
    color: theme.lawFirm.text,
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  toggleDesc: {
    color: theme.colors.warmGray,
    fontSize: 12,
  },
  notificationSelector: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
    gap: 10,
  },
  notificationOption: {
    flex: 1,
    padding: 12,
    borderRadius: 10,
    backgroundColor: theme.lawFirm.background,
    borderWidth: 1,
    borderColor: theme.lawFirm.border,
    alignItems: 'center',
  },
  notificationOptionActive: {
    backgroundColor: theme.lawFirm.primary,
    borderColor: theme.lawFirm.primary,
  },
  notificationOptionLabel: {
    fontSize: 16,
    fontWeight: 'bold',
    color: theme.lawFirm.text,
    marginBottom: 4,
  },
  notificationOptionLabelActive: {
    color: '#FFFFFF',
  },
  notificationOptionDesc: {
    fontSize: 11,
    color: theme.colors.warmGray,
  },
  notificationOptionDescActive: {
    color: 'rgba(255, 255, 255, 0.9)',
  },
  roleSelector: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 20,
  },
  roleOption: {
    paddingHorizontal: 15,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: theme.lawFirm.background,
    marginRight: 10,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: theme.lawFirm.border,
  },
  roleOptionActive: {
    backgroundColor: theme.lawFirm.primary,
    borderColor: theme.lawFirm.primary,
  },
  roleOptionText: {
    color: theme.lawFirm.text,
    fontSize: 14,
    fontWeight: '600',
  },
  roleOptionTextActive: {
    color: '#FFFFFF',
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 20,
  },
  cancelButton: {
    flex: 1,
    padding: 15,
    borderRadius: 12,
    backgroundColor: theme.lawFirm.background,
    marginRight: 10,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: theme.lawFirm.border,
  },
  cancelButtonText: {
    color: theme.lawFirm.text,
    fontSize: 16,
    fontWeight: '600',
  },
  submitButton: {
    flex: 1,
    padding: 15,
    borderRadius: 12,
    backgroundColor: theme.lawFirm.primary,
    alignItems: 'center',
  },
  submitButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
});

export default LawFirmUserManagementScreen;
// src/screens/MedicalProviderUserManagementScreen.js

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
  ImageBackground,
  Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import MedicalGlassCard from '../components/MedicalGlassCard';
import { medicalProviderTheme } from '../styles/medicalProviderTheme';
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

const MedicalProviderUserManagementScreen = ({ user, onBack }) => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddUserModal, setShowAddUserModal] = useState(false);
  const [filterStatus, setFilterStatus] = useState('active');
  const [permissionError, setPermissionError] = useState(null);

  useEffect(() => {
    loadUsers();
  }, [filterStatus]);

  const loadUsers = async () => {
    try {
      setLoading(true);
      setPermissionError(null);
      const response = await apiRequest(`${API_ENDPOINTS.MEDICAL_PROVIDER_USERS.GET_ALL}?status=${filterStatus}`, {
        method: 'GET',
        headers: { 'Authorization': `Bearer ${user.token}` },
      });

      setUsers(response.users || []);
    } catch (error) {
      console.error('[UserManagement] Load error:', error);
      if (error.status === 403) {
        setPermissionError('You do not have permission to manage users. Only administrators can access this feature.');
      } else {
        showAlert('Error', 'Failed to load users');
      }
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
      console.log('[MedProvider UserManagement] Deactivating user:', userId);
      const url = API_ENDPOINTS.MEDICAL_PROVIDER_USERS.DEACTIVATE(userId);
      console.log('[MedProvider UserManagement] Deactivate URL:', url);
      
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

      console.log('[MedProvider UserManagement] Deactivate response:', response);

      if (response.success) {
        showAlert('Success', 'User deactivated successfully');
        loadUsers();
      } else {
        showAlert('Error', response.message || 'Failed to deactivate user');
      }
    } catch (error) {
      console.error('[MedProvider UserManagement] Deactivate error:', error);
      showAlert('Error', error.message || 'Failed to deactivate user');
    }
  };

  const reactivateUser = async (userId) => {
    try {
      console.log('[MedProvider UserManagement] Reactivating user:', userId);
      const response = await apiRequest(API_ENDPOINTS.MEDICAL_PROVIDER_USERS.REACTIVATE(userId), {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${user.token}` },
      });

      console.log('[MedProvider UserManagement] Reactivate response:', response);

      if (response.success) {
        showAlert('Success', 'User reactivated successfully');
        loadUsers();
      } else {
        showAlert('Error', response.message || 'Failed to reactivate user');
      }
    } catch (error) {
      console.error('[MedProvider UserManagement] Reactivate error:', error);
      showAlert('Error', error.message || 'Failed to reactivate user');
    }
  };

  return (
    <View style={styles.container}>
      <ImageBackground
        source={require('../../attached_assets/Ship_1763681596533.png')}
        style={styles.background}
        resizeMode="cover"
      />

      <BlurView intensity={30} style={styles.header}>
        <View style={styles.headerContent}>
          <TouchableOpacity onPress={onBack}>
            <Text style={styles.backText}>← Back</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>User Management</Text>
          <TouchableOpacity onPress={() => setShowAddUserModal(true)}>
            <Text style={styles.addButton}>+ Add</Text>
          </TouchableOpacity>
        </View>
      </BlurView>

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

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.content}>
        {permissionError ? (
          <View style={styles.permissionErrorCard}>
            <Text style={styles.permissionErrorIcon}>🔒</Text>
            <Text style={styles.permissionErrorTitle}>Access Restricted</Text>
            <Text style={styles.permissionErrorText}>{permissionError}</Text>
            <Text style={styles.permissionErrorHint}>Contact your administrator to request access.</Text>
          </View>
        ) : (
          <>
            {users.map((u) => (
              <UserCard
                key={u.id}
                user={u}
                onDeactivate={() => handleDeactivateUser(u.id, `${u.firstName} ${u.lastName}`)}
                onReactivate={() => reactivateUser(u.id)}
                onViewActivity={() => {}}
              />
            ))}

            {users.length === 0 && (
              <View style={styles.emptyCard}>
                <Text style={styles.emptyText}>
                  {filterStatus === 'active' ? 'No active users' : 'No deactivated users'}
                </Text>
              </View>
            )}
          </>
        )}
      </ScrollView>

      <AddUserModal
        visible={showAddUserModal}
        onClose={() => setShowAddUserModal(false)}
        onUserAdded={() => {
          setShowAddUserModal(false);
          loadUsers();
        }}
        providerToken={user.token}
      />
    </View>
  );
};

const UserCard = ({ user, onDeactivate, onReactivate, onViewActivity }) => {
  const roleColors = {
    admin: medicalProviderTheme.colors.prescriptionGreen,
    physician: medicalProviderTheme.colors.medicalBlue,
    nurse: medicalProviderTheme.colors.mintGreen,
    staff: medicalProviderTheme.colors.mediumGray,
    billing: medicalProviderTheme.colors.warning,
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

const AddUserModal = ({ visible, onClose, onUserAdded, providerToken }) => {
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    role: 'physician',
    title: '',
    licenseNumber: '',
    phoneNumber: '',
    notificationMethod: 'email',
  });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!formData.firstName || !formData.lastName || !formData.email || !formData.password) {
      showAlert('Error', 'Please fill in all required fields');
      return;
    }

    try {
      setLoading(true);
      const response = await apiRequest(API_ENDPOINTS.MEDICAL_PROVIDER_USERS.CREATE, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${providerToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      if (response.success) {
        showAlert('Success', `User created! User code: ${response.user.userCode}`);
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
      <ImageBackground
        source={require('../../attached_assets/Ship_1763681250752.png')}
        style={styles.modalContainer}
        resizeMode="cover"
      >
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
              placeholder="Password *"
              placeholderTextColor="#999"
              secureTextEntry
              value={formData.password}
              onChangeText={(text) => setFormData({ ...formData, password: text })}
            />
            <TextInput
              style={styles.input}
              placeholder="Title (e.g., Chief Medical Officer)"
              placeholderTextColor="#999"
              value={formData.title}
              onChangeText={(text) => setFormData({ ...formData, title: text })}
            />
            <TextInput
              style={styles.input}
              placeholder="License Number"
              placeholderTextColor="#999"
              value={formData.licenseNumber}
              onChangeText={(text) => setFormData({ ...formData, licenseNumber: text })}
            />
            <TextInput
              style={styles.input}
              placeholder="Phone Number (required for SMS notifications)"
              placeholderTextColor="#999"
              keyboardType="phone-pad"
              value={formData.phoneNumber}
              onChangeText={(text) => setFormData({ ...formData, phoneNumber: text })}
            />

            {/* Notification Method Selector */}
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

            <Text style={styles.label}>Role:</Text>
            <View style={styles.roleSelector}>
              {['admin', 'physician', 'nurse', 'staff', 'billing'].map((role) => (
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
      </ImageBackground>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: medicalProviderTheme.colors.deepTeal,
    paddingBottom: 100,
  },
  background: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
  },
  header: {
    paddingTop: 60,
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  backText: {
    color: '#d4af37',
    fontSize: 16,
    fontWeight: '600',
    textShadowColor: 'rgba(0, 0, 0, 0.8)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FFFFFF',
    textShadowColor: 'rgba(0, 0, 0, 0.8)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  addButton: {
    color: '#d4af37',
    fontSize: 16,
    fontWeight: '700',
    textShadowColor: 'rgba(0, 0, 0, 0.8)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  filterContainer: {
    flexDirection: 'row',
    padding: 20,
    paddingTop: 10,
  },
  filterTab: {
    flex: 1,
    padding: 12,
    alignItems: 'center',
    borderRadius: 12,
    marginHorizontal: 5,
    backgroundColor: 'rgba(20, 30, 48, 0.5)',
    borderWidth: 2,
    borderColor: 'rgba(212, 175, 55, 0.4)',
  },
  filterTabActive: {
    backgroundColor: 'rgba(212, 175, 55, 0.8)',
    borderColor: '#d4af37',
  },
  filterText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
    textShadowColor: 'rgba(0, 0, 0, 0.8)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  filterTextActive: {
    color: '#1e3a5f',
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
    backgroundColor: 'rgba(20, 30, 48, 0.7)',
    borderRadius: 16,
    borderWidth: 2,
    borderColor: 'rgba(212, 175, 55, 0.4)',
  },
  userCardContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  userAvatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: medicalProviderTheme.colors.prescriptionGreen,
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
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 4,
    textShadowColor: 'rgba(0, 0, 0, 0.8)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  userEmail: {
    color: '#d4af37',
    fontSize: 14,
    marginBottom: 6,
    textShadowColor: 'rgba(0, 0, 0, 0.8)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
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
    color: medicalProviderTheme.colors.mediumGray,
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
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
  },
  dangerButton: {
    backgroundColor: 'rgba(239, 68, 68, 0.3)',
  },
  successButton: {
    backgroundColor: 'rgba(16, 185, 129, 0.3)',
  },
  actionButtonText: {
    fontSize: 20,
  },
  lastLogin: {
    color: medicalProviderTheme.colors.mediumGray,
    fontSize: 12,
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.1)',
  },
  emptyCard: {
    padding: 40,
    alignItems: 'center',
    backgroundColor: 'rgba(20, 30, 48, 0.7)',
    borderRadius: 16,
    borderWidth: 2,
    borderColor: 'rgba(212, 175, 55, 0.4)',
  },
  emptyText: {
    color: '#d4af37',
    fontSize: 16,
    textShadowColor: 'rgba(0, 0, 0, 0.8)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  permissionErrorCard: {
    padding: 40,
    alignItems: 'center',
    backgroundColor: 'rgba(20, 30, 48, 0.85)',
    borderRadius: 16,
    borderWidth: 2,
    borderColor: 'rgba(239, 68, 68, 0.5)',
    marginHorizontal: 10,
  },
  permissionErrorIcon: {
    fontSize: 48,
    marginBottom: 16,
  },
  permissionErrorTitle: {
    color: '#ef4444',
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 12,
    textShadowColor: 'rgba(0, 0, 0, 0.8)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  permissionErrorText: {
    color: '#fff',
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 12,
    paddingHorizontal: 10,
  },
  permissionErrorHint: {
    color: 'rgba(255, 255, 255, 0.6)',
    fontSize: 12,
    textAlign: 'center',
    fontStyle: 'italic',
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    padding: 20,
    width: '100%',
  },
  modalContent: {
    width: '100%',
    maxHeight: '90%',
    backgroundColor: 'rgba(20, 30, 48, 0.92)',
    borderRadius: 20,
    padding: 20,
    borderWidth: 2,
    borderColor: '#d4af37',
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#d4af37',
    marginBottom: 20,
    textAlign: 'center',
    textShadowColor: 'rgba(0, 0, 0, 0.9)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  input: {
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    borderRadius: 12,
    padding: 15,
    color: '#FFFFFF',
    fontSize: 16,
    marginBottom: 15,
    borderWidth: 2,
    borderColor: 'rgba(212, 175, 55, 0.5)',
  },
  label: {
    color: '#d4af37',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 10,
    marginTop: 5,
    textShadowColor: 'rgba(0, 0, 0, 0.8)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
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
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    borderWidth: 2,
    borderColor: 'rgba(212, 175, 55, 0.5)',
    alignItems: 'center',
  },
  notificationOptionActive: {
    backgroundColor: 'rgba(212, 175, 55, 0.25)',
    borderColor: '#d4af37',
  },
  notificationOptionLabel: {
    fontSize: 16,
    fontWeight: 'bold',
    color: 'rgba(255, 255, 255, 0.8)',
    marginBottom: 4,
  },
  notificationOptionLabelActive: {
    color: '#4a90e2',
  },
  notificationOptionDesc: {
    fontSize: 11,
    color: 'rgba(255, 255, 255, 0.6)',
  },
  notificationOptionDescActive: {
    color: 'rgba(74, 144, 226, 0.9)',
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
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    marginRight: 10,
    marginBottom: 10,
    borderWidth: 2,
    borderColor: 'rgba(212, 175, 55, 0.4)',
  },
  roleOptionActive: {
    backgroundColor: 'rgba(212, 175, 55, 0.95)',
    borderColor: '#d4af37',
  },
  roleOptionText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  roleOptionTextActive: {
    color: '#1e3a5f',
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
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    marginRight: 10,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'rgba(212, 175, 55, 0.5)',
  },
  cancelButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    textShadowColor: 'rgba(0, 0, 0, 0.8)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  submitButton: {
    flex: 1,
    padding: 15,
    borderRadius: 12,
    backgroundColor: 'rgba(212, 175, 55, 0.95)',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#d4af37',
  },
  submitButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
    textShadowColor: 'rgba(0, 0, 0, 0.8)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
});

export default MedicalProviderUserManagementScreen;

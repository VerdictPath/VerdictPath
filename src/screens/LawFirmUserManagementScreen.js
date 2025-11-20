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
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import GlassCard from '../components/GlassCard';
import { lawFirmTheme } from '../styles/lawFirmTheme';
import { apiRequest, API_ENDPOINTS } from '../config/api';

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
      Alert.alert('Error', 'Failed to load users');
    } finally {
      setLoading(false);
    }
  };

  const handleDeactivateUser = (userId, userName) => {
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
  };

  const deactivateUser = async (userId) => {
    try {
      const response = await apiRequest(API_ENDPOINTS.LAWFIRM_USERS.DEACTIVATE(userId), {
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
        Alert.alert('Success', 'User deactivated successfully');
        loadUsers();
      }
    } catch (error) {
      console.error('[UserManagement] Deactivate error:', error);
      Alert.alert('Error', error.message || 'Failed to deactivate user');
    }
  };

  const reactivateUser = async (userId) => {
    try {
      const response = await apiRequest(API_ENDPOINTS.LAWFIRM_USERS.REACTIVATE(userId), {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${user.token}` },
      });

      if (response.success) {
        Alert.alert('Success', 'User reactivated successfully');
        loadUsers();
      }
    } catch (error) {
      console.error('[UserManagement] Reactivate error:', error);
      Alert.alert('Error', 'Failed to reactivate user');
    }
  };

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={[
          lawFirmTheme.colors.deepNavy,
          lawFirmTheme.colors.midnightBlue,
        ]}
        style={styles.background}
      />

      {/* Header */}
      <BlurView intensity={20} style={styles.header}>
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
          <GlassCard variant="light" style={styles.emptyCard}>
            <Text style={styles.emptyText}>
              {filterStatus === 'active' ? 'No active users' : 'No deactivated users'}
            </Text>
          </GlassCard>
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
    <GlassCard variant="dark" style={styles.userCard}>
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
    </GlassCard>
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
  });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!formData.firstName || !formData.lastName || !formData.email || !formData.password) {
      Alert.alert('Error', 'Please fill in all required fields');
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
        Alert.alert('Success', `User created! User code: ${response.user.userCode}`);
        onUserAdded();
      }
    } catch (error) {
      console.error('[AddUser] Error:', error);
      Alert.alert('Error', error.message || 'Failed to create user');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent={true}>
      <BlurView intensity={90} style={styles.modalContainer}>
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
              placeholder="Phone Number"
              placeholderTextColor="#999"
              keyboardType="phone-pad"
              value={formData.phoneNumber}
              onChangeText={(text) => setFormData({ ...formData, phoneNumber: text })}
            />

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
      </BlurView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: lawFirmTheme.colors.deepNavy,
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
    color: lawFirmTheme.colors.accentBlue,
    fontSize: 16,
    fontWeight: '600',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  addButton: {
    color: lawFirmTheme.colors.gold,
    fontSize: 16,
    fontWeight: '700',
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
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  filterTabActive: {
    backgroundColor: lawFirmTheme.colors.accentBlue,
  },
  filterText: {
    color: '#FFFFFF',
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
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 4,
  },
  userEmail: {
    color: lawFirmTheme.colors.lightGray,
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
    color: lawFirmTheme.colors.mediumGray,
    fontSize: 12,
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.1)',
  },
  emptyCard: {
    padding: 40,
    alignItems: 'center',
  },
  emptyText: {
    color: lawFirmTheme.colors.lightGray,
    fontSize: 16,
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    width: '100%',
    maxHeight: '90%',
    backgroundColor: lawFirmTheme.colors.midnightBlue,
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: lawFirmTheme.colors.accentBlue,
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 20,
    textAlign: 'center',
  },
  input: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 12,
    padding: 15,
    color: '#FFFFFF',
    fontSize: 16,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  label: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 10,
    marginTop: 5,
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
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    marginRight: 10,
    marginBottom: 10,
  },
  roleOptionActive: {
    backgroundColor: lawFirmTheme.colors.accentBlue,
  },
  roleOptionText: {
    color: '#FFFFFF',
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
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    marginRight: 10,
    alignItems: 'center',
  },
  cancelButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  submitButton: {
    flex: 1,
    padding: 15,
    borderRadius: 12,
    backgroundColor: lawFirmTheme.colors.accentBlue,
    alignItems: 'center',
  },
  submitButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
});

export default LawFirmUserManagementScreen;
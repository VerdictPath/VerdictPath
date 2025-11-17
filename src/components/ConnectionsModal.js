import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, StyleSheet, Modal, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { theme } from '../styles/theme';
import { API_BASE_URL } from '../config/api';

const ConnectionsModal = ({ visible, onClose, user, onConnectionsUpdated, userType = 'individual' }) => {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [lawFirmCode, setLawFirmCode] = useState('');
  const [medicalProviderCode, setMedicalProviderCode] = useState('');
  const [currentConnections, setCurrentConnections] = useState(null);
  
  const isLawFirm = userType === 'lawfirm';

  useEffect(() => {
    if (visible && user?.token) {
      fetchCurrentConnections();
    }
  }, [visible, user]);

  const fetchCurrentConnections = async () => {
    try {
      setLoading(true);
      
      if (isLawFirm) {
        // Law firm fetches medical provider connections
        const response = await fetch(`${API_BASE_URL}/api/connections/medical-providers`, {
          headers: {
            'Authorization': `Bearer ${user.token}`
          }
        });

        if (response.ok) {
          const data = await response.json();
          setCurrentConnections({
            medicalProviders: data.medicalProviders || []
          });
        }
      } else {
        // Individual user fetches both law firm and medical provider connections
        const response = await fetch(`${API_BASE_URL}/api/connections/my-connections`, {
          headers: {
            'Authorization': `Bearer ${user.token}`
          }
        });

        if (response.ok) {
          const data = await response.json();
          setCurrentConnections(data);
          setLawFirmCode(data.lawFirmCode || '');
        }
      }
    } catch (error) {
      console.error('Error fetching connections:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateLawFirm = async () => {
    if (!lawFirmCode.trim()) {
      Alert.alert('Error', 'Please enter a law firm code');
      return;
    }

    try {
      setSaving(true);
      const response = await fetch(`${API_BASE_URL}/api/connections/update-lawfirm`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${user.token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ lawFirmCode: lawFirmCode.trim() })
      });

      const data = await response.json();

      if (response.ok) {
        Alert.alert('Success', data.message || 'Law firm connection updated successfully');
        fetchCurrentConnections();
        if (onConnectionsUpdated) onConnectionsUpdated();
      } else {
        Alert.alert('Error', data.error || 'Failed to update law firm connection');
      }
    } catch (error) {
      console.error('Error updating law firm:', error);
      Alert.alert('Error', 'Failed to update law firm connection');
    } finally {
      setSaving(false);
    }
  };

  const handleAddMedicalProvider = async () => {
    if (!medicalProviderCode.trim()) {
      Alert.alert('Error', 'Please enter a medical provider code');
      return;
    }

    try {
      setSaving(true);
      
      // Use different endpoint based on user type
      const endpoint = isLawFirm 
        ? `${API_BASE_URL}/api/connections/add-medical-provider-lawfirm`
        : `${API_BASE_URL}/api/connections/add-medical-provider`;
      
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${user.token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ medicalProviderCode: medicalProviderCode.trim() })
      });

      const data = await response.json();

      if (response.ok) {
        Alert.alert('Success', data.message || 'Medical provider added successfully');
        setMedicalProviderCode('');
        fetchCurrentConnections();
        if (onConnectionsUpdated) onConnectionsUpdated();
      } else {
        Alert.alert('Error', data.error || 'Failed to add medical provider');
      }
    } catch (error) {
      console.error('Error adding medical provider:', error);
      Alert.alert('Error', 'Failed to add medical provider');
    } finally {
      setSaving(false);
    }
  };

  const handleRemoveMedicalProvider = async (providerId) => {
    try {
      setSaving(true);
      
      // Use different endpoint based on user type
      const endpoint = isLawFirm
        ? `${API_BASE_URL}/api/connections/remove-medical-provider-lawfirm`
        : `${API_BASE_URL}/api/connections/remove-medical-provider`;
      
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${user.token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ providerId })
      });

      const data = await response.json();

      if (response.ok) {
        Alert.alert('Success', data.message || 'Medical provider removed successfully');
        fetchCurrentConnections();
        if (onConnectionsUpdated) onConnectionsUpdated();
      } else {
        Alert.alert('Error', data.error || 'Failed to remove medical provider');
      }
    } catch (error) {
      console.error('Error removing medical provider:', error);
      Alert.alert('Error', 'Failed to remove medical provider');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <TouchableOpacity 
        style={styles.overlay} 
        activeOpacity={1} 
        onPress={onClose}
      >
        <TouchableOpacity 
          style={styles.modalContainer} 
          activeOpacity={1}
          onPress={(e) => e.stopPropagation()}
        >
          <View style={styles.header}>
            <Text style={styles.title}>My Connections</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Text style={styles.closeButtonText}>✕</Text>
            </TouchableOpacity>
          </View>

          {loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={theme.colors.mahogany} />
              <Text style={styles.loadingText}>Loading your connections...</Text>
            </View>
          ) : (
            <View style={styles.content}>
              <Text style={styles.description}>
                {isLawFirm 
                  ? 'Manage your medical provider connections to access client medical records and billing information.'
                  : 'Connect with your law firm and medical provider to share your case information securely.'
                }
              </Text>

              {!isLawFirm && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>⚖️ Law Firm Connection</Text>
                {currentConnections?.lawFirm ? (
                  <View style={styles.currentConnection}>
                    <Text style={styles.connectedLabel}>Currently Connected:</Text>
                    <Text style={styles.connectedName}>{currentConnections.lawFirm.firm_name || currentConnections.lawFirm.email}</Text>
                    <Text style={styles.connectedEmail}>{currentConnections.lawFirm.email}</Text>
                  </View>
                ) : (
                  <Text style={styles.notConnected}>Not connected to a law firm</Text>
                )}
                
                <TextInput
                  style={styles.input}
                  placeholder="Enter law firm code"
                  value={lawFirmCode}
                  onChangeText={(text) => setLawFirmCode(text.toUpperCase())}
                  autoCapitalize="characters"
                  maxLength={8}
                />
                
                <TouchableOpacity 
                  style={[styles.updateButton, saving && styles.updateButtonDisabled]}
                  onPress={handleUpdateLawFirm}
                  disabled={saving}
                >
                  {saving ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <Text style={styles.updateButtonText}>
                      {currentConnections?.lawFirm ? 'Change Law Firm' : 'Connect Law Firm'}
                    </Text>
                  )}
                </TouchableOpacity>
              </View>
              )}

              <View style={styles.section}>
                <Text style={styles.sectionTitle}>🏥 Medical Provider Connections</Text>
                {currentConnections?.medicalProviders?.length > 0 ? (
                  <View style={styles.providersList}>
                    <Text style={styles.connectedLabel}>Connected Providers:</Text>
                    {currentConnections.medicalProviders.map((provider) => (
                      <View key={provider.id} style={styles.providerItem}>
                        <View style={styles.providerInfo}>
                          <Text style={styles.providerName}>{provider.provider_name || provider.email}</Text>
                          <Text style={styles.providerEmail}>{provider.email}</Text>
                        </View>
                        <TouchableOpacity 
                          style={styles.removeButton}
                          onPress={() => handleRemoveMedicalProvider(provider.id)}
                          disabled={saving}
                        >
                          <Text style={styles.removeButtonText}>Remove</Text>
                        </TouchableOpacity>
                      </View>
                    ))}
                  </View>
                ) : (
                  <Text style={styles.notConnected}>No medical providers connected</Text>
                )}
                
                <Text style={styles.addLabel}>Add Medical Provider:</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Enter medical provider code"
                  value={medicalProviderCode}
                  onChangeText={(text) => setMedicalProviderCode(text.toUpperCase())}
                  autoCapitalize="characters"
                  maxLength={8}
                />
                
                <TouchableOpacity 
                  style={[styles.addButton, saving && styles.addButtonDisabled]}
                  onPress={handleAddMedicalProvider}
                  disabled={saving}
                >
                  {saving ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <Text style={styles.addButtonText}>Add Medical Provider</Text>
                  )}
                </TouchableOpacity>
              </View>

              <View style={styles.infoBox}>
                <Text style={styles.infoIcon}>ℹ️</Text>
                <Text style={styles.infoText}>
                  {isLawFirm
                    ? 'Connect with medical providers using their connection codes. This allows you to access client medical records and negotiate bills directly.'
                    : 'You can connect with ONE law firm and MULTIPLE medical providers. Ask them for their connection codes to share medical records and case information securely.'
                  }
                </Text>
              </View>
            </View>
          )}
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContainer: {
    backgroundColor: theme.colors.cream,
    borderRadius: 15,
    padding: 0,
    width: '90%',
    maxWidth: 500,
    maxHeight: '85%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 10,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 2,
    borderBottomColor: theme.colors.secondary,
    backgroundColor: theme.colors.mahogany,
    borderTopLeftRadius: 15,
    borderTopRightRadius: 15,
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#fff',
  },
  closeButton: {
    padding: 5,
  },
  closeButtonText: {
    fontSize: 24,
    color: '#fff',
    fontWeight: 'bold',
  },
  loadingContainer: {
    padding: 40,
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 15,
    fontSize: 14,
    color: theme.colors.textSecondary,
  },
  content: {
    padding: 20,
  },
  description: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    marginBottom: 20,
    lineHeight: 20,
    textAlign: 'center',
  },
  section: {
    marginBottom: 25,
    backgroundColor: theme.colors.lightCream,
    padding: 15,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: theme.colors.secondary,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: theme.colors.mahogany,
    marginBottom: 12,
  },
  currentConnection: {
    backgroundColor: theme.colors.cream,
    padding: 12,
    borderRadius: 8,
    marginBottom: 12,
    borderLeftWidth: 4,
    borderLeftColor: theme.colors.warmGold,
  },
  connectedLabel: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    marginBottom: 4,
  },
  connectedName: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.navy,
    marginBottom: 2,
  },
  connectedEmail: {
    fontSize: 13,
    color: theme.colors.textSecondary,
  },
  notConnected: {
    fontSize: 14,
    color: theme.colors.warmGray,
    fontStyle: 'italic',
    marginBottom: 12,
  },
  input: {
    backgroundColor: '#fff',
    borderWidth: 2,
    borderColor: theme.colors.secondary,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    marginBottom: 12,
    fontFamily: 'monospace',
    textAlign: 'center',
  },
  updateButton: {
    backgroundColor: theme.colors.mahogany,
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  updateButtonDisabled: {
    opacity: 0.6,
  },
  updateButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  providersList: {
    marginBottom: 15,
  },
  providerItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: theme.colors.cream,
    padding: 12,
    borderRadius: 8,
    marginTop: 8,
    borderLeftWidth: 4,
    borderLeftColor: theme.colors.warmGold,
  },
  providerInfo: {
    flex: 1,
  },
  providerName: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.navy,
    marginBottom: 2,
  },
  providerEmail: {
    fontSize: 13,
    color: theme.colors.textSecondary,
  },
  removeButton: {
    backgroundColor: '#e74c3c',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    marginLeft: 10,
  },
  removeButtonText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '600',
  },
  addLabel: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    marginTop: 15,
    marginBottom: 8,
    fontWeight: '600',
  },
  addButton: {
    backgroundColor: '#27ae60',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  addButtonDisabled: {
    opacity: 0.6,
  },
  addButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  infoBox: {
    flexDirection: 'row',
    backgroundColor: theme.colors.lightCream,
    padding: 15,
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: theme.colors.warmGold,
    marginTop: 10,
  },
  infoIcon: {
    fontSize: 20,
    marginRight: 10,
  },
  infoText: {
    flex: 1,
    fontSize: 13,
    color: theme.colors.textSecondary,
    lineHeight: 18,
  },
});

export default ConnectionsModal;

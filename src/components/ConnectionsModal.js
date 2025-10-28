import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, StyleSheet, Modal, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { theme } from '../styles/theme';
import { API_BASE_URL } from '../config/api';

const ConnectionsModal = ({ visible, onClose, user, onConnectionsUpdated }) => {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [lawFirmCode, setLawFirmCode] = useState('');
  const [medicalProviderCode, setMedicalProviderCode] = useState('');
  const [currentConnections, setCurrentConnections] = useState(null);

  useEffect(() => {
    if (visible && user?.token) {
      fetchCurrentConnections();
    }
  }, [visible, user]);

  const fetchCurrentConnections = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${API_BASE_URL}/api/connections/my-connections`, {
        headers: {
          'Authorization': `Bearer ${user.token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setCurrentConnections(data);
        setLawFirmCode(data.lawFirmCode || '');
        setMedicalProviderCode(data.medicalProviderCode || '');
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

  const handleUpdateMedicalProvider = async () => {
    if (!medicalProviderCode.trim()) {
      Alert.alert('Error', 'Please enter a medical provider code');
      return;
    }

    try {
      setSaving(true);
      const response = await fetch(`${API_BASE_URL}/api/connections/update-medical-provider`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${user.token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ medicalProviderCode: medicalProviderCode.trim() })
      });

      const data = await response.json();

      if (response.ok) {
        Alert.alert('Success', data.message || 'Medical provider connection updated successfully');
        fetchCurrentConnections();
        if (onConnectionsUpdated) onConnectionsUpdated();
      } else {
        Alert.alert('Error', data.error || 'Failed to update medical provider connection');
      }
    } catch (error) {
      console.error('Error updating medical provider:', error);
      Alert.alert('Error', 'Failed to update medical provider connection');
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
                Connect with your law firm and medical provider to share your case information securely.
              </Text>

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

              <View style={styles.section}>
                <Text style={styles.sectionTitle}>🏥 Medical Provider Connection</Text>
                {currentConnections?.medicalProvider ? (
                  <View style={styles.currentConnection}>
                    <Text style={styles.connectedLabel}>Currently Connected:</Text>
                    <Text style={styles.connectedName}>{currentConnections.medicalProvider.facility_name || currentConnections.medicalProvider.email}</Text>
                    <Text style={styles.connectedEmail}>{currentConnections.medicalProvider.email}</Text>
                  </View>
                ) : (
                  <Text style={styles.notConnected}>Not connected to a medical provider</Text>
                )}
                
                <TextInput
                  style={styles.input}
                  placeholder="Enter medical provider code"
                  value={medicalProviderCode}
                  onChangeText={(text) => setMedicalProviderCode(text.toUpperCase())}
                  autoCapitalize="characters"
                  maxLength={8}
                />
                
                <TouchableOpacity 
                  style={[styles.updateButton, saving && styles.updateButtonDisabled]}
                  onPress={handleUpdateMedicalProvider}
                  disabled={saving}
                >
                  {saving ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <Text style={styles.updateButtonText}>
                      {currentConnections?.medicalProvider ? 'Change Medical Provider' : 'Connect Medical Provider'}
                    </Text>
                  )}
                </TouchableOpacity>
              </View>

              <View style={styles.infoBox}>
                <Text style={styles.infoIcon}>ℹ️</Text>
                <Text style={styles.infoText}>
                  Ask your law firm or medical provider for their connection code. This allows you to share medical records and case information securely with them.
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

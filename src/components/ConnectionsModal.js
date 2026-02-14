import React, { useState, useEffect, useRef, useCallback } from 'react';
import { View, Text, TextInput, StyleSheet, Modal, TouchableOpacity, Pressable, ActivityIndicator, ScrollView, Platform } from 'react-native';
import { theme } from '../styles/theme';
import { API_BASE_URL } from '../config/api';
import alert from '../utils/alert';

const ConnectionsModal = ({ visible, onClose, user, onConnectionsUpdated, userType = 'individual' }) => {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [lawFirmCode, setLawFirmCode] = useState('');
  const [medicalProviderCode, setMedicalProviderCode] = useState('');
  const [currentConnections, setCurrentConnections] = useState(null);
  const [showAddForm, setShowAddForm] = useState(false);
  
  const isLawFirm = userType === 'lawfirm';

  const hasNoConnections = currentConnections && 
    !currentConnections.lawFirm && 
    (!currentConnections.medicalProviders || currentConnections.medicalProviders.length === 0);

  useEffect(() => {
    if (visible && user?.token) {
      fetchCurrentConnections();
      setShowAddForm(false);
    }
  }, [visible, user]);

  const fetchCurrentConnections = async () => {
    try {
      setLoading(true);
      
      if (isLawFirm) {
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
      alert('Error', 'Please enter a law firm code');
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
        alert('Success', data.message || 'Law firm connection updated successfully');
        setShowAddForm(false);
        fetchCurrentConnections();
        if (onConnectionsUpdated) onConnectionsUpdated();
      } else {
        alert('Error', data.error || 'Failed to update law firm connection');
      }
    } catch (error) {
      console.error('Error updating law firm:', error);
      alert('Error', 'Failed to update law firm connection');
    } finally {
      setSaving(false);
    }
  };

  const handleAddMedicalProvider = async () => {
    if (!medicalProviderCode.trim()) {
      alert('Error', 'Please enter a medical provider code');
      return;
    }

    try {
      setSaving(true);
      
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
        alert('Success', data.message || 'Medical provider added successfully');
        setMedicalProviderCode('');
        setShowAddForm(false);
        fetchCurrentConnections();
        if (onConnectionsUpdated) onConnectionsUpdated();
      } else {
        alert('Error', data.error || 'Failed to add medical provider');
      }
    } catch (error) {
      console.error('Error adding medical provider:', error);
      alert('Error', 'Failed to add medical provider');
    } finally {
      setSaving(false);
    }
  };

  const handleRemoveMedicalProvider = async (providerId) => {
    try {
      setSaving(true);
      
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
        alert('Success', data.message || 'Medical provider removed successfully');
        fetchCurrentConnections();
        if (onConnectionsUpdated) onConnectionsUpdated();
      } else {
        alert('Error', data.error || 'Failed to remove medical provider');
      }
    } catch (error) {
      console.error('Error removing medical provider:', error);
      alert('Error', 'Failed to remove medical provider');
    } finally {
      setSaving(false);
    }
  };

  const renderEmptyState = () => (
    <View style={styles.emptyStateContainer}>
      <Text style={styles.emptyStateIcon}>🔗</Text>
      <Text style={styles.emptyStateTitle}>No Connections Yet</Text>
      <Text style={styles.emptyStateMessage}>
        {isLawFirm
          ? 'You haven\'t connected with any medical providers yet. Add a connection to start collaborating on client cases.'
          : 'You haven\'t connected with a law firm or medical provider yet. Adding connections lets you securely share case information and medical records.'}
      </Text>

      <View style={styles.emptyStateSteps}>
        <View style={styles.stepItem}>
          <View style={styles.stepNumber}><Text style={styles.stepNumberText}>1</Text></View>
          <Text style={styles.stepText}>
            {isLawFirm 
              ? 'Get a connection code from your medical provider' 
              : 'Ask your law firm or medical provider for their connection code'}
          </Text>
        </View>
        <View style={styles.stepItem}>
          <View style={styles.stepNumber}><Text style={styles.stepNumberText}>2</Text></View>
          <Text style={styles.stepText}>Enter the code below to create a secure connection</Text>
        </View>
        <View style={styles.stepItem}>
          <View style={styles.stepNumber}><Text style={styles.stepNumberText}>3</Text></View>
          <Text style={styles.stepText}>
            {isLawFirm
              ? 'Access shared medical records and billing information'
              : 'Start sharing documents and tracking your case together'}
          </Text>
        </View>
      </View>

      <TouchableOpacity 
        style={styles.getStartedButton}
        onPress={() => setShowAddForm(true)}
      >
        <Text style={styles.getStartedButtonText}>Add a Connection</Text>
      </TouchableOpacity>
    </View>
  );

  const renderAddForm = () => (
    <ScrollView 
      style={styles.scrollView}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={true}
      bounces={false}
    >
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
          <View style={styles.emptyConnectionCard}>
            <Text style={styles.emptyConnectionIcon}>⚖️</Text>
            <Text style={styles.emptyConnectionText}>No law firm connected</Text>
            <Text style={styles.emptyConnectionHint}>Enter your law firm's code below to connect</Text>
          </View>
        )}
        
        <TextInput
          style={styles.input}
          placeholder="Enter law firm code"
          value={lawFirmCode}
          onChangeText={(text) => setLawFirmCode(text.toUpperCase())}
          autoCapitalize="characters"
          maxLength={20}
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
          <View style={styles.emptyConnectionCard}>
            <Text style={styles.emptyConnectionIcon}>🏥</Text>
            <Text style={styles.emptyConnectionText}>No medical providers connected</Text>
            <Text style={styles.emptyConnectionHint}>Enter a provider's code below to connect</Text>
          </View>
        )}
        
        <Text style={styles.addLabel}>Add Medical Provider:</Text>
        <TextInput
          style={styles.input}
          placeholder="Enter medical provider code"
          value={medicalProviderCode}
          onChangeText={(text) => setMedicalProviderCode(text.toUpperCase())}
          autoCapitalize="characters"
          maxLength={20}
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
    </ScrollView>
  );

  const handleOverlayPress = useCallback((e) => {
    if (Platform.OS === 'web') {
      if (e.target === e.currentTarget) {
        onClose();
      }
    } else {
      onClose();
    }
  }, [onClose]);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <Pressable 
        style={styles.overlay} 
        onPress={handleOverlayPress}
      >
        <View 
          style={styles.modalContainer}
          onStartShouldSetResponder={() => true}
          onResponderRelease={(e) => e.stopPropagation()}
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
          ) : hasNoConnections && !showAddForm ? (
            renderEmptyState()
          ) : (
            renderAddForm()
          )}
        </View>
      </Pressable>
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
  emptyStateContainer: {
    padding: 30,
    alignItems: 'center',
  },
  emptyStateIcon: {
    fontSize: 48,
    marginBottom: 16,
  },
  emptyStateTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: theme.colors.navy,
    marginBottom: 12,
    textAlign: 'center',
  },
  emptyStateMessage: {
    fontSize: 15,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 24,
    paddingHorizontal: 10,
  },
  emptyStateSteps: {
    width: '100%',
    backgroundColor: theme.colors.lightCream,
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: theme.colors.secondary,
  },
  stepItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 14,
  },
  stepNumber: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: theme.colors.mahogany,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    marginTop: 1,
  },
  stepNumberText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  stepText: {
    flex: 1,
    fontSize: 14,
    color: theme.colors.navy,
    lineHeight: 20,
  },
  getStartedButton: {
    backgroundColor: theme.colors.mahogany,
    paddingVertical: 14,
    paddingHorizontal: 40,
    borderRadius: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
  },
  getStartedButtonText: {
    color: '#fff',
    fontSize: 17,
    fontWeight: '700',
  },
  emptyConnectionCard: {
    backgroundColor: theme.colors.cream,
    padding: 16,
    borderRadius: 10,
    marginBottom: 14,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: theme.colors.secondary,
    borderStyle: 'dashed',
  },
  emptyConnectionIcon: {
    fontSize: 28,
    marginBottom: 6,
    opacity: 0.5,
  },
  emptyConnectionText: {
    fontSize: 15,
    fontWeight: '600',
    color: theme.colors.navy,
    marginBottom: 4,
  },
  emptyConnectionHint: {
    fontSize: 13,
    color: theme.colors.textSecondary,
    textAlign: 'center',
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: 20,
    paddingBottom: 30,
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

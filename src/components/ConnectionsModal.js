import React, { useState, useEffect, useRef, useCallback } from 'react';
import { View, Text, TextInput, StyleSheet, Modal, TouchableOpacity, Pressable, ActivityIndicator, ScrollView, Platform } from 'react-native';
import { theme } from '../styles/theme';
import { API_BASE_URL } from '../config/api';
import alert from '../utils/alert';

const ConnectionsModal = ({ visible, onClose, user, onConnectionsUpdated, userType = 'individual', onUpgradeSubscription }) => {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [lawFirmCode, setLawFirmCode] = useState('');
  const [medicalProviderCode, setMedicalProviderCode] = useState('');
  const [currentConnections, setCurrentConnections] = useState(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [connectionRequests, setConnectionRequests] = useState({ inbound: [], outbound: [] });
  const [activeSection, setActiveSection] = useState('connections');
  
  const isLawFirm = userType === 'lawfirm';

  const hasNoConnections = currentConnections && 
    !currentConnections.lawFirm && 
    (!currentConnections.medicalProviders || currentConnections.medicalProviders.length === 0);

  const pendingInbound = connectionRequests.inbound.filter(r => r.status === 'pending');
  const pendingOutbound = connectionRequests.outbound.filter(r => r.status === 'pending');

  useEffect(() => {
    if (visible && user?.token) {
      fetchCurrentConnections();
      fetchConnectionRequests();
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

  const fetchConnectionRequests = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/connections/requests?type=all`, {
        headers: {
          'Authorization': `Bearer ${user.token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setConnectionRequests({
          inbound: data.inbound || [],
          outbound: data.outbound || []
        });
      }
    } catch (error) {
      console.error('Error fetching connection requests:', error);
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
        alert('Request Sent', data.message || 'Connection request sent! Awaiting approval.');
        setShowAddForm(false);
        setLawFirmCode('');
        fetchConnectionRequests();
      } else {
        alert('Error', data.error || 'Failed to send connection request');
      }
    } catch (error) {
      console.error('Error sending law firm request:', error);
      alert('Error', 'Failed to send connection request');
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
        alert('Request Sent', data.message || 'Connection request sent! Awaiting approval.');
        setMedicalProviderCode('');
        setShowAddForm(false);
        fetchConnectionRequests();
      } else {
        alert('Error', data.error || 'Failed to send connection request');
      }
    } catch (error) {
      console.error('Error sending medical provider request:', error);
      alert('Error', 'Failed to send connection request');
    } finally {
      setSaving(false);
    }
  };

  const handleAcceptRequest = async (requestId) => {
    try {
      setSaving(true);
      const response = await fetch(`${API_BASE_URL}/api/connections/requests/${requestId}/accept`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${user.token}`,
          'Content-Type': 'application/json'
        }
      });

      const data = await response.json();

      if (response.ok) {
        alert('Accepted', data.message || 'Connection request accepted!');
        fetchConnectionRequests();
        fetchCurrentConnections();
        if (onConnectionsUpdated) onConnectionsUpdated();
      } else if (data.errorCode === 'CLIENT_LIMIT_REACHED') {
        if (Platform.OS === 'web') {
          const shouldUpgrade = confirm(
            `You've reached your free trial limit of ${data.limit} clients.\n\n` +
            `Current clients: ${data.currentCount}/${data.limit}\n\n` +
            `Upgrade your subscription to add more clients.\n\n` +
            `Launch Special: All plans just $40/month!\n\n` +
            `Would you like to view subscription plans?`
          );
          if (shouldUpgrade && onUpgradeSubscription) {
            onClose();
            onUpgradeSubscription();
          }
        } else {
          alert(
            'Client Limit Reached',
            `You've reached your free trial limit of ${data.limit} clients.\n\nCurrent clients: ${data.currentCount}/${data.limit}\n\nUpgrade your subscription to add more clients.\n\nLaunch Special: All plans just $40/month!`,
            [
              { text: 'Later', style: 'cancel' },
              { 
                text: 'View Plans', 
                onPress: () => {
                  if (onUpgradeSubscription) {
                    onClose();
                    onUpgradeSubscription();
                  }
                }
              }
            ]
          );
        }
      } else {
        alert('Error', data.error || 'Failed to accept request');
      }
    } catch (error) {
      console.error('Error accepting request:', error);
      alert('Error', 'Failed to accept request');
    } finally {
      setSaving(false);
    }
  };

  const handleDeclineRequest = async (requestId) => {
    try {
      setSaving(true);
      const response = await fetch(`${API_BASE_URL}/api/connections/requests/${requestId}/decline`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${user.token}`,
          'Content-Type': 'application/json'
        }
      });

      const data = await response.json();

      if (response.ok) {
        alert('Declined', data.message || 'Connection request declined.');
        fetchConnectionRequests();
      } else {
        alert('Error', data.error || 'Failed to decline request');
      }
    } catch (error) {
      console.error('Error declining request:', error);
      alert('Error', 'Failed to decline request');
    } finally {
      setSaving(false);
    }
  };

  const handleCancelRequest = async (requestId) => {
    try {
      setSaving(true);
      const response = await fetch(`${API_BASE_URL}/api/connections/requests/${requestId}/cancel`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${user.token}`,
          'Content-Type': 'application/json'
        }
      });

      const data = await response.json();

      if (response.ok) {
        alert('Cancelled', data.message || 'Connection request cancelled.');
        fetchConnectionRequests();
      } else {
        alert('Error', data.error || 'Failed to cancel request');
      }
    } catch (error) {
      console.error('Error cancelling request:', error);
      alert('Error', 'Failed to cancel request');
    } finally {
      setSaving(false);
    }
  };

  const handleDisconnectLawFirm = async () => {
    try {
      setSaving(true);
      const response = await fetch(`${API_BASE_URL}/api/connections/disconnect-lawfirm`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${user.token}`,
          'Content-Type': 'application/json'
        }
      });

      const data = await response.json();

      if (response.ok) {
        alert('Success', data.message || 'Law firm disconnected successfully');
        setLawFirmCode('');
        fetchCurrentConnections();
        if (onConnectionsUpdated) onConnectionsUpdated();
      } else {
        alert('Error', data.error || 'Failed to disconnect from law firm');
      }
    } catch (error) {
      console.error('Error disconnecting law firm:', error);
      alert('Error', 'Failed to disconnect from law firm');
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

  const getRequestTypeLabel = (request) => {
    if (request.connection_type === 'individual_lawfirm') return 'Law Firm Connection';
    if (request.connection_type === 'individual_medical_provider') return 'Medical Provider Connection';
    if (request.connection_type === 'lawfirm_medical_provider') return 'Law Firm - Provider Connection';
    return 'Connection';
  };

  const getRequestIcon = (request) => {
    if (request.connection_type === 'individual_lawfirm') return '⚖️';
    if (request.connection_type === 'individual_medical_provider') return '🏥';
    if (request.connection_type === 'lawfirm_medical_provider') return '🤝';
    return '🔗';
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'pending': return { text: 'Pending', color: '#f39c12', bg: '#fff8e1' };
      case 'accepted': return { text: 'Accepted', color: '#27ae60', bg: '#e8f5e9' };
      case 'declined': return { text: 'Declined', color: '#e74c3c', bg: '#fce4ec' };
      case 'cancelled': return { text: 'Cancelled', color: '#95a5a6', bg: '#f5f5f5' };
      default: return { text: status, color: '#666', bg: '#f5f5f5' };
    }
  };

  const renderSectionTabs = () => (
    <View style={styles.sectionTabs}>
      <TouchableOpacity
        style={[styles.sectionTab, activeSection === 'connections' && styles.sectionTabActive]}
        onPress={() => setActiveSection('connections')}
      >
        <Text style={[styles.sectionTabText, activeSection === 'connections' && styles.sectionTabTextActive]}>
          Connections
        </Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={[styles.sectionTab, activeSection === 'requests' && styles.sectionTabActive]}
        onPress={() => setActiveSection('requests')}
      >
        <Text style={[styles.sectionTabText, activeSection === 'requests' && styles.sectionTabTextActive]}>
          Requests {pendingInbound.length > 0 ? `(${pendingInbound.length})` : ''}
        </Text>
        {pendingInbound.length > 0 && (
          <View style={styles.requestBadge}>
            <Text style={styles.requestBadgeText}>{pendingInbound.length}</Text>
          </View>
        )}
      </TouchableOpacity>
    </View>
  );

  const renderInboundRequests = () => {
    if (pendingInbound.length === 0) {
      return (
        <View style={styles.emptyRequestsCard}>
          <Text style={styles.emptyRequestsIcon}>📭</Text>
          <Text style={styles.emptyRequestsText}>No pending requests</Text>
          <Text style={styles.emptyRequestsHint}>When someone sends you a connection request, it will appear here</Text>
        </View>
      );
    }

    return pendingInbound.map((request) => {
      const badge = getStatusBadge(request.status);
      return (
        <View key={request.id} style={styles.requestCard}>
          <View style={styles.requestCardHeader}>
            <Text style={styles.requestIcon}>{getRequestIcon(request)}</Text>
            <View style={styles.requestInfo}>
              <Text style={styles.requestName}>{request.requester_name || 'Unknown'}</Text>
              <Text style={styles.requestType}>{getRequestTypeLabel(request)}</Text>
              <Text style={styles.requestDate}>
                {new Date(request.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
              </Text>
            </View>
            <View style={[styles.statusBadge, { backgroundColor: badge.bg }]}>
              <Text style={[styles.statusBadgeText, { color: badge.color }]}>{badge.text}</Text>
            </View>
          </View>
          {request.status === 'pending' && (
            <View style={styles.requestActions}>
              <TouchableOpacity
                style={styles.acceptButton}
                onPress={() => handleAcceptRequest(request.id)}
                disabled={saving}
              >
                <Text style={styles.acceptButtonText}>Accept</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.declineButton}
                onPress={() => {
                  alert(
                    'Decline Request',
                    `Are you sure you want to decline the connection request from ${request.requester_name || 'this user'}?`,
                    [
                      { text: 'Cancel', style: 'cancel' },
                      { text: 'Decline', style: 'destructive', onPress: () => handleDeclineRequest(request.id) }
                    ]
                  );
                }}
                disabled={saving}
              >
                <Text style={styles.declineButtonText}>Decline</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      );
    });
  };

  const renderOutboundRequests = () => {
    if (pendingOutbound.length === 0) {
      return (
        <View style={styles.emptyRequestsCard}>
          <Text style={styles.emptyRequestsIcon}>📤</Text>
          <Text style={styles.emptyRequestsText}>No pending sent requests</Text>
          <Text style={styles.emptyRequestsHint}>Requests you've sent that are awaiting approval will appear here</Text>
        </View>
      );
    }

    return pendingOutbound.map((request) => {
      const badge = getStatusBadge(request.status);
      return (
        <View key={request.id} style={styles.requestCard}>
          <View style={styles.requestCardHeader}>
            <Text style={styles.requestIcon}>{getRequestIcon(request)}</Text>
            <View style={styles.requestInfo}>
              <Text style={styles.requestName}>{request.recipient_name || 'Unknown'}</Text>
              <Text style={styles.requestType}>{getRequestTypeLabel(request)}</Text>
              <Text style={styles.requestDate}>
                Sent {new Date(request.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
              </Text>
            </View>
            <View style={[styles.statusBadge, { backgroundColor: badge.bg }]}>
              <Text style={[styles.statusBadgeText, { color: badge.color }]}>{badge.text}</Text>
            </View>
          </View>
          {request.status === 'pending' && (
            <View style={styles.requestActions}>
              <TouchableOpacity
                style={styles.cancelRequestButton}
                onPress={() => {
                  alert(
                    'Cancel Request',
                    `Are you sure you want to cancel your connection request to ${request.recipient_name || 'this entity'}?`,
                    [
                      { text: 'Keep', style: 'cancel' },
                      { text: 'Cancel Request', style: 'destructive', onPress: () => handleCancelRequest(request.id) }
                    ]
                  );
                }}
                disabled={saving}
              >
                <Text style={styles.cancelRequestButtonText}>Cancel Request</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      );
    });
  };

  const renderRequestsSection = () => (
    <ScrollView 
      style={styles.scrollView}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={true}
      bounces={false}
    >
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>📥 Incoming Requests</Text>
        {renderInboundRequests()}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>📤 Sent Requests</Text>
        {renderOutboundRequests()}
      </View>
    </ScrollView>
  );

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
          <Text style={styles.stepText}>Enter the code below to send a connection request</Text>
        </View>
        <View style={styles.stepItem}>
          <View style={styles.stepNumber}><Text style={styles.stepNumberText}>3</Text></View>
          <Text style={styles.stepText}>
            {isLawFirm
              ? 'Once approved, access shared medical records and billing information'
              : 'Once approved, start sharing documents and tracking your case together'}
          </Text>
        </View>
      </View>

      <TouchableOpacity 
        style={styles.getStartedButton}
        onPress={() => { setShowAddForm(true); setActiveSection('connections'); }}
      >
        <Text style={styles.getStartedButtonText}>Send a Connection Request</Text>
      </TouchableOpacity>

      {pendingInbound.length > 0 && (
        <TouchableOpacity 
          style={[styles.getStartedButton, { marginTop: 12, backgroundColor: theme.colors.warmGold }]}
          onPress={() => setActiveSection('requests')}
        >
          <Text style={styles.getStartedButtonText}>View Pending Requests ({pendingInbound.length})</Text>
        </TouchableOpacity>
      )}
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
          ? 'Send connection requests to medical providers to collaborate on client cases. They will need to approve the request.'
          : 'Send connection requests to your law firm and medical providers. They will need to approve the request before the connection is established.'
        }
      </Text>

      {!isLawFirm && (
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>⚖️ Law Firm Connection</Text>
        {currentConnections?.lawFirm ? (
          <View style={styles.currentConnection}>
            <View style={styles.connectionRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.connectedLabel}>Currently Connected:</Text>
                <Text style={styles.connectedName}>{currentConnections.lawFirm.firm_name || currentConnections.lawFirm.email}</Text>
                <Text style={styles.connectedEmail}>{currentConnections.lawFirm.email}</Text>
              </View>
              <TouchableOpacity 
                style={styles.disconnectButton}
                onPress={() => {
                  alert(
                    'Disconnect Law Firm',
                    `Are you sure you want to disconnect from ${currentConnections.lawFirm.firm_name || currentConnections.lawFirm.email}?`,
                    [
                      { text: 'Cancel', style: 'cancel' },
                      { text: 'Disconnect', style: 'destructive', onPress: handleDisconnectLawFirm }
                    ]
                  );
                }}
                disabled={saving}
              >
                <Text style={styles.disconnectButtonText}>Disconnect</Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          <View style={styles.emptyConnectionCard}>
            <Text style={styles.emptyConnectionIcon}>⚖️</Text>
            <Text style={styles.emptyConnectionText}>No law firm connected</Text>
            <Text style={styles.emptyConnectionHint}>Enter your law firm's code below to send a connection request</Text>
          </View>
        )}
        
        {!currentConnections?.lawFirm && (
          <>
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
                <Text style={styles.updateButtonText}>Send Connection Request</Text>
              )}
            </TouchableOpacity>
          </>
        )}
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
                  onPress={() => {
                    alert(
                      'Remove Provider',
                      `Are you sure you want to disconnect from ${provider.provider_name || provider.email}?`,
                      [
                        { text: 'Cancel', style: 'cancel' },
                        { text: 'Remove', style: 'destructive', onPress: () => handleRemoveMedicalProvider(provider.id) }
                      ]
                    );
                  }}
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
            <Text style={styles.emptyConnectionHint}>Enter a provider's code below to send a connection request</Text>
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
            <Text style={styles.addButtonText}>Send Connection Request</Text>
          )}
        </TouchableOpacity>
      </View>

      <View style={styles.infoBox}>
        <Text style={styles.infoIcon}>ℹ️</Text>
        <Text style={styles.infoText}>
          {isLawFirm
            ? 'Send connection requests to medical providers using their connection codes. They must approve the request before the connection is established.'
            : 'Send connection requests using connection codes. You can connect with ONE law firm and MULTIPLE medical providers. Each connection must be approved by the recipient.'}
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

          {renderSectionTabs()}

          {loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={theme.colors.mahogany} />
              <Text style={styles.loadingText}>Loading your connections...</Text>
            </View>
          ) : activeSection === 'requests' ? (
            renderRequestsSection()
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
  sectionTabs: {
    flexDirection: 'row',
    backgroundColor: theme.colors.lightCream,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.secondary,
  },
  sectionTab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    borderBottomWidth: 3,
    borderBottomColor: 'transparent',
  },
  sectionTabActive: {
    borderBottomColor: theme.colors.mahogany,
    backgroundColor: '#fff',
  },
  sectionTabText: {
    fontSize: 15,
    fontWeight: '600',
    color: theme.colors.textSecondary,
  },
  sectionTabTextActive: {
    color: theme.colors.mahogany,
  },
  requestBadge: {
    backgroundColor: '#e74c3c',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 6,
    paddingHorizontal: 6,
  },
  requestBadgeText: {
    color: '#fff',
    fontSize: 11,
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
  connectionRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  disconnectButton: {
    backgroundColor: '#e74c3c',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
    marginLeft: 10,
  },
  disconnectButtonText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '600',
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
  requestCard: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: theme.colors.secondary,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 3,
    elevation: 2,
  },
  requestCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  requestIcon: {
    fontSize: 28,
    marginRight: 12,
  },
  requestInfo: {
    flex: 1,
  },
  requestName: {
    fontSize: 16,
    fontWeight: '700',
    color: theme.colors.navy,
    marginBottom: 2,
  },
  requestType: {
    fontSize: 13,
    color: theme.colors.textSecondary,
    marginBottom: 2,
  },
  requestDate: {
    fontSize: 12,
    color: theme.colors.warmGray || '#999',
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusBadgeText: {
    fontSize: 12,
    fontWeight: '700',
  },
  requestActions: {
    flexDirection: 'row',
    marginTop: 12,
    gap: 10,
  },
  acceptButton: {
    flex: 1,
    backgroundColor: '#27ae60',
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
  },
  acceptButtonText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '700',
  },
  declineButton: {
    flex: 1,
    backgroundColor: '#fff',
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#e74c3c',
  },
  declineButtonText: {
    color: '#e74c3c',
    fontSize: 15,
    fontWeight: '700',
  },
  cancelRequestButton: {
    flex: 1,
    backgroundColor: '#fff',
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#95a5a6',
  },
  cancelRequestButtonText: {
    color: '#95a5a6',
    fontSize: 15,
    fontWeight: '700',
  },
  emptyRequestsCard: {
    backgroundColor: theme.colors.cream,
    padding: 20,
    borderRadius: 10,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: theme.colors.secondary,
    borderStyle: 'dashed',
    marginBottom: 10,
  },
  emptyRequestsIcon: {
    fontSize: 32,
    marginBottom: 8,
    opacity: 0.5,
  },
  emptyRequestsText: {
    fontSize: 15,
    fontWeight: '600',
    color: theme.colors.navy,
    marginBottom: 4,
  },
  emptyRequestsHint: {
    fontSize: 13,
    color: theme.colors.textSecondary,
    textAlign: 'center',
  },
});

export default ConnectionsModal;

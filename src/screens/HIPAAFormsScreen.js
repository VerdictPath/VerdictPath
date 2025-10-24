import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Alert,
  ScrollView,
  TextInput,
  Modal
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:5000/api';

export default function HIPAAFormsScreen({ onNavigate, user }) {
  const [forms, setForms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedForm, setSelectedForm] = useState(null);
  const [showSignModal, setShowSignModal] = useState(false);
  const [signatureText, setSignatureText] = useState('');

  useEffect(() => {
    loadForms();
  }, []);

  const loadForms = async () => {
    try {
      const token = await AsyncStorage.getItem('token');
      if (!token) {
        Alert.alert('Error', 'Please log in to continue');
        return;
      }

      const response = await fetch(`${API_BASE_URL}/forms/my-forms`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        setForms(data.forms);
      } else {
        Alert.alert('Error', 'Failed to load forms');
      }
    } catch (error) {
      console.error('Error loading forms:', error);
      Alert.alert('Error', 'Failed to load forms');
    } finally {
      setLoading(false);
    }
  };

  const viewForm = async (formId) => {
    try {
      const token = await AsyncStorage.getItem('token');
      const response = await fetch(`${API_BASE_URL}/forms/submissions/${formId}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        setSelectedForm(data.submission);
        setShowSignModal(true);
      } else {
        Alert.alert('Error', 'Failed to load form details');
      }
    } catch (error) {
      console.error('Error loading form:', error);
      Alert.alert('Error', 'Failed to load form details');
    }
  };

  const signForm = async () => {
    if (!signatureText.trim()) {
      Alert.alert('Error', 'Please type your full name to sign');
      return;
    }

    try {
      const token = await AsyncStorage.getItem('token');
      const response = await fetch(`${API_BASE_URL}/forms/submissions/${selectedForm.id}/sign`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          signatureData: signatureText
        })
      });

      if (response.ok) {
        Alert.alert('Success', 'Form signed successfully');
        setShowSignModal(false);
        setSelectedForm(null);
        setSignatureText('');
        loadForms();
      } else {
        const error = await response.json();
        Alert.alert('Error', error.message || 'Failed to sign form');
      }
    } catch (error) {
      console.error('Error signing form:', error);
      Alert.alert('Error', 'Failed to sign form');
    }
  };

  const getStatusStyle = (status) => {
    switch (status) {
      case 'signed':
        return styles.statusSigned;
      case 'pending_signature':
        return styles.statusPending;
      case 'draft':
        return styles.statusDraft;
      default:
        return styles.statusDefault;
    }
  };

  const renderFormItem = ({ item }) => (
    <TouchableOpacity
      style={styles.formCard}
      onPress={() => viewForm(item.id)}
    >
      <View style={styles.formHeader}>
        <Text style={styles.formTitle}>{item.template_name}</Text>
        <View style={[styles.statusBadge, getStatusStyle(item.status)]}>
          <Text style={styles.statusText}>
            {item.status.replace(/_/g, ' ').toUpperCase()}
          </Text>
        </View>
      </View>
      
      {item.law_firm_name && (
        <Text style={styles.formMeta}>From: {item.law_firm_name}</Text>
      )}
      
      <Text style={styles.formMeta}>
        Created: {new Date(item.created_at).toLocaleDateString()}
      </Text>
      
      {item.signed_at && (
        <Text style={styles.formMeta}>
          Signed: {new Date(item.signed_at).toLocaleDateString()}
        </Text>
      )}
      
      <Text style={styles.formMeta}>
        Signatures: {item.signature_count || 0}
      </Text>
      
      {item.status === 'pending_signature' && (
        <Text style={styles.actionText}>Tap to review and sign</Text>
      )}
    </TouchableOpacity>
  );

  const renderFormField = (fieldName, value) => {
    if (typeof value === 'boolean') {
      return (
        <View key={fieldName} style={styles.fieldContainer}>
          <Text style={styles.fieldLabel}>{fieldName.replace(/_/g, ' ').toUpperCase()}</Text>
          <Text style={styles.fieldValue}>{value ? '✓ Yes' : '✗ No'}</Text>
        </View>
      );
    }
    
    if (value) {
      return (
        <View key={fieldName} style={styles.fieldContainer}>
          <Text style={styles.fieldLabel}>{fieldName.replace(/_/g, ' ').toUpperCase()}</Text>
          <Text style={styles.fieldValue}>{value}</Text>
        </View>
      );
    }
    
    return null;
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <Text style={styles.loadingText}>Loading forms...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => {
            // Navigate back based on user type
            if (user?.userType === 'lawfirm') {
              onNavigate('lawfirm-dashboard');
            } else if (user?.userType === 'medical_provider') {
              onNavigate('medicalprovider-dashboard');
            } else {
              onNavigate('medical');
            }
          }}
        >
          <Text style={styles.backButtonText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>HIPAA Forms</Text>
        <Text style={styles.headerSubtitle}>
          Review and sign important legal documents
        </Text>
      </View>

      {forms.length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyText}>No forms available</Text>
          <Text style={styles.emptySubtext}>
            Your law firm will send you forms to review and sign here
          </Text>
        </View>
      ) : (
        <FlatList
          data={forms}
          keyExtractor={(item) => item.id.toString()}
          renderItem={renderFormItem}
          contentContainerStyle={styles.listContainer}
        />
      )}

      <Modal
        visible={showSignModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowSignModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <ScrollView>
              {selectedForm && (
                <>
                  <Text style={styles.modalTitle}>{selectedForm.template_name}</Text>
                  
                  <View style={styles.formDetailsContainer}>
                    {selectedForm.form_data && Object.entries(selectedForm.form_data).map(([key, value]) =>
                      renderFormField(key, value)
                    )}
                  </View>

                  {selectedForm.status === 'pending_signature' && (
                    <View style={styles.signatureSection}>
                      <Text style={styles.signatureTitle}>Digital Signature</Text>
                      <Text style={styles.signatureSubtitle}>
                        By typing your full name below, you acknowledge that you have read and agree to the terms of this form.
                      </Text>
                      
                      <TextInput
                        style={styles.signatureInput}
                        placeholder="Type your full legal name"
                        value={signatureText}
                        onChangeText={setSignatureText}
                        autoCapitalize="words"
                      />
                      
                      <TouchableOpacity
                        style={styles.signButton}
                        onPress={signForm}
                      >
                        <Text style={styles.signButtonText}>Sign Form</Text>
                      </TouchableOpacity>
                    </View>
                  )}

                  {selectedForm.status === 'signed' && (
                    <View style={styles.signedBanner}>
                      <Text style={styles.signedText}>✓ This form has been signed</Text>
                      {selectedForm.signatures && selectedForm.signatures.length > 0 && (
                        <Text style={styles.signedDate}>
                          Signed on {new Date(selectedForm.signatures[0].signed_at).toLocaleString()}
                        </Text>
                      )}
                    </View>
                  )}
                </>
              )}
            </ScrollView>
            
            <TouchableOpacity
              style={styles.closeButton}
              onPress={() => {
                setShowSignModal(false);
                setSelectedForm(null);
                setSignatureText('');
              }}
            >
              <Text style={styles.closeButtonText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F1E8',
  },
  header: {
    backgroundColor: '#2A4A6F',
    padding: 20,
    paddingTop: 50,
  },
  backButton: {
    marginBottom: 10,
    padding: 8,
    alignSelf: 'flex-start',
  },
  backButtonText: {
    fontSize: 16,
    color: '#FFFFFF',
    fontWeight: '600',
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 5,
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#E8E4D8',
  },
  loadingText: {
    textAlign: 'center',
    marginTop: 50,
    fontSize: 16,
    color: '#666',
  },
  listContainer: {
    padding: 15,
  },
  formCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  formHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 10,
  },
  formTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2A4A6F',
    flex: 1,
    marginRight: 10,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusSigned: {
    backgroundColor: '#E8F5E9',
  },
  statusPending: {
    backgroundColor: '#FFF4E6',
  },
  statusDraft: {
    backgroundColor: '#E3F2FD',
  },
  statusDefault: {
    backgroundColor: '#F5F5F5',
  },
  statusText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#333',
  },
  formMeta: {
    fontSize: 13,
    color: '#666',
    marginBottom: 4,
  },
  actionText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#8B2500',
    marginTop: 8,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#2A4A6F',
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    maxHeight: '90%',
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#2A4A6F',
    marginBottom: 20,
  },
  formDetailsContainer: {
    marginBottom: 20,
  },
  fieldContainer: {
    marginBottom: 15,
    paddingBottom: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#E8E4D8',
  },
  fieldLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#666',
    marginBottom: 4,
  },
  fieldValue: {
    fontSize: 15,
    color: '#333',
  },
  signatureSection: {
    backgroundColor: '#F5F1E8',
    padding: 20,
    borderRadius: 12,
    marginVertical: 20,
  },
  signatureTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#2A4A6F',
    marginBottom: 8,
  },
  signatureSubtitle: {
    fontSize: 13,
    color: '#666',
    marginBottom: 15,
    lineHeight: 18,
  },
  signatureInput: {
    backgroundColor: '#FFFFFF',
    borderWidth: 2,
    borderColor: '#8B2500',
    borderRadius: 8,
    padding: 15,
    fontSize: 16,
    marginBottom: 15,
  },
  signButton: {
    backgroundColor: '#8B2500',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  signButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  signedBanner: {
    backgroundColor: '#E8F5E9',
    padding: 20,
    borderRadius: 12,
    marginVertical: 20,
    alignItems: 'center',
  },
  signedText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2E7D32',
    marginBottom: 4,
  },
  signedDate: {
    fontSize: 13,
    color: '#666',
  },
  closeButton: {
    backgroundColor: '#E8E4D8',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 10,
  },
  closeButtonText: {
    color: '#2A4A6F',
    fontSize: 16,
    fontWeight: '600',
  },
});

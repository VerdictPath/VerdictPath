import React, { useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet } from 'react-native';
import { commonStyles } from '../styles/commonStyles';

const PrivacyAcceptanceScreen = ({ onAccept, onDecline, onNavigate }) => {
  const [accepted, setAccepted] = useState(false);

  const handleAccept = () => {
    if (accepted) {
      onAccept();
    }
  };

  return (
    <View style={commonStyles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Legal Documents</Text>
        <Text style={styles.headerSubtitle}>Please review and accept to continue</Text>
      </View>

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        <View style={styles.content}>
          <Text style={styles.sectionTitle}>📜 Required Reading</Text>
          <Text style={styles.paragraph}>
            Before creating your account, please review our legal documents:
          </Text>

          <TouchableOpacity 
            style={styles.documentButton}
            onPress={() => onNavigate('privacy-policy')}
          >
            <Text style={styles.documentIcon}>🔒</Text>
            <View style={styles.documentTextContainer}>
              <Text style={styles.documentTitle}>Privacy Policy</Text>
              <Text style={styles.documentSubtitle}>How we protect your data</Text>
            </View>
            <Text style={styles.arrow}>→</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.documentButton}
            onPress={() => onNavigate('terms-of-service')}
          >
            <Text style={styles.documentIcon}>📋</Text>
            <View style={styles.documentTextContainer}>
              <Text style={styles.documentTitle}>Terms of Service</Text>
              <Text style={styles.documentSubtitle}>Your rights and responsibilities</Text>
            </View>
            <Text style={styles.arrow}>→</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.documentButton}
            onPress={() => onNavigate('eula')}
          >
            <Text style={styles.documentIcon}>⚖️</Text>
            <View style={styles.documentTextContainer}>
              <Text style={styles.documentTitle}>EULA</Text>
              <Text style={styles.documentSubtitle}>End User License Agreement</Text>
            </View>
            <Text style={styles.arrow}>→</Text>
          </TouchableOpacity>

          <View style={styles.divider} />

          <TouchableOpacity 
            style={styles.checkboxContainer}
            onPress={() => {
              console.log('Checkbox toggled! New value:', !accepted);
              setAccepted(!accepted);
            }}
          >
            <View style={[styles.checkbox, accepted && styles.checkboxChecked]}>
              {accepted && <Text style={styles.checkmark}>✓</Text>}
            </View>
            <Text style={styles.checkboxText}>
              I have read and agree to the Privacy Policy, Terms of Service, and EULA
            </Text>
          </TouchableOpacity>

          <Text style={styles.disclaimer}>
            By accepting, you acknowledge that you understand and agree to be bound by these terms.
          </Text>
        </View>
      </ScrollView>

      <View style={styles.buttonContainer}>
        <TouchableOpacity 
          style={styles.declineButton}
          onPress={onDecline}
        >
          <Text style={styles.declineButtonText}>Decline & Go Back</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={[
            styles.acceptButton,
            !accepted && styles.buttonDisabled
          ]}
          onPress={handleAccept}
          disabled={!accepted}
        >
          <Text style={styles.acceptButtonText}>
            {accepted ? 'Accept & Continue' : 'Please Check Box Above'}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  header: {
    backgroundColor: '#8B4513',
    padding: 20,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 5,
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#f5deb3',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
  },
  content: {
    flex: 1,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginBottom: 15,
    textAlign: 'center',
  },
  paragraph: {
    fontSize: 16,
    color: '#2c3e50',
    lineHeight: 24,
    marginBottom: 20,
    textAlign: 'center',
  },
  documentButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 15,
    borderRadius: 10,
    marginBottom: 12,
    borderWidth: 2,
    borderColor: '#3498db',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  documentIcon: {
    fontSize: 32,
    marginRight: 15,
  },
  documentTextContainer: {
    flex: 1,
  },
  documentTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginBottom: 3,
  },
  documentSubtitle: {
    fontSize: 13,
    color: '#7f8c8d',
  },
  arrow: {
    fontSize: 20,
    color: '#3498db',
    fontWeight: 'bold',
  },
  divider: {
    height: 1,
    backgroundColor: '#bdc3c7',
    marginVertical: 25,
  },
  checkboxContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#fffacd',
    padding: 15,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#8B4513',
    marginBottom: 15,
  },
  checkbox: {
    width: 28,
    height: 28,
    borderWidth: 3,
    borderColor: '#8B4513',
    borderRadius: 6,
    marginRight: 12,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  checkboxChecked: {
    backgroundColor: '#27ae60',
    borderColor: '#27ae60',
  },
  checkmark: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
  },
  checkboxText: {
    flex: 1,
    fontSize: 15,
    color: '#2c3e50',
    lineHeight: 22,
    fontWeight: '600',
  },
  disclaimer: {
    fontSize: 12,
    color: '#7f8c8d',
    textAlign: 'center',
    lineHeight: 18,
  },
  buttonContainer: {
    flexDirection: 'row',
    padding: 15,
    gap: 10,
    borderTopWidth: 1,
    borderTopColor: '#bdc3c7',
    backgroundColor: '#f8f9fa',
  },
  declineButton: {
    flex: 1,
    padding: 15,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#e74c3c',
    backgroundColor: '#fff',
    alignItems: 'center',
  },
  declineButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#e74c3c',
  },
  acceptButton: {
    flex: 2,
    padding: 15,
    borderRadius: 10,
    backgroundColor: '#27ae60',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  acceptButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fff',
  },
  buttonDisabled: {
    backgroundColor: '#95a5a6',
    opacity: 0.6,
  },
});

export default PrivacyAcceptanceScreen;

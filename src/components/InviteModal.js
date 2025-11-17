import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, ActivityIndicator, Share, Platform } from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { theme } from '../styles/theme';
import { API_BASE_URL, API_ENDPOINTS } from '../config/api';

const InviteModal = ({ visible, onClose, user }) => {
  const [loading, setLoading] = useState(false);
  const [inviteData, setInviteData] = useState(null);
  const [copied, setCopied] = useState(false);
  const [selectedInviteType, setSelectedInviteType] = useState(null);
  const isMedicalProvider = user?.userType === 'medical_provider';

  useEffect(() => {
    if (visible && user?.token) {
      if (isMedicalProvider) {
        // Medical providers need to select who to invite first
        setSelectedInviteType(null);
      } else {
        fetchInviteCode();
      }
    }
  }, [visible, user]);

  useEffect(() => {
    if (selectedInviteType && user?.token) {
      fetchInviteCode();
    }
  }, [selectedInviteType]);

  const fetchInviteCode = async () => {
    try {
      setLoading(true);
      const response = await fetch(API_ENDPOINTS.INVITES.MY_CODE, {
        headers: {
          'Authorization': `Bearer ${user.token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setInviteData(data);
      } else {
        console.error('Failed to fetch invite code');
      }
    } catch (error) {
      console.error('Error fetching invite code:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCopyCode = async () => {
    if (inviteData?.inviteCode) {
      await Clipboard.setStringAsync(inviteData.inviteCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleCopyLink = async () => {
    if (inviteData?.shareUrl) {
      await Clipboard.setStringAsync(inviteData.shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleShareText = async () => {
    if (!inviteData?.shareText) return;

    if (Platform.OS === 'web') {
      if (navigator.share) {
        try {
          await navigator.share({
            title: 'Join Verdict Path',
            text: inviteData.shareText,
            url: inviteData.shareUrl
          });
        } catch (error) {
          console.log('Share cancelled or failed:', error);
        }
      } else {
        await handleCopyLink();
      }
    } else {
      try {
        await Share.share({
          message: `${inviteData.shareText}\n\n${inviteData.shareUrl}`
        });
      } catch (error) {
        console.error('Error sharing:', error);
      }
    }
  };

  const handleShareEmail = () => {
    if (!inviteData) return;
    
    const subject = encodeURIComponent('Join Verdict Path - Legal Case Management');
    
    let emailBody;
    if (user?.userType === 'individual' || user?.userType === 'client') {
      emailBody = encodeURIComponent(
        `Hi there!\n\nI've been using Verdict Path to navigate my legal journey and wanted to invite you to join.\n\n` +
        `Verdict Path is an interactive legal case management platform for individuals who are not familiar with the litigation process, law firms who want their clients informed, and medical providers who want to stay in the loop.\n\n` +
        `Key features:\n` +
        `• Track litigation progress step-by-step\n` +
        `• Earn rewards for completing milestones\n` +
        `• Store medical records securely (HIPAA-compliant)\n` +
        `• Connect with legal and medical professionals\n` +
        `• Learn about the legal process\n\n` +
        `Use my invite code: ${inviteData.inviteCode}\n` +
        `Or click here: ${inviteData.shareUrl}\n\n` +
        `Whether you're learning about litigation and navigating your case, providing legal services, or treating your patients, Verdict Path has the tools you need!\n\n` +
        `Best regards`
      );
    } else if (user?.userType === 'lawfirm') {
      emailBody = encodeURIComponent(
        `Hi there!\n\nI'm inviting you to join our firm on Verdict Path - a comprehensive legal case management platform.\n\n` +
        `Verdict Path helps law firms:\n` +
        `• Manage client cases efficiently\n` +
        `• Track litigation progress\n` +
        `• Access secure client records\n` +
        `• Connect with clients and medical providers\n\n` +
        `Use my invite code: ${inviteData.inviteCode}\n` +
        `Or click here: ${inviteData.shareUrl}\n\n` +
        `Best regards`
      );
    } else if (isMedicalProvider && selectedInviteType === 'lawfirm') {
      emailBody = encodeURIComponent(
        `Hi there!\n\nI'm inviting your law firm to join Verdict Path - a HIPAA-compliant platform connecting medical providers and law firms.\n\n` +
        `Verdict Path helps law firms:\n` +
        `• Coordinate with medical providers seamlessly\n` +
        `• Access patient medical information securely\n` +
        `• Negotiate medical bills directly in the platform\n` +
        `• Track client litigation progress\n` +
        `• Manage cases efficiently\n\n` +
        `Use this invite code to connect: ${inviteData.inviteCode}\n` +
        `Or click here: ${inviteData.shareUrl}\n\n` +
        `Looking forward to collaborating with you!\n\n` +
        `Best regards`
      );
    } else if (isMedicalProvider && selectedInviteType === 'patient') {
      emailBody = encodeURIComponent(
        `Hi there!\n\nI'm inviting you to join Verdict Path - a HIPAA-compliant platform for tracking your legal case.\n\n` +
        `Verdict Path helps patients:\n` +
        `• Stay informed about your legal case progress\n` +
        `• Securely store and share medical records\n` +
        `• Connect with your medical providers and law firm\n` +
        `• Track litigation milestones step-by-step\n` +
        `• Communicate with your legal team\n\n` +
        `Use my invite code: ${inviteData.inviteCode}\n` +
        `Or click here: ${inviteData.shareUrl}\n\n` +
        `Best regards`
      );
    } else {
      emailBody = encodeURIComponent(
        `Hi there!\n\nI'm inviting you to join our practice on Verdict Path - a HIPAA-compliant platform for medical providers.\n\n` +
        `Verdict Path helps medical providers:\n` +
        `• Manage patient records securely\n` +
        `• Coordinate with law firms\n` +
        `• Track case-related medical information\n` +
        `• Streamline legal-medical collaboration\n\n` +
        `Use my invite code: ${inviteData.inviteCode}\n` +
        `Or click here: ${inviteData.shareUrl}\n\n` +
        `Best regards`
      );
    }
    
    if (Platform.OS === 'web') {
      window.open(`mailto:?subject=${subject}&body=${emailBody}`, '_blank');
    } else {
      Share.share({
        message: decodeURIComponent(emailBody),
        title: decodeURIComponent(subject)
      });
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
            <Text style={styles.headerTitle}>🎁 Invite Friends</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Text style={styles.closeButtonText}>✕</Text>
            </TouchableOpacity>
          </View>

          {loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={theme.colors.mahogany} />
              <Text style={styles.loadingText}>Generating your invite code...</Text>
            </View>
          ) : isMedicalProvider && !selectedInviteType ? (
            <View style={styles.content}>
              <View style={styles.infoSection}>
                <Text style={styles.infoIcon}>⚕️</Text>
                <Text style={styles.infoText}>
                  Who would you like to invite to Verdict Path? Select the type of person you want to invite:
                </Text>
              </View>

              <Text style={styles.selectionTitle}>Select Invite Type:</Text>

              <TouchableOpacity 
                style={styles.selectionOption} 
                onPress={() => setSelectedInviteType('patient')}
              >
                <Text style={styles.selectionIcon}>👤</Text>
                <View style={styles.selectionTextContainer}>
                  <Text style={styles.selectionOptionTitle}>Invite a Patient</Text>
                  <Text style={styles.selectionOptionDescription}>
                    Invite patients to track their legal case progress
                  </Text>
                </View>
                <Text style={styles.selectionArrow}>→</Text>
              </TouchableOpacity>

              <TouchableOpacity 
                style={styles.selectionOption} 
                onPress={() => setSelectedInviteType('lawfirm')}
              >
                <Text style={styles.selectionIcon}>⚖️</Text>
                <View style={styles.selectionTextContainer}>
                  <Text style={styles.selectionOptionTitle}>Invite a Law Firm</Text>
                  <Text style={styles.selectionOptionDescription}>
                    Connect with law firms for collaboration and bill negotiations
                  </Text>
                </View>
                <Text style={styles.selectionArrow}>→</Text>
              </TouchableOpacity>

              <TouchableOpacity 
                style={styles.selectionOption} 
                onPress={() => setSelectedInviteType('colleague')}
              >
                <Text style={styles.selectionIcon}>👨‍⚕️</Text>
                <View style={styles.selectionTextContainer}>
                  <Text style={styles.selectionOptionTitle}>Invite a Colleague</Text>
                  <Text style={styles.selectionOptionDescription}>
                    Invite other medical providers to join your practice
                  </Text>
                </View>
                <Text style={styles.selectionArrow}>→</Text>
              </TouchableOpacity>
            </View>
          ) : inviteData ? (
            <View style={styles.content}>
              {isMedicalProvider && selectedInviteType && (
                <TouchableOpacity 
                  style={styles.backButton}
                  onPress={() => setSelectedInviteType(null)}
                >
                  <Text style={styles.backButtonText}>← Back to Selection</Text>
                </TouchableOpacity>
              )}
              
              {user?.userType === 'individual' || user?.userType === 'client' ? (
                <View style={styles.infoSection}>
                  <Text style={styles.infoIcon}>💰</Text>
                  <Text style={styles.infoText}>
                    Invite your friends, peers, medical providers and even your lawyer to join Verdict Path! Earn 500 coins for each person who signs up using your invite code!
                  </Text>
                </View>
              ) : user?.userType === 'lawfirm' ? (
                <View style={styles.infoSection}>
                  <Text style={styles.infoIcon}>⚖️</Text>
                  <Text style={styles.infoText}>
                    Invite your clients, colleagues, and peers to join Verdict Path! Help them navigate their legal journey with our interactive case management platform. Share your invite code to connect and collaborate seamlessly.
                  </Text>
                </View>
              ) : selectedInviteType === 'lawfirm' ? (
                <View style={styles.infoSection}>
                  <Text style={styles.infoIcon}>⚖️</Text>
                  <Text style={styles.infoText}>
                    Invite law firms to join Verdict Path! Connect with legal professionals to coordinate patient care, share medical information securely, and negotiate medical bills directly in the platform.
                  </Text>
                </View>
              ) : selectedInviteType === 'patient' ? (
                <View style={styles.infoSection}>
                  <Text style={styles.infoIcon}>👤</Text>
                  <Text style={styles.infoText}>
                    Invite your patients to join Verdict Path! Help them track their legal case progress, store medical records securely, and stay connected with their legal team through our HIPAA-compliant platform.
                  </Text>
                </View>
              ) : (
                <View style={styles.infoSection}>
                  <Text style={styles.infoIcon}>👨‍⚕️</Text>
                  <Text style={styles.infoText}>
                    Invite colleagues to join your practice on Verdict Path! Collaborate with other medical providers, share patient information securely, and coordinate care efficiently.
                  </Text>
                </View>
              )}

              <View style={styles.codeSection}>
                <Text style={styles.codeLabel}>Your Invite Code:</Text>
                <View style={styles.codeContainer}>
                  <Text style={styles.codeText}>{inviteData.inviteCode}</Text>
                </View>
                <TouchableOpacity style={styles.copyButton} onPress={handleCopyCode}>
                  <Text style={styles.copyButtonText}>
                    {copied ? '✓ Copied!' : '📋 Copy Code'}
                  </Text>
                </TouchableOpacity>
              </View>

              <View style={styles.divider} />

              <Text style={styles.shareTitle}>Share via:</Text>
              
              <TouchableOpacity style={styles.shareOption} onPress={handleShareText}>
                <Text style={styles.shareIcon}>📱</Text>
                <View style={styles.shareTextContainer}>
                  <Text style={styles.shareOptionTitle}>Text Message</Text>
                  <Text style={styles.shareOptionDescription}>
                    Share your invite code via SMS
                  </Text>
                </View>
              </TouchableOpacity>

              <TouchableOpacity style={styles.shareOption} onPress={handleShareEmail}>
                <Text style={styles.shareIcon}>✉️</Text>
                <View style={styles.shareTextContainer}>
                  <Text style={styles.shareOptionTitle}>Email</Text>
                  <Text style={styles.shareOptionDescription}>
                    Send an email invitation
                  </Text>
                </View>
              </TouchableOpacity>

              <TouchableOpacity style={styles.shareOption} onPress={handleCopyLink}>
                <Text style={styles.shareIcon}>🔗</Text>
                <View style={styles.shareTextContainer}>
                  <Text style={styles.shareOptionTitle}>Copy Link</Text>
                  <Text style={styles.shareOptionDescription}>
                    {copied ? 'Link copied to clipboard!' : 'Share invite link anywhere'}
                  </Text>
                </View>
              </TouchableOpacity>
            </View>
          ) : null}

          <TouchableOpacity style={styles.cancelButton} onPress={onClose}>
            <Text style={styles.cancelButtonText}>Close</Text>
          </TouchableOpacity>
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContainer: {
    backgroundColor: theme.colors.cream,
    borderRadius: 16,
    width: '100%',
    maxWidth: 500,
    borderWidth: 3,
    borderColor: theme.colors.secondary,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 2,
    borderBottomColor: theme.colors.secondary,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: theme.colors.mahogany,
  },
  closeButton: {
    padding: 5,
  },
  closeButtonText: {
    fontSize: 24,
    color: theme.colors.textSecondary,
    fontWeight: 'bold',
  },
  loadingContainer: {
    padding: 40,
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 15,
    color: theme.colors.textSecondary,
    fontSize: 14,
  },
  content: {
    padding: 20,
  },
  infoSection: {
    backgroundColor: theme.colors.lightCream,
    padding: 16,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: theme.colors.warmGold,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  infoIcon: {
    fontSize: 28,
    marginRight: 12,
  },
  infoText: {
    flex: 1,
    fontSize: 14,
    color: theme.colors.navy,
    lineHeight: 20,
    fontWeight: '600',
  },
  codeSection: {
    marginBottom: 20,
    alignItems: 'center',
  },
  codeLabel: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    marginBottom: 10,
    fontWeight: '600',
  },
  codeContainer: {
    backgroundColor: theme.colors.sand,
    paddingVertical: 20,
    paddingHorizontal: 30,
    borderRadius: 12,
    borderWidth: 3,
    borderColor: theme.colors.mahogany,
    marginBottom: 12,
  },
  codeText: {
    fontSize: 32,
    fontWeight: 'bold',
    color: theme.colors.mahogany,
    letterSpacing: 4,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  copyButton: {
    backgroundColor: theme.colors.warmGold,
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: theme.colors.secondary,
  },
  copyButtonText: {
    color: theme.colors.navy,
    fontSize: 16,
    fontWeight: '600',
  },
  divider: {
    height: 2,
    backgroundColor: theme.colors.secondary,
    marginVertical: 20,
  },
  shareTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: theme.colors.mahogany,
    marginBottom: 15,
  },
  shareOption: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.lightCream,
    padding: 16,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: theme.colors.secondary,
    marginBottom: 12,
  },
  shareIcon: {
    fontSize: 32,
    marginRight: 15,
  },
  shareTextContainer: {
    flex: 1,
  },
  shareOptionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.mahogany,
    marginBottom: 4,
  },
  shareOptionDescription: {
    fontSize: 13,
    color: theme.colors.textSecondary,
  },
  cancelButton: {
    backgroundColor: theme.colors.sand,
    padding: 16,
    margin: 20,
    marginTop: 0,
    borderRadius: 10,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: theme.colors.secondary,
  },
  cancelButtonText: {
    color: theme.colors.mahogany,
    fontSize: 16,
    fontWeight: '600',
  },
  selectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: theme.colors.mahogany,
    marginBottom: 15,
  },
  selectionOption: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.lightCream,
    padding: 16,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: theme.colors.secondary,
    marginBottom: 12,
  },
  selectionIcon: {
    fontSize: 32,
    marginRight: 15,
  },
  selectionTextContainer: {
    flex: 1,
  },
  selectionOptionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.mahogany,
    marginBottom: 4,
  },
  selectionOptionDescription: {
    fontSize: 13,
    color: theme.colors.textSecondary,
  },
  selectionArrow: {
    fontSize: 20,
    color: theme.colors.mahogany,
    fontWeight: 'bold',
  },
  backButton: {
    marginBottom: 15,
    alignSelf: 'flex-start',
  },
  backButtonText: {
    color: theme.colors.mahogany,
    fontSize: 14,
    fontWeight: '600',
  },
});

export default InviteModal;

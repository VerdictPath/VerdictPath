import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity } from 'react-native';
import { commonStyles } from '../styles/commonStyles';
import { theme } from '../styles/theme';

const PrivacyPolicyScreen = ({ onBack, onNavigate }) => {
  const [privacyText, setPrivacyText] = useState('');

  useEffect(() => {
    loadPrivacyPolicy();
  }, []);

  const loadPrivacyPolicy = async () => {
    try {
      const policy = require('../../assets/privacy-policy.txt');
      setPrivacyText(policy.default || policy);
    } catch (error) {
      setPrivacyText(PRIVACY_POLICY_TEXT);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={onBack || (() => onNavigate && onNavigate('register'))}
        >
          <Text style={styles.backButtonText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Privacy Policy</Text>
      </View>

      <ScrollView style={styles.scrollView}>
        <View style={styles.content}>
          <Text style={styles.title}>PRIVACY POLICY FOR VERDICT PATH</Text>
          <Text style={styles.lastUpdated}>Last Updated: October 31, 2025</Text>
          
          <View style={styles.divider} />

          <Text style={styles.sectionTitle}>1. INTRODUCTION</Text>
          <Text style={styles.paragraph}>
            Welcome to Verdict Path ("we," "us," or "our"). This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our mobile application and related services (collectively, the "Service").
          </Text>
          <Text style={styles.paragraph}>
            Please read this Privacy Policy carefully. By accessing or using the Service, you acknowledge that you have read, understood, and agree to be bound by all the terms of this Privacy Policy. If you do not agree with the terms of this Privacy Policy, please do not access or use the Service.
          </Text>
          <Text style={styles.paragraph}>
            <Text style={styles.bold}>Verdict Path</Text> is a civil litigation case management application designed to help individual users, law firms, and medical providers manage case progress, communications, and related activities.
          </Text>

          <View style={styles.divider} />

          <Text style={styles.sectionTitle}>2. INFORMATION WE COLLECT</Text>
          
          <Text style={styles.subsectionTitle}>2.1 Information You Provide to Us</Text>
          
          <Text style={styles.bold}>Account Information:</Text>
          <Text style={styles.paragraph}>When you create an account, we collect:</Text>
          <Text style={styles.listItem}>• Email address</Text>
          <Text style={styles.listItem}>• Password (encrypted)</Text>
          <Text style={styles.listItem}>• First and last name</Text>
          <Text style={styles.listItem}>• User type (individual user, law firm, or medical provider)</Text>
          <Text style={styles.listItem}>• Firm name or provider name (if applicable)</Text>
          <Text style={styles.listItem}>• Subscription tier selection</Text>

          <Text style={styles.bold}>Payment Information:</Text>
          <Text style={styles.paragraph}>
            We use Stripe, a third-party payment processor, to process payments. We do not store your complete credit card information on our servers.
          </Text>

          <Text style={styles.subsectionTitle}>2.2 Information Collected Automatically</Text>
          <Text style={styles.paragraph}>
            We automatically collect device information, usage information, and push notification tokens to provide and improve the Service.
          </Text>

          <View style={styles.divider} />

          <Text style={styles.sectionTitle}>3. HOW WE USE YOUR INFORMATION</Text>
          <Text style={styles.paragraph}>We use the information we collect to:</Text>
          <Text style={styles.listItem}>• Create and manage your account</Text>
          <Text style={styles.listItem}>• Process your transactions and subscriptions</Text>
          <Text style={styles.listItem}>• Track litigation progress through the 9-stage roadmap</Text>
          <Text style={styles.listItem}>• Enable communication between users</Text>
          <Text style={styles.listItem}>• Deliver push notifications and alerts</Text>
          <Text style={styles.listItem}>• Synchronize calendar events</Text>
          <Text style={styles.listItem}>• Track achievements, badges, and gamification features</Text>

          <View style={styles.divider} />

          <Text style={styles.sectionTitle}>4. HOW WE SHARE YOUR INFORMATION</Text>
          <Text style={styles.paragraph}>
            <Text style={styles.bold}>We do not sell your personal information to third parties.</Text>
          </Text>
          <Text style={styles.paragraph}>We may share your information with:</Text>
          <Text style={styles.listItem}>• Connected law firms and medical providers (with your consent)</Text>
          <Text style={styles.listItem}>• Service providers (Stripe, Railway, Neon, Expo)</Text>
          <Text style={styles.listItem}>• Law enforcement (when legally required)</Text>

          <View style={styles.divider} />

          <Text style={styles.sectionTitle}>5. DATA SECURITY</Text>
          <Text style={styles.paragraph}>We implement security measures including:</Text>
          <Text style={styles.listItem}>• SSL/TLS encryption for data transmission</Text>
          <Text style={styles.listItem}>• Bcrypt password hashing</Text>
          <Text style={styles.listItem}>• Role-based access control (RBAC)</Text>
          <Text style={styles.listItem}>• JWT token-based authentication</Text>
          <Text style={styles.listItem}>• PCI-compliant payment processing through Stripe</Text>

          <View style={styles.divider} />

          <Text style={styles.sectionTitle}>6. YOUR PRIVACY RIGHTS</Text>
          <Text style={styles.paragraph}>You have the right to:</Text>
          <Text style={styles.listItem}>• Access your personal information</Text>
          <Text style={styles.listItem}>• Request correction of inaccurate information</Text>
          <Text style={styles.listItem}>• Request deletion of your account and data</Text>
          <Text style={styles.listItem}>• Opt-out of marketing communications</Text>
          <Text style={styles.listItem}>• Configure notification preferences</Text>

          <View style={styles.divider} />

          <Text style={styles.sectionTitle}>7. CHILDREN'S PRIVACY</Text>
          <Text style={styles.paragraph}>
            The Service is not intended for users under the age of 18. We do not knowingly collect personal information from children under 18.
          </Text>

          <View style={styles.divider} />

          <Text style={styles.sectionTitle}>8. INTERNATIONAL DATA TRANSFERS</Text>
          <Text style={styles.paragraph}>
            Verdict Path is based in the United States. If you are accessing the Service from outside the United States, your information may be transferred to, stored, and processed in the United States.
          </Text>

          <View style={styles.divider} />

          <Text style={styles.sectionTitle}>9. THIRD-PARTY SERVICES</Text>
          <Text style={styles.paragraph}>We use the following third-party services:</Text>
          <Text style={styles.listItem}>• Stripe - Payment processing</Text>
          <Text style={styles.listItem}>• Expo - Push notifications</Text>
          <Text style={styles.listItem}>• Railway - Backend hosting</Text>
          <Text style={styles.listItem}>• Neon - Database hosting</Text>

          <View style={styles.divider} />

          <Text style={styles.sectionTitle}>10. CONTACT US</Text>
          <Text style={styles.paragraph}>
            If you have any questions about this Privacy Policy, please contact us at:
          </Text>
          <Text style={styles.bold}>Email: contact@verdictpath.io</Text>
          <Text style={styles.paragraph}>
            We will respond to your inquiry within 30 days.
          </Text>

          <View style={styles.divider} />

          <Text style={styles.paragraph}>
            <Text style={styles.bold}>Effective Date:</Text> October 31, 2025
          </Text>
          <Text style={styles.paragraph}>
            <Text style={styles.bold}>Version:</Text> 1.0
          </Text>

          <Text style={styles.copyright}>© 2025 Verdict Path. All rights reserved.</Text>
        </View>
      </ScrollView>
    </View>
  );
};

const PRIVACY_POLICY_TEXT = `Full privacy policy text loaded from assets/privacy-policy.txt`;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 15,
    backgroundColor: theme.colors.primary,
    borderBottomWidth: 2,
    borderBottomColor: theme.colors.secondary,
  },
  backButton: {
    marginRight: 15,
  },
  backButtonText: {
    fontSize: 16,
    color: theme.colors.white,
    fontWeight: '600',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: theme.colors.white,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: 20,
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    color: theme.colors.primary,
    textAlign: 'center',
    marginBottom: 10,
  },
  lastUpdated: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    fontStyle: 'italic',
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: theme.colors.mahogany,
    marginTop: 15,
    marginBottom: 10,
  },
  subsectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.text,
    marginTop: 10,
    marginBottom: 8,
  },
  paragraph: {
    fontSize: 14,
    color: theme.colors.text,
    lineHeight: 22,
    marginBottom: 12,
  },
  bold: {
    fontWeight: 'bold',
    color: theme.colors.text,
    fontSize: 14,
    marginTop: 8,
  },
  listItem: {
    fontSize: 14,
    color: theme.colors.text,
    lineHeight: 22,
    marginBottom: 5,
    paddingLeft: 10,
  },
  divider: {
    height: 1,
    backgroundColor: theme.colors.secondary,
    marginVertical: 15,
  },
  copyright: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    marginTop: 20,
    marginBottom: 40,
    fontStyle: 'italic',
  },
});

export default PrivacyPolicyScreen;

import React from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity } from 'react-native';
import { commonStyles } from '../styles/commonStyles';
import { theme } from '../styles/theme';

const TermsOfServiceScreen = ({ onBack, onNavigate }) => {
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={onBack || (() => onNavigate && onNavigate('register'))}
        >
          <Text style={styles.backButtonText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Terms of Service</Text>
      </View>

      <ScrollView style={styles.scrollView}>
        <View style={styles.content}>
          <Text style={styles.title}>TERMS OF SERVICE FOR VERDICT PATH</Text>
          <Text style={styles.lastUpdated}>Last Updated: October 31, 2025</Text>
          
          <View style={styles.divider} />

          <Text style={styles.sectionTitle}>1. ACCEPTANCE OF TERMS</Text>
          <Text style={styles.paragraph}>
            Welcome to Verdict Path. These Terms of Service ("Terms," "Agreement") are a legal agreement between you and Verdict Path governing your use of the Verdict Path mobile application and related services.
          </Text>
          <Text style={styles.bold}>
            BY CREATING AN ACCOUNT, ACCESSING, OR USING THE SERVICE, YOU AGREE TO BE BOUND BY THESE TERMS. IF YOU DO NOT AGREE TO THESE TERMS, DO NOT USE THE SERVICE.
          </Text>

          <View style={styles.divider} />

          <Text style={styles.sectionTitle}>2. DESCRIPTION OF SERVICE</Text>
          <Text style={styles.paragraph}>Verdict Path is a mobile application designed to help users manage civil litigation cases. The Service provides:</Text>
          
          <Text style={styles.subsectionTitle}>For Individual Users:</Text>
          <Text style={styles.listItem}>• Interactive 9-stage litigation roadmap with 60 substages</Text>
          <Text style={styles.listItem}>• Case progress tracking</Text>
          <Text style={styles.listItem}>• Task management assigned by law firms</Text>
          <Text style={styles.listItem}>• Calendar integration for court dates and appointments</Text>
          <Text style={styles.listItem}>• Gamification features (achievements, badges, coin system)</Text>

          <Text style={styles.subsectionTitle}>For Law Firms:</Text>
          <Text style={styles.listItem}>• Client management portal</Text>
          <Text style={styles.listItem}>• Push notification sending to clients</Text>
          <Text style={styles.listItem}>• Task assignment and calendar event requests</Text>

          <Text style={styles.subsectionTitle}>Payment Processing:</Text>
          <Text style={styles.listItem}>• Subscription plans (Free, Basic, Premium)</Text>
          <Text style={styles.listItem}>• Secure payment processing through Stripe</Text>
          <Text style={styles.listItem}>• Multiple payment methods (credit cards, Apple Pay, Google Pay)</Text>

          <View style={styles.divider} />

          <Text style={styles.sectionTitle}>3. ELIGIBILITY</Text>
          <Text style={styles.paragraph}>You must be at least 18 years old to use the Service. By using the Service, you represent that you have the legal capacity to enter into these Terms.</Text>

          <View style={styles.divider} />

          <Text style={styles.sectionTitle}>4. USER CONTENT AND CONDUCT</Text>
          <Text style={styles.paragraph}>You retain ownership of all content you submit. By submitting content, you grant us a license to use it solely for providing the Service.</Text>
          
          <Text style={styles.subsectionTitle}>Prohibited Conduct:</Text>
          <Text style={styles.listItem}>• Post false, misleading, or fraudulent information</Text>
          <Text style={styles.listItem}>• Violate any laws or regulations</Text>
          <Text style={styles.listItem}>• Interfere with or disrupt the Service</Text>
          <Text style={styles.listItem}>• Attempt unauthorized access</Text>
          <Text style={styles.listItem}>• Use automated systems without permission</Text>

          <Text style={styles.subsectionTitle}>Important Disclaimer:</Text>
          <Text style={styles.bold}>NOT LEGAL ADVICE:</Text>
          <Text style={styles.paragraph}>
            Verdict Path is an educational and organizational tool. The Service does not provide legal advice. You should consult with a licensed attorney regarding your specific legal matters.
          </Text>

          <View style={styles.divider} />

          <Text style={styles.sectionTitle}>5. INTELLECTUAL PROPERTY</Text>
          <Text style={styles.paragraph}>
            The Service and its contents are owned by Verdict Path and protected by copyright, trademark, and other intellectual property laws. "Verdict Path" and our logos are trademarks of Verdict Path.
          </Text>

          <View style={styles.divider} />

          <Text style={styles.sectionTitle}>6. PAYMENT TERMS</Text>
          
          <Text style={styles.subsectionTitle}>Subscription Plans:</Text>
          <Text style={styles.bold}>Individual Users:</Text>
          <Text style={styles.listItem}>• Free Plan: $0/month - Basic features</Text>
          <Text style={styles.listItem}>• Premium Plan: $29.99/month - Full feature access</Text>
          
          <Text style={styles.bold}>Law Firms & Medical Providers:</Text>
          <Text style={styles.listItem}>• Free Plan: $0/month - Limited connections</Text>
          <Text style={styles.listItem}>• Basic Plan: $49/month - Expanded management</Text>
          <Text style={styles.listItem}>• Premium Plan: $149/month - Unlimited features</Text>

          <Text style={styles.subsectionTitle}>Billing and Renewal:</Text>
          <Text style={styles.listItem}>• Subscription fees are billed monthly in advance</Text>
          <Text style={styles.listItem}>• Subscriptions automatically renew unless cancelled</Text>
          <Text style={styles.listItem}>• Cancel anytime; access continues until period ends</Text>

          <Text style={styles.subsectionTitle}>Refund Policy:</Text>
          <Text style={styles.paragraph}>
            All subscription fees are non-refundable except as required by law. If you are unsatisfied within the first 7 days, contact support@verdictpath.io for a potential refund.
          </Text>

          <View style={styles.divider} />

          <Text style={styles.sectionTitle}>7. DISCLAIMERS</Text>
          <Text style={styles.bold}>SERVICE "AS IS"</Text>
          <Text style={styles.paragraph}>
            THE SERVICE IS PROVIDED ON AN "AS IS" AND "AS AVAILABLE" BASIS WITHOUT WARRANTIES OF ANY KIND. WE DO NOT GUARANTEE UNINTERRUPTED OR ERROR-FREE OPERATION.
          </Text>

          <View style={styles.divider} />

          <Text style={styles.sectionTitle}>8. LIMITATION OF LIABILITY</Text>
          <Text style={styles.paragraph}>
            TO THE MAXIMUM EXTENT PERMITTED BY LAW, VERDICT PATH SHALL NOT BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, OR CONSEQUENTIAL DAMAGES. OUR TOTAL LIABILITY SHALL NOT EXCEED THE AMOUNT YOU PAID US IN THE PRECEDING 12 MONTHS OR $100, WHICHEVER IS GREATER.
          </Text>

          <View style={styles.divider} />

          <Text style={styles.sectionTitle}>9. TERMINATION</Text>
          <Text style={styles.paragraph}>
            You may terminate your account at any time. We may suspend or terminate your account for violations of these Terms, fraudulent activity, or other reasons. Upon termination, your access will cease and we may delete your data.
          </Text>

          <View style={styles.divider} />

          <Text style={styles.sectionTitle}>10. DISPUTE RESOLUTION</Text>
          <Text style={styles.paragraph}>
            Before filing a claim, contact us at support@verdictpath.io to attempt informal resolution. Disputes will be resolved through binding arbitration rather than in court.
          </Text>
          <Text style={styles.bold}>CLASS ACTION WAIVER:</Text>
          <Text style={styles.paragraph}>
            Disputes will be resolved individually, not as part of a class action. You waive your right to participate in a class action lawsuit.
          </Text>

          <View style={styles.divider} />

          <Text style={styles.sectionTitle}>11. CONTACT US</Text>
          <Text style={styles.paragraph}>
            If you have questions about these Terms, please contact us at:
          </Text>
          <Text style={styles.bold}>Email: support@verdictpath.io</Text>
          <Text style={styles.paragraph}>
            We will respond to your inquiry within 30 days.
          </Text>

          <View style={styles.divider} />

          <Text style={styles.sectionTitle}>12. ACKNOWLEDGMENT</Text>
          <Text style={styles.bold}>
            BY USING THE SERVICE, YOU ACKNOWLEDGE THAT YOU HAVE READ THESE TERMS, UNDERSTAND THEM, AND AGREE TO BE BOUND BY THEM.
          </Text>
          <Text style={styles.paragraph}>
            If you do not agree to these Terms, you must not access or use the Service.
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
    marginBottom: 8,
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

export default TermsOfServiceScreen;

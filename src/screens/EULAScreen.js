import React from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity } from 'react-native';
import { commonStyles } from '../styles/commonStyles';
import { theme } from '../styles/theme';

const EULAScreen = ({ onBack, onNavigate }) => {
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={onBack || (() => onNavigate && onNavigate('register'))}
        >
          <Text style={styles.backButtonText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>End User License Agreement</Text>
      </View>

      <ScrollView style={styles.scrollView}>
        <View style={styles.content}>
          <Text style={styles.title}>END USER LICENSE AGREEMENT (EULA)</Text>
          <Text style={styles.subtitle}>FOR VERDICT PATH</Text>
          <Text style={styles.lastUpdated}>Last Updated: October 31, 2025</Text>
          
          <View style={styles.divider} />

          <Text style={styles.importantHeader}>IMPORTANT - READ CAREFULLY</Text>
          <Text style={styles.paragraph}>
            This End User License Agreement is a legal agreement between you and Verdict Path for the Verdict Path mobile application software.
          </Text>
          <Text style={styles.bold}>
            BY DOWNLOADING, INSTALLING, OR USING THE SOFTWARE, YOU AGREE TO BE BOUND BY THE TERMS OF THIS EULA. IF YOU DO NOT AGREE, DO NOT USE THE SOFTWARE.
          </Text>

          <View style={styles.divider} />

          <Text style={styles.sectionTitle}>1. DEFINITIONS</Text>
          <Text style={styles.listItem}><Text style={styles.bold}>Software:</Text> The Verdict Path mobile application, including all updates and modifications</Text>
          <Text style={styles.listItem}><Text style={styles.bold}>Device:</Text> Any mobile device on which the Software is installed</Text>
          <Text style={styles.listItem}><Text style={styles.bold}>User Account:</Text> Your account to access and use the Software</Text>
          <Text style={styles.listItem}><Text style={styles.bold}>Content:</Text> Any data or information you create or transmit through the Software</Text>
          <Text style={styles.listItem}><Text style={styles.bold}>Services:</Text> Cloud-based services including data storage, synchronization, and push notifications</Text>

          <View style={styles.divider} />

          <Text style={styles.sectionTitle}>2. LICENSE GRANT</Text>
          <Text style={styles.subsectionTitle}>2.1 Limited License</Text>
          <Text style={styles.paragraph}>
            Subject to your compliance with this EULA, we grant you a limited, non-exclusive, non-transferable, revocable license to:
          </Text>
          <Text style={styles.listItem}>• Download and install the Software on your Device(s)</Text>
          <Text style={styles.listItem}>• Access and use the Software for personal or business purposes</Text>
          <Text style={styles.listItem}>• Access the Services through the Software</Text>

          <Text style={styles.subsectionTitle}>2.2 License Restrictions - You May NOT:</Text>
          <Text style={styles.listItem}>• Copy, modify, or create derivative works of the Software</Text>
          <Text style={styles.listItem}>• Reverse engineer, decompile, or disassemble the Software</Text>
          <Text style={styles.listItem}>• Remove or alter copyright or proprietary notices</Text>
          <Text style={styles.listItem}>• Rent, lease, sell, redistribute, or sublicense the Software</Text>
          <Text style={styles.listItem}>• Use the Software to develop competing applications</Text>
          <Text style={styles.listItem}>• Use the Software for illegal or unauthorized purposes</Text>
          <Text style={styles.listItem}>• Circumvent security features or access restrictions</Text>
          <Text style={styles.listItem}>• Use automated systems (bots, scrapers) without permission</Text>

          <View style={styles.divider} />

          <Text style={styles.sectionTitle}>3. INSTALLATION AND USE</Text>
          <Text style={styles.subsectionTitle}>System Requirements:</Text>
          <Text style={styles.listItem}>• iOS 13.0 or later / Android 8.0 or later</Text>
          <Text style={styles.listItem}>• Internet connection for full functionality</Text>
          <Text style={styles.listItem}>• Valid email address for account creation</Text>

          <Text style={styles.subsectionTitle}>Account Requirements:</Text>
          <Text style={styles.listItem}>• Must be at least 18 years of age</Text>
          <Text style={styles.listItem}>• Provide accurate and complete information</Text>
          <Text style={styles.listItem}>• Maintain security of account credentials</Text>
          <Text style={styles.listItem}>• Comply with Terms of Service and Privacy Policy</Text>

          <View style={styles.divider} />

          <Text style={styles.sectionTitle}>4. SUBSCRIPTION AND PAYMENT</Text>
          <Text style={styles.subsectionTitle}>Subscription Tiers:</Text>
          <Text style={styles.bold}>Individual Users:</Text>
          <Text style={styles.listItem}>• Free Tier: Basic features at no cost</Text>
          <Text style={styles.listItem}>• Premium Tier: $29.99/month - Full feature access</Text>
          
          <Text style={styles.bold}>Law Firms & Medical Providers:</Text>
          <Text style={styles.listItem}>• Free Tier: $0/month - Limited connections</Text>
          <Text style={styles.listItem}>• Basic Tier: $49/month - Expanded management</Text>
          <Text style={styles.listItem}>• Premium Tier: $149/month - Unlimited features</Text>

          <Text style={styles.subsectionTitle}>Payment Terms:</Text>
          <Text style={styles.listItem}>• Subscription fees billed monthly in advance through Stripe</Text>
          <Text style={styles.listItem}>• Automatic recurring payments authorized</Text>
          <Text style={styles.listItem}>• Subscriptions auto-renew unless cancelled</Text>
          <Text style={styles.listItem}>• All fees are non-refundable except as required by law</Text>

          <View style={styles.divider} />

          <Text style={styles.sectionTitle}>5. INTELLECTUAL PROPERTY</Text>
          <Text style={styles.paragraph}>
            The Software and all its contents are owned by Verdict Path and protected by United States and international copyright, trademark, patent, and trade secret laws.
          </Text>
          <Text style={styles.paragraph}>
            "Verdict Path" and related logos are trademarks of Verdict Path. You may not use these marks without prior written permission.
          </Text>
          <Text style={styles.paragraph}>
            You retain ownership of your Content. By using the Software, you grant us a license to use your Content solely to provide the Services.
          </Text>

          <View style={styles.divider} />

          <Text style={styles.sectionTitle}>6. PRIVACY AND DATA</Text>
          <Text style={styles.paragraph}>
            Your use of the Software is governed by our Privacy Policy. We collect account information, usage data, device information, and payment information (processed by Stripe).
          </Text>
          <Text style={styles.subsectionTitle}>Data Security:</Text>
          <Text style={styles.listItem}>• Encryption of data in transit and at rest</Text>
          <Text style={styles.listItem}>• Secure authentication mechanisms</Text>
          <Text style={styles.listItem}>• Regular security audits</Text>
          <Text style={styles.paragraph}>
            However, no method is 100% secure. You use the Software at your own risk.
          </Text>

          <View style={styles.divider} />

          <Text style={styles.sectionTitle}>7. PROHIBITED USES</Text>
          <Text style={styles.paragraph}>You agree NOT to:</Text>
          <Text style={styles.listItem}>• Violate any laws or regulations</Text>
          <Text style={styles.listItem}>• Infringe on intellectual property rights</Text>
          <Text style={styles.listItem}>• Transmit viruses, malware, or harmful code</Text>
          <Text style={styles.listItem}>• Attempt unauthorized access to systems</Text>
          <Text style={styles.listItem}>• Interfere with or disrupt the Software</Text>
          <Text style={styles.listItem}>• Harass, threaten, or abuse other users</Text>
          <Text style={styles.listItem}>• Use the Software for unauthorized commercial purposes</Text>

          <View style={styles.divider} />

          <Text style={styles.sectionTitle}>8. DISCLAIMERS</Text>
          <Text style={styles.bold}>SOFTWARE PROVIDED "AS IS"</Text>
          <Text style={styles.paragraph}>
            THE SOFTWARE IS PROVIDED "AS IS" AND "AS AVAILABLE" WITHOUT WARRANTIES OF ANY KIND, EXPRESS OR IMPLIED. WE DO NOT WARRANT UNINTERRUPTED, ERROR-FREE, OR SECURE OPERATION.
          </Text>
          
          <Text style={styles.bold}>NOT LEGAL OR MEDICAL ADVICE</Text>
          <Text style={styles.paragraph}>
            The Software is an organizational and educational tool. It does not provide legal or medical advice. Consult with licensed professionals for advice specific to your situation.
          </Text>

          <Text style={styles.bold}>USE AT YOUR OWN RISK</Text>
          <Text style={styles.paragraph}>
            YOU ARE SOLELY RESPONSIBLE FOR ANY DAMAGE TO YOUR DEVICE, LOSS OF DATA, OR OTHER CONSEQUENCES FROM YOUR USE OF THE SOFTWARE.
          </Text>

          <View style={styles.divider} />

          <Text style={styles.sectionTitle}>9. LIMITATION OF LIABILITY</Text>
          <Text style={styles.paragraph}>
            TO THE MAXIMUM EXTENT PERMITTED BY LAW, VERDICT PATH SHALL NOT BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES, INCLUDING LOSS OF PROFITS, DATA, BUSINESS OPPORTUNITIES, OR GOODWILL.
          </Text>
          <Text style={styles.paragraph}>
            OUR TOTAL LIABILITY SHALL NOT EXCEED THE GREATER OF:
          </Text>
          <Text style={styles.listItem}>• The amount you paid in the preceding 12 months, or</Text>
          <Text style={styles.listItem}>• One hundred dollars ($100.00)</Text>

          <View style={styles.divider} />

          <Text style={styles.sectionTitle}>10. INDEMNIFICATION</Text>
          <Text style={styles.paragraph}>
            You agree to indemnify and hold harmless Verdict Path from any claims, damages, or expenses arising from your use of the Software, violation of this EULA, or violation of any laws.
          </Text>

          <View style={styles.divider} />

          <Text style={styles.sectionTitle}>11. TERMINATION</Text>
          <Text style={styles.paragraph}>
            You may terminate this license by uninstalling the Software and deleting your account. We may terminate your license for violations, fraudulent activity, or other reasons.
          </Text>
          <Text style={styles.paragraph}>
            Upon termination, your right to use the Software ceases immediately. We may delete your account and content. No refunds will be provided.
          </Text>

          <View style={styles.divider} />

          <Text style={styles.sectionTitle}>12. DISPUTE RESOLUTION</Text>
          <Text style={styles.paragraph}>
            Before filing a claim, contact support@verdictpath.io for informal resolution. If unsuccessful, disputes will be resolved through binding arbitration administered by the American Arbitration Association.
          </Text>
          <Text style={styles.bold}>CLASS ACTION WAIVER:</Text>
          <Text style={styles.paragraph}>
            Disputes will be resolved individually. You waive your right to participate in class action lawsuits or class-wide arbitration.
          </Text>

          <View style={styles.divider} />

          <Text style={styles.sectionTitle}>13. CONTACT US</Text>
          <Text style={styles.paragraph}>
            If you have questions about this EULA:
          </Text>
          <Text style={styles.bold}>Email: support@verdictpath.io</Text>
          <Text style={styles.paragraph}>We will respond within 30 days.</Text>

          <View style={styles.divider} />

          <Text style={styles.sectionTitle}>14. ACKNOWLEDGMENT</Text>
          <Text style={styles.bold}>
            BY DOWNLOADING, INSTALLING, OR USING THE SOFTWARE, YOU ACKNOWLEDGE THAT YOU HAVE READ AND UNDERSTOOD THIS EULA AND AGREE TO BE BOUND BY ITS TERMS.
          </Text>
          <Text style={styles.paragraph}>
            If you do not agree, you must not download, install, or use the Software.
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
    fontSize: 18,
    fontWeight: 'bold',
    color: theme.colors.white,
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: 20,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: theme.colors.primary,
    textAlign: 'center',
    marginBottom: 5,
  },
  subtitle: {
    fontSize: 18,
    fontWeight: '600',
    color: theme.colors.mahogany,
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
  importantHeader: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#c0392b',
    textAlign: 'center',
    marginBottom: 10,
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

export default EULAScreen;

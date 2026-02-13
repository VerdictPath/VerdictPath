import React from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity } from 'react-native';
import { commonStyles } from '../styles/commonStyles';
import { theme } from '../styles/theme';

const LegalDisclaimerScreen = ({ onBack, onNavigate }) => {
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={onBack || (() => onNavigate && onNavigate('landing'))}
        >
          <Text style={styles.backButtonText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Legal Disclaimer</Text>
      </View>

      <ScrollView style={styles.scrollView}>
        <View style={styles.content}>
          <Text style={styles.title}>LEGAL DISCLAIMER FOR VERDICT PATH</Text>
          <Text style={styles.lastUpdated}>Last Updated: February 10, 2026</Text>
          
          <View style={styles.divider} />

          <Text style={styles.sectionTitle}>1. NOT LEGAL ADVICE</Text>
          <Text style={styles.paragraph}>
            Verdict Path is an educational and organizational tool designed to help individuals understand and manage the general process of civil litigation. The information, content, roadmaps, tutorials, and any other materials provided through this application are for informational and educational purposes only.
          </Text>
          <Text style={styles.bold}>
            NOTHING IN THIS APPLICATION CONSTITUTES LEGAL ADVICE. THE USE OF VERDICT PATH DOES NOT CREATE AN ATTORNEY-CLIENT RELATIONSHIP BETWEEN YOU AND VERDICT PATH, ITS OWNERS, EMPLOYEES, OR AFFILIATES.
          </Text>

          <View style={styles.divider} />

          <Text style={styles.sectionTitle}>2. NO GUARANTEE OF OUTCOMES</Text>
          <Text style={styles.paragraph}>
            Verdict Path does not guarantee any particular legal outcome. Every legal matter is unique, and results vary based on individual circumstances, jurisdiction, applicable laws, and many other factors. The litigation roadmap and stage tracking features are general guides and may not reflect the specific procedures or requirements of your case or jurisdiction.
          </Text>

          <View style={styles.divider} />

          <Text style={styles.sectionTitle}>3. CONSULT A LICENSED ATTORNEY</Text>
          <Text style={styles.paragraph}>
            You are strongly encouraged to consult with a licensed attorney in your jurisdiction for advice specific to your legal situation. Do not rely solely on information provided by Verdict Path to make legal decisions. An attorney can provide guidance tailored to your specific circumstances and applicable law.
          </Text>

          <View style={styles.divider} />

          <Text style={styles.sectionTitle}>4. MEDICAL INFORMATION DISCLAIMER</Text>
          <Text style={styles.paragraph}>
            The Medical Hub feature within Verdict Path is designed solely for document storage and organization purposes. It is not a medical records system and should not be used as a substitute for official medical records management. Verdict Path does not provide medical advice, diagnosis, or treatment recommendations.
          </Text>

          <View style={styles.divider} />

          <Text style={styles.sectionTitle}>5. ACCURACY OF INFORMATION</Text>
          <Text style={styles.paragraph}>
            While Verdict Path strives to provide accurate and up-to-date information, we make no representations or warranties of any kind, express or implied, about the completeness, accuracy, reliability, suitability, or availability of the information, content, or related materials contained in the application. Any reliance you place on such information is strictly at your own risk.
          </Text>

          <View style={styles.divider} />

          <Text style={styles.sectionTitle}>6. LIMITATION OF LIABILITY</Text>
          <Text style={styles.paragraph}>
            To the fullest extent permitted by applicable law, Verdict Path, its owners, officers, directors, employees, agents, and affiliates shall not be liable for any direct, indirect, incidental, special, consequential, or punitive damages arising out of or related to your use of or inability to use the application, including but not limited to:
          </Text>
          <Text style={styles.listItem}>• Any errors or omissions in the content</Text>
          <Text style={styles.listItem}>• Any loss or damage of any kind incurred as a result of the use of any content posted, transmitted, or otherwise made available via the application</Text>
          <Text style={styles.listItem}>• Any adverse legal outcomes</Text>
          <Text style={styles.listItem}>• Loss of data or documents</Text>
          <Text style={styles.listItem}>• Missed deadlines or court dates</Text>

          <View style={styles.divider} />

          <Text style={styles.sectionTitle}>7. THIRD-PARTY SERVICES</Text>
          <Text style={styles.paragraph}>
            Verdict Path may integrate with third-party services including but not limited to payment processors, cloud storage providers, and communication services. Verdict Path is not responsible for the actions, policies, or practices of any third-party services. Your use of third-party services is subject to their respective terms and conditions.
          </Text>

          <View style={styles.divider} />

          <Text style={styles.sectionTitle}>8. JURISDICTIONAL VARIATIONS</Text>
          <Text style={styles.paragraph}>
            Legal procedures, timelines, and requirements vary significantly by jurisdiction. The litigation stages and substages presented in Verdict Path represent a general overview of civil litigation processes and may not accurately reflect the specific procedures required in your state, county, or federal court. Always verify procedural requirements with your attorney or local court.
          </Text>

          <View style={styles.divider} />

          <Text style={styles.sectionTitle}>9. HIPAA COMPLIANCE NOTICE</Text>
          <Text style={styles.paragraph}>
            While Verdict Path implements security measures designed to protect sensitive information, including HIPAA-compliant encryption and access controls, users are responsible for ensuring their own compliance with applicable privacy laws and regulations. Verdict Path does not guarantee absolute security of stored data.
          </Text>

          <View style={styles.divider} />

          <Text style={styles.sectionTitle}>10. CHANGES TO THIS DISCLAIMER</Text>
          <Text style={styles.paragraph}>
            Verdict Path reserves the right to modify this Legal Disclaimer at any time. Changes will be effective immediately upon posting within the application. Your continued use of the application after any changes constitutes your acceptance of the modified disclaimer.
          </Text>

          <View style={styles.divider} />

          <Text style={styles.sectionTitle}>11. CONTACT INFORMATION</Text>
          <Text style={styles.paragraph}>
            If you have questions about this Legal Disclaimer, please contact us at:
          </Text>
          <Text style={styles.paragraph}>
            Email: support@verdictpath.io
          </Text>

          <Text style={styles.copyright}>
            © 2026 Verdict Path. All rights reserved.
          </Text>
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
    paddingHorizontal: 15,
    paddingVertical: 15,
    backgroundColor: theme.colors.mahogany,
  },
  backButton: {
    marginRight: 15,
  },
  backButtonText: {
    color: theme.colors.white,
    fontSize: 16,
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

export default LegalDisclaimerScreen;

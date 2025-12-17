import React, { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { theme } from '../styles/theme';
import { medicalProviderTheme } from '../styles/medicalProviderTheme';

const getThemeColors = (userType) => {
  if (userType === 'medical_provider') {
    return {
      primary: medicalProviderTheme.colors.primary,
      accent: medicalProviderTheme.colors.primaryLight,
    };
  }
  return {
    primary: theme.colors.mahogany,
    accent: theme.colors.warmGold,
  };
};

const FeatureComparisonMatrix = ({
  heading = '📊 Compare Plans',
  subheading = 'Choose the plan that best fits your firm\'s needs',
  standardFeatures = [],
  premiumFeatures = [],
  showDisbursementNote = true,
  disbursementNoteText = null,
  standardLabel = 'Standard',
  standardDescription = 'Core features for your practice',
  premiumLabel = 'Premium',
  premiumDescription = null,
  userType = null
}) => {
  const themeColors = useMemo(() => getThemeColors(userType), [userType]);
  const styles = useMemo(() => createStyles(themeColors), [themeColors]);
  const premiumDescText = premiumDescription || `Everything in ${standardLabel}, plus:`;
  const defaultDisbursementNote = 'Settlement Disbursements is a premium-only feature. Upgrade to Premium to process payments to clients and medical providers.';
  const noteText = disbursementNoteText || defaultDisbursementNote;
  
  return (
    <View style={styles.container}>
      <Text style={styles.title}>{heading}</Text>
      <Text style={styles.subtitle}>{subheading}</Text>
      
      <View style={styles.grid}>
        {/* Standard/Basic Column */}
        <View style={styles.column}>
          <View style={styles.header}>
            <Text style={styles.planName}>{standardLabel}</Text>
            <Text style={styles.planDescription}>{standardDescription}</Text>
          </View>
          <View style={styles.features}>
            <Text style={styles.featuresTitle}>Included:</Text>
            {standardFeatures.map((feature, index) => (
              <View key={index} style={styles.featureItem}>
                <Text style={styles.featureCheck}>✓</Text>
                <Text style={styles.featureText}>{feature}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Premium Column */}
        <View style={[styles.column, styles.columnPremium]}>
          <View style={[styles.header, styles.headerPremium]}>
            <View style={styles.badge}>
              <Text style={styles.badgeText}>⭐ PREMIUM</Text>
            </View>
            <Text style={[styles.planName, styles.planNamePremium]}>{premiumLabel}</Text>
            <Text style={styles.planDescription}>{premiumDescText}</Text>
          </View>
          <View style={styles.features}>
            <Text style={styles.featuresTitle}>Additional Features:</Text>
            {premiumFeatures.map((feature, index) => (
              <View key={index} style={styles.featureItem}>
                <Text style={styles.featureCheck}>✓</Text>
                <Text style={styles.featureText}>{feature}</Text>
              </View>
            ))}
          </View>
        </View>
      </View>
      
      {showDisbursementNote && (
        <View style={styles.note}>
          <Text style={styles.noteIcon}>💡</Text>
          <Text style={styles.noteText}>
            {noteText}
          </Text>
        </View>
      )}
    </View>
  );
};

const createStyles = (colors) => StyleSheet.create({
  container: {
    backgroundColor: '#fff',
    marginHorizontal: 20,
    marginVertical: 16,
    padding: 20,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: theme.colors.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    color: colors.primary,
    textAlign: 'center',
    marginBottom: 8
  },
  subtitle: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    marginBottom: 20
  },
  grid: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 16
  },
  column: {
    flex: 1,
    backgroundColor: '#f9f9f9',
    borderRadius: 10,
    padding: 16,
    borderWidth: 2,
    borderColor: '#e0e0e0'
  },
  columnPremium: {
    backgroundColor: '#f0fdf9',
    borderColor: colors.accent,
    borderWidth: 2
  },
  header: {
    marginBottom: 16,
    paddingBottom: 12,
    borderBottomWidth: 2,
    borderBottomColor: '#e0e0e0'
  },
  headerPremium: {
    borderBottomColor: colors.accent
  },
  planName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: theme.colors.text,
    marginBottom: 4
  },
  planNamePremium: {
    color: colors.primary
  },
  planDescription: {
    fontSize: 13,
    color: theme.colors.textSecondary,
    fontStyle: 'italic'
  },
  features: {
    gap: 10
  },
  featuresTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.text,
    marginBottom: 8
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8
  },
  featureCheck: {
    fontSize: 14,
    color: '#4CAF50',
    fontWeight: 'bold',
    marginTop: 2
  },
  featureText: {
    flex: 1,
    fontSize: 13,
    color: theme.colors.text,
    lineHeight: 18
  },
  badge: {
    backgroundColor: colors.accent,
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 12,
    alignSelf: 'flex-start',
    marginBottom: 8,
    borderWidth: 1,
    borderColor: theme.colors.secondary
  },
  badgeText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#fff'
  },
  note: {
    backgroundColor: '#e8f4ff',
    padding: 12,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    borderLeftWidth: 4,
    borderLeftColor: colors.primary
  },
  noteIcon: {
    fontSize: 18,
    marginTop: 2
  },
  noteText: {
    flex: 1,
    fontSize: 13,
    color: theme.colors.text,
    lineHeight: 18
  }
});

export default FeatureComparisonMatrix;

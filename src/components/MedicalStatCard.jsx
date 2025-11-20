// Medical Stat Card - Statistics display component

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import MedicalGlassCard from './MedicalGlassCard';
import { medicalProviderTheme } from '../styles/medicalProviderTheme';

const MedicalStatCard = ({ 
  icon, 
  label, 
  value, 
  trend, 
  color = medicalProviderTheme.colors.accentTeal,
  variant = 'white',
  size = 'large',
  status,
  onPress 
}) => {
  const isSmall = size === 'small';
  
  return (
    <MedicalGlassCard variant={variant} onPress={onPress} style={[styles.card, isSmall && styles.cardSmall]}>
      <View style={[styles.content, isSmall && styles.contentSmall]}>
        {icon && (
          <LinearGradient
            colors={[color + '30', color + '10']}
            style={[styles.iconContainer, isSmall && styles.iconContainerSmall]}
          >
            <Text style={[styles.icon, isSmall && styles.iconSmall]}>{icon}</Text>
          </LinearGradient>
        )}
        
        <View style={styles.info}>
          <Text style={[styles.label, isSmall && styles.labelSmall]}>{label}</Text>
          <View style={styles.valueRow}>
            <Text style={[styles.value, isSmall && styles.valueSmall, { color }]}>{value}</Text>
            {trend && (
              <Text style={[
                styles.trend, 
                isSmall && styles.trendSmall,
                { color: trend > 0 ? medicalProviderTheme.colors.healthy : medicalProviderTheme.colors.critical }
              ]}>
                {trend > 0 ? '↑' : '↓'} {Math.abs(trend)}%
              </Text>
            )}
          </View>
        </View>
      </View>
    </MedicalGlassCard>
  );
};

const styles = StyleSheet.create({
  card: {
    padding: 16,
    marginBottom: 12,
  },
  cardSmall: {
    padding: 12,
    flex: 1,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  contentSmall: {
    flexDirection: 'column',
    alignItems: 'flex-start',
  },
  iconContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  iconContainerSmall: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 0,
    marginBottom: 8,
  },
  icon: {
    fontSize: 28,
  },
  iconSmall: {
    fontSize: 20,
  },
  info: {
    flex: 1,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: medicalProviderTheme.colors.mediumGray,
    marginBottom: 4,
  },
  labelSmall: {
    fontSize: 11,
    marginBottom: 2,
  },
  valueRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  value: {
    fontSize: 28,
    fontWeight: '700',
    marginRight: 12,
  },
  valueSmall: {
    fontSize: 22,
    marginRight: 0,
  },
  trend: {
    fontSize: 14,
    fontWeight: '600',
  },
  trendSmall: {
    fontSize: 11,
  },
});

export default MedicalStatCard;

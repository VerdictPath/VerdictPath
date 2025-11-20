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
  onPress 
}) => {
  return (
    <MedicalGlassCard variant={variant} onPress={onPress} style={styles.card}>
      <View style={styles.content}>
        {icon && (
          <LinearGradient
            colors={[color + '30', color + '10']}
            style={styles.iconContainer}
          >
            <Text style={styles.icon}>{icon}</Text>
          </LinearGradient>
        )}
        
        <View style={styles.info}>
          <Text style={styles.label}>{label}</Text>
          <View style={styles.valueRow}>
            <Text style={[styles.value, { color }]}>{value}</Text>
            {trend && (
              <Text style={[
                styles.trend, 
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
  content: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  icon: {
    fontSize: 28,
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
  valueRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  value: {
    fontSize: 28,
    fontWeight: '700',
    marginRight: 12,
  },
  trend: {
    fontSize: 14,
    fontWeight: '600',
  },
});

export default MedicalStatCard;

// Medical Glass Card - Reusable card component with Deep Teal & Silver theme

import React from 'react';
import { TouchableOpacity, View, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { medicalProviderTheme } from '../styles/medicalProviderTheme';

const MedicalGlassCard = ({ 
  children, 
  variant = 'white', 
  onPress, 
  style,
  intensity = 20,
  disabled = false 
}) => {
  const variants = {
    white: {
      colors: ['#FFFFFF', '#FAFAFA'],
      borderColor: 'rgba(17, 94, 89, 0.15)',
    },
    glass: {
      colors: ['rgba(255, 255, 255, 0.95)', 'rgba(245, 247, 250, 0.9)'],
      borderColor: 'rgba(17, 94, 89, 0.2)',
    },
    teal: {
      colors: ['rgba(17, 94, 89, 0.08)', 'rgba(17, 94, 89, 0.04)'],
      borderColor: 'rgba(17, 94, 89, 0.25)',
    },
    silver: {
      colors: ['rgba(168, 168, 168, 0.1)', 'rgba(192, 192, 192, 0.05)'],
      borderColor: 'rgba(168, 168, 168, 0.3)',
    },
    mint: {
      colors: ['rgba(94, 234, 212, 0.1)', 'rgba(94, 234, 212, 0.05)'],
      borderColor: 'rgba(94, 234, 212, 0.3)',
    },
  };

  const variantStyle = variants[variant] || variants.white;

  const CardContainer = onPress ? TouchableOpacity : View;

  return (
    <CardContainer
      onPress={onPress}
      disabled={disabled || !onPress}
      activeOpacity={0.7}
      style={[styles.container, style]}
    >
      <LinearGradient
        colors={variantStyle.colors}
        style={styles.gradient}
      >
        <View style={[styles.border, { borderColor: variantStyle.borderColor }]}>
          {children}
        </View>
      </LinearGradient>
    </CardContainer>
  );
};

const styles = StyleSheet.create({
  container: {
    borderRadius: medicalProviderTheme.borderRadius.medium,
    overflow: 'hidden',
    ...medicalProviderTheme.shadows.card,
  },
  gradient: {
    borderRadius: medicalProviderTheme.borderRadius.medium,
  },
  border: {
    borderRadius: medicalProviderTheme.borderRadius.medium,
    borderWidth: 1,
  },
});

export default MedicalGlassCard;

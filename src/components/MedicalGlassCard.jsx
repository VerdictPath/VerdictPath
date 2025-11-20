// Medical Glass Card - Reusable frosted glass card component

import React from 'react';
import { TouchableOpacity, View, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
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
      colors: ['rgba(255, 255, 255, 0.95)', 'rgba(255, 255, 255, 0.85)'],
      borderColor: 'rgba(0, 188, 212, 0.15)',
    },
    glass: {
      colors: ['rgba(255, 255, 255, 0.7)', 'rgba(255, 255, 255, 0.5)'],
      borderColor: 'rgba(0, 188, 212, 0.2)',
    },
    mint: {
      colors: ['rgba(178, 235, 242, 0.3)', 'rgba(178, 235, 242, 0.2)'],
      borderColor: medicalProviderTheme.colors.accentTeal + '40',
    },
    teal: {
      colors: ['rgba(0, 188, 212, 0.15)', 'rgba(0, 168, 200, 0.1)'],
      borderColor: medicalProviderTheme.colors.accentTeal + '60',
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

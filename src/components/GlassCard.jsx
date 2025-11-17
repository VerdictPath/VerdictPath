import React from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { lawFirmTheme } from '../styles/theme';

const GlassCard = ({ 
  children, 
  style = {}, 
  variant = 'medium',
  onPress = null,
  shadowIntensity = 'medium',
}) => {
  const glassStyles = {
    light: styles.glassLight,
    medium: styles.glassMedium,
    dark: styles.glassDark,
  };

  const shadowStyles = {
    none: {},
    small: lawFirmTheme.shadows.small,
    medium: lawFirmTheme.shadows.medium,
    large: lawFirmTheme.shadows.large,
  };

  const CardContainer = onPress ? TouchableOpacity : View;

  return (
    <CardContainer
      onPress={onPress}
      style={[
        styles.card,
        glassStyles[variant],
        shadowStyles[shadowIntensity],
        style,
      ]}
    >
      <LinearGradient
        colors={[
          'rgba(59, 130, 246, 0.4)',
          'rgba(59, 130, 246, 0.1)',
          'rgba(59, 130, 246, 0.05)',
        ]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.borderGradient}
      />
      
      <View style={styles.content}>
        {children}
      </View>
    </CardContainer>
  );
};

const styles = StyleSheet.create({
  card: {
    borderRadius: 16,
    overflow: 'hidden',
    position: 'relative',
  },
  glassLight: {
    backgroundColor: 'rgba(59, 130, 246, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  glassMedium: {
    backgroundColor: 'rgba(30, 58, 95, 0.4)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.18)',
  },
  glassDark: {
    backgroundColor: 'rgba(10, 25, 41, 0.8)',
    borderWidth: 1,
    borderColor: 'rgba(59, 130, 246, 0.3)',
  },
  borderGradient: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 2,
  },
  content: {
    position: 'relative',
  },
});

export default GlassCard;

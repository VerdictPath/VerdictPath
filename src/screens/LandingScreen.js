import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Image } from 'react-native';
import { commonStyles } from '../styles/commonStyles';

const LandingScreen = ({ onNavigate }) => {
  return (
    <View style={commonStyles.container}>
      <View style={styles.heroSection}>
        <Image 
          source={require('../../attached_assets/verdict-path-logo.png')}
          style={styles.logo}
          resizeMode="contain"
        />
      </View>

      <View style={styles.buttonContainer}>
        <TouchableOpacity 
          style={commonStyles.primaryButton}
          onPress={() => onNavigate('register')}
        >
          <Text style={commonStyles.buttonText}>Get Started</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={commonStyles.secondaryButton}
          onPress={() => onNavigate('login')}
        >
          <Text style={commonStyles.secondaryButtonText}>Sign In</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.featuresContainer}>
        <Text style={styles.featureTitle}>What You'll Get:</Text>
        <Text style={styles.featureItem}>📍 Interactive case roadmap</Text>
        <Text style={styles.featureItem}>🎮 Earn coins as you progress</Text>
        <Text style={styles.featureItem}>🎓 Expert video tutorials</Text>
        <Text style={styles.featureItem}>🏥 Secure medical records storage</Text>
        <Text style={styles.featureItem}>⚡ Daily login rewards</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  heroSection: {
    alignItems: 'center',
    paddingVertical: 40,
    paddingHorizontal: 20,
  },
  logo: {
    width: 300,
    height: 300,
    marginBottom: 20,
  },
  buttonContainer: {
    paddingHorizontal: 20,
    marginTop: 20,
  },
  featuresContainer: {
    padding: 30,
    marginTop: 30,
  },
  featureTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#2c3e50',
    marginBottom: 15,
  },
  featureItem: {
    fontSize: 16,
    color: '#34495e',
    marginBottom: 10,
  },
});

export default LandingScreen;

import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Image } from 'react-native';
import { commonStyles } from '../styles/commonStyles';

const LandingScreen = ({ onNavigate }) => {
  return (
    <View style={commonStyles.container}>
      <View style={styles.heroSection}>
        <Image 
          source={require('../../attached_assets/verdict-path-logo-seamless.png')}
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
        <View style={styles.featureRow}>
          <View style={styles.iconBadge}>
            <View style={styles.iconScale}>
              <View style={styles.scalePanLeft} />
              <View style={styles.scalePanRight} />
              <View style={styles.scaleBeam} />
              <View style={styles.scaleBase} />
            </View>
          </View>
          <Text style={styles.featureItem}>Interactive case roadmap</Text>
        </View>
        <View style={styles.featureRow}>
          <View style={styles.iconBadge}>
            <View style={styles.iconStar}>
              <View style={styles.ribbonLeft} />
              <View style={styles.ribbonRight} />
              <View style={styles.medalCircle} />
              <View style={styles.medalStar} />
            </View>
          </View>
          <Text style={styles.featureItem}>Earn coins as you progress</Text>
        </View>
        <View style={styles.featureRow}>
          <View style={styles.iconBadge}>
            <View style={styles.iconPlay} />
          </View>
          <Text style={styles.featureItem}>Expert video tutorials</Text>
        </View>
        <View style={styles.featureRow}>
          <View style={styles.iconBadge}>
            <View style={styles.iconDocument}>
              <View style={styles.docLine1} />
              <View style={styles.docLine2} />
              <View style={styles.docLine3} />
            </View>
          </View>
          <Text style={styles.featureItem}>Secure medical records storage</Text>
        </View>
        <View style={styles.featureRow}>
          <View style={styles.iconBadge}>
            <View style={styles.iconGift}>
              <View style={styles.giftBox} />
              <View style={styles.giftRibbon} />
            </View>
          </View>
          <Text style={styles.featureItem}>Daily login rewards</Text>
        </View>
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
    width: 350,
    height: 350,
    marginBottom: 10,
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
    marginBottom: 20,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  iconBadge: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#3498db',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  featureItem: {
    fontSize: 16,
    color: '#34495e',
    flex: 1,
  },
  iconScale: {
    width: 18,
    height: 18,
    position: 'relative',
  },
  scaleBeam: {
    width: 16,
    height: 1.5,
    backgroundColor: '#ffffff',
    position: 'absolute',
    top: 6,
    left: 1,
  },
  scaleBase: {
    width: 1.5,
    height: 10,
    backgroundColor: '#ffffff',
    position: 'absolute',
    bottom: 0,
    left: 8.25,
  },
  scalePanLeft: {
    width: 5,
    height: 4,
    borderWidth: 1,
    borderColor: '#ffffff',
    borderTopWidth: 0,
    backgroundColor: 'transparent',
    position: 'absolute',
    top: 6,
    left: 0,
  },
  scalePanRight: {
    width: 5,
    height: 4,
    borderWidth: 1,
    borderColor: '#ffffff',
    borderTopWidth: 0,
    backgroundColor: 'transparent',
    position: 'absolute',
    top: 6,
    right: 0,
  },
  iconStar: {
    width: 16,
    height: 18,
    position: 'relative',
  },
  ribbonLeft: {
    width: 2,
    height: 6,
    backgroundColor: '#ffffff',
    position: 'absolute',
    top: 0,
    left: 4,
  },
  ribbonRight: {
    width: 2,
    height: 6,
    backgroundColor: '#ffffff',
    position: 'absolute',
    top: 0,
    right: 4,
  },
  medalCircle: {
    width: 10,
    height: 10,
    borderRadius: 5,
    borderWidth: 2,
    borderColor: '#ffffff',
    backgroundColor: 'transparent',
    position: 'absolute',
    left: 3,
    bottom: 0,
  },
  medalStar: {
    width: 4,
    height: 4,
    backgroundColor: '#ffffff',
    position: 'absolute',
    left: 6,
    bottom: 3,
    transform: [{ rotate: '45deg' }],
  },
  iconPlay: {
    width: 0,
    height: 0,
    borderLeftWidth: 12,
    borderTopWidth: 8,
    borderBottomWidth: 8,
    borderLeftColor: '#ffffff',
    borderTopColor: 'transparent',
    borderBottomColor: 'transparent',
    marginLeft: 2,
  },
  iconDocument: {
    width: 14,
    height: 18,
    borderWidth: 2,
    borderColor: '#ffffff',
    backgroundColor: 'transparent',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 2,
  },
  docLine1: {
    width: 8,
    height: 1,
    backgroundColor: '#ffffff',
    marginBottom: 2,
  },
  docLine2: {
    width: 8,
    height: 1,
    backgroundColor: '#ffffff',
    marginBottom: 2,
  },
  docLine3: {
    width: 8,
    height: 1,
    backgroundColor: '#ffffff',
  },
  iconGift: {
    width: 16,
    height: 16,
    position: 'relative',
  },
  giftBox: {
    width: 14,
    height: 10,
    borderWidth: 2,
    borderColor: '#ffffff',
    backgroundColor: 'transparent',
    position: 'absolute',
    bottom: 0,
    left: 1,
  },
  giftRibbon: {
    width: 14,
    height: 2,
    backgroundColor: '#ffffff',
    position: 'absolute',
    top: 5,
    left: 1,
  },
});

export default LandingScreen;

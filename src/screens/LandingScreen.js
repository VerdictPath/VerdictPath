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
          <View style={styles.iconBadgeMap}>
            <View style={styles.iconCompass}>
              <View style={styles.compassOuter} />
              <View style={styles.compassInner} />
              <View style={styles.compassNeedleNorth} />
              <View style={styles.compassNeedleSouth} />
            </View>
          </View>
          <Text style={styles.featureItem}>Interactive case roadmap</Text>
        </View>
        <View style={styles.featureRow}>
          <View style={styles.iconBadgeCoin}>
            <View style={styles.iconCoin}>
              <View style={styles.coinOuter} />
              <View style={styles.coinInner} />
              <View style={styles.coinShine} />
            </View>
          </View>
          <Text style={styles.featureItem}>Earn coins as you progress</Text>
        </View>
        <View style={styles.featureRow}>
          <View style={styles.iconBadgeSpyglass}>
            <View style={styles.iconSpyglass}>
              <View style={styles.spyglassBody} />
              <View style={styles.spyglassLens} />
            </View>
          </View>
          <Text style={styles.featureItem}>Expert video tutorials</Text>
        </View>
        <View style={styles.featureRow}>
          <View style={styles.iconBadgeChest}>
            <View style={styles.iconChest}>
              <View style={styles.chestBottom} />
              <View style={styles.chestTop} />
              <View style={styles.chestLock} />
            </View>
          </View>
          <Text style={styles.featureItem}>Secure medical records storage</Text>
        </View>
        <View style={styles.featureRow}>
          <View style={styles.iconBadgeGem}>
            <View style={styles.iconGem}>
              <View style={styles.gemTop} />
              <View style={styles.gemBottom} />
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
  featureItem: {
    fontSize: 16,
    color: '#34495e',
    flex: 1,
  },
  iconBadgeMap: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#1a3a52',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
    borderWidth: 2,
    borderColor: '#8B7355',
  },
  iconCompass: {
    width: 20,
    height: 20,
    position: 'relative',
  },
  compassOuter: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#D4AF37',
    backgroundColor: 'transparent',
  },
  compassInner: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#2c5f7f',
    position: 'absolute',
    top: 4,
    left: 4,
  },
  compassNeedleNorth: {
    width: 0,
    height: 0,
    borderLeftWidth: 3,
    borderRightWidth: 3,
    borderBottomWidth: 8,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderBottomColor: '#e74c3c',
    position: 'absolute',
    top: 2,
    left: 7,
  },
  compassNeedleSouth: {
    width: 0,
    height: 0,
    borderLeftWidth: 3,
    borderRightWidth: 3,
    borderTopWidth: 8,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderTopColor: '#D4AF37',
    position: 'absolute',
    bottom: 2,
    left: 7,
  },
  iconBadgeCoin: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#8B6914',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
    borderWidth: 2,
    borderColor: '#D4AF37',
  },
  iconCoin: {
    width: 18,
    height: 18,
    position: 'relative',
  },
  coinOuter: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#FFD700',
    borderWidth: 1.5,
    borderColor: '#B8860B',
  },
  coinInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    borderWidth: 1,
    borderColor: '#B8860B',
    backgroundColor: 'transparent',
    position: 'absolute',
    top: 4,
    left: 4,
  },
  coinShine: {
    width: 4,
    height: 2,
    backgroundColor: '#FFFACD',
    borderRadius: 2,
    position: 'absolute',
    top: 5,
    left: 5,
  },
  iconBadgeSpyglass: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#2c3e50',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
    borderWidth: 2,
    borderColor: '#7f8c8d',
  },
  iconSpyglass: {
    width: 20,
    height: 8,
    position: 'relative',
  },
  spyglassBody: {
    width: 18,
    height: 6,
    backgroundColor: '#34495e',
    borderRadius: 3,
    borderWidth: 1,
    borderColor: '#95a5a6',
    position: 'absolute',
    left: 0,
    top: 1,
  },
  spyglassLens: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#5dade2',
    borderWidth: 1,
    borderColor: '#7f8c8d',
    position: 'absolute',
    right: 0,
    top: 1,
  },
  iconBadgeChest: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#6b4423',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
    borderWidth: 2,
    borderColor: '#D4AF37',
  },
  iconChest: {
    width: 18,
    height: 16,
    position: 'relative',
  },
  chestBottom: {
    width: 18,
    height: 10,
    backgroundColor: '#8B4513',
    borderWidth: 1,
    borderColor: '#654321',
    position: 'absolute',
    bottom: 0,
  },
  chestTop: {
    width: 18,
    height: 6,
    backgroundColor: '#A0522D',
    borderWidth: 1,
    borderColor: '#654321',
    borderTopLeftRadius: 3,
    borderTopRightRadius: 3,
    position: 'absolute',
    top: 0,
  },
  chestLock: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#FFD700',
    borderWidth: 1,
    borderColor: '#B8860B',
    position: 'absolute',
    bottom: 3,
    left: 7,
  },
  iconBadgeGem: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#1a1a2e',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
    borderWidth: 2,
    borderColor: '#9b59b6',
  },
  iconGem: {
    width: 14,
    height: 16,
    position: 'relative',
  },
  gemTop: {
    width: 0,
    height: 0,
    borderLeftWidth: 7,
    borderRightWidth: 7,
    borderBottomWidth: 8,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderBottomColor: '#9b59b6',
    position: 'absolute',
    top: 0,
    left: 0,
  },
  gemBottom: {
    width: 0,
    height: 0,
    borderLeftWidth: 7,
    borderRightWidth: 7,
    borderTopWidth: 8,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderTopColor: '#8e44ad',
    position: 'absolute',
    bottom: 0,
    left: 0,
  },
});

export default LandingScreen;

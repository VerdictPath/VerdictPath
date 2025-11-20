import React, { useRef, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Image } from 'react-native';
import { Video, ResizeMode } from 'expo-av';
import { commonStyles } from '../styles/commonStyles';
import { theme } from '../styles/theme';
import FeatheredImage from '../components/FeatheredImage';

const LandingScreen = ({ onNavigate }) => {
  const videoRef = useRef(null);

  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.playAsync();
    }
  }, []);

  return (
    <View style={commonStyles.container}>
      <Video
        ref={videoRef}
        source={require('../../attached_assets/Ship in Medium Weather 10sec_1763359328620.mp4')}
        style={styles.backgroundVideo}
        resizeMode={ResizeMode.COVER}
        isLooping
        isMuted
        shouldPlay
      />
      
      <View style={styles.overlay}>
        <View style={styles.logoContainer}>
          <FeatheredImage 
            source={require('../../attached_assets/Nautical Pirate Logo with Foggy Sea Background_1762830868803.png')}
            style={styles.logo}
            resizeMode="contain"
            featherAmount={0.2}
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
            <Image 
              source={require('../../attached_assets/MAP_1763356928680.png')}
              style={styles.treasureMapThumbnail}
              resizeMode="cover"
            />
          </View>
          <Text style={styles.featureItem}>Interactive case roadmap</Text>
        </View>
        <View style={styles.featureRow}>
          <View style={styles.iconBadgeTreasure}>
            <Image 
              source={require('../../attached_assets/_a_pirates_treasure_chest_of_gold_1763356815342.png')}
              style={styles.treasureChestThumbnail}
              resizeMode="cover"
            />
          </View>
          <Text style={styles.featureItem}>Earn treasure as you progress</Text>
        </View>
        <View style={styles.featureRow}>
          <View style={styles.iconBadgeVideoCamera}>
            <Image 
              source={require('../../attached_assets/video_1762018822588.jpeg')}
              style={styles.videoCameraThumbnail}
              resizeMode="cover"
            />
          </View>
          <Text style={styles.featureItem}>Educational audio/video tutorials</Text>
        </View>
        <View style={styles.featureRow}>
          <View style={styles.iconBadgeHospital}>
            <View style={styles.iconHospital}>
              <View style={styles.hospitalCrossVertical} />
              <View style={styles.hospitalCrossHorizontal} />
            </View>
          </View>
          <Text style={styles.featureItem}>Medical Hub COMING SOON</Text>
        </View>
        <View style={styles.featureRow}>
          <View style={styles.iconBadgeLocker}>
            <Image 
              source={require('../../attached_assets/vault_1762018272142.jpeg')}
              style={styles.vaultThumbnail}
              resizeMode="cover"
            />
          </View>
          <Text style={styles.featureItem}>Evidence Locker</Text>
        </View>
      </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  backgroundVideo: {
    position: 'absolute',
    top: 0,
    left: 0,
    bottom: 0,
    right: 0,
    width: '100%',
    height: '100%',
  },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    zIndex: 1,
  },
  logoContainer: {
    position: 'absolute',
    top: 20,
    left: 20,
    zIndex: 10,
  },
  logo: {
    width: 120,
    height: 120,
  },
  buttonContainer: {
    paddingHorizontal: 20,
    marginTop: 160,
  },
  featuresContainer: {
    padding: 30,
    marginTop: 30,
  },
  featureTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 20,
    textShadowColor: 'rgba(0, 0, 0, 0.8)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 3,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  featureItem: {
    fontSize: 16,
    color: '#FFFFFF',
    flex: 1,
    textShadowColor: 'rgba(0, 0, 0, 0.8)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 3,
  },
  iconBadgeMap: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: theme.colors.charcoal,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
    borderWidth: 2,
    borderColor: theme.colors.secondary,
    overflow: 'hidden',
  },
  treasureMapThumbnail: {
    width: 40,
    height: 40,
  },
  iconBadgeTreasure: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: theme.colors.charcoal,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
    borderWidth: 2,
    borderColor: theme.colors.secondary,
    overflow: 'hidden',
  },
  treasureChestThumbnail: {
    width: 40,
    height: 40,
  },
  iconBadgeVideoCamera: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: theme.colors.charcoal,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
    borderWidth: 2,
    borderColor: theme.colors.secondary,
    overflow: 'hidden',
  },
  videoCameraThumbnail: {
    width: 40,
    height: 40,
  },
  iconBadgeHospital: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: theme.colors.cream,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
    borderWidth: 2,
    borderColor: theme.colors.deepMaroon,
  },
  iconHospital: {
    width: 16,
    height: 16,
    position: 'relative',
  },
  hospitalCrossVertical: {
    width: 5,
    height: 16,
    backgroundColor: theme.colors.deepMaroon,
    position: 'absolute',
    left: 5.5,
    top: 0,
  },
  hospitalCrossHorizontal: {
    width: 16,
    height: 5,
    backgroundColor: theme.colors.deepMaroon,
    position: 'absolute',
    left: 0,
    top: 5.5,
  },
  iconBadgeLocker: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: theme.colors.charcoal,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
    borderWidth: 2,
    borderColor: theme.colors.secondary,
    overflow: 'hidden',
  },
  vaultThumbnail: {
    width: 40,
    height: 40,
  },
});

export default LandingScreen;

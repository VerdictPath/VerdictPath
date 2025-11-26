import React, { useRef, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Image } from 'react-native';
import { Video, ResizeMode } from 'expo-av';
import { commonStyles } from '../styles/commonStyles';
import { theme } from '../styles/theme';

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
        resizeMode={ResizeMode.CONTAIN}
        isLooping
        isMuted
        shouldPlay
      />
      
      <View style={styles.overlay}>
        {/* Verdict Path Logo - Top Left Corner */}
        <Image 
          source={require('../../attached_assets/Nautical Pirate Logo with Foggy Sea Background_1762830868803.png')}
          style={styles.logo}
          resizeMode="contain"
        />
        
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
              source={require('../../attached_assets/Old Camera Closeup_1764040319335.png')}
              style={styles.videoCameraThumbnail}
              resizeMode="cover"
            />
          </View>
          <Text style={styles.featureItem}>Educational audio/video tutorials</Text>
        </View>
        <View style={styles.featureRow}>
          <View style={styles.iconBadgeMedical}>
            <Image 
              source={require('../../attached_assets/Medical Symbol Pirate_1764039521695.png')}
              style={styles.medicalSymbolThumbnail}
              resizeMode="cover"
            />
          </View>
          <Text style={styles.featureItem}>Medical Hub COMING SOON</Text>
        </View>
        <View style={styles.featureRow}>
          <View style={styles.iconBadgeLocker}>
            <Image 
              source={require('../../attached_assets/Evidence Vault_1764037430801.png')}
              style={styles.vaultThumbnail}
              resizeMode="cover"
            />
          </View>
          <Text style={styles.featureItem}>Evidence Vault</Text>
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
  logo: {
    position: 'absolute',
    top: 20,
    left: '50%',
    marginLeft: -100,
    width: 200,
    height: 200,
    zIndex: 10,
  },
  buttonContainer: {
    paddingHorizontal: 20,
    marginTop: 240,
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
  iconBadgeMedical: {
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
  medicalSymbolThumbnail: {
    width: 40,
    height: 40,
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

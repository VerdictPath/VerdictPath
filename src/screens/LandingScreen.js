import React, { useRef, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Image, ScrollView, Dimensions } from 'react-native';
import { Video, ResizeMode } from 'expo-av';
import { commonStyles } from '../styles/commonStyles';
import { theme } from '../styles/theme';

const { height: screenHeight } = Dimensions.get('window');

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
      
      <ScrollView 
        style={styles.overlay}
        contentContainerStyle={styles.overlayContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Verdict Path Logo */}
        <View style={styles.logoContainer}>
          <Image 
            source={require('../../attached_assets/Nautical Pirate Logo with Foggy Sea Background_1762830868803.png')}
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
            <Image 
              source={require('../../attached_assets/MAP_1763356928680.png')}
              style={styles.iconThumbnail}
              resizeMode="cover"
            />
          </View>
          <Text style={styles.featureItem}>Interactive case roadmap</Text>
        </View>
        <View style={styles.featureRow}>
          <View style={styles.iconBadge}>
            <Image 
              source={require('../../attached_assets/_a_pirates_treasure_chest_of_gold_1763356815342.png')}
              style={styles.iconThumbnail}
              resizeMode="cover"
            />
          </View>
          <Text style={styles.featureItem}>Earn treasure as you progress</Text>
        </View>
        <View style={styles.featureRow}>
          <View style={styles.iconBadge}>
            <Image 
              source={require('../../attached_assets/Old Camera Closeup_1764040319335.png')}
              style={styles.iconThumbnail}
              resizeMode="cover"
            />
          </View>
          <Text style={styles.featureItem}>Educational audio/video tutorials</Text>
        </View>
        <View style={styles.featureRow}>
          <View style={styles.iconBadge}>
            <Image 
              source={require('../../attached_assets/Medical Symbol Pirate_1764039521695.png')}
              style={styles.iconThumbnail}
              resizeMode="cover"
            />
          </View>
          <Text style={styles.featureItem}>Medical Hub COMING SOON</Text>
        </View>
        <View style={styles.featureRow}>
          <View style={styles.iconBadge}>
            <Image 
              source={require('../../attached_assets/Evidence Vault_1764037430801.png')}
              style={styles.iconThumbnail}
              resizeMode="cover"
            />
          </View>
          <Text style={styles.featureItem}>Evidence Vault</Text>
        </View>
      </View>
      </ScrollView>
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
  overlayContent: {
    flexGrow: 1,
    paddingBottom: 20,
  },
  logoContainer: {
    alignItems: 'center',
    marginTop: 10,
    marginBottom: 5,
  },
  logo: {
    width: 140,
    height: 140,
  },
  buttonContainer: {
    paddingHorizontal: 20,
    marginTop: 5,
  },
  featuresContainer: {
    paddingHorizontal: 20,
    paddingVertical: 15,
    marginTop: 10,
  },
  featureTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 12,
    textShadowColor: 'rgba(0, 0, 0, 0.8)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 3,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  featureItem: {
    fontSize: 14,
    color: '#FFFFFF',
    flex: 1,
    textShadowColor: 'rgba(0, 0, 0, 0.8)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 3,
  },
  iconBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: theme.colors.charcoal,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    borderWidth: 2,
    borderColor: theme.colors.secondary,
    overflow: 'hidden',
  },
  iconThumbnail: {
    width: 32,
    height: 32,
  },
});

export default LandingScreen;

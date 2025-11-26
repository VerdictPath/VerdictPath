import React, { useState, useEffect, useRef } from 'react';
import { 
  Modal, 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity,
  useWindowDimensions,
  Animated
} from 'react-native';
import { Video, ResizeMode } from 'expo-av';
import { BlurView } from 'expo-blur';
import { AVATARS } from '../constants/avatars';

const ActionVideoModal = ({ 
  visible, 
  onClose, 
  avatarType = 'captain',
  message = '',
  coinsEarned = 0,
}) => {
  const { width, height } = useWindowDimensions();
  const videoRef = useRef(null);
  const [showContent, setShowContent] = useState(false);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.8)).current;

  const avatar = AVATARS[avatarType.toUpperCase()];
  
  const isPhone = width < 768;
  const isTablet = width >= 768 && width < 1024;
  const isDesktop = width >= 1024;

  useEffect(() => {
    if (visible) {
      playVideo();
      animateIn();
    } else {
      setShowContent(false);
    }
  }, [visible]);

  const playVideo = async () => {
    if (videoRef.current && avatar) {
      try {
        await videoRef.current.unloadAsync();
        
        await videoRef.current.loadAsync(avatar.actionVideo, {
          shouldPlay: true,
          isLooping: false,
          volume: 0.7,
        });
        
        console.log('[ActionVideoModal] Playing action video');
      } catch (error) {
        console.error('[ActionVideoModal] Video error:', error);
      }
    }
  };

  const animateIn = () => {
    setShowContent(true);
    
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        tension: 50,
        friction: 7,
        useNativeDriver: true,
      }),
    ]).start();

    setTimeout(() => {
      handleClose();
    }, 6500);
  };

  const handleClose = () => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.timing(scaleAnim, {
        toValue: 0.8,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start(() => {
      onClose();
    });
  };

  const handlePlaybackComplete = () => {
    console.log('[ActionVideoModal] Playback complete');
    handleClose();
  };

  if (!avatar) return null;

  const getModalDimensions = () => {
    if (isDesktop) {
      return { width: Math.min(width * 0.5, 600), height: Math.min(height * 0.8, 700) };
    } else if (isTablet) {
      return { width: width * 0.7, height: height * 0.75 };
    }
    return { width: width * 0.92, height: height * 0.72 };
  };

  const modalDimensions = getModalDimensions();

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="none"
      onRequestClose={handleClose}
    >
      <BlurView intensity={90} style={styles.blurContainer}>
        <Animated.View 
          style={[
            styles.modalContent,
            {
              width: modalDimensions.width,
              height: modalDimensions.height,
              opacity: fadeAnim,
              transform: [{ scale: scaleAnim }],
            }
          ]}
        >
          <View style={styles.videoContainer}>
            <Video
              ref={videoRef}
              rate={1.0}
              volume={0.7}
              isMuted={false}
              isLooping={false}
              shouldPlay={visible}
              resizeMode={ResizeMode.COVER}
              style={styles.video}
              onPlaybackStatusUpdate={(status) => {
                if (status.didJustFinish) {
                  handlePlaybackComplete();
                }
              }}
            />
          </View>

          {showContent && (
            <Animated.View 
              style={[
                styles.messageContainer,
                { 
                  opacity: fadeAnim,
                  bottom: isDesktop ? 100 : isTablet ? 90 : 80,
                  padding: isDesktop ? 30 : isTablet ? 28 : 25,
                }
              ]}
            >
              <Text style={[
                styles.messageTitle,
                { fontSize: isDesktop ? 32 : isTablet ? 30 : 28 }
              ]}>{message}</Text>
              
              {coinsEarned > 0 && (
                <View style={styles.coinsContainer}>
                  <Text style={[
                    styles.coinsText,
                    { fontSize: isDesktop ? 48 : isTablet ? 44 : 40 }
                  ]}>+{coinsEarned}</Text>
                  <Text style={[
                    styles.coinsLabel,
                    { fontSize: isDesktop ? 26 : isTablet ? 24 : 22 }
                  ]}>⚓ COINS</Text>
                </View>
              )}
            </Animated.View>
          )}

          <TouchableOpacity 
            style={[
              styles.skipButton,
              { 
                top: isDesktop ? 25 : 20,
                right: isDesktop ? 25 : 20,
                paddingHorizontal: isDesktop ? 24 : 20,
                paddingVertical: isDesktop ? 14 : 12,
              }
            ]}
            onPress={handleClose}
          >
            <Text style={[
              styles.skipText,
              { fontSize: isDesktop ? 18 : 16 }
            ]}>Close ✕</Text>
          </TouchableOpacity>
        </Animated.View>
      </BlurView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  blurContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContent: {
    borderRadius: 25,
    overflow: 'hidden',
    backgroundColor: '#000',
    shadowColor: '#FFD700',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 20,
    elevation: 10,
  },
  videoContainer: {
    width: '100%',
    height: '100%',
  },
  video: {
    width: '100%',
    height: '100%',
  },
  messageContainer: {
    position: 'absolute',
    left: 20,
    right: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.85)',
    borderRadius: 20,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#FFD700',
  },
  messageTitle: {
    fontWeight: 'bold',
    color: '#FFFFFF',
    textAlign: 'center',
    marginBottom: 15,
    textShadowColor: '#000',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  coinsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 10,
  },
  coinsText: {
    fontWeight: 'bold',
    color: '#FFD700',
    marginRight: 10,
    textShadowColor: '#000',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  coinsLabel: {
    fontWeight: 'bold',
    color: '#FFD700',
  },
  skipButton: {
    position: 'absolute',
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    borderRadius: 25,
    borderWidth: 1,
    borderColor: '#FFFFFF',
  },
  skipText: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
});

export default ActionVideoModal;

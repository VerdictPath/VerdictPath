import React, { useState, useEffect, useRef } from 'react';
import { 
  Modal, 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity,
  useWindowDimensions,
  Animated,
  Platform,
  StatusBar,
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
  
  const isSmallPhone = width < 375;
  const isPhone = width < 768;
  const isTablet = width >= 768 && width < 1024;
  const isLargeTablet = width >= 1024 && width < 1280;
  const isDesktop = width >= 1280;
  const isLargeDesktop = width >= 1440;
  
  const aspectRatio = height / width;
  const isTallDevice = aspectRatio > 1.8;
  const isShortDevice = aspectRatio < 1.5;
  const isLandscape = width > height;

  useEffect(() => {
    if (visible) {
      playVideo();
      animateIn();
    } else {
      setShowContent(false);
      fadeAnim.setValue(0);
      scaleAnim.setValue(0.8);
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
        
      } catch (error) {
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
    handleClose();
  };

  if (!avatar) return null;

  const getModalDimensions = () => {
    const statusBarHeight = Platform.OS === 'ios' ? 44 : StatusBar.currentHeight || 0;
    const safeHeight = height - statusBarHeight;

    if (isLargeDesktop) {
      return { 
        width: Math.min(width * 0.45, 650), 
        height: Math.min(safeHeight * 0.85, 750) 
      };
    }
    
    if (isDesktop) {
      return { 
        width: Math.min(width * 0.5, 600), 
        height: Math.min(safeHeight * 0.8, 700) 
      };
    }
    
    if (isLargeTablet) {
      return { 
        width: width * 0.6, 
        height: safeHeight * 0.78 
      };
    }
    
    if (isTablet) {
      if (isLandscape) {
        return { 
          width: height * 0.7, 
          height: safeHeight * 0.85 
        };
      }
      return { 
        width: width * 0.75, 
        height: safeHeight * 0.7 
      };
    }

    if (isLandscape) {
      return { 
        width: height * 0.85, 
        height: safeHeight * 0.9 
      };
    }

    if (isTallDevice) {
      return { 
        width: width * 0.92, 
        height: safeHeight * 0.65 
      };
    }
    
    if (isShortDevice) {
      return { 
        width: width * 0.92, 
        height: safeHeight * 0.78 
      };
    }
    
    if (isSmallPhone) {
      return { 
        width: width * 0.94, 
        height: safeHeight * 0.7 
      };
    }

    return { 
      width: width * 0.92, 
      height: safeHeight * 0.72 
    };
  };

  const getFontSizes = () => {
    if (isLargeDesktop) return { title: 36, coins: 52, label: 28 };
    if (isDesktop) return { title: 32, coins: 48, label: 26 };
    if (isLargeTablet) return { title: 30, coins: 46, label: 24 };
    if (isTablet) return { title: 28, coins: 44, label: 22 };
    if (isSmallPhone) return { title: 24, coins: 36, label: 20 };
    return { title: 28, coins: 40, label: 22 };
  };

  const getMessagePosition = () => {
    if (isLargeDesktop) return 110;
    if (isDesktop) return 100;
    if (isLargeTablet) return 95;
    if (isTablet) return 90;
    if (isTallDevice) return 70;
    if (isSmallPhone) return 60;
    return 80;
  };

  const getButtonPosition = () => {
    if (isDesktop || isLargeTablet) return { top: 25, right: 25 };
    if (isTablet) return { top: 22, right: 22 };
    return { top: 18, right: 18 };
  };

  const modalDimensions = getModalDimensions();
  const fonts = getFontSizes();
  const buttonPos = getButtonPosition();

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="none"
      onRequestClose={handleClose}
      statusBarTranslucent={true}
    >
      <BlurView intensity={Platform.OS === 'ios' ? 90 : 100} style={styles.blurContainer}>
        <Animated.View 
          style={[
            styles.modalContent,
            {
              width: modalDimensions.width,
              height: modalDimensions.height,
              opacity: fadeAnim,
              transform: [{ scale: scaleAnim }],
              borderRadius: isSmallPhone ? 20 : 25,
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
                  bottom: getMessagePosition(),
                  padding: isDesktop ? 30 : isTablet ? 28 : isSmallPhone ? 20 : 25,
                  marginHorizontal: isSmallPhone ? 12 : 20,
                }
              ]}
            >
              <Text style={[styles.messageTitle, { fontSize: fonts.title }]}>
                {message}
              </Text>
              
              {coinsEarned > 0 && (
                <View style={styles.coinsContainer}>
                  <Text style={[styles.coinsText, { fontSize: fonts.coins }]}>
                    +{coinsEarned}
                  </Text>
                  <Text style={[styles.coinsLabel, { fontSize: fonts.label }]}>
                    ⚓ COINS
                  </Text>
                </View>
              )}
            </Animated.View>
          )}

          <TouchableOpacity 
            style={[
              styles.skipButton,
              { 
                top: buttonPos.top,
                right: buttonPos.right,
                paddingHorizontal: isDesktop ? 24 : isSmallPhone ? 16 : 20,
                paddingVertical: isDesktop ? 14 : isSmallPhone ? 10 : 12,
              }
            ]}
            onPress={handleClose}
            activeOpacity={0.7}
          >
            <Text style={[
              styles.skipText,
              { fontSize: isDesktop ? 18 : isSmallPhone ? 14 : 16 }
            ]}>
              Close ✕
            </Text>
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
    left: 0,
    right: 0,
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

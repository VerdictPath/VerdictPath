import React, { useState, useEffect, useRef } from 'react';
import { 
  Modal, 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity,
  Dimensions,
  Animated
} from 'react-native';
import { Video, ResizeMode } from 'expo-av';
import { BlurView } from 'expo-blur';
import { AVATARS } from '../constants/avatars';

const { width, height } = Dimensions.get('window');

const ActionVideoModal = ({ 
  visible, 
  onClose, 
  avatarType = 'captain',
  message = '',
  coinsEarned = 0,
}) => {
  const videoRef = useRef(null);
  const [showContent, setShowContent] = useState(false);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.8)).current;

  const avatar = AVATARS[avatarType.toUpperCase()];

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
                { opacity: fadeAnim }
              ]}
            >
              <Text style={styles.messageTitle}>{message}</Text>
              
              {coinsEarned > 0 && (
                <View style={styles.coinsContainer}>
                  <Text style={styles.coinsText}>+{coinsEarned}</Text>
                  <Text style={styles.coinsLabel}>⚓ COINS</Text>
                </View>
              )}
            </Animated.View>
          )}

          <TouchableOpacity 
            style={styles.skipButton}
            onPress={handleClose}
          >
            <Text style={styles.skipText}>Close ✕</Text>
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
    width: width * 0.9,
    height: height * 0.7,
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
    bottom: 80,
    left: 20,
    right: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.85)',
    padding: 25,
    borderRadius: 20,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#FFD700',
  },
  messageTitle: {
    fontSize: 28,
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
    fontSize: 40,
    fontWeight: 'bold',
    color: '#FFD700',
    marginRight: 10,
    textShadowColor: '#000',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  coinsLabel: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#FFD700',
  },
  skipButton: {
    position: 'absolute',
    top: 20,
    right: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 25,
    borderWidth: 1,
    borderColor: '#FFFFFF',
  },
  skipText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
});

export default ActionVideoModal;

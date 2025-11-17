import React, { useEffect, useRef } from 'react';
import { View, Text, Modal, Animated, StyleSheet, Dimensions } from 'react-native';
import { Video, ResizeMode } from 'expo-av';

const { width, height } = Dimensions.get('window');

const CelebrationAnimation = ({ visible, onComplete, milestone, coinsEarned = 100 }) => {
  const videoRef = useRef(null);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.5)).current;
  const bounceAnim = useRef(new Animated.Value(0)).current;
  const rotateAnim = useRef(new Animated.Value(0)).current;
  const confettiAnims = useRef(
    Array.from({ length: 30 }, () => ({
      x: new Animated.Value(Math.random() * width),
      y: new Animated.Value(-50),
      rotation: new Animated.Value(0),
    }))
  ).current;

  useEffect(() => {
    if (visible) {
      // Play video
      playVideo();
      
      // Reset animations
      fadeAnim.setValue(0);
      scaleAnim.setValue(0.3);
      bounceAnim.setValue(0);
      rotateAnim.setValue(0);
      confettiAnims.forEach(anim => {
        anim.x.setValue(Math.random() * width);
        anim.y.setValue(-50);
        anim.rotation.setValue(0);
      });

      // Explosive entrance with bounce
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 150,
          useNativeDriver: true,
        }),
        Animated.spring(scaleAnim, {
          toValue: 1,
          tension: 80,
          friction: 5,
          useNativeDriver: true,
        }),
        Animated.sequence([
          Animated.timing(bounceAnim, {
            toValue: 1,
            duration: 200,
            useNativeDriver: true,
          }),
          Animated.spring(bounceAnim, {
            toValue: 0,
            tension: 100,
            friction: 3,
            useNativeDriver: true,
          }),
        ]),
        Animated.timing(rotateAnim, {
          toValue: 1,
          duration: 400,
          useNativeDriver: true,
        }),
      ]).start();

      // Faster confetti explosion
      const confettiAnimations = confettiAnims.map((anim) =>
        Animated.parallel([
          Animated.timing(anim.y, {
            toValue: height + 100,
            duration: 800 + Math.random() * 400,
            useNativeDriver: true,
          }),
          Animated.timing(anim.rotation, {
            toValue: Math.random() * 1080,
            duration: 1000,
            useNativeDriver: true,
          }),
        ])
      );

      Animated.parallel(confettiAnimations).start();

      // Auto-dismiss after video completes (extended duration)
      setTimeout(() => {
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }).start(() => onComplete());
      }, 2500);
    }
  }, [visible]);

  const playVideo = async () => {
    if (videoRef.current) {
      try {
        await videoRef.current.unloadAsync();
        await videoRef.current.loadAsync(
          require('../../attached_assets/raining_small_gold_coins_from_the_sky_1763418163239.mp4'),
          {
            shouldPlay: true,
            isLooping: false,
            volume: 0.8,
          }
        );
        console.log('[CelebrationAnimation] Playing NEW raining coins celebration video');
      } catch (error) {
        console.error('[CelebrationAnimation] Video error:', error);
      }
    }
  };

  if (!visible) return null;

  return (
    <Modal transparent visible={visible} animationType="none">
      <View style={styles.overlay}>
        {/* Confetti */}
        {confettiAnims.map((anim, index) => (
          <Animated.View
            key={index}
            style={[
              styles.confetti,
              {
                left: anim.x,
                transform: [
                  { translateY: anim.y },
                  { 
                    rotate: anim.rotation.interpolate({
                      inputRange: [0, 360],
                      outputRange: ['0deg', '360deg'],
                    })
                  },
                ],
                backgroundColor: ['#d4a574', '#2c3e50', '#8b4513', '#f39c12'][index % 4],
              },
            ]}
          />
        ))}

        {/* Video celebration card */}
        <Animated.View
          style={[
            styles.celebrationCard,
            {
              opacity: fadeAnim,
              transform: [
                { scale: scaleAnim },
                { 
                  translateY: bounceAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0, -20],
                  })
                },
              ],
            },
          ]}
        >
          <View style={styles.videoContainer}>
            <Video
              ref={videoRef}
              rate={1.0}
              volume={0.8}
              isMuted={false}
              isLooping={false}
              shouldPlay={visible}
              resizeMode={ResizeMode.CONTAIN}
              style={styles.video}
            />
          </View>
          
          <View style={styles.messageContainer}>
            <Text style={styles.congratsText}>💰 COINS RAINING DOWN! 💰</Text>
            <View style={styles.coinsContainer}>
              <Text style={styles.coinsBig}>🪙</Text>
              <Text style={styles.coinsEarnedText}>+{coinsEarned}</Text>
              <Text style={styles.coinsBig}>🪙</Text>
            </View>
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  confetti: {
    position: 'absolute',
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  celebrationCard: {
    backgroundColor: '#1a1a1a',
    borderRadius: 20,
    padding: 15,
    alignItems: 'center',
    borderWidth: 4,
    borderColor: '#FFD700',
    width: width * 0.85,
    maxWidth: 450,
    shadowColor: '#FFD700',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 15,
    elevation: 15,
  },
  videoContainer: {
    width: '100%',
    height: 250,
    borderRadius: 15,
    overflow: 'hidden',
    marginBottom: 15,
    backgroundColor: '#000',
  },
  video: {
    width: '100%',
    height: '100%',
  },
  messageContainer: {
    alignItems: 'center',
  },
  congratsText: {
    fontSize: 26,
    fontWeight: '900',
    color: '#FFD700',
    marginBottom: 10,
    textShadowColor: '#FF6B00',
    textShadowOffset: { width: 2, height: 2 },
    textShadowRadius: 4,
    letterSpacing: 2,
  },
  coinsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  coinsBig: {
    fontSize: 48,
  },
  coinsEarnedText: {
    fontSize: 42,
    fontWeight: 'bold',
    color: '#FFD700',
    textShadowColor: '#FF6B00',
    textShadowOffset: { width: 2, height: 2 },
    textShadowRadius: 4,
  },
});

export default CelebrationAnimation;

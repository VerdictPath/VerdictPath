import React, { useEffect, useRef } from 'react';
import { View, Text, Modal, Animated, StyleSheet, Dimensions } from 'react-native';

const { width, height } = Dimensions.get('window');

const CelebrationAnimation = ({ visible, onComplete, milestone, coinsEarned = 100 }) => {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.5)).current;
  const confettiAnims = useRef(
    Array.from({ length: 20 }, () => ({
      x: new Animated.Value(Math.random() * width),
      y: new Animated.Value(-50),
      rotation: new Animated.Value(0),
    }))
  ).current;

  useEffect(() => {
    if (visible) {
      // Reset animations
      fadeAnim.setValue(0);
      scaleAnim.setValue(0.5);
      confettiAnims.forEach(anim => {
        anim.x.setValue(Math.random() * width);
        anim.y.setValue(-50);
        anim.rotation.setValue(0);
      });

      // Start main animation
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

      // Confetti animation
      const confettiAnimations = confettiAnims.map((anim) =>
        Animated.parallel([
          Animated.timing(anim.y, {
            toValue: height + 100,
            duration: 2000 + Math.random() * 1000,
            useNativeDriver: true,
          }),
          Animated.timing(anim.rotation, {
            toValue: Math.random() * 720,
            duration: 2000,
            useNativeDriver: true,
          }),
        ])
      );

      Animated.parallel(confettiAnimations).start();

      // Auto-dismiss after 2.5 seconds
      setTimeout(() => {
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }).start(() => onComplete());
      }, 2500);
    }
  }, [visible]);

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

        {/* Main celebration card */}
        <Animated.View
          style={[
            styles.celebrationCard,
            {
              opacity: fadeAnim,
              transform: [{ scale: scaleAnim }],
            },
          ]}
        >
          <Text style={styles.treasure}>💰</Text>
          <Text style={styles.congratsText}>Ahoy, Matey!</Text>
          <Text style={styles.milestoneText}>Milestone Complete!</Text>
          {milestone && (
            <Text style={styles.milestoneName}>{milestone}</Text>
          )}
          <Text style={styles.coinsText}>⚓ +{coinsEarned} Coins Earned! ⚓</Text>
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
    backgroundColor: '#f9f6f0',
    borderRadius: 20,
    padding: 30,
    alignItems: 'center',
    borderWidth: 3,
    borderColor: '#d4a574',
    width: width * 0.8,
    maxWidth: 400,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 10,
  },
  treasure: {
    fontSize: 60,
    marginBottom: 10,
  },
  congratsText: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginBottom: 5,
  },
  milestoneText: {
    fontSize: 18,
    color: '#8b4513',
    marginBottom: 10,
  },
  milestoneName: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 15,
    fontStyle: 'italic',
  },
  coinsText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#d4a574',
  },
});

export default CelebrationAnimation;

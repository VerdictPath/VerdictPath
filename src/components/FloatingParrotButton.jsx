import React, { useState, useRef, useEffect } from 'react';
import { 
  TouchableOpacity, 
  Animated, 
  Modal,
  StyleSheet,
  View,
  Text
} from 'react-native';
import { BlurView } from 'expo-blur';
import ParrotNavigator from './ParrotNavigator';

const FloatingParrotButton = ({ onNavigate, userType = 'individual' }) => {
  const [isVisible, setIsVisible] = useState(false);
  const [showTooltip, setShowTooltip] = useState(true);
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const tooltipAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.15,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
      ])
    );
    pulse.start();

    Animated.timing(tooltipAnim, {
      toValue: 1,
      duration: 500,
      useNativeDriver: true,
    }).start();

    const tooltipTimer = setTimeout(() => {
      Animated.timing(tooltipAnim, {
        toValue: 0,
        duration: 500,
        useNativeDriver: true,
      }).start(() => setShowTooltip(false));
    }, 5000);

    return () => {
      pulse.stop();
      clearTimeout(tooltipTimer);
    };
  }, []);

  const handlePressIn = () => {
    Animated.spring(scaleAnim, {
      toValue: 0.9,
      useNativeDriver: true,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      friction: 3,
      tension: 40,
      useNativeDriver: true,
    }).start();
  };

  const handlePress = () => {
    setIsVisible(true);
  };

  return (
    <>
      <Animated.View
        style={[
          styles.floatingButton,
          {
            transform: [
              { scale: Animated.multiply(scaleAnim, pulseAnim) }
            ]
          }
        ]}
      >
        <TouchableOpacity
          onPressIn={handlePressIn}
          onPressOut={handlePressOut}
          onPress={handlePress}
          activeOpacity={0.8}
          style={styles.buttonTouchable}
        >
          <BlurView intensity={30} tint="dark" style={styles.buttonBlur}>
            <View style={styles.buttonContent}>
              <Text style={styles.parrotEmoji}>🦜</Text>
              <View style={styles.pulseRing} />
            </View>
          </BlurView>
        </TouchableOpacity>

        {showTooltip && (
          <Animated.View
            style={[
              styles.tooltip,
              {
                opacity: tooltipAnim,
                transform: [
                  {
                    translateX: tooltipAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [20, 0],
                    }),
                  },
                ],
              },
            ]}
          >
            <BlurView intensity={40} tint="dark" style={styles.tooltipBlur}>
              <Text style={styles.tooltipText}>Need help navigating? Tap me! 🗺️</Text>
            </BlurView>
          </Animated.View>
        )}
      </Animated.View>

      <Modal
        visible={isVisible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setIsVisible(false)}
      >
        <ParrotNavigator 
          visible={isVisible}
          onNavigate={onNavigate}
          onClose={() => setIsVisible(false)}
          userType={userType}
        />
      </Modal>
    </>
  );
};

const styles = StyleSheet.create({
  floatingButton: {
    position: 'absolute',
    bottom: 100,
    right: 20,
    zIndex: 1000,
  },
  buttonTouchable: {
    shadowColor: '#FFD700',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.6,
    shadowRadius: 8,
    elevation: 8,
  },
  buttonBlur: {
    width: 70,
    height: 70,
    borderRadius: 35,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: '#FFD700',
  },
  buttonContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(26, 35, 126, 0.7)',
  },
  parrotEmoji: {
    fontSize: 36,
  },
  pulseRing: {
    position: 'absolute',
    width: 70,
    height: 70,
    borderRadius: 35,
    borderWidth: 2,
    borderColor: 'rgba(255, 215, 0, 0.5)',
  },
  tooltip: {
    position: 'absolute',
    right: 80,
    top: 15,
    maxWidth: 180,
  },
  tooltipBlur: {
    borderRadius: 12,
    padding: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255, 215, 0, 0.5)',
  },
  tooltipText: {
    color: '#FFD700',
    fontSize: 13,
    fontWeight: '600',
    textAlign: 'center',
  },
});

export default FloatingParrotButton;
